export const CATEGORIES = [
  'lastName', 'firstName', 'fullName',
  'lastNameKana', 'firstNameKana', 'fullNameKana',
  'lastNameRomaji', 'firstNameRomaji', 'fullNameRomaji',
  'gender',
  'email', 'tel', 'tel1', 'tel2', 'tel3',
  'zip', 'zip1', 'zip2',
  'prefecture', 'city', 'street', 'building',
  'addressFull', 'addressNoPref',
  'birthYear', 'birthMonth', 'birthDay', 'birthEra',
  'school', 'department',
  'unknown',
] as const;
export type Category = (typeof CATEGORIES)[number];

export type KanaKind = 'katakana' | 'hiragana' | 'halfKatakana';

export interface SelectOption { value: string; text: string }

export interface FieldMeta {
  id: string;
  tag: 'input' | 'select';
  type: string;
  name: string;
  htmlId: string;
  autocomplete: string;
  label: string;
  placeholder: string;
  nearby: string;
  maxLength: number | null;
  pattern: string;
  options: SelectOption[];
  readOnly: boolean;
  disabled: boolean;
  value: string;
}

export interface Classification {
  category: Category;
  confidence: number;
  source: 'rule' | 'llm';
  kanaKind?: KanaKind;
}

export interface Profile {
  id: string;
  label: string;
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  lastNameRomaji: string;
  firstNameRomaji: string;
  gender: string;
  birthday: string;
  school: string;
  department: string;
  email: string;
  tel: string;
}

export interface Address {
  id: string;
  label: string;
  zip: string;
  prefecture: string;
  city: string;
  street: string;
  building: string;
}

export interface StoredData {
  profiles: Profile[];
  addresses: Address[];
}

export const EMPTY_PROFILE: Profile = {
  id: '', label: '',
  lastName: '', firstName: '', lastNameKana: '', firstNameKana: '',
  lastNameRomaji: '', firstNameRomaji: '',
  gender: '',
  birthday: '', school: '', department: '',
  email: '', tel: '',
};
