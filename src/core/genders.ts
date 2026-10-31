import { clean } from './literals';
import type { SelectOption } from './types';

export const GENDERS = ['男性', '女性', 'その他', '回答しない'] as const;

// PBI-212: English form vocabulary. An English gender option (Male/Female) is
// an alias of its Japanese profile value, so an English-form radio resolves
// against a Japanese profile instead of warn-no-option. Keys are lowercased
// (the real page ships value="Male" and label text "Male"; FEMALE also reads).
// The alias rides the option accessors of the 3-stage fallback below, so the
// English labels match at the exact text stage (stage 1) and the exact value
// stage (stage 2); the leading-character stage (stage 3) stays Japanese-only
// (男/女) — English abbreviations never fill by leading char.
const GENDER_ALIASES: ReadonlyMap<string, string> = new Map([
  ['male', '男性'],
  ['female', '女性'],
]);

// Exact text/value matches win; single-character options (男/女) resolve by
// leading character so abbreviated selects still fill. Numeric codes (0/1)
// never match a Japanese profile value and correctly fall to warn-no-option.
export function matchGenderOption(options: SelectOption[], gender: string): SelectOption | null {
  const t = clean(gender);
  if (!t) return null;
  // Alias-wrapped accessors: an English option text/value reads as its Japanese
  // equivalent before each stage compares, so the fallback order (text → value
  // → leading char) and the plain Japanese vocabulary stay untouched.
  const ja = (s: string): string => GENDER_ALIASES.get(clean(s).toLowerCase()) ?? clean(s);
  return options.find((o) => ja(o.text) === t)
    ?? options.find((o) => ja(o.value) === t)
    ?? options.find((o) => {
      const c = clean(o.text);
      return c !== '' && (t.startsWith(c) || c.startsWith(t));
    })
    ?? null;
}
