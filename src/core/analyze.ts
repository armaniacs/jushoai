import {
  classifyField, detectKanaKind, isConfident, refineClassifications, type Item,
} from './classify-rules';
import type { Category, FieldMeta } from './types';
import type { FieldClassifier } from './classifier';

export async function classifyAll(
  metas: FieldMeta[],
  classifier: FieldClassifier | null,
): Promise<Item[]> {
  const ruled = metas.map((meta) => ({ meta, cls: classifyField(meta) }));
  const pending = ruled
    .filter((r) => !isConfident(r.cls))
    .map((r) => r.meta);

  let fromLlm = new Map<string, Category>();
  if (classifier && pending.length > 0) {
    try {
      fromLlm = await classifier.classify(pending);
    } catch {
      // An LLM failure must not block rule-based filling.
    }
  }

  const items: Item[] = [];
  for (const { meta, cls } of ruled) {
    if (isConfident(cls)) {
      items.push({ meta, cls });
      continue;
    }
    const category = fromLlm.get(meta.id);
    if (category && category !== 'unknown') {
      items.push({
        meta,
        cls: {
          category,
          confidence: 0.5,
          source: 'llm',
          ...(category.endsWith('Kana') ? { kanaKind: detectKanaKind(meta) } : {}),
        },
      });
    }
  }
  return refineClassifications(items);
}
