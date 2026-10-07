import type { Category } from './types';
import type { Item } from './classify-rules';

const JAPANESE = /[぀-ゟ゠-ヿ一-龠]/g;
const LATIN = /[a-z]/gi;
const MIN_LATIN_LETTERS = 80;
// Page chrome (a "日本語" language switcher, a footer link) must not flip an English page.
const MAX_JAPANESE_RATIO = 0.03;

export function isEnglishPageText(text: string): boolean {
  const latin = text.match(LATIN)?.length ?? 0;
  const japanese = text.match(JAPANESE)?.length ?? 0;
  return latin >= MIN_LATIN_LETTERS && japanese / (latin + japanese) <= MAX_JAPANESE_RATIO;
}

// Western forms want latin names and the overseas address block; the profile's
// kanji values would be wrong there even when the field label is a plain "First name".
const ENGLISH_PAGE_CATEGORY: Partial<Record<Category, Category>> = {
  lastName: 'lastNameRomaji',
  firstName: 'firstNameRomaji',
  fullName: 'fullNameRomaji',
  zip: 'postalCode',
  building: 'address1',
  addressFull: 'address2',
  street: 'address2',
  city: 'address3',
  prefecture: 'address4',
};

export function applyEnglishPage(items: Item[]): Item[] {
  return items.map((it) => {
    const category = ENGLISH_PAGE_CATEGORY[it.cls.category];
    return category ? { meta: it.meta, cls: { ...it.cls, category } } : it;
  });
}
