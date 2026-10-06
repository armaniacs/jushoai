import { toKatakana } from './formatters';
import { GENDERS } from './genders';
import { PREFECTURES } from './prefectures';
import type { Address, Profile } from './types';

const digits = (s: string) => s.normalize('NFKC').replace(/\D/g, '');
const kana = (s: string) => toKatakana(s.normalize('NFKC').trim());
// NFKC folds full-width alphabet into half-width, so Ｙａｍａｄａ becomes Yamada
const romaji = (s: string) => s.normalize('NFKC').trim();
const ROMAJI = /^[A-Za-z][A-Za-z .,'-]*$/;
// Accepts 1990/5/7 or 1990年5月7日 style input but leaves year-only strings untouched
const birthday = (s: string) => {
  const t = s.normalize('NFKC').trim();
  const m = t.match(/^(\d{4})\D(\d{1,2})\D(\d{1,2})日?$/);
  if (!m) return t;
  return `${m[1]}-${m[2]!.padStart(2, '0')}-${m[3]!.padStart(2, '0')}`;
};

export function normalizeProfile(p: Profile): Profile {
  return {
    id: p.id,
    label: p.label.trim(),
    lastName: p.lastName.trim(),
    firstName: p.firstName.trim(),
    lastNameKana: kana(p.lastNameKana),
    firstNameKana: kana(p.firstNameKana),
    lastNameRomaji: romaji(p.lastNameRomaji),
    firstNameRomaji: romaji(p.firstNameRomaji),
    gender: p.gender.normalize('NFKC').trim(),
    birthday: birthday(p.birthday),
    school: p.school.trim(),
    department: p.department.trim(),
    email: p.email.normalize('NFKC').trim(),
    tel: digits(p.tel),
  };
}

const half = (s: string) => s.normalize('NFKC').trim();

export function normalizeAddress(a: Address): Address {
  return {
    id: a.id,
    label: a.label.trim(),
    profileId: a.profileId,
    zip: digits(a.zip),
    prefecture: a.prefecture.trim(),
    city: a.city.trim(),
    street: a.street.trim(),
    building: a.building.trim(),
    country: half(a.country),
    address1: half(a.address1),
    address2: half(a.address2),
    address3: half(a.address3),
    address4: half(a.address4),
    postalCode: half(a.postalCode),
  };
}

export function validateProfile(p: Profile): string[] {
  const errors: string[] = [];
  if (!p.lastName) errors.push('姓を入力してください');
  if (!p.firstName) errors.push('名を入力してください');
  if (!/^[ァ-ヶー]+$/.test(p.lastNameKana)) errors.push('セイは全角カナで入力してください');
  if (!/^[ァ-ヶー]+$/.test(p.firstNameKana)) errors.push('メイは全角カナで入力してください');
  if (p.lastNameRomaji && !ROMAJI.test(p.lastNameRomaji)) errors.push('ローマ字姓は半角英字で入力してください');
  if (p.firstNameRomaji && !ROMAJI.test(p.firstNameRomaji)) errors.push('ローマ字名は半角英字で入力してください');
  if (p.gender && !(GENDERS as readonly string[]).includes(p.gender)) {
    errors.push('性別は「男性」「女性」「その他」「回答しない」から選んでください');
  }
  if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
    errors.push('メールアドレスの形式が正しくありません');
  }
  if (p.tel && !/^\d{10,11}$/.test(p.tel)) errors.push('電話番号は10〜11桁の数字で入力してください');
  if (!p.label.trim()) errors.push('プロファイルの名前を入力してください');
  if (p.birthday) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.birthday)) {
      errors.push('生年月日は YYYY-MM-DD の形式で入力してください');
    } else {
      // Round-trip through Date: rollover (e.g. Feb 30) shifts the fields and gets rejected
      const [y, m, d] = p.birthday.split('-').map(Number);
      const dt = new Date(y!, m! - 1, d!);
      if (dt.getFullYear() !== y || dt.getMonth() !== m! - 1 || dt.getDate() !== d) {
        errors.push('生年月日が正しい日付ではありません');
      }
    }
  }
  return errors;
}

const ASCII = /^[\x20-\x7E]*$/;
const OVERSEAS_LABELS: [keyof Address, string][] = [
  ['country', '国名'],
  ['address1', '建物名'],
  ['address2', '番地'],
  ['address3', '市'],
  ['address4', '州・地域'],
  ['postalCode', '郵便番号'],
];

export function validateAddress(a: Address): string[] {
  const errors: string[] = [];
  if (!a.label) errors.push('住所の名前（自宅など）を入力してください');
  // A country declares an overseas address: domestic fields stop being required,
  // and overseas lines must be half-width ASCII for half-width-only forms.
  const overseas = OVERSEAS_LABELS.some(([k]) => a[k]);
  if (overseas && !a.country) errors.push('英語住所の国名を入力してください');
  for (const [k, label] of OVERSEAS_LABELS) {
    if (a[k] && !ASCII.test(a[k])) errors.push(`英語住所の${label}は半角英数で入力してください`);
  }
  if (!a.country) {
    if (!/^\d{7}$/.test(a.zip)) errors.push('郵便番号は7桁の数字で入力してください');
    if (!(PREFECTURES as readonly string[]).includes(a.prefecture)) {
      errors.push('都道府県は「東京都」のように正式名称で入力してください');
    }
    if (!a.city) errors.push('市区町村を入力してください');
    if (!a.street) errors.push('番地を入力してください');
  }
  return errors;
}
