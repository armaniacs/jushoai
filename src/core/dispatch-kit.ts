import type { Category, Classification, FieldMeta } from './types';

export interface DispatchCtx {
  m: FieldMeta;
  ownText: string;
  legendText: string;
  overseasCtx: string;
  isOptionField: boolean;
}

export type Matcher = (ctx: DispatchCtx) => Classification | null;

export interface MatcherEntry {
  name: string;
  match: Matcher;
}

// None of the dispatch entries yields a Kana category, so the module-level
// constructor needs no kanaKind (kept in classifyField's local make).
export const matchAs = (category: Category, confidence: number): Classification => ({
  category,
  confidence,
  source: 'rule',
});

// The field itself (0.7) outranks a shared heading (0.65): one data row
// expands to the ordered pair, so the gradient lives in a single place.
// extra gates both sides (e.g. decade options); legendExtra overrides the
// legend side when its evidence lives elsewhere (e.g. FOREIGN_MARK may sit
// in the field or its heading, so the legend side reads overseasCtx).
// Contract: legendGate defaults to extra — the own-side gate applies to the
// legend side unless legendExtra overrides it.
export function ownLegend(
  re: RegExp,
  category: Category,
  extra?: (ctx: DispatchCtx) => boolean,
  legendExtra?: (ctx: DispatchCtx) => boolean,
): [MatcherEntry, MatcherEntry] {
  const legendGate = legendExtra ?? extra;
  return [
    { name: `${category}-own`, match: (ctx) => (re.test(ctx.ownText) && (!extra || extra(ctx)) ? matchAs(category, 0.7) : null) },
    { name: `${category}-legend`, match: (ctx) => (re.test(ctx.legendText) && (!legendGate || legendGate(ctx)) ? matchAs(category, 0.65) : null) },
  ];
}
