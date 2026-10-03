import type { SelectOption } from './types';

// Array index + 1 equals the JIS X 0401 prefecture code, which many select values use.
export const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
] as const;

const strip = (s: string) => s.normalize('NFKC').trim().replace(/[都道府県]$/, '');

export function matchPrefectureOption(
  options: SelectOption[],
  prefecture: string,
): SelectOption | null {
  const target = strip(prefecture);
  if (!target) return null;
  const byText = options.find((o) => strip(o.text) === target);
  if (byText) return byText;
  const code = PREFECTURES.indexOf(prefecture as (typeof PREFECTURES)[number]) + 1;
  return (
    options.find(
      (o) => strip(o.value) === target || (code > 0 && /^\d+$/.test(o.value) && Number(o.value) === code),
    ) ?? null
  );
}
