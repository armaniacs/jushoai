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
