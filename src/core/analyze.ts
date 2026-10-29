import type { FieldMeta, Item } from './types';
import type { FieldClassifier } from './classifier';
import { runClassifyPipeline } from '../classify-pipeline/pipeline';

// PBI-174: analyze owns no LLM orchestration. The boundary of one classify
// attempt (pending split → chunk attempts → merge) and the failure vocabulary
// are owned by runClassifyPipeline (classify-pipeline/); classifyAll is the
// thin entry that returns items only, for existing callers. The merge itself
// (LLM merge, radio gate, resolveKana→refine→englishPage order) is that same
// module's merge owner — no second implementation here.
// PBI-198: the legacy throw wrapper (withLegacyThrowFallback) is normalized
// once at the pipeline boundary (runClassifyPipeline), so classifyAll hands
// the classifier through verbatim instead of wrapping it a second time.
export async function classifyAll(
  metas: FieldMeta[],
  classifier: FieldClassifier | null,
  opts: { force?: boolean; englishPage?: boolean; llmSkip?: ReadonlySet<string> } = {},
): Promise<Item[]> {
  return (await runClassifyPipeline(classifier, metas, opts)).items;
}
