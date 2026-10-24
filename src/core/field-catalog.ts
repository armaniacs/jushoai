// Field catalog (PBI-158): the single vocabulary table for the Profile and
// Address inputs that the options cards and the guest panel both render.
// key → label → placeholder → input type used to be copied into both UIs and
// the kana label difference could not be told apart from a one-sided update
// drift; the table below is the one source and the differences are columns:
// - optionsNote: supplementary wording appended to the label on the options
//   cards only (e.g. the furigana note). The guest panel shows the base label
//   as-is, which records that the shorter guest wording is intended.
// - optionsSelect: the options side renders the row as a select (都道府県),
//   not a plain text row; the select label still comes from this table.
// - guest: whether the one-shot guest panel carries the row; the guest set is
//   a subset of this table and is pinned by tests (tests/ui/guest-panel.test.ts).
// - guestWide: guest-panel-only two-column width (zip/street/building); the
//   options cards have no wide concept, so toOptionsField carries no wide.
// Pure data: imports types only — no DOM, no LLM.

import type { Address, Profile } from './types';

export interface FieldEntry<K extends string> {
  key: K;
  label: string;
  placeholder: string;
  type?: 'email' | 'tel';
  optionsNote?: string;
  optionsSelect?: boolean;
  guest: boolean;
  guestWide?: boolean;
}

// Plain input rows only: id/label/gender never render as text rows (label is
// the card's name row, gender is a select), so they stay out of the table.
export type ProfileFieldKey = Exclude<keyof Profile, 'id' | 'label' | 'gender'>;
// id/profileId are internal/owner keys, not form rows.
export type AddressFieldKey = Exclude<keyof Address, 'id' | 'profileId'>;

export type ProfileFieldEntry = FieldEntry<ProfileFieldKey>;
export type AddressFieldEntry = FieldEntry<AddressFieldKey>;

export const PROFILE_FIELD_CATALOG: readonly ProfileFieldEntry[] = [
  { key: 'lastName', label: '姓', placeholder: '山田', guest: true },
  { key: 'firstName', label: '名', placeholder: '太郎', guest: true },
  { key: 'lastNameKana', label: 'セイ', placeholder: 'ヤマダ', optionsNote: '（フリガナ・ふりがな入力可）', guest: true },
  { key: 'firstNameKana', label: 'メイ', placeholder: 'タロウ', optionsNote: '（フリガナ・ふりがな入力可）', guest: true },
  { key: 'lastNameRomaji', label: '姓（ローマ字・半角英字・任意）', placeholder: 'Yamada', guest: false },
  { key: 'firstNameRomaji', label: '名（ローマ字・半角英字・任意）', placeholder: 'Taro', guest: false },
  { key: 'birthday', label: '生年月日', placeholder: '1990-05-07', guest: false },
  { key: 'school', label: '学校名', placeholder: '都立日比谷高校', guest: false },
  { key: 'department', label: '学部・学科', placeholder: '普通科', guest: false },
  { key: 'companyName', label: '会社名（任意）', placeholder: '株式会社サンプル', guest: false },
  { key: 'companyDepartment', label: '会社の部署（任意）', placeholder: '開発部', guest: false },
  { key: 'email', label: 'メールアドレス', placeholder: 'yamada@example.com', type: 'email', guest: true },
  { key: 'tel', label: '電話番号', placeholder: '09012345678', type: 'tel', guest: true },
];

const PREFECTURE_ENTRY: AddressFieldEntry = {
  key: 'prefecture', label: '都道府県', placeholder: '東京都',
  optionsSelect: true, guest: true,
};

export const ADDRESS_FIELD_CATALOG: readonly AddressFieldEntry[] = [
  { key: 'label', label: '名前（自宅・勤務先など）', placeholder: '自宅', guest: false },
  { key: 'zip', label: '郵便番号', placeholder: '1000001', guest: true, guestWide: true },
  PREFECTURE_ENTRY,
  { key: 'city', label: '市区町村', placeholder: '千代田区', guest: true },
  { key: 'street', label: '番地', placeholder: '千代田1-1', guest: true, guestWide: true },
  { key: 'building', label: '建物名・部屋番号', placeholder: '千代田ビル101', optionsNote: '（任意）', guest: true, guestWide: true },
];

// The options side renders 都道府県 as a select; the label still comes from
// the catalog row so the wording stays single-sourced.
export const PREFECTURE_FIELD_LABEL = PREFECTURE_ENTRY.label;

// The projected row each UI consumes: key/label/placeholder/type with the
// per-UI wording already resolved. wide (two-column width) is guest-only: the
// guest panel lays the guestWide rows out full-width, and the options cards
// have no wide concept, so toOptionsField carries no wide.
export interface CatalogField<K extends string> {
  key: K;
  label: string;
  placeholder: string;
  type?: 'email' | 'tel';
  wide?: boolean;
}

const toGuestField = <K extends string>(f: FieldEntry<K>): CatalogField<K> => ({
  key: f.key,
  label: f.label,
  placeholder: f.placeholder,
  type: f.type,
  wide: f.guestWide === true,
});

const toOptionsField = <K extends string>(f: FieldEntry<K>): CatalogField<K> => ({
  key: f.key,
  label: f.optionsNote ? `${f.label}${f.optionsNote}` : f.label,
  placeholder: f.placeholder,
  type: f.type,
});

// Guest subset: the rows the one-shot guest panel carries, in table order.
export const GUEST_PROFILE_FIELDS: readonly CatalogField<ProfileFieldKey>[] =
  PROFILE_FIELD_CATALOG.filter((f) => f.guest).map(toGuestField);

export const GUEST_ADDRESS_FIELDS: readonly CatalogField<AddressFieldKey>[] =
  ADDRESS_FIELD_CATALOG.filter((f) => f.guest).map(toGuestField);

// Options card rows: the base label plus the options-only supplementary
// wording; select rows (都道府県) stay out of the plain-text list.
export const OPTIONS_PROFILE_FIELDS: readonly CatalogField<ProfileFieldKey>[] =
  PROFILE_FIELD_CATALOG.map(toOptionsField);

export const OPTIONS_ADDRESS_FIELDS: readonly CatalogField<AddressFieldKey>[] =
  ADDRESS_FIELD_CATALOG.filter((f) => !f.optionsSelect).map(toOptionsField);
