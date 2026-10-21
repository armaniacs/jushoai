import { toKatakana } from './formatters';
import { GENDERS } from './genders';
import { clean, includesLiteral } from './literals';
import { PREFECTURES } from './prefectures';
import type { Address, Profile } from './types';

// digits stays outside clean (WHY): it projects digit runs rather than
// canonicalizing a value; trim would be a no-op because \D already drops every
// whitespace character (U+0020/U+3000 included), so routing it through clean
// would imply a trim-then-extract ordering contract that does not exist.
const digits = (s: string) => s.normalize('NFKC').replace(/\D/g, '');
// Romaji/kana/gender/email/birthday canonicalize through the shared clean
// (NFKC + trim). clean keeps case on purpose: NFKC folds Ｙａｍａｄａ into Yamada
// and must not lowercase it (norm would turn it into yamada).
const kana = (s: string) => toKatakana(clean(s));
const ROMAJI = /^[A-Za-z][A-Za-z .,'-]*$/;
// Accepts 1990/5/7 or 1990年5月7日 style input but leaves year-only strings untouched
const birthday = (s: string) => {
  const t = clean(s);
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
    lastNameRomaji: clean(p.lastNameRomaji),
    firstNameRomaji: clean(p.firstNameRomaji),
    gender: clean(p.gender),
    birthday: birthday(p.birthday),
    school: p.school.trim(),
    department: p.department.trim(),
    // PBI-119: 会社名・会社の部署は trim のみ（検証なし・空許容）。
    companyName: p.companyName.trim(),
    companyDepartment: p.companyDepartment.trim(),
    email: clean(p.email),
    tel: digits(p.tel),
  };
}

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
    // Overseas lines width-fold + trim through clean; case is kept for
    // half-width-only forms.
    country: clean(a.country),
    address1: clean(a.address1),
    address2: clean(a.address2),
    address3: clean(a.address3),
    address4: clean(a.address4),
    postalCode: clean(a.postalCode),
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
  if (p.gender && !includesLiteral(GENDERS, p.gender)) {
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
    if (!includesLiteral(PREFECTURES, a.prefecture)) {
      errors.push('都道府県は「東京都」のように正式名称で入力してください');
    }
    if (!a.city) errors.push('市区町村を入力してください');
    if (!a.street) errors.push('番地を入力してください');
  }
  return errors;
}
