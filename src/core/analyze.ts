import type { FieldMeta, Item } from './types';
import type { FieldClassifier } from './classifier';
import { runClassifyPipeline, withLegacyThrowFallback } from '../classify-pipeline/pipeline';

// PBI-174: analyze は LLM 編成を持たない。「1回の分類試行」の境界
// (pending 分割→チャンク試行→合流) と失敗語彙の所有は runClassifyPipeline
// (classify-pipeline/) に集約し、classifyAll は既存呼び出し向けの薄い入口
// として items だけを返す。合流の実体 (LLM合流・radio ゲート・
// resolveKana→refine→englishPage の順序) も同モジュールの merge 所有で、
// ここに二重実装は置かない。throw 契約 (classify) は test/legacy 専用の
// 互換包み経由でのみ使う。
export async function classifyAll(
  metas: FieldMeta[],
  classifier: FieldClassifier | null,
  opts: { force?: boolean; englishPage?: boolean; llmSkip?: ReadonlySet<string> } = {},
): Promise<Item[]> {
  return (await runClassifyPipeline(withLegacyThrowFallback(classifier), metas, opts)).items;
}
