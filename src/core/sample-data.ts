import { GENDERS } from './genders';
import { PREFECTURES } from './prefectures';
import type { Address, Profile } from './types';

type Rand = () => number;

function defaultRand(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] as number) / 0x100000000;
}

const pick = <T>(rand: Rand, list: readonly T[]): T =>
  list[Math.floor(rand() * list.length)] as T;

const SURNAMES = [
  ['山田', 'ヤマダ', 'Yamada'], ['佐藤', 'サトウ', 'Sato'], ['鈴木', 'スズキ', 'Suzuki'],
  ['高橋', 'タカハシ', 'Takahashi'], ['田中', 'タナカ', 'Tanaka'], ['渡辺', 'ワタナベ', 'Watanabe'],
  ['山本', 'ヤマモト', 'Yamamoto'], ['中村', 'ナカムラ', 'Nakamura'], ['小林', 'コバヤシ', 'Kobayashi'],
  ['加藤', 'カトウ', 'Kato'], ['吉田', 'ヨシダ', 'Yoshida'], ['山下', 'ヤマシタ', 'Yamashita'],
  ['松本', 'マツモト', 'Matsumoto'], ['井上', 'イノウエ', 'Inoue'], ['木村', 'キムラ', 'Kimura'],
  ['林', 'ハヤシ', 'Hayashi'], ['斎藤', 'サイトウ', 'Saito'], ['清水', 'シミズ', 'Shimizu'],
  ['森', 'モリ', 'Mori'], ['岡田', 'オカダ', 'Okada'],
] as const;

const GIVEN = [
  ['太郎', 'タロウ', 'Taro'], ['花子', 'ハナコ', 'Hanako'], ['健太', 'ケンタ', 'Kenta'],
  ['美咲', 'ミサキ', 'Misaki'], ['翔太', 'ショウタ', 'Shota'], ['葵', 'アオイ', 'Aoi'],
  ['蓮', 'レン', 'Ren'], ['陽菜', 'ヒナ', 'Hina'], ['大輔', 'ダイスケ', 'Daisuke'],
  ['恵子', 'ケイコ', 'Keiko'], ['拓也', 'タクヤ', 'Takuya'], ['真由美', 'マユミ', 'Mayumi'],
  ['亮', 'リョウ', 'Ryo'], ['楓', 'カエデ', 'Kaede'], ['颯太', 'ソウタ', 'Sota'],
  ['結衣', 'ユイ', 'Yui'], ['和也', 'カズヤ', 'Kazuya'], ['沙織', 'サオリ', 'Saori'],
  ['直樹', 'ナオキ', 'Naoki'], ['千尋', 'チヒロ', 'Chihiro'],
] as const;

const CITIES = [
  '千代田区', '港区', '新宿区', '横浜市港北区', '川崎市中原区', 'さいたま市大宮区',
  '千葉市中央区', '大阪市北区', '神戸市中央区', '京都市中京区', '名古屋市中区',
  '札幌市中央区', '仙台市青葉区', '広島市中区', '福岡市博多区', '那覇市',
] as const;

const STREETS = [
  '千代田1-1', '梅田2-3-4', '本町3-5-6', '中央1-2-3', '駅前4-5-6',
  '旭町2-1-8', '桜木町1-5-2', '錦町3-3-3',
] as const;

const BUILDINGS = ['', 'サンプルビル101', 'グリーンハイツ203', 'サンライズマンション301'] as const;

const digits = (rand: Rand, n: number): string =>
  Array.from({ length: n }, () => Math.floor(rand() * 10)).join('');

export function makeSampleProfile(rand: Rand = defaultRand): Omit<Profile, 'id'> {
  const [lastName, lastNameKana, lastNameRomaji] = pick(rand, SURNAMES);
  const [firstName, firstNameKana, firstNameRomaji] = pick(rand, GIVEN);
  const year = 1960 + Math.floor(rand() * 51);
  const month = 1 + Math.floor(rand() * 12);
  const day = 1 + Math.floor(rand() * 28);
  const telHead = pick(rand, ['090', '080', '070'] as const);
  const serial = 1000 + Math.floor(rand() * 9000);
  return {
    label: 'お試し',
    lastName,
    firstName,
    lastNameKana,
    firstNameKana,
    lastNameRomaji,
    firstNameRomaji,
    gender: pick(rand, GENDERS),
    birthday: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    school: '',
    department: '',
    companyName: '',
    companyDepartment: '',
    companyNameKana: '',
    email: `${lastNameRomaji.toLowerCase()}.${firstNameRomaji.toLowerCase()}${serial}@example.com`,
    tel: `${telHead}${digits(rand, 8)}`,
  };
}

export function makeSampleAddress(rand: Rand = defaultRand): Omit<Address, 'id' | 'profileId'> {
  return {
    label: '自宅',
    zip: digits(rand, 7),
    prefecture: pick(rand, PREFECTURES),
    city: pick(rand, CITIES),
    street: pick(rand, STREETS),
    building: pick(rand, BUILDINGS),
    country: '',
    address1: '',
    address2: '',
    address3: '',
    address4: '',
    postalCode: '',
  };
}
