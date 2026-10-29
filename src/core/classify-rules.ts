import type {
  Category, Classification, FieldMeta, Item, SelectOption,
} from './types';
import { stripExample } from './formatters';
import { kanaNormFromViews, matchFieldOwned, matchLegend, resolveKana, wantsKana } from './kana';
import { buildFieldNormViews, norm } from './literals';
import { applyEnglishPage } from './page-language';

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
  // PBI-118: a full-birthdate token (type=date, or a single-input field) is the
  // whole date in one box, so it maps to the single birthday category.
  ['bday', 'birthday'],
  // PBI-119: the page itself declares the field as an organization name, so the
  // token outranks the EXCLUDE gate on 会社語 labels.
  ['organization', 'company'],
]);

// 学校 is claimed by the school pre-pass below, so it stays out of this list; the office
// vocabulary (会社/法人/企業/店舗/部署) stays excluded except for the two new
// categories (PBI-119): officeEligible passes 会社名/法人・団体名/部署 alone through
// company/companyDepartment.
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
// PBI-118: 誕生日語そのもの（label 単体）の anchored 完全一致。お も接頭辞の
// 許可リストに含める（お誕生日 → birthDay への誤落ち防止）。英語欄は Birthday /
// Date of Birth を受ける。
const BIRTH_PHRASE = /^(ご|御|お)?(誕生日|生年月日|誕生年月日)$/;
const BIRTH_PHRASE_EN = /^(birthday|date of birth)$/;
const isBirthPhrase = (view: string): boolean =>
  BIRTH_PHRASE.test(view) || BIRTH_PHRASE_EN.test(view);
const ERA_CTX = /元号|年号|和暦|era|wareki|gengou/;
// 元号/年号/和暦 alone are era evidence, but romaji hits (generation, operate) and
// place names sharing era kanji (昭和区) need the ERA_CTX gate above.
const ERA_NAME = /元号|年号|和暦|令和|平成|昭和|大正|明治/;
const SCHOOL = /学校|school|univ|college|高校|大学/;
const DEPT = /学部|学科|専攻|department|major|faculty/;
// PBI-119: 会社語の欄は company/companyDepartment だけ EXCLUDE から通す（緩和境界）。
// カナ文脈（会社名（フリガナ））と誕生文脈（会社の生年月日）は誤注入の恐れが
// あるため緩和対象外で、従来どおり EXCLUDE のまま。役職・店舗・法人種別など
// 他の office 語も緩和しない。officeField ゲートと DISPATCH の extra gate が
// この一箇所の条件を共有する。応募/申込 の団体名（応募団体名・申込団体名）は
// 応募者側の団体で、会社プロファイルの注入先ではないため否定文脈で除外する
// （officeEligible と同型の除外を COMPANY_OFFICE 自身に持たせる）。
const COMPANY_OFFICE = /(?:会社|法人)名|(?:(?<!応募)(?<!申込)団体名)|社名/;
const DEPT_OFFICE = /部署(?!名)/;
const KANA_NOTE = /カナ|フリガナ|かな|kana/i;
const officeEligible = (own: string): boolean =>
  !KANA_NOTE.test(own) && !BIRTH_CTX.test(own) && (COMPANY_OFFICE.test(own) || DEPT_OFFICE.test(own));
// PBI-119 + レビュー指摘: legend 側の gate。旧 legend gate（officeEligible）は
// 欄自身の office 語一致を要求したため、「ご記入ください + 共有見出し会社名」の
// ような shared heading ケースが到達不能だった（own 語が一致すれば own entry
// 0.7 が既に返る）。ここでは欄自身の文言一致を要求せず、カナ文脈・誕生文脈の
// 除外だけを課す。ただし own 語が一致する欄では legend に流さない（own matcher
// 0.7 が DispatchCtx の定義順で先に返る順序の維持 + !COMPANY_OFFICE/!DEPT_OFFICE
// が「部署欄 + 共有見出し会社名」を company-legend 0.65 で採用する交差ケースを
// 遮る）。
// WHY 複合ラベル（会社名・部署名）の分解はしない: 「会社名・部署名」のような
// 複合欄はどちらにも解釈でき、誤注入より不注入が安全なため officeField が
// EXCLUDE で落とす従来動作を維持する。
const officeLegendEligible = (own: string): boolean =>
  !KANA_NOTE.test(own) && !BIRTH_CTX.test(own)
  && !COMPANY_OFFICE.test(own) && !DEPT_OFFICE.test(own);
