import type { SelectOption } from './types';

export const GENDERS = ['男性', '女性', 'その他', '回答しない'] as const;

const clean = (s: string) => s.normalize('NFKC').trim();

// Exact text/value matches win; single-character options (男/女) resolve by
// leading character so abbreviated selects still fill. Numeric codes (0/1)
// never match a Japanese profile value and correctly fall to warn-no-option.
export function matchGenderOption(options: SelectOption[], gender: string): SelectOption | null {
  const t = clean(gender);
  if (!t) return null;
  return options.find((o) => clean(o.text) === t)
    ?? options.find((o) => clean(o.value) === t)
    ?? options.find((o) => {
      const c = clean(o.text);
      return c !== '' && (t.startsWith(c) || c.startsWith(t));
    })
    ?? null;
}
