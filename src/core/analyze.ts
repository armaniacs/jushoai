import {
  classifyField, isConfident, refineClassifications, type Item,
} from './classify-rules';
import { detectKanaKind, resolveKana } from './kana';
import type { Category, FieldMeta } from './types';
import type { FieldClassifier } from './classifier';
import { applyEnglishPage } from './page-language';

export async function classifyAll(
  metas: FieldMeta[],
  classifier: FieldClassifier | null,
  opts: { force?: boolean; englishPage?: boolean } = {},
): Promise<Item[]> {
  const force = opts.force === true;
  const ruled = metas.map((meta) => ({ meta, cls: classifyField(meta) }));
  const pending = (force ? ruled : ruled.filter((r) => !isConfident(r.cls))).map((r) => r.meta);

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
    if (!force && isConfident(cls)) {
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
      continue;
    }
    if (force && cls) items.push({ meta, cls });
  }
  resolveKana(items);
  const refined = refineClassifications(items);
  return opts.englishPage ? applyEnglishPage(refined) : refined;
}
