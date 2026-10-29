import { asClassifyFailure, type ClassifyFailure } from '../messages';
import {
  classifyField, classifyRulePipeline, isConfident, refineClassifications,
} from '../core/classify-rules';
import { detectKanaKind, resolveKana } from '../core/kana';
import { applyEnglishPage } from '../core/page-language';
import { isAllowedRadioCategory } from '../core/radio-policy';
import { sendSet } from '../core/pending-split';
import { prepare, type PremadePass } from '../core/classify-once';
import type { Category, FieldMeta, Item, RuledField } from '../core/types';
import type { FieldClassifier } from '../core/classifier';
import { planChunks, scheduleFor } from './chunks';

// 分類1回ユースケースの境界と所有モジュール (PBI-174)。「1回の分類試行」
// (pending 分割→チャンク試行→合流) はこのモジュールが所有し、content 系の
// 呼び出し元は run を通る。rule-only の純粋合成 (fill-one・import-draft・
// eval) は classifyRulePipeline が所有し、そちらを通る (PBI-186)。失敗語彙の
// 優先順位 (チャンク失敗 > 切り詰め通知、未知語彙→bad-response) もここに
// 集約する。core/ 直下に I/O は置かない: 送信は FieldClassifier 縫い目に
// 注入し、このモジュールは送信手段を選ばない。

export interface ClassifyPipelineOptions {
  force?: boolean;
  englishPage?: boolean;
  llmSkip?: ReadonlySet<string>;
  signal?: AbortSignal;
  // The shared classify-once pass (PBI-179/181): a PremadePass view of the
  // canonical RunContext. The caller that already holds one pass over these
  // metas (the gate path does) hands it over; the pipeline never re-runs
  // classifyField on its own path below. Absent only in rule-only and legacy
  // direct uses, where the boundary normalizes it once (same pure functions,
  // same inputs — results identical).
  premade?: PremadePass;
}

export interface ClassifyPipelineResult {
  items: Item[];
  failureReason: ClassifyFailure | null;
}

// PBI-27: ルール限定実行の集約行 (analyze から移動)。件数と経過時間のみで
// meta 内容 (label/placeholder/value/ids) は載せない。
function logRuleOnlyRun(fieldCount: number, startedAt: number): void {
  console.debug(`[JushoAI] rule-only classify fields=${fieldCount} durationMs=${Date.now() - startedAt}`);
}

// LLM 合流の単一所有 (analyze.classifyAll から移動)。順序は不変:
// confident 保持 (force 時は LLM 優先) → LLM 回答の採用 → radio ゲート →
// rule フォールバック → resolveKana → refine → englishPage。
export function mergeClassified(
  metas: FieldMeta[],
  fromLlm: Map<string, Category>,
  opts: { force?: boolean; englishPage?: boolean } = {},
  premadeRuled?: readonly RuledField[],
): Item[] {
  const force = opts.force === true;
  const ruled = premadeRuled ?? metas.map((meta) => ({ meta, cls: classifyField(meta) }));
  const items: Item[] = [];
  for (const { meta, cls } of ruled) {
    if (!force && isConfident(cls)) {
      items.push({ meta, cls });
      continue;
    }
    const category = fromLlm.get(meta.id);
    if (category && category !== 'unknown') {
      // PBI-05: radio は性別・年代のみ (方針は isAllowedRadioCategory が所有)。
      // PBI-41 の許容集合をここで守り、それ以外は rule 保持に落とす。
      if (meta.tag !== 'radio' || isAllowedRadioCategory(category)) {
        items.push({
          meta,
          cls: {
            category,
            confidence: 0.5,
            source: 'llm',
            ...(category.endsWith('Kana') ? { kanaKind: detectKanaKind(meta) } : {}),
          },
        });
        continue;
      }
    }
    // LLM 回答なしでは rule 結果を保持 (fail-safe: 未分類は unknown のまま
    // 残し、buildPlan が誤注入の代わりに除外する)。
    items.push({ meta, cls: cls ?? { category: 'unknown', confidence: 0, source: 'rule' } });
  }
  const resolved = resolveKana(items);
  const refined = refineClassifications(resolved);
  return opts.englishPage ? applyEnglishPage(refined) : refined;
}

// PBI-174: throw 契約 (classify) は test/legacy 専用。attempt を持たない旧来
// fake 用の互換包み: 成功時は {map, null}、throw 時は空 map・null 理由で
// 旧 classifyAll の fail-safe と同一に振る舞う。正規 adapter は attempt を
// 持つため素通しする。
export function withLegacyThrowFallback(
  classifier: FieldClassifier | null,
): FieldClassifier | null {
  if (classifier === null) return null;
  if (typeof classifier.attempt === 'function') return classifier;
  return {
    classify: (...args) => classifier.classify(...args),
    attempt: async (fields, schedule) => {
      try {
        return { map: await classifier.classify(fields, schedule), failureReason: null };
      } catch {
        return { map: new Map(), failureReason: null };
      }
    },
  };
}

// 分類パイプラインの唯一の入口。force・llmSkip・signal を引数で受け、
// chunk/cap/schedule 生成は run が所有して attempt 引数に格上げする
// (gateway は転送のみ)。
export async function runClassifyPipeline(
  classifier: FieldClassifier | null,
  metas: FieldMeta[],
  opts: ClassifyPipelineOptions = {},
): Promise<ClassifyPipelineResult> {
  const startedAt = Date.now();
  const force = opts.force === true;
  const englishPage = opts.englishPage;
  if (classifier === null) {
    logRuleOnlyRun(metas.length, startedAt);
    return { items: classifyRulePipeline(metas, { englishPage }), failureReason: null };
  }
  // PBI-124/154/185: 送信集合の所有は sendSet。force は全件 (skip
  // 除外)、通常は非 confident のみ。PBI-181: 単経路 — 冒頭で1パスに正規化し、
  // 下流 (pending 選択も merge も) はその pass のみ読む。premade ありなら
  // 分類を再実行せず、その pass から sendSet が集合を決める（同一純粋
  // 関数の同一入力なので集合は等しい）。
  const pass = opts.premade ?? prepare(metas, { taughtKeys: new Set() });
  const pending = sendSet(pass.ruled, { skip: opts.llmSkip, force });
  if (pending.length === 0) {
    logRuleOnlyRun(metas.length, startedAt);
    return { items: classifyRulePipeline(metas, { englishPage }), failureReason: null };
  }
  const seam = withLegacyThrowFallback(classifier);
  const plan = planChunks(pending);
  const fromLlm = new Map<string, Category>();
  // 最初の失敗が理由になる (後続チャンクの失敗や切り詰め通知より優先)。
  let failureReason: ClassifyFailure | null = null;
  for (let i = 0; i < plan.chunks.length; i++) {
    if (opts.signal?.aborted) {
      failureReason ??= 'network';
      break;
    }
    let outcome;
    try {
      outcome = await seam!.attempt(
        plan.chunks[i]!,
        scheduleFor(i + 1, plan.chunks.length),
        { signal: opts.signal },
      );
    } catch {
      // attempt は非 throw 契約。契約外の throw は旧 fail-safe
      // (理由なし・後続継続) 扱いにする。
      continue;
    }
    for (const [id, category] of outcome.map) fromLlm.set(id, category);
    failureReason ??= asClassifyFailure(outcome.failureReason);
  }
  if (plan.truncatedCount > 0 && failureReason === null) {
    failureReason = 'truncated';
  }
  return { items: mergeClassified(metas, fromLlm, { force, englishPage }, pass.ruled), failureReason };
}
