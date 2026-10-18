import type {
  Category, Classification, FieldMeta, Item, SelectOption,
} from './types';
import { stripExample } from './formatters';
import { matchFieldOwned, matchLegend, wantsKana } from './kana';
import { norm } from './literals';

export const ACCEPT_THRESHOLD = 0.6;

// Single source of truth for "rule-based classification is trustworthy enough to adopt";
// analyze.ts (LLM fallback) and detect-forms.ts (anchor selection) must not drift on this.
export const isConfident = (cls: Classification | null): cls is Classification =>
  cls !== null && cls.confidence >= ACCEPT_THRESHOLD;

// A Map lookup stays on own entries: a plain-object subscript walks the prototype
// chain, so a page-set autocomplete="constructor" (or "__proto__") resolved an
// inherited function as a truthy category and crashed the classification run.
const AUTOCOMPLETE = new Map<string, Category>([
  ['family-name', 'lastName'],
  ['given-name', 'firstName'],
  ['name', 'fullName'],
  ['email', 'email'],
  ['tel', 'tel'],
  ['tel-national', 'tel'],
  ['postal-code', 'zip'],
  ['address-level1', 'prefecture'],
  ['address-level2', 'city'],
  ['address-line1', 'addressFull'],
  ['address-line2', 'building'],
  ['street-address', 'addressFull'],
  ['bday-year', 'birthYear'],
  ['bday-month', 'birthMonth'],
  ['bday-day', 'birthDay'],
]);

// 学校 is claimed by the school pre-pass below, so it stays out of this list; the office
// vocabulary (会社/法人/企業/店舗/部署) must still be excluded for the new categories too.
const EXCLUDE = /company|corp|organi[sz]ation|会社|法人|部署|役職|企業|店舗/;
// Applied only to the person-name step so e.g. a user_email field stays an email.
const NAME_EXCLUDE =
  /件名|題名|商品|品名|店名|国名|ユーザー|ログイン|届け先名|担当者|名義|user|subject|title|holder|card|if different|different (from|than)|(^|[^a-z])cc([^a-z]|$)/;
