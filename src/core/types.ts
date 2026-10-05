export const CATEGORIES = [
  'lastName', 'firstName', 'fullName',
  'lastNameKana', 'firstNameKana', 'fullNameKana',
  'lastNameRomaji', 'firstNameRomaji', 'fullNameRomaji',
  'gender', 'ageDecade',
  'country', 'address1', 'address2', 'address3', 'address4', 'postalCode',
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

export interface SelectOption { value: string; text: string; disabled?: boolean }

export interface FieldMeta {
  id: string;
  tag: 'input' | 'select' | 'radio';
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
  country: string;
  address1: string;
  address2: string;
  address3: string;
  address4: string;
  postalCode: string;
}

export const EMPTY_ADDRESS: Address = {
  id: '', label: '', zip: '', prefecture: '', city: '', street: '', building: '',
  country: '', address1: '', address2: '', address3: '', address4: '', postalCode: '',
};

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
