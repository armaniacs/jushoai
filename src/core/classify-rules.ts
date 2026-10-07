import type {
  Category, Classification, FieldMeta, KanaKind, SelectOption,
} from './types';
import { stripExample } from './formatters';

export const ACCEPT_THRESHOLD = 0.6;

// Single source of truth for "rule-based classification is trustworthy enough to adopt";
// analyze.ts (LLM fallback) and detect-forms.ts (anchor selection) must not drift on this.
export const isConfident = (cls: Classification | null): cls is Classification =>
  cls !== null && cls.confidence >= ACCEPT_THRESHOLD;

export interface Item {
  meta: FieldMeta;
  cls: Classification;
}

const AUTOCOMPLETE: Record<string, Category> = {
  'family-name': 'lastName',
  'given-name': 'firstName',
  name: 'fullName',
  email: 'email',
  tel: 'tel',
  'tel-national': 'tel',
  'postal-code': 'zip',
  'address-level1': 'prefecture',
  'address-level2': 'city',
  'address-line1': 'addressFull',
  'address-line2': 'building',
  'street-address': 'addressFull',
  'bday-year': 'birthYear',
  'bday-month': 'birthMonth',
  'bday-day': 'birthDay',
};

// 学校 is claimed by the school pre-pass below, so it stays out of this list; the office
// vocabulary (会社/法人/企業/店舗/部署) must still be excluded for the new categories too.
const EXCLUDE = /company|corp|organi[sz]ation|会社|法人|部署|役職|企業|店舗/;
// Applied only to the person-name step so e.g. a user_email field stays an email.
const NAME_EXCLUDE =
  /件名|題名|商品|品名|店名|国名|ユーザー|ログイン|届け先名|担当者|名義|user|subject|title|holder|card|if different|different (from|than)|(^|[^a-z])cc([^a-z]|$)/;
