// Const-array membership with literal narrowing. Replaces the `as readonly
// string[]` + typeof preamble repeated at every vocabulary check, so a new
// literal stays covered by the type system instead of by convention.
export function includesLiteral<T extends readonly string[]>(list: T, value: unknown): value is T[number] {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}

// NFKC case-folding shared by the rule matchers (classify-rules) and the kana
// module, so the two never drift on normalization.
// Trim-bearing normalization stays owned by the matchers (eras/genders/prefectures/profile); only case-fold is shared here.
export const norm = (s: string): string => s.normalize('NFKC').toLowerCase();

// PBI-44: text→category入口の段階別正規化契約（第1段階 normalize）。
// 1欄の各raw文字列はここで1回だけnormされ、後段（DISPATCH・sources・
// wantsKana・resolveKana）はこのビューを使い回し、再normしない。rawの切り方
// と結合順はclassifyFieldの従来どおり（6源泉）のため、意味論は不変。
// nearbyはlegendTextとして1回だけnormされ、KanaNorm.nearbyと同一物になる。
export interface FieldNormViews {
  /** norm([name, htmlId, label, placeholder]) — DISPATCHのownText。 */
  readonly ownText: string;
  /** norm(nearby) — DISPATCHのlegendText／KanaNorm.nearbyと同一物。 */
  readonly legendText: string;
  /** norm(`${name} ${htmlId}`) — 0.8源泉（name/id）。 */
  readonly nameId: string;
  /** norm(`${label} ${placeholder}`) — 0.7源泉（label/placeholder）。 */
  readonly labelPlaceholder: string;
  /** norm(placeholder) — KanaNorm.placeholderと同一物。 */
  readonly placeholder: string;
  /** norm([name, htmlId, label]) — KanaNorm.nameIdLabelと同一物。 */
  readonly nameIdLabel: string;
  /** `${ownText} ${legendText}` — 派生結合のみ（norm追加なし）。 */
  readonly overseasCtx: string;
}

/** 欄メタのraw文字列から正規化ビューを一段で組み立てる（各rawちょうど1回）。 */
export function buildFieldNormViews(m: {
  name: string;
  htmlId: string;
  label: string;
  placeholder: string;
  nearby: string;
}): FieldNormViews {
  const ownText = norm([m.name, m.htmlId, m.label, m.placeholder].join(' '));
  const legendText = norm(m.nearby);
  return {
    ownText,
    legendText,
    nameId: norm(`${m.name} ${m.htmlId}`),
    labelPlaceholder: norm(`${m.label} ${m.placeholder}`),
    placeholder: norm(m.placeholder),
    nameIdLabel: norm([m.name, m.htmlId, m.label].join(' ')),
    overseasCtx: `${ownText} ${legendText}`,
  };
}
