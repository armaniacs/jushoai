// Local name-reading dictionary (PBI-133): a terminal-only seed of common
// surnames and given names to katakana readings. No network, no LLM — a
// deterministic lookup. The seed is designed to grow (a generated table, same
// shape, swaps in without touching the lookup or the planner); unknown names
// return null and the row keeps the plain warn-no-value warning.

export type NameKind = 'surname' | 'given';

// Highest-confidence seed: the most common surnames (a large population share)
// and classic given names with unambiguous readings.
const SURNAME_READINGS: Record<string, string> = {
  佐藤: 'サトウ', 鈴木: 'スズキ', 高橋: 'タカハシ', 田中: 'タナカ', 渡辺: 'ワタナベ',
  伊藤: 'イトウ', 山本: 'ヤマモト', 中村: 'ナカムラ', 小林: 'コバヤシ', 加藤: 'カトウ',
  吉田: 'ヨシダ', 山田: 'ヤマダ', 佐々木: 'ササキ', 山口: 'ヤマグチ', 松本: 'マツモト',
  井上: 'イノウエ', 木村: 'キムラ', 林: 'ハヤシ', 斉藤: 'サイトウ', 斎藤: 'サイトウ',
  清水: 'シミズ', 山崎: 'ヤマザキ', 森: 'モリ', 池田: 'イケダ', 橋本: 'ハシモト',
  阿部: 'アベ', 石川: 'イシカワ', 山下: 'ヤマシタ', 中島: 'ナカジマ', 石井: 'イシイ',
  小川: 'オガワ', 前田: 'マエダ', 藤田: 'フジタ', 後藤: 'ゴトウ', 岡田: 'オカダ',
  長谷川: 'ハセガワ', 村上: 'ムラカミ', 近藤: 'コンドウ', 石原: 'イシハラ', 藤本: 'フジモト',
  青木: 'アオキ', 坂本: 'サカモト', 福田: 'フクダ', 三浦: 'ミウラ', 西田: 'ニシダ',
  藤井: 'フジイ', 原田: 'ハラダ', 太田: 'オオタ', 松田: 'マツダ', 原: 'ハラ',
  岩崎: 'イワサキ', 竹内: 'タケウチ', 宇野: 'ウノ', 新井: 'アライ', 野口: 'ノグチ',
  田村: 'タムラ', 上田: 'ウエダ', 中野: 'ナカノ', 平野: 'ヒラノ', 川崎: 'カワサキ',
  三宅: 'ミヤケ', 関: 'セキ', 佐久間: 'サクマ', 小野: 'オノ', 田口: 'タグチ',
  河野: 'カワノ', 服部: 'ハットリ', 杉本: 'スギモト', 丸山: 'マルヤマ', 水野: 'ミズノ',
  今井: 'イマイ', 大野: 'オオノ', 高木: 'タカギ', 松井: 'マツイ', 小池: 'コイケ',
  吉川: 'ヨシカワ', 内田: 'ウチダ', 島田: 'シマダ', 森田: 'モリタ', 中山: 'ナカヤマ',
  佐野: 'サノ', 西野: 'ニシノ', 中川: 'ナカガワ', 堀: 'ホリ', 吉村: 'ヨシムラ',
};

const GIVEN_READINGS: Record<string, string> = {
  太郎: 'タロウ', 次郎: 'ジロウ', 一郎: 'イチロウ', 花子: 'ハナコ', 桜: 'サクラ',
  大輔: 'ダイスケ', 健太: 'ケンタ', 悠真: 'ユウマ', 蓮: 'レン', 美咲: 'ミサキ',
  健一: 'ケンイチ', 健二: 'ケンジ', 由美: 'ユミ', 悠子: 'ユウコ', 洋子: 'ヨウコ',
  仁美: 'ヒトミ', 大地: 'ダイチ', 亮: 'リョウ', 明: 'アキラ', 誠: 'マコト',
  翔太: 'ショウタ', 拓海: 'タクミ', 剛: 'ゴウ', 美: 'ミ', 大輝: 'ダイキ',
};

export function readingFor(kanji: string, which: NameKind): string | null {
  const table = which === 'surname' ? SURNAME_READINGS : GIVEN_READINGS;
  return table[kanji] ?? null;
}
