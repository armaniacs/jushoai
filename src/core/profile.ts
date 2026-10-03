import { toKatakana } from './formatters';
import { PREFECTURES } from './prefectures';
import type { Address, Profile } from './types';

const digits = (s: string) => s.normalize('NFKC').replace(/\D/g, '');
const kana = (s: string) => toKatakana(s.normalize('NFKC').trim());

export function normalizeProfile(p: Profile): Profile {
  return {
    lastName: p.lastName.trim(),
    firstName: p.firstName.trim(),
    lastNameKana: kana(p.lastNameKana),
    firstNameKana: kana(p.firstNameKana),
    email: p.email.normalize('NFKC').trim(),
    tel: digits(p.tel),
  };
}

export function normalizeAddress(a: Address): Address {
  return {
    id: a.id,
    label: a.label.trim(),
    zip: digits(a.zip),
    prefecture: a.prefecture.trim(),
    city: a.city.trim(),
    street: a.street.trim(),
    building: a.building.trim(),
  };
}

export function validateProfile(p: Profile): string[] {
  const errors: string[] = [];
  if (!p.lastName) errors.push('姓を入力してください');
  if (!p.firstName) errors.push('名を入力してください');
  if (!/^[ァ-ヶー]+$/.test(p.lastNameKana)) errors.push('セイは全角カナで入力してください');
  if (!/^[ァ-ヶー]+$/.test(p.firstNameKana)) errors.push('メイは全角カナで入力してください');
  if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
    errors.push('メールアドレスの形式が正しくありません');
  }
  if (p.tel && !/^\d{10,11}$/.test(p.tel)) errors.push('電話番号は10〜11桁の数字で入力してください');
  return errors;
}

export function validateAddress(a: Address): string[] {
  const errors: string[] = [];
  if (!a.label) errors.push('住所の名前（自宅など）を入力してください');
  if (!/^\d{7}$/.test(a.zip)) errors.push('郵便番号は7桁の数字で入力してください');
  if (!(PREFECTURES as readonly string[]).includes(a.prefecture)) {
    errors.push('都道府県は「東京都」のように正式名称で入力してください');
  }
  if (!a.city) errors.push('市区町村を入力してください');
  if (!a.street) errors.push('番地を入力してください');
  return errors;
}
