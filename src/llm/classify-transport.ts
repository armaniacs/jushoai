import type { Category, FieldMeta } from '../core/types';
import type { ClassifySchedule } from '../core/classifier';
import {
  aiClassifyRequest,
  encodeFieldMeta,
  isLegacyClassifyFailure,
  parseClassifyResult,
  type ClassifyFailure,
} from '../messages';
import { planChunks, scheduleFor } from '../classify-pipeline/chunks';
import { TRANSFER_CHUNK_TIMEOUT_MS, TRANSFER_TOTAL_TIMEOUT_MS } from './transfer-contract';

// 分類転送の単一所有 (PBI-175)。cap/slice/chunk/encode/schedule/clamp/timeout/
// 失敗語彙のうち転送側の関心事はこのモジュールに集約し、公開入口は send の
// みとする。chunk 幅・cap・schedule 生成の数値判断は持たず、PBI-174 の
// classify-pipeline/chunks（planChunks/scheduleFor）を再利用する。
// gateway（background-gateway.ts）は転送内容を持たず send に委譲するだけの
// 薄い適合層、pipeline（classify-pipeline/pipeline.ts）は試行の順序と合流だけ
// を持ち、送信自体は FieldClassifier 縫い目経由でここに流れる。

export interface ClassifySendOptions {
  signal?: AbortSignal;
  // 分割済み単一転送の位置。複数 chunk 走時は plan に従い scheduleFor を
  // 付け直すため無視される（gateway 互換: 単一 chunk 走のみ caller 値を運ぶ）。
  schedule?: ClassifySchedule;
  // 既定は転送契約値。gateway の構成値（テスト含む）をそのまま流すための
  // 上書き口で、通常は指定しない。
  timeoutMs?: number;
  totalTimeoutMs?: number;
}

export interface ClassifySendResult {
  map: Map<string, Category>;
  failureReason: ClassifyFailure | null;
  truncatedCount: number;
}

// A stalled Service Worker reply must not leave the caller pending forever.
// The optional signal links the wait to preview disposal (PBI-33): an abort
// rejects the in-flight chunk so the loop below stops without sending more.
function sendWithTimeout(msg: unknown, ms: number, signal?: AbortSignal): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('aborted'));
      return;
    }
    const timer = setTimeout(() => { cleanup(); reject(new Error('timeout')); }, ms);
    const onAbort = () => { clearTimeout(timer); cleanup(); reject(new Error('aborted')); };
    const cleanup = () => signal?.removeEventListener('abort', onAbort);
    signal?.addEventListener('abort', onAbort, { once: true });
    (chrome.runtime.sendMessage(msg) as Promise<unknown>).then(
      (v) => { clearTimeout(timer); cleanup(); resolve(v); },
      (e) => { clearTimeout(timer); cleanup(); reject(e); },
    );
  });
}

// 唯一の転送入口。fields 全体の転送走（cap 切り詰め＋逐次 chunk 送信）を
// 1 回で行い、部分結果と停止理由と切り詰め件数を束ねて返す。
// 失敗語彙の優先順位: 先に起きた chunk 失敗が理由になる（後続の失敗や切り詰め
// 通知より優先）。切り詰め通知 'truncated' は他に失敗がないときのみ付く。
// PBI-33: 逐次走全体は totalTimeoutMs で区切り（残 budget が各 chunk 送信を
// clamp する）、signal（プレビュー破棄）は走の前・途中で止める。いずれの
// 打ち切りも既得 chunk を保持し 'network' で返す（呼び出し側は rule のみ継続）。
export async function send(fields: FieldMeta[], opts: ClassifySendOptions = {}): Promise<ClassifySendResult> {
  const signal = opts.signal;
  const timeoutMs = opts.timeoutMs ?? TRANSFER_CHUNK_TIMEOUT_MS;
  const totalTimeoutMs = opts.totalTimeoutMs ?? TRANSFER_TOTAL_TIMEOUT_MS;
  const startedAt = Date.now();
  const out = new Map<string, Category>();
  let failureReason: ClassifyFailure | null = null;
  const plan = planChunks(fields);
  for (let i = 0; i < plan.chunks.length; i++) {
    if (signal?.aborted) {
      failureReason ??= 'network';
      break;
    }
    const remaining = totalTimeoutMs - (Date.now() - startedAt);
    if (remaining <= 0) {
      failureReason ??= 'network';
      break;
    }
    const rows = plan.chunks[i]!.map(encodeFieldMeta);
    // The chunk position rides along only when the run was actually split, so
    // single-chunk calls stay out of the audit log's scheduling fields.
    // PBI-54: sent through the ai-classify builder (codec-owned envelope);
    // rows are MetaWire and the wire type says so.
    const schedule = plan.chunks.length > 1
      ? scheduleFor(i + 1, plan.chunks.length)
      : opts.schedule;
    let parsed: ReturnType<typeof parseClassifyResult>;
    let raw: unknown;
    try {
      raw = await sendWithTimeout(
        aiClassifyRequest(rows, schedule),
        Math.min(timeoutMs, remaining),
        signal,
      );
      parsed = parseClassifyResult(raw);
    } catch {
      failureReason = 'network';
      break;
    }
    if (!parsed) {
      // A legacy reply carries no reason; record unknown instead of crying wolf.
      failureReason = isLegacyClassifyFailure(raw) ? null : 'bad-response';
      break;
    }
    if (parsed.ok === false) {
      // A failing provider (401, 429, timeout) would fail every later chunk too.
      failureReason = parsed.reason;
      break;
    }
    for (const [id, c] of parsed.map) out.set(id, c);
  }
  if (plan.truncatedCount > 0 && failureReason === null) {
    failureReason = 'truncated';
  }
  return { map: out, failureReason, truncatedCount: plan.truncatedCount };
}