// PBI-160: 会社名フリガナの連言（会社・法人系語彙 AND カナ注記）。company
// エントリの COMPANY_OFFICE に厳密に従い（応募/申込の団体名除外を含む）、
// カナ側は KANA_NOTE と同型の注記集合（フリガナはカナを部分文字列に含まない
// ため明示する）。norm が全角括弧を半角化するため括弧の存続には依存せず、
// 語の共起だけを見る（会社名（フリガナ）・会社名(フリガナ)のいずれも一致する）。
const COMPANY_KANA =
  /(?=.*(?:(?:会社|法人)名|(?:(?<!応募)(?<!申込)団体名)|社名))(?=.*(?:フリガナ|カナ|かな|kana))/;
// PBI-160: 会社名フリガナの緩和境界。own 側は欄自身、legend 側は共有見出しが
// 連言を持つときに開く（th 見出し「会社名（フリガナ）」の company_kana 欄は
// own に和語がなく legend 経由で到達する）。誕生文脈は両側とも除外。
// name のみ（company_kana・ラベルなし）は両方とも連言を持たないため
// unknown のまま（誤注入より不注入）。
const officeKanaEligible = (own: string, legend: string): boolean =>
  !BIRTH_CTX.test(`${own} ${legend}`) && (COMPANY_KANA.test(own) || COMPANY_KANA.test(legend));
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
  // PBI-119: 会社名・会社部署は school/department と同一の単独欄パターン
  // （field 自身 0.7 が shared heading 0.65 に勝る）。own 側の緩和境界は
  // officeEligible、legend 側は officeLegendEligible（欄自身の office 語一致を
  // 要求せず、own 語がある欄は legend に流さない）が一箇所で持つ。
  // PBI-160: 会社名フリガナは terminal カテゴリ（resolveKana の帰属変換を通さず
  // classifyField が直接返す）。own 側は欄自身の連言、legend 側は共有見出しの
  // 連言で開く。legend 側は own に会社語がある欄（漢字の会社名欄）には流さない
  // （officeLegendEligible と同型の交差遮断）。誕生文脈は両側で除外する。
  ...ownLegend(
    COMPANY_KANA,
    'companyNameKana',
    (ctx) => !BIRTH_CTX.test(ctx.ownText),
    (ctx) =>
      !BIRTH_CTX.test(`${ctx.ownText} ${ctx.legendText}`)
      && !COMPANY_OFFICE.test(ctx.ownText) && !DEPT_OFFICE.test(ctx.ownText),
  ),
  ...ownLegend(
    COMPANY_OFFICE,
    'company',
    (ctx) => officeEligible(ctx.ownText),
    (ctx) => officeLegendEligible(ctx.ownText),
  ),
  ...ownLegend(
    DEPT_OFFICE,
    'companyDepartment',
    (ctx) => officeEligible(ctx.ownText),
    (ctx) => officeLegendEligible(ctx.ownText),
  ),
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
 * 欄単体から素名のみを返す（カナ帰属は解決せず `resolveKana` が行う）。注入・下書きの入口からは直呼びしない: `classifyRulePipeline`（分類 → kana 帰属 → refine の正準合成、PBI-150）経由で使うこと。
 */
