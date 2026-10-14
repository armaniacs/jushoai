// Const-array membership with literal narrowing. Replaces the `as readonly
// string[]` + typeof preamble repeated at every vocabulary check, so a new
// literal stays covered by the type system instead of by convention.
export function includesLiteral<T extends readonly string[]>(list: T, value: unknown): value is T[number] {
  return typeof value === 'string' && (list as readonly string[]).includes(value);
}
