// Local zip dictionary (PBI-125): a terminal-only seed of postal-code prefixes
// to { prefecture, city }. No network, no LLM — a deterministic lookup. The
// seed is designed to grow: the full Japan Post ken_all dataset swaps in here
// (a generated table, same shape) without touching the lookup or the planner.
// Unknown prefixes return null, and the row keeps the plain warn-no-value
// warning (BDD: 候補不一致・辞書なし時は従来通り警告で止まり注入しない).

export interface ZipAssist {
  prefecture: string;
  city: string;
}

interface PrefixRange {
  lo: string;
  hi: string;
  prefecture: string;
  city: string;
}

// Highest-confidence seed: Tokyo 23 ward cores, the verified Tama cities, and
// a few major city centers. Ranges are inclusive on the 3-digit prefix.
const PREFIX_RANGES: PrefixRange[] = [
  ...range('100', '102', '東京都', '千代田区'),
  ...range('103', '104', '東京都', '中央区'),
  ...range('105', '108', '東京都', '港区'),
  ...range('110', '111', '東京都', '台東区'),
  ...range('112', '113', '東京都', '文京区'),
  ...range('114', '115', '東京都', '北区'),
  ...range('116', '116', '東京都', '荒川区'),
  ...range('120', '121', '東京都', '足立区'),
  ...range('124', '125', '東京都', '葛飾区'),
  ...range('130', '131', '東京都', '墨田区'),
  ...range('132', '132', '東京都', '江東区'),
  ...range('134', '134', '東京都', '江戸川区'),
  ...range('135', '136', '東京都', '江東区'),
  ...range('140', '140', '東京都', '品川区'),
  ...range('141', '141', '東京都', '目黒区'),
  ...range('143', '146', '東京都', '大田区'),
  ...range('150', '151', '東京都', '渋谷区'),
  ...range('154', '158', '東京都', '世田谷区'),
  ...range('160', '162', '東京都', '新宿区'),
  ...range('164', '165', '東京都', '中野区'),
  ...range('166', '168', '東京都', '杉並区'),
  ...range('170', '171', '東京都', '豊島区'),
  ...range('173', '174', '東京都', '板橋区'),
  ...range('176', '178', '東京都', '練馬区'),
  ...range('180', '180', '東京都', '武蔵野市'),
  ...range('181', '181', '東京都', '三鷹市'),
  ...range('182', '182', '東京都', '調布市'),
  ...range('183', '183', '東京都', '府中市'),
  ...range('184', '184', '東京都', '小金井市'),
  ...range('185', '185', '東京都', '国分寺市'),
  ...range('186', '186', '東京都', '国立市'),
  ...range('187', '188', '東京都', '西東京市'),
  ...range('190', '190', '東京都', '立川市'),
  ...range('191', '191', '東京都', '日野市'),
  ...range('192', '193', '東京都', '八王子市'),
  ...range('194', '194', '東京都', '町田市'),
  ...range('196', '196', '東京都', '昭島市'),
  ...range('198', '198', '東京都', '青梅市'),
  ...range('530', '531', '大阪府', '大阪市北区'),
  ...range('540', '542', '大阪府', '大阪市中央区'),
  ...range('552', '552', '大阪府', '大阪市港区'),
  ...range('553', '553', '大阪府', '大阪市福島区'),
  ...range('556', '556', '大阪府', '大阪市浪速区'),
  ...range('460', '460', '愛知県', '名古屋市中区'),
  ...range('220', '220', '神奈川県', '横浜市西区'),
  ...range('231', '231', '神奈川県', '横浜市中区'),
  ...range('060', '060', '北海道', '札幌市中央区'),
  ...range('650', '650', '兵庫県', '神戸市中央区'),
];

function range(lo: string, hi: string, prefecture: string, city: string): PrefixRange[] {
  return [{ lo, hi, prefecture, city }];
}

// Hyphen-insensitive: the lookup strips the separator before reading the
// prefix, so both 100-0001 and 1000001 resolve the same way.
export function zipAssistFor(zip: string): ZipAssist | null {
  const digits = zip.replace(/[^0-9]/g, '');
  if (digits.length < 3) return null;
  const prefix = digits.slice(0, 3);
  for (const r of PREFIX_RANGES) {
    if (r.lo <= prefix && prefix <= r.hi) return { prefecture: r.prefecture, city: r.city };
  }
  return null;
}