export function classifyField(m: FieldMeta): Classification | null {
  const ac = m.autocomplete.trim().toLowerCase().split(/\s+/).pop() ?? '';
  const make = (category: Category, confidence: number): Classification => ({
    category,
    confidence,
    source: 'rule',
  });

  // Birth/school/department signals are field-level: a legend like 生年月日 qualifies
  // 年/月/日 words found on the field itself, and era/school words stand alone.
  // PBI-44: 第1段階の正規化ビューを一段で組み立てる。各rawはここで1回だけ
  // normされ、DISPATCH・sources・wantsKanaは使い回す（再normなし）。
  // nearbyはlegendTextに一本化され、kanaNormFromViewsのnearbyと同一物。
  const views = buildFieldNormViews(m);
  const ownText = views.ownText;
  const legendText = views.legendText;
  // PBI-119: 会社語の欄は company/companyDepartment だけ EXCLUDE から通す。
  // 緩和境界（カナ文脈・誕生文脈・部署名を除外）は officeEligible が一箇所で持つ。
  // PBI-160: 会社名フリガナ（会社・法人系語彙 AND カナ注記の連言）は
  // officeKanaEligible が own/legend の両側で一箇所に持つ（誕生文脈は除外）。
  const officeField =
    EXCLUDE.test(ownText) && !officeEligible(ownText) && !officeKanaEligible(ownText, legendText);

  const ownTrimmed = ownText.trim();
  // レビュー指摘: the single-birthday anchor reads the LABEL view only.
  // ownText は name+htmlId+label+placeholder の連結 norm 全体のため、anchored な
  // 完全一致は name/id がある欄で常に失敗し（'birthday 生年月日' は /^(...)$/ に
  // 不一致）、同じ欄が DISPATCH で birthYear (0.7) に落ちていた。planner の
  // birthYear は非 ISO の '1990' を返し、date input は無音で捨てて fill-plan は
  // 「適用済み」と報告する。label 単体が誕生日語と一致するかで判定する。お を
  // 接頭辞の許可リストに足し、お誕生日 が birthDay に落ちるのを防ぐ。
  // label のみのビューは遅延 norm: anchored 一致が成立するには label が誕生日語
  // そのものである必要があり、それは ownText に誕生語があることと同値なので、
  // 誕生語のない欄は norm を1回も追加で払わない（1欄の norm 数契約を保つ）。
  // 共有ビューは literals が持ち、label 単体の anchored 判定は分類だけの関心事
  // なため本モジュール ローカル。
  let labelView: string | null = null;
  const birthOnLabel = (): boolean => {
    if (!BIRTH_CTX.test(ownTrimmed) && !/^bday/.test(ac)) return false;
    labelView ??= norm(m.label).trim();
    return isBirthPhrase(labelView);
  };
  const birthOnOwn = isBirthPhrase(ownTrimmed);

  // レビュー指摘: type=date の欄は birthday 以外のカテゴリに到達させない。
  // 値が常に YYYY-MM-DD の date input に birthYear の '1990' のような部分値は
  // 無音で捨てられ、fill-plan は「適用済み」と報告する。誕生日語の根拠（label
  // 一致 or autocomplete が bday で始まる）があれば birthday、なければ null
  // （unclassified・しきい値未満の欄として LLM 補助に回る）。bday-year →
  // birthYear (0.95) のような部分カテゴリを date 欄に通さない。
  if (m.type === 'date') {
    return birthOnOwn || birthOnLabel() || /^bday/.test(ac) ? make('birthday', 0.7) : null;
  }

  const acCategory = AUTOCOMPLETE.get(ac);
  if (acCategory) return make(acCategory, 0.95);
  if (m.type === 'email') return make('email', 0.9);

  // PBI-118: a field that is only the birth phrase itself (a single full-date
  // field, text or type=date) is the whole date in one box. It classifies as the
  // single birthday category instead of staying unclassified, and the planner
  // fills the profile's ISO value; an uninterpretable stored birthday stays
  // empty (warn-no-value), so the old no-partial-value guarantee holds.
  // Legend-only evidence would collide with the 3-split 生年月日 fieldset, so
  // own wording stays the only signal.
  if (birthOnOwn || birthOnLabel()) {
    return make('birthday', 0.7);
  }

  if (!officeField) {
    const ctx: DispatchCtx = {
      m,
      ownText,
      legendText,
      overseasCtx: views.overseasCtx,
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
  // PBI-44: preは第1段階ビューの派生（kanaNormFromViews）で、再normなし。
  const kanaPre = kanaNormFromViews(views);
  let kanaWant: boolean | undefined;
  const wantsKanaField = (): boolean =>
    (kanaWant ??= wantsKana(m, kanaPre));
  const sources: [string, number, boolean, (normalized: string) => boolean][] = [
    [views.nameId, 0.8, false, matchFieldOwned],
    [views.labelPlaceholder, 0.7, true, matchFieldOwned],
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

// PBI-44: text→categoryの入口seam（一段）。欄文言→categoryの理解はここを
// 開けば足りる。段階別契約は一段で読み取れる:
//
//   1 normalize  buildFieldNormViews（literals）— 各raw 1回だけnormし、
//                後段は使い回す。KanaNormはkanaNormFromViewsの派生。
//   2 dispatch   DISPATCH定義順＝優先度（本モジュール）。新規種別は挿入のみ。
//   3 sources    classifyTextの0.8/0.7/0.65源泉＋wantsKana遅延ゲート（kana）。
//                素名のみを返し、カナ帰属は解決しない（kana-blind）。
//   4 resolveKana カナ帰属（kana）。refineの前に素名→カナ名へ変換する。
//   5 refine     refineClassifications（本モジュール）。兄弟欄を見て分割・絞る。
//   6 englishPage applyEnglishPage後段（page-language）。英語ページのみ適用。
//
// analyze.ts classifyAllのルール経路は同順序で呼ぶ（seamを動かし意味は動かさ
// ない）。ルール優先の意味論は不変：本関数はLLMに触れず、classifyField・
// resolveKana・refineClassifications・applyEnglishPageの合成に過ぎない。
export const TEXT_TO_CATEGORY_STAGES = [
  { name: 'normalize', runs: 'buildFieldNormViews' },
  { name: 'dispatch', runs: 'DISPATCH' },
  { name: 'sources', runs: 'classifyText+wantsKana' },
  { name: 'resolveKana', runs: 'resolveKana' },
  { name: 'refine', runs: 'refineClassifications' },
  { name: 'englishPage', runs: 'applyEnglishPage' },
] as const;

export interface RulePipelineTrace {
  // The pipeline's final items (englishPage applied when requested).
  items: Item[];
  // Non-confident fields from the initial classification (the LLM fallback
  // set, PBI-185: renamed from `pending` — the trace value is pre-skip,
  // pre-refine and non-force, while the actual send set is post-skip and
  // force-aware, so the shared name hid the gap; sendSet owns the send set).
  initialUnconfident: FieldMeta[];
  // Fields whose category changed during the sibling refine step.
  refineChanged: number;
  // Fields the refine dropped (oversized ambiguous groups).
  refineDropped: number;
}

// Trace-bearing single implementation of the canonical composition
// (classify → resolveKana → refine → englishPage): classifyRulePipeline (the
// production entrance) and the eval (src/eval/metrics.ts) share this one
// composition, and the trace carries the intermediate values (the initial
// non-confident list, the refine retag/drop counts) the eval reads — the
// eval's former hand-rolled copy of the composition is replaced (PBI-145).
// initialUnconfident is the initial classification's non-confident fields,
// before resolveKana and refine, without any skip filter and without force
// (PBI-185: the pre-skip/pre-refine/non-force definition, distinct from the
// sendSet-owned send set). refineChanged / refineDropped count the refine
// step's retags and drops and do not depend on englishPage.
export function classifyRulePipelineWithTrace(
  metas: FieldMeta[],
  opts: { englishPage?: boolean } = {},
): RulePipelineTrace {
  const started: Item[] = metas.map((meta) => ({
    meta,
    cls: classifyField(meta) ?? { category: 'unknown', confidence: 0, source: 'rule' as const },
  }));
  const initialUnconfident = started.filter((r) => !isConfident(r.cls)).map((r) => r.meta);
  const resolved = resolveKana(started);
  const refined = refineClassifications(resolved);
  const before = new Map(resolved.map((i) => [i.meta.id, i.cls.category]));
  const afterIds = new Set(refined.map((i) => i.meta.id));
  const items = opts.englishPage === true ? applyEnglishPage(refined) : refined;
  return {
    items,
    initialUnconfident,
    refineChanged: refined.filter((i) => before.get(i.meta.id) !== i.cls.category).length,
    refineDropped: resolved.filter((i) => !afterIds.has(i.meta.id)).length,
  };
}

/**
 * ルール限定の分類パイプライン（入口seam）。classifyAllのルール経路の正準で、
 * 未分類欄はunknown化する（LLM回答なし時と同一）。PBI-50: classifier不使用時
 * のclassifyAllはこの関数に委譲する（単一所有）。順序・意味論を変えるときは
 * ここだけ変えれば両経路に反映される。PBI-150: analyze・fill-one・import-draft
 * の分類入口はこの関数経由で呼ぶ（classifyField の直呼びは入口から出す）。
 * PBI-186: 分類入口の一覧 — full-preview は runClassifyPipeline（LLM合流あり）、
 * fill-one・import-draft はこの関数（rule-only）、eval は WithTrace（trace読取）。
 */
export function classifyRulePipeline(
  metas: FieldMeta[],
  opts: { englishPage?: boolean } = {},
): Item[] {
  return classifyRulePipelineWithTrace(metas, opts).items;
}
