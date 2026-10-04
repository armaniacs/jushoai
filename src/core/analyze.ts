import {
  classifyField, detectKanaKind, isConfident, refineClassifications, wantsKana,
  wantsKanaOwnMeta, type Item,
} from './classify-rules';
import type { Category, FieldMeta } from './types';
import type { FieldClassifier } from './classifier';

const KANA_CATEGORY: Partial<Record<Category, Category>> = {
  lastName: 'lastNameKana',
  firstName: 'firstNameKana',
  fullName: 'fullNameKana',
};

// The kana decision cannot ride any single classification route: autocomplete reports
// family-name for both the kanji and the furigana pair, so it is applied once here,
// after rules and the LLM, before refinement groups the pairs.
function applyKanaOverlay(items: Item[]): void {
  // A legend shared with a sibling that claims kana through its own attributes describes
  // the section, not each row: heading evidence alone must not flip plain-name rows
  // (e.g. a kanji 姓 row inside a お名前（フリガナ）fieldset).
  const kanaByOwnMeta = new Set(
    items.filter((i) => wantsKanaOwnMeta(i.meta)).map((i) => i.meta.nearby),
  );
  for (const item of items) {
    const target = KANA_CATEGORY[item.cls.category];
    if (!target || !wantsKana(item.meta)) continue;
    if (!wantsKanaOwnMeta(item.meta) && kanaByOwnMeta.has(item.meta.nearby)) continue;
    item.cls.category = target;
    item.cls.kanaKind = detectKanaKind(item.meta);
  }
}

export async function classifyAll(
  metas: FieldMeta[],
  classifier: FieldClassifier | null,
  opts: { force?: boolean } = {},
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
  applyKanaOverlay(items);
  return refineClassifications(items);
}
