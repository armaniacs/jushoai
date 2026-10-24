// Domain field mapping (PBI-138): the per-domain correction layer the user
// teaches once from the preview. A correction rides ON TOP of the rule
// classification — the learned category wins over the rule — and stores only
// the field signature → category pair. Profile values and corrections never
// cross the wire: the LLM keeps receiving metadata only, the audit log keeps
// recording classification attempts only.

import type { Category, FieldMeta, Item } from './types';

export interface MappingEntry {
  domain: string;
  // The stable field signature (name, else htmlId). A class/id-only signature
  // is too volatile to teach; a nameless field with no htmlId is unteachable.
  fieldKey: string;
  category: Category;
}

// The teachable signature. Returns null for a field with neither a name nor an
// htmlId: nothing stable survives a reload, so the correction would be noise.
export function fieldKeyFor(meta: FieldMeta): string | null {
  const key = meta.name || meta.htmlId;
  return key.trim() !== '' ? key : null;
}

export function hostOf(href: string): string {
  try {
    return new URL(href).host;
  } catch {
    return '';
  }
}

// The correction layer: entries for this domain override the matched fields'
// classifications. Unmatched fields keep their rule classification, so the
// layer is additive and never downgrades a field the user did not correct.
export function applyMapping(items: Item[], entries: MappingEntry[], domain: string): Item[] {
  if (entries.length === 0 || domain === '') return items;
  const learned = new Map<string, Category>();
  for (const e of entries) {
    if (e.domain === domain) learned.set(e.fieldKey, e.category);
  }
  if (learned.size === 0) return items;
  return items.map((i) => {
    const key = fieldKeyFor(i.meta);
    const category = key ? learned.get(key) : undefined;
    if (!category || category === i.cls.category) return i;
    return { ...i, cls: { category, confidence: 1, source: 'rule' } };
  });
}
