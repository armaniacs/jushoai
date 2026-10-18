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

// FieldMeta は走査〜分類〜計画で共有する定義側の唯一形状。
// value は fill 判定専用（入力済み上書き抑止のためのページ既存値スナップショット）で、
// LLM 送信には含めない。送信形状は MetaWire（src/messages.ts の META_WIRE_KEYS /
// toWireMeta のみ）で構築する。fill 適用時の真値は fill-plan 側が live DOM から読み直す。
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
  // fill 判定専用のページ既存値。LLM 送信用ペイロード（MetaWire）には含めず、
  // toWireMeta / sanitizeField が落とす前提。将来の送信側変更でもここを wire に載せない。
  value: string;
}

export interface Classification {
  category: Category;
  confidence: number;
  source: 'rule' | 'llm';
  kanaKind?: KanaKind;
}

// The shared pair flowing through classify → kana-resolve → refine → plan.
// Lives here (not in classify-rules) so kana.ts never imports classify-rules:
// value flows classify-rules → kana, type flows types → both, and no future
// value import on the kana side can turn this into a runtime cycle.
export interface Item {
  meta: FieldMeta;
  cls: Classification;
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
  // Owner profile id. Empty means shared: usable with any profile.
  profileId: string;
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
  id: '', label: '', profileId: '', zip: '', prefecture: '', city: '', street: '', building: '',
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