const LAST = /last.?name|family.?name|surname|(^|[^a-z])l_?name|(^|[^a-z])sei([^a-z]|$)|姓|苗字|名字|セイ|せい/;
const FIRST = /first.?name|given.?name|(^|[^a-z])f_?name|(^|[^a-z])mei([^a-z]|$)|(^|[\s（(［\[「【])名($|[\s）)］\]」】*＊:：（(])|メイ|めい/;
const FULL_NAME = /氏名|お名前|名前|full.?name|your.?name|(^|[^a-z])name([^a-z]|$)/;

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
const GENDER = /性別|せいべつ|ジェンダー|gender|(^|[^a-z])sex([^a-z]|$)/;
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
// extra gates both sides (e.g. decade options); legendExtra overrides the
// legend side when its evidence lives elsewhere (e.g. FOREIGN_MARK may sit
// in the field or its heading, so the legend side reads overseasCtx).
function ownLegend(
  re: RegExp,
  category: Category,
  extra?: (ctx: DispatchCtx) => boolean,
  legendExtra?: (ctx: DispatchCtx) => boolean,
): [MatcherEntry, MatcherEntry] {
  const legendGate = legendExtra ?? extra;
  return [
    { name: `${category}-own`, match: (ctx) => (re.test(ctx.ownText) && (!extra || extra(ctx)) ? matchAs(category, 0.7) : null) },
    { name: `${category}-legend`, match: (ctx) => (re.test(ctx.legendText) && (!legendGate || legendGate(ctx)) ? matchAs(category, 0.65) : null) },
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
  // postal-code: half-width/foreign note gates both sides; the legend side
  // reads the combined field+heading context.
  ...ownLegend(
    POSTAL_CODE,
    'postalCode',
    (ctx) => FOREIGN_MARK.test(ctx.ownText),
    (ctx) => FOREIGN_MARK.test(ctx.overseasCtx),
  ),
  // age: option fields with decade readings only.
  ...ownLegend(AGE, 'ageDecade', (ctx) => ctx.isOptionField && hasDecadeOptions(ctx.m.options)),
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

// Kana-blind name step: returns plain name bases only. Whether a base wants kana
// is decided once in kana.ts (resolveKana), which also owns wantsKana — the gate
// below keeps the old null-vs-fullName distinction (a kanji/latin placeholder
// still beats a bare kana signal) without re-implementing the kana decision here.
// wantsKanaField is a per-field memoized thunk: the three text sources share one
// lazy evaluation so a kana-worded field pays the kana regexes at most once.
// kanaTest is the vocabulary query for the source at hand: field-owned strings
// use the full set, the shared legend the narrower one.
// normalized is the caller's NFKC view (built once per field before the sources
// loop): classifyText never normalizes itself, so the same raw string is normed
// exactly once per field and kanaTest keeps its normalized-input contract.
function classifyText(
  normalized: string,
  bareKana: boolean,
  wantsKanaField: () => boolean,
  kanaTest: (normalized: string) => boolean,
): Category | null {
  const t = normalized;
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
  if (last && !first) return 'lastName';
  if (first && !last) return 'firstName';
  if (last || first || FULL_NAME.test(t) || ((bareKana || kanaTest(t)) && wantsKanaField())) return 'fullName';
  if (/address|住所|addr/.test(t)) return 'addressFull';
  return null;
}

/**
 * 欄単体から素名のみを返す（カナ帰属は解決せず `resolveKana` が行う）。単体直呼びの結果を planner に渡さず `classifyAll` 経由で使うこと。
 */
export function classifyField(m: FieldMeta): Classification | null {
  const ac = m.autocomplete.trim().toLowerCase().split(/\s+/).pop() ?? '';
  const make = (category: Category, confidence: number): Classification => ({
    category,
    confidence,
    source: 'rule',
  });

  const acCategory = AUTOCOMPLETE.get(ac);
  if (acCategory) return make(acCategory, 0.95);
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

  // Only the label/placeholder source may infer a name from the placeholder alone;
  // name/id and heading text need their own name signal. Kana attribution is not
  // decided here (see kana.ts resolveKana): the bare flag only widens the base.
  // The kana gate is lazy and memoized per field, so text sources that never
  // reach the kana branch still pay nothing. Each view below is one norm call:
  // the sources loop and wantsKana share them instead of re-normalizing the
  // same raw string (nearby doubles as the dispatch legendText).
  const normNameId = norm(`${m.name} ${m.htmlId}`);
  const normLabelPlaceholder = norm(`${m.label} ${m.placeholder}`);
  const normPlaceholder = norm(m.placeholder);
  const normNameIdLabel = norm([m.name, m.htmlId, m.label].join(' '));
  let kanaWant: boolean | undefined;
  const wantsKanaField = (): boolean =>
    (kanaWant ??= wantsKana(m, {
      placeholder: normPlaceholder,
      nameIdLabel: normNameIdLabel,
      nearby: legendText,
    }));
  const sources: [string, number, boolean, (normalized: string) => boolean][] = [
    [normNameId, 0.8, false, matchFieldOwned],
    [normLabelPlaceholder, 0.7, true, matchFieldOwned],
    [legendText, 0.65, false, matchLegend],
  ];
  for (const [normalized, confidence, bare, kanaTest] of sources) {
    const category = classifyText(normalized, bare, wantsKanaField, kanaTest);
    if (category) return make(category, confidence);
  }
  if (m.type === 'tel') return make('tel', 0.5);
  return null;
}

export interface SplitDrop {
  fieldId: string;
  from: Category;
  reason: 'oversized-group';
}

// Split policies, one table: adding a split kind is one row (source category,
// targets, grouping), not a new wrapper. Label grouping splits fields sharing
// label and heading by exact size; part-order grouping splits fields sharing
// only a heading by consecutiveness and part-order labels.
type SplitGrouping = 'label' | 'partOrder';

interface SplitPolicy {
  from: Category;
  to: Category[];
  grouping: SplitGrouping;
  parts?: RegExp[];
}

const TEL_PARTS = [/市外/, /市内/, /加入者/];
const ZIP_PARTS = [/上.{0,2}3桁/, /下.{0,2}4桁/];

const SPLIT_POLICIES: SplitPolicy[] = [
  { from: 'tel', to: ['tel1', 'tel2', 'tel3'], grouping: 'label' },
  { from: 'zip', to: ['zip1', 'zip2'], grouping: 'label' },
  { from: 'fullName', to: ['lastName', 'firstName'], grouping: 'label' },
  { from: 'fullNameKana', to: ['lastNameKana', 'firstNameKana'], grouping: 'label' },
  { from: 'tel', to: ['tel1', 'tel2', 'tel3'], grouping: 'partOrder', parts: TEL_PARTS },
  { from: 'zip', to: ['zip1', 'zip2'], grouping: 'partOrder', parts: ZIP_PARTS },
];

export function refineWithDrops(items: Item[]): { items: Item[]; dropped: SplitDrop[] } {
  const out = items.map((i) => ({ meta: i.meta, cls: { ...i.cls } }));
  // outはmapで作ったdenseな実体配列であり、indices()産の添字は常に有効。
  // 個別の!ではなくこのat()に集約してundefinedを一箇所で narrowing する。
  const at = (i: number): Item => {
    const it = out[i];
    if (!it) throw new Error(`refineWithDrops: out-of-range index ${i}`);
    return it;
  };
  const indices = (c: Category) =>
    out.flatMap((it, i) => (it.cls.category === c ? [i] : []));
  const retag = (idx: number[], cats: Category[]) =>
    idx.forEach((i, n) => {
      const target = out[i];
      const cat = cats[n];
      if (target && cat) target.cls.category = cat;
    });

  const dropped: SplitDrop[] = [];
  // Fields only split when they share label and heading; otherwise they may belong to
  // different people or address blocks (e.g. orderer vs. recipient). Oversized ambiguous
  // groups are dropped instead of being filled with fragments of one value, and each
  // drop carries its reason so callers can trace why a field vanished.
  const splitBy = (
    cat: Category,
    cats: Category[],
    key: (meta: FieldMeta) => string,
    accept: (idx: number[], size: number) => boolean,
    dropOversize: boolean,
  ) => {
    const groups = new Map<string, number[]>();
    for (const i of indices(cat)) {
      const k = key(at(i).meta);
      groups.set(k, [...(groups.get(k) ?? []), i]);
    }
    for (const idx of groups.values()) {
      if (accept(idx, cats.length)) retag(idx, cats);
      else if (dropOversize && idx.length > cats.length) {
        for (const i of idx) dropped.push({ fieldId: at(i).meta.id, from: cat, reason: 'oversized-group' });
      }
    }
  };
  const exactSize = (idx: number[], size: number): boolean => idx.length === size;
  const sameLabel = (meta: FieldMeta): string => `${meta.label}\u0000${meta.nearby}`;
  // Only consecutive fields under one heading whose labels arrive in part order
  // qualify; anything else keeps the current unsplit protection.
  const partRank = (label: string, parts: RegExp[]): number => {
    const t = norm(label);
    for (const [i, re] of parts.entries()) {
      if (re.test(t)) return i;
    }
    return -1;
  };
  const inPartOrder = (parts: RegExp[]) => (idx: number[], size: number): boolean => {
    if (idx.length !== size) return false;
    const first = idx[0];
    if (first === undefined) return size === 0;
    return (
      idx.every((v, k) => v === first + k) &&
      idx.every((v, k) => partRank(at(v).meta.label, parts) === k)
    );
  };
  for (const policy of SPLIT_POLICIES) {
    if (policy.grouping === 'label') {
      splitBy(policy.from, policy.to, sameLabel, exactSize, true);
    } else {
      splitBy(policy.from, policy.to, (meta) => meta.nearby, inPartOrder(policy.parts ?? []), false);
    }
  }

  // PBI-09: exact不一致で残った同ラベル系tel/zip群は、plannerが欄ごとに
  // 完全値を複製しないようunknown化する。単独欄・正常分割済み・droppedは対象外。
  // 空キー群（label・nearbyとも空）もunknown化する：ブロック帰属を判定できず、
  // 複製注入（誤注入）と不注入（手入力）の二択では後者を選ぶのが本プロジェクトの
  // 方針のため。tests/core/classify-rules.test.ts の空キー回帰で固定。
  const droppedIds = new Set(dropped.map((d) => d.fieldId));
  for (const leftover of ['tel', 'zip'] as const) {
    const groups = new Map<string, number[]>();
    out.forEach((it, i) => {
      if (it.cls.category !== leftover || droppedIds.has(it.meta.id)) return;
      const k = sameLabel(it.meta);
      groups.set(k, [...(groups.get(k) ?? []), i]);
    });
    for (const idx of groups.values()) {
      if (idx.length >= 2) {
        for (const i of idx) {
          const it = out[i];
          if (it) it.cls.category = 'unknown';
        }
      }
    }
  }

  // PBI-12: 住所絞り込みはnearby単位（ブロック単位）で判定する。全体判定だと
  // 別ブロックのprefecture/cityを理由に届け先addressFullがstreet化されるため。
  // nearbyが空の欄はすべて同一スコープに畳まれる（単一ブロック挙動は不変・回帰済み）。
  // 見出しを持たない複数ブロックでは従来の全体判定と等価になる制限がある。
  const scopeOf = new Map<string, { hasCity: boolean; hasPref: boolean }>();
  for (const it of out) {
    const g = scopeOf.get(it.meta.nearby) ?? { hasCity: false, hasPref: false };
    if (it.cls.category === 'city') g.hasCity = true;
    if (it.cls.category === 'prefecture') g.hasPref = true;
    scopeOf.set(it.meta.nearby, g);
  }
  for (const it of out) {
    if (it.cls.category !== 'addressFull') continue;
    const g = scopeOf.get(it.meta.nearby);
    if (g?.hasCity) it.cls.category = 'street';
    else if (g?.hasPref) it.cls.category = 'addressNoPref';
  }
  const keptIds = new Set(out.map((it) => it.meta.id));
  for (const d of dropped) keptIds.delete(d.fieldId);
  return { items: out.filter((it) => keptIds.has(it.meta.id)), dropped };
}

export function refineClassifications(items: Item[]): Item[] {
  return refineWithDrops(items).items;
}