const KANA = /kana|furigana|yomi|フリガナ|ふりがな|フリカナ|カナ|ひらがな|読み|セイ|メイ|せい|めい/;
const LAST = /last.?name|family.?name|surname|(^|[^a-z])l_?name|(^|[^a-z])sei([^a-z]|$)|姓|苗字|名字|セイ|せい/;
const FIRST = /first.?name|given.?name|(^|[^a-z])f_?name|(^|[^a-z])mei([^a-z]|$)|(^|[\s（(［\[「【])名($|[\s）)］\]」】*＊:：（(])|メイ|めい/;
const FULL_NAME = /氏名|お名前|名前|full.?name|your.?name|(^|[^a-z])name([^a-z]|$)/;

const norm = (s: string) => s.normalize('NFKC').toLowerCase();

// Priority-ordered dispatch table for classifyField: definition order is the
// match priority. A new field kind is one entry inserted at the right place;
// existing entries stay untouched. Module-level so no per-field allocation,
// and every matcher has a name visible in stack traces.
const BIRTH_CTX = /bday|birth|dob|生年月日|誕生/;
const ERA_CTX = /元号|年号|和暦|era|wareki|gengou/;
// 元号/年号/和暦 alone are era evidence, but romaji hits (generation, operate) and
// place names sharing era kanji (昭和区) need the ERA_CTX gate above.
const ERA_NAME = /元号|年号|和暦|令和|平成|昭和|大正|明治/;
const SCHOOL = /学校|school|univ|college|高校|大学/;
const DEPT = /学部|学科|専攻|department|major|faculty/;
const ROMAJI_CTX = /半角英数|半角|英字|英文|英語|ローマ字|romaji|alphabet|english/i;
const GENDER = /性別|せいべつ|ジェンダー|gender|sex/;
const COUNTRY = /country/i;
const ADDR_LINE = /address[_-]?([1-4])/i;
const POSTAL_CODE = /postal[-_ ]?code/i;
const OVERSEAS_CTX = /country|postal|city|state|province|region|street|building|apartment/i;
const FOREIGN_MARK = /半角英数|海外|foreign|english|alphabet/i;
// A numeric age text box (年齢を数字で入力) must not qualify: only selects
// and radio groups whose options carry decade (代) readings are decade fields.
const AGE = /年齢|年代|ねんだい|年齢層|age/;

interface DispatchCtx {
  m: FieldMeta;
  ownText: string;
  legendText: string;
  overseasCtx: string;
  isOptionField: boolean;
}

type Matcher = (ctx: DispatchCtx) => Classification | null;

interface MatcherEntry {
  name: string;
  match: Matcher;
}

// None of the dispatch entries yields a Kana category, so the module-level
// constructor needs no kanaKind (kept in classifyField's local make).
const matchAs = (category: Category, confidence: number): Classification => ({
  category,
  confidence,
  source: 'rule',
});

// The field itself (0.7) outranks a shared heading (0.65): one data row
// expands to the ordered pair, so the gradient lives in a single place.
function ownLegend(re: RegExp, category: Category): [MatcherEntry, MatcherEntry] {
  return [
    { name: `${category}-own`, match: (ctx) => (re.test(ctx.ownText) ? matchAs(category, 0.7) : null) },
    { name: `${category}-legend`, match: (ctx) => (re.test(ctx.legendText) ? matchAs(category, 0.65) : null) },
  ];
}

const hasDecadeOptions = (o: SelectOption[]) => o.some((s) => /代/.test(s.text));

// A half-width note plus a name signal means the field wants a latin name,
// even when name/id alone would read as a plain Japanese name (name_last).
// NAME_EXCLUDE (user/card/company/section words) never qualifies as a person name.
const romajiBase = (ctx: DispatchCtx): boolean =>
  ROMAJI_CTX.test(ctx.ownText) && !NAME_EXCLUDE.test(ctx.ownText);

const DISPATCH: readonly MatcherEntry[] = [
  // birth: 年/月/日 share 年月日, so month and day come first: 生年月日の月 must
  // not read as a year, and 生年月日の日 must not read as a month.
  {
    name: 'birth-month',
    match: (ctx) =>
      (BIRTH_CTX.test(ctx.ownText) || BIRTH_CTX.test(ctx.legendText)) &&
      /bday-month|(^|[^a-z])month|(^|[^\d年月日])月/.test(ctx.ownText)
        ? matchAs('birthMonth', 0.7)
        : null,
  },
  {
    name: 'birth-day',
    match: (ctx) =>
      (BIRTH_CTX.test(ctx.ownText) || BIRTH_CTX.test(ctx.legendText)) &&
      /bday-day|(^|[^a-z])day|(^|[^\d年月日])日/.test(ctx.ownText)
        ? matchAs('birthDay', 0.7)
        : null,
  },
  {
    name: 'birth-year',
    match: (ctx) =>
      (BIRTH_CTX.test(ctx.ownText) || BIRTH_CTX.test(ctx.legendText)) &&
      /bday-year|(^|[^a-z])year|(^|[^\d年月日])年/.test(ctx.ownText)
        ? matchAs('birthYear', 0.7)
        : null,
  },
  // era: context-gated kanji or an exact era word alone.
  {
    name: 'birth-era',
    match: (ctx) => {
      const eraByContext = ERA_CTX.test(`${ctx.ownText} ${ctx.legendText}`) && ERA_NAME.test(ctx.ownText);
      const eraExact =
        /^(令和|平成|昭和|大正|明治)$/.test(ctx.m.label.trim()) ||
        /^(令和|平成|昭和|大正|明治)$/.test(stripExample(ctx.m.placeholder).trim());
      return eraByContext || eraExact ? matchAs('birthEra', 0.7) : null;
    },
  },
  // school / department / gender: field itself (0.7) outranks a shared heading (0.65).
  ...ownLegend(SCHOOL, 'school'),
  ...ownLegend(DEPT, 'department'),
  ...ownLegend(GENDER, 'gender'),
  // Overseas address fields are named explicitly (country, address_1..4,
  // postal_code), so they classify without sibling refinement. 国名 alone
  // stays unclassified: on domestic forms it is ambiguous with person names.
  // Bare address1/address2 keep their domestic readings (addressFull/building):
  // the overseas reading needs an overseas context (city/state/street words
  // or a half-width note) in the field or its heading.
  ...ownLegend(COUNTRY, 'country'),
  {
    name: 'address-line-own',
    match: (ctx) => {
      const addrLine = ctx.ownText.match(ADDR_LINE);
      return addrLine && OVERSEAS_CTX.test(ctx.overseasCtx)
        ? matchAs(`address${addrLine[1]}` as Category, 0.7)
        : null;
    },
  },
  {
    name: 'address-line-legend',
    match: (ctx) => {
      const addrLegend = ctx.legendText.match(ADDR_LINE);
      return addrLegend && OVERSEAS_CTX.test(ctx.overseasCtx)
        ? matchAs(`address${addrLegend[1]}` as Category, 0.65)
        : null;
    },
  },
  {
    name: 'postal-code-own',
    match: (ctx) =>
      POSTAL_CODE.test(ctx.ownText) && FOREIGN_MARK.test(ctx.ownText) ? matchAs('postalCode', 0.7) : null,
  },
  {
    name: 'postal-code-legend',
    match: (ctx) =>
      POSTAL_CODE.test(ctx.legendText) && FOREIGN_MARK.test(ctx.overseasCtx)
        ? matchAs('postalCode', 0.65)
        : null,
  },
  // age: option fields with decade readings only.
  {
    name: 'age-decade-own',
    match: (ctx) =>
      AGE.test(ctx.ownText) && ctx.isOptionField && hasDecadeOptions(ctx.m.options)
        ? matchAs('ageDecade', 0.7)
        : null,
  },
  {
    name: 'age-decade-legend',
    match: (ctx) =>
      AGE.test(ctx.legendText) && ctx.isOptionField && hasDecadeOptions(ctx.m.options)
        ? matchAs('ageDecade', 0.65)
        : null,
  },
  {
    name: 'romaji-full-name',
    match: (ctx) =>
      romajiBase(ctx) && FULL_NAME.test(ctx.ownText) ? matchAs('fullNameRomaji', 0.7) : null,
  },
  {
    name: 'romaji-last-name',
    match: (ctx) =>
      romajiBase(ctx) && LAST.test(ctx.ownText) && !FIRST.test(ctx.ownText)
        ? matchAs('lastNameRomaji', 0.7)
        : null,
  },
  {
    name: 'romaji-first-name',
    match: (ctx) =>
      romajiBase(ctx) && FIRST.test(ctx.ownText) && !LAST.test(ctx.ownText)
        ? matchAs('firstNameRomaji', 0.7)
        : null,
  },
  {
    name: 'romaji-either-name',
    match: (ctx) =>
      romajiBase(ctx) && (LAST.test(ctx.ownText) || FIRST.test(ctx.ownText))
        ? matchAs('fullNameRomaji', 0.7)
        : null,
  },
];

function classifyText(raw: string, kana: boolean, bareKana: boolean): Category | null {
  const t = norm(raw);
  if (!t.trim() || EXCLUDE.test(t)) return null;
  if (/e-?mail|メール/.test(t)) return 'email';
  if (/(^|[^a-z])tel|phone|mobile|電話|携帯/.test(t)) return 'tel';
  if (/zip|postal|post.?code|郵便|〒/.test(t)) return 'zip';
  if (/prefecture|(^|[^a-z])pref([^a-z]|$)|都道府県/.test(t)) return 'prefecture';
  if (/building|bldg|建物|マンション|アパート|ビル名|部屋|号室|address.?(line)?.?2|addr.?2|住所.?2/.test(t)) {
    return 'building';
  }
  if (/(市区町村|市町村).*(番地|丁目)/.test(t)) return 'addressNoPref';
  if (/(^|[^a-z])city|municipal|市区町村|市町村|市区郡/.test(t)) return 'city';
  if (/street|番地|丁目|町名/.test(t)) return 'street';
  if (NAME_EXCLUDE.test(t)) return null;
  const last = LAST.test(t);
  const first = FIRST.test(t);
  if (last && !first) return kana ? 'lastNameKana' : 'lastName';
  if (first && !last) return kana ? 'firstNameKana' : 'firstName';
  if (last || first || FULL_NAME.test(t) || (kana && (bareKana || KANA.test(t)))) return kana ? 'fullNameKana' : 'fullName';
  if (/address|住所|addr/.test(t)) return 'addressFull';
  return null;
}

// Decodes the literal \uXXXX escapes an HTML pattern attribute holds as text; only
// the regex engine interprets them, so kana-range checks on the raw string see none.
const decodePattern = (p: string) =>
  p.replace(/\\u([0-9a-fA-F]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));

// True when the field asks for kana rather than kanji: a kana-only placeholder,
// kana vocabulary in name/id/label/legend, or a kana-only pattern. A kanji or
// latin placeholder means the field wants a plain name, whatever the heading says.
export function wantsKana(m: FieldMeta): boolean {
  const ph = stripExample(norm(m.placeholder));
  if (ph !== '' && /[一-龠a-z]/.test(ph)) return false;
  if (ph !== '' && /^[ァ-ヶぁ-ゖー\s　]+$/.test(ph)) return true;
  if (KANA.test(norm([m.name, m.htmlId, m.label, m.nearby].join(' ')))) return true;
  const pat = decodePattern(m.pattern);
  return /[ぁ-ゖァ-ヶ]/.test(pat) || /[ｦ-ﾟ]/.test(pat);
}

// True when the field itself claims kana through placeholder, name/id/label, or pattern —
// evidence that belongs to this field, unlike a legend shared with sibling rows.
export function wantsKanaOwnMeta(m: FieldMeta): boolean {
  const ph = stripExample(norm(m.placeholder));
  if (ph !== '' && /^[ァ-ヶぁ-ゖー\s　]+$/.test(ph)) return true;
  if (KANA.test(norm([m.name, m.htmlId, m.label].join(' ')))) return true;
  const pat = decodePattern(m.pattern);
  return /[ぁ-ゖァ-ヶ]/.test(pat) || /[ｦ-ﾟ]/.test(pat);
}

export function detectKanaKind(m: FieldMeta): KanaKind {
  const ph = stripExample(m.placeholder);
  if (/^[ｦ-ﾟ\s]+$/.test(ph)) return 'halfKatakana';
  if (/^[ぁ-ゖー\s　]+$/.test(ph)) return 'hiragana';
  if (/^[ァ-ヶー\s　]+$/.test(ph)) return 'katakana';
  const pat = decodePattern(m.pattern);
  if (/[ｦ-ﾟ]/.test(pat)) return 'halfKatakana';
  if (/ぁ|ぃ|ん/.test(pat)) return 'hiragana';
  if (/ァ|ア|ン/.test(pat)) return 'katakana';
  const text = [m.label, m.nearby, m.placeholder].join(' ');
  if (/半角カナ|半角カタカナ|ﾊﾝｶｸ/.test(text)) return 'halfKatakana';
  if (/カタカナ/.test(text)) return 'katakana';
  if (/ひらがな|ふりがな/.test(text)) return 'hiragana';
  return 'katakana';
}

export function classifyField(m: FieldMeta): Classification | null {
  const ac = m.autocomplete.trim().toLowerCase().split(/\s+/).pop() ?? '';
  const kanaKind = detectKanaKind(m);
  const make = (category: Category, confidence: number): Classification => ({
    category,
    confidence,
    source: 'rule',
    ...(category.endsWith('Kana') ? { kanaKind } : {}),
  });

  if (AUTOCOMPLETE[ac]) return make(AUTOCOMPLETE[ac], 0.95);
  if (m.type === 'email') return make('email', 0.9);

  // Birth/school/department signals are field-level: a legend like 生年月日 qualifies
  // 年/月/日 words found on the field itself, and era/school words stand alone.
  const ownText = norm([m.name, m.htmlId, m.label, m.placeholder].join(' '));
  const legendText = norm(m.nearby);
  const officeField = EXCLUDE.test(ownText);

  const ownTrimmed = ownText.trim();
  // A field that is only the birth phrase itself (a single full-date field) must not
  // receive a partial year/month/day value.
  if (/^(ご|御)?(誕生日|生年月日|誕生年月日)$/.test(ownTrimmed) || /^(birthday|date of birth)$/.test(ownTrimmed)) {
    return null;
  }

  if (!officeField) {
    const ctx: DispatchCtx = {
      m,
      ownText,
      legendText,
      overseasCtx: `${ownText} ${legendText}`,
      isOptionField: m.tag === 'select' || m.tag === 'radio',
    };
    for (const { match } of DISPATCH) {
      const hit = match(ctx);
      if (hit) return hit;
    }
  }

  const ph = stripExample(norm(m.placeholder));
  const placeholderIsKana = ph !== '' && /^[ァ-ヶぁ-ゖー\s　]+$/.test(ph);
  // A kanji or latin placeholder (山田) means the field wants a plain name even if a shared heading says フリガナ.
  const placeholderIsPlain = ph !== '' && /[一-龠a-z]/.test(ph);
  const own = norm([m.name, m.htmlId, m.label, m.placeholder].join(' '));
  // The heading counts only when it is the source that produced the category.
  const kanaFor = (heading: string) =>
    placeholderIsKana || (!placeholderIsPlain && KANA.test(`${own} ${norm(heading)}`));

  // Only the label/placeholder source may infer kana from the placeholder alone; name/id and
  // heading text need their own kana signal.
  const sources: [string, number, boolean][] = [
    [`${m.name} ${m.htmlId}`, 0.8, false],
    [`${m.label} ${m.placeholder}`, 0.7, true],
    [m.nearby, 0.65, false],
  ];
  for (const [text, confidence, bare] of sources) {
    const category = classifyText(text, kanaFor(text === m.nearby ? m.nearby : ''), bare);
    if (category) return make(category, confidence);
  }
  if (m.type === 'tel') return make('tel', 0.5);
  return null;
}

export function refineClassifications(items: Item[]): Item[] {
  const out = items.map((i) => ({ meta: i.meta, cls: { ...i.cls } }));
  const indices = (c: Category) =>
    out.flatMap((it, i) => (it.cls.category === c ? [i] : []));
  const retag = (idx: number[], cats: Category[]) =>
    idx.forEach((i, n) => {
      const target = out[i];
      const cat = cats[n];
      if (target && cat) target.cls.category = cat;
    });

  const dropped = new Set<number>();
  // Fields only split when they share label and heading; otherwise they may belong to
  // different people or address blocks (e.g. orderer vs. recipient). Oversized ambiguous
  // groups are dropped instead of being filled with fragments of one value.
  const splitGroups = (cat: Category, cats: Category[]) => {
    const groups = new Map<string, number[]>();
    for (const i of indices(cat)) {
      const meta = out[i]!.meta;
      const key = `${meta.label}\u0000${meta.nearby}`;
      groups.set(key, [...(groups.get(key) ?? []), i]);
    }
    for (const idx of groups.values()) {
      if (idx.length === cats.length) retag(idx, cats);
      else if (idx.length > cats.length) idx.forEach((i) => dropped.add(i));
    }
  };
  splitGroups('tel', ['tel1', 'tel2', 'tel3']);
  splitGroups('zip', ['zip1', 'zip2']);
  splitGroups('fullName', ['lastName', 'firstName']);
  splitGroups('fullNameKana', ['lastNameKana', 'firstNameKana']);

  // Split parts whose labels spell the part out (市外局番/市内局番/加入者番号,
  // 上3桁/下4桁): they share a heading but not a label, so the pass above never
  // groups them. Only consecutive fields under one heading whose labels arrive in
  // part order qualify; anything else keeps the current unsplit protection.
  const TEL_PARTS = [/市外/, /市内/, /加入者/];
  const ZIP_PARTS = [/上.{0,2}3桁/, /下.{0,2}4桁/];
  const partRank = (label: string, parts: RegExp[]): number => {
    const t = norm(label);
    for (let i = 0; i < parts.length; i++) {
      if (parts[i]!.test(t)) return i;
    }
    return -1;
  };
  const splitGroupsByPart = (cat: Category, cats: Category[], parts: RegExp[]) => {
    const groups = new Map<string, number[]>();
    for (const i of indices(cat)) {
      const nearby = out[i]!.meta.nearby;
      groups.set(nearby, [...(groups.get(nearby) ?? []), i]);
    }
    for (const idx of groups.values()) {
      if (idx.length !== cats.length) continue;
      if (!idx.every((v, k) => k === 0 || v === idx[k - 1]! + 1)) continue;
      if (!idx.every((v, k) => partRank(out[v]!.meta.label, parts) === k)) continue;
      retag(idx, cats);
    }
  };
  splitGroupsByPart('tel', ['tel1', 'tel2', 'tel3'], TEL_PARTS);
  splitGroupsByPart('zip', ['zip1', 'zip2'], ZIP_PARTS);

  const hasCity = out.some((it) => it.cls.category === 'city');
  const hasPref = out.some((it) => it.cls.category === 'prefecture');
  for (const it of out) {
    if (it.cls.category !== 'addressFull') continue;
    if (hasCity) it.cls.category = 'street';
    else if (hasPref) it.cls.category = 'addressNoPref';
  }
  return out.filter((_, i) => !dropped.has(i));
}
