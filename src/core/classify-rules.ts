import type {
  Category, Classification, FieldMeta, Item,
} from './types';
import { kanaNormFromViews, matchFieldOwned, matchLegend, resolveKana, wantsKana } from './kana';
import { buildFieldNormViews, norm } from './literals';
import { applyEnglishPage } from './page-language';
import type { DispatchCtx, MatcherEntry } from './dispatch-kit';
import { BIRTH_CTX, birthEntries, isBirthPhrase } from './classify-vocab-birth';
import { schoolEntries } from './classify-vocab-school';
import {
  EXCLUDE, isCompanyByName, jobOfficeEligible, officeEligible,
  officeEntries, officeKanaEligible,
} from './classify-vocab-office';
import { FIRST, FULL_NAME, isEmailByName, LAST, NAME_EXCLUDE, nameEntries } from './classify-vocab-name';
import { addressEntries } from './classify-vocab-address';
import { ageEntries, genderEntries, isSearchBox, WEBSITE } from './classify-vocab-misc';
import { roleOf, withPersonRole } from './person-role';

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

// Priority-ordered dispatch table for classifyField: definition order is the
// match priority. A new field kind is one entry inserted at the right place;
// existing entries stay untouched. Module-level so no per-field allocation,
// and every matcher has a name visible in stack traces. Domain vocab modules
// own their entry slices (classify-vocab-*); the spread order below is the
// single owner of the overall priority.
const DISPATCH: readonly MatcherEntry[] = [
  ...birthEntries,
  ...schoolEntries,
  ...officeEntries,
  ...genderEntries,
  ...addressEntries,
  ...ageEntries,
  ...nameEntries,
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
  // PBI-226: fax 語彙はラベル側の source（label/placeholder・legend）でのみ
  // 有効。name/id だけの素の fax 名（fax1/fax2…、faxnumber）は既存の tel
  // 名寄せ・分割の対象のまま残す：BDD の対象は「ラベルに FAX番号を含む」欄で、
  // 素名まで拾うと asahi の phone/mobile/fax 3-split や hulic の tel/fax 対
  // といった電話番号欄の既存ふるまいを壊す。
  faxOk: boolean,
): Category | null {
  const t = normalized;
  if (!t.trim() || EXCLUDE.test(t)) return null;
  if (/e-?mail|メール/.test(t)) return 'email';
  // PBI-226: FAX語彙（FAX番号・FAX・fax。norm が小文字化するため小文字のみ、
  // 全角ＦＡＸは NFKC で畳まれる）。tel 行より先に判定する：fax を含む欄は
  // fax 欄で、tel 語だけの電話番号欄（電話・携帯・phone）は tel のまま。
  // ファクス（カタカナ）は対象外で、従来どおり LLM 補助に回る。
  if (faxOk && /(^|[^a-z])fax/.test(t)) return 'fax';
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
  // Relaxation boundary WHY lives in classify-vocab-office.ts;
  // the gates below only delegate to the eligibility predicates.
  const officeField =
    EXCLUDE.test(ownText) && !officeEligible(ownText) && !officeKanaEligible(ownText, legendText)
    && !jobOfficeEligible(ownText);

  const ownTrimmed = ownText.trim();
  // なぜなぜ分析（2026-11-19 項目2/3）: the single-birthday anchor reads each of
  // label・name・id・placeholder individually, as the design (profiles-design.md
  // 追補「分類は欄自身の文言だけ」) prescribes. 旧実装は label 単独ビューだけを
  // 見ていたため、label が空で name/id/placeholder に誕生日語がある欄（積水
  // name+id とも birthday・ena name=birthday + placeholder 例示）が unknown に
  // 落ちていた。誕生日語の語彙集合（BIRTH_PHRASE / BIRTH_PHRASE_EN）は不変で、
  // 判定対象の拡張のみ。BIRTH_CTX を参照する系統（birth dispatch 3 エントリ・
  // office 系ゲート・companyNameKana legend gate）には波及しない（語彙を広げて
  // いないため gate の開きは変わらない）。
  // ownText は name+htmlId+label+placeholder の連結 norm 全体のため、anchored な
  // 完全一致は複数ビューが非空の欄で常に失敗し（'birthday birthday' は /^(...)$/
  // に不一致）、同じ欄が DISPATCH で birthYear (0.7) に落ちるか unknown に沈む。
  // 各ビューの norm は遅延: anchored 一致が成立するにはビューが誕生日語そのもの
  // である必要があり、それは ownText に誕生語があることと同値なので、誕生語の
  // ない欄は norm を1回も追加で払わない（1欄の norm 数契約を保つ）。placeholder
  // のビューは buildFieldNormViews が既に持つため追加 norm なし。ownText 全体の
  // anchored 判定（birthOnOwn）は温存: 'date of' + 'birth' のようなビュー境界を
  // 跨ぐ語順の一致を失わない。
  let labelView: string | null = null;
  let nameView: string | null = null;
  let idView: string | null = null;
  const birthOnView = (): boolean => {
    if (!BIRTH_CTX.test(ownTrimmed) && !ac.startsWith('bday')) return false;
    labelView ??= norm(m.label).trim();
    if (isBirthPhrase(labelView)) return true;
    nameView ??= norm(m.name).trim();
    if (isBirthPhrase(nameView)) return true;
    idView ??= norm(m.htmlId).trim();
    if (isBirthPhrase(idView)) return true;
    return isBirthPhrase(views.placeholder.trim());
  };
  const birthOnOwn = isBirthPhrase(ownTrimmed);

  // レビュー指摘: type=date の欄は birthday 以外のカテゴリに到達させない。
  // 値が常に YYYY-MM-DD の date input に birthYear の '1990' のような部分値は
  // 無音で捨てられ、fill-plan は「適用済み」と報告する。誕生日語の根拠
  // （label・name・id・placeholder のいずれかが一致 or autocomplete が bday で
  // 始まる）があれば birthday、なければ null
  // （unclassified・しきい値未満の欄として LLM 補助に回る）。bday-year →
  // birthYear (0.95) のような部分カテゴリを date 欄に通さない。
  if (m.type === 'date') {
    return birthOnOwn || birthOnView() || ac.startsWith('bday') ? make('birthday', 0.7) : null;
  }

  const acCategory = AUTOCOMPLETE.get(ac);
  if (acCategory) return make(acCategory, 0.95);
  if (m.type === 'email') return make('email', 0.9);

  // PBI-224: 検索窓は confident な unknown として分類する（sendSet から外れ、
  // planner も unknown を捨てるため、LLM送付・fill のどちらにも入らない）。
  // EXCLUDE との相互作用: classifyText の EXCLUDE も unknown に落とす点は同じ
  // だが、そちらは null（= 非confidentで送付対象）になるため、このゲートを
  // 先に返す。autocomplete・email 型のページ自身の宣言はこの語彙除外より先
  // に返る（WEBSITE の除外と同一の約束事）。
  if (isSearchBox(m)) return make('unknown', 0.7);

  // PBI-225: label空 × name完全一致の会社名欄。ownText は EXCLUDE語彙
  // （company|corp|...）に触れるため、officeField ゲートより先に返す。
  // 完全一致＋許可リスト方式：区切り・大小文字の違い（company_name /
  // company-name / companyName）のみ通し、派生名（companyEmail /
  // companyDepartment / company-address / company_kana 等）や接頭辞付き
  // （your-company / form_company 等）は通さない。部分一致にしない。
  // placeholder は検索窓と同様に空条件に含めない（例）株式会社… が付く
  // ため）。テキスト欄だけが対象（radio グループ名 company は開かない）。
  if (isCompanyByName(m)) return make('company', 0.7);

  // PBI-229: label空 × text/tel/email型 × name に mail/email を含む欄は
  // email 確定（company ゲートの隣。EXCLUDE・DISPATCH・sources より先）。
  // 確認系派生名（mailconf・email_confirm 等）も email になるため planner は
  // 同一 profile.email を入れ、既存の確認欄流用と矛盾しない。
  if (isEmailByName(m)) return make('email', 0.7);

  // PBI-118: a field that is only the birth phrase itself (a single full-date
  // field, text or type=date) is the whole date in one box. It classifies as the
  // single birthday category instead of staying unclassified, and the planner
  // fills the profile's ISO value; an uninterpretable stored birthday stays
  // empty (warn-no-value), so the old no-partial-value guarantee holds.
  // Legend-only evidence would collide with the 3-split 生年月日 fieldset, so
  // legend stays out and the anchored views stay label・name・id・placeholder
  // only (なぜなぜ分析 2026-11-19 項目2/3 の対象拡張。語彙は不変).
  if (birthOnOwn || birthOnView()) {
    return make('birthday', 0.7);
  }

  // PBI-212: website 欄は school 名欄より先に判定して分類から外す（URL を入れたい
  // 欄に学校名が入る誤補完より不注入が安全）。autocomplete・email・誕生日語の
  // ページ自身の宣言はこの語彙除外より先に返る（AUTOCOMPLETE の token は語彙に
  // 勝る既存の約束事と同じ）。unknown のまま置き、URL 欄は JushoAI の補完対象外。
  if (WEBSITE.test(ownText) || WEBSITE.test(legendText)) return null;

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
  const sources: [string, number, boolean, (normalized: string) => boolean, boolean][] = [
    [views.nameId, 0.8, false, matchFieldOwned, false],
    [views.labelPlaceholder, 0.7, true, matchFieldOwned, true],
    [legendText, 0.65, false, matchLegend, true],
  ];
  for (const [normalized, confidence, bare, kanaTest, faxOk] of sources) {
    const category = classifyText(normalized, bare, wantsKanaField, kanaTest, faxOk);
    if (category) return make(category, confidence);
  }
  if (m.type === 'tel') return make('tel', 0.5);
  return null;
}

interface SplitDrop {
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

// PBI-219: 同ラベル系の grouping キー。splitBy の label 分岐と dropLeftovers
// で共有する単一の定義で、書式の drift を防ぐ（空キーの畳み込みを含む）。
// 人物役割を先頭に含める：役割の違う欄同士（児童と保護者など）は混ざらず、
// 同一役割内でのみ分割と絞り込みが働く。
const sameLabel = (item: Item): string => `${roleOf(item)}\u0000${item.meta.label}\u0000${item.meta.nearby}`;

// Nearby scope grouping key: same owner as sameLabel, without the label part,
// so address narrowing and part-order splits share one definition.
const scopeKey = (item: Item): string => `${roleOf(item)}\u0000${item.meta.nearby}`;

// PBI-09: exact不一致で残った同ラベル系tel/zip群は、plannerが欄ごとに
// 完全値を複製しないようunknown化する。単独欄・正常分割済みは対象外。
// 空キー群（label・nearbyとも空）もunknown化する：ブロック帰属を判定できず、
// 複製注入（誤注入）と不注入（手入力）の二択では後者を選ぶのが本プロジェクトの
// 方針のため。tests/core/classify-rules.test.ts の空キー回帰で固定。
// PBI-219: refineWithDrops の (c) leftover unknown 化を切り出した純粋関数。
// 入力は変えず、新しい配列を返す。dropped 済み欄は合成側で先に取り除くため、
// 旧所在の droppedIds ガードは引数ではなく合成順序で引き継ぐ。
function dropLeftovers(items: Item[]): Item[] {
  const out = items.map((i) => ({ ...i, cls: { ...i.cls } }));
  // Reachability note: a same-label zip pair never reaches this unknown-ization —
  // the zip split policy's exact-size-2 retag consumes it earlier in the composition.
  // The branch remains as insurance in case the split policy is ever loosened.
  for (const leftover of ['tel', 'zip'] as const) {
    const groups = new Map<string, number[]>();
    out.forEach((it, i) => {
      if (it.cls.category !== leftover) return;
      const k = sameLabel(it);
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
  return out;
}

// PBI-12: 住所絞り込みはnearby単位（ブロック単位）で判定する。全体判定だと
// 別ブロックのprefecture/cityを理由に届け先addressFullがstreet化されるため。
// nearbyが空の欄はすべて同一スコープに畳まれる（単一ブロック挙動は不変・回帰済み）。
// 見出しを持たない複数ブロックでは従来の全体判定と等価になる制限がある。
// PBI-219: refineWithDrops の (d) 住所絞り込みを切り出した純粋関数。
// 入力は変えず、新しい配列を返す。
function narrowAddress(items: Item[]): Item[] {
  const out = items.map((i) => ({ ...i, cls: { ...i.cls } }));
  const scopeOf = new Map<string, { hasCity: boolean; hasPref: boolean }>();
  for (const it of out) {
    const g = scopeOf.get(scopeKey(it)) ?? { hasCity: false, hasPref: false };
    if (it.cls.category === 'city') g.hasCity = true;
    if (it.cls.category === 'prefecture') g.hasPref = true;
    scopeOf.set(scopeKey(it), g);
  }
  for (const it of out) {
    if (it.cls.category !== 'addressFull') continue;
    const g = scopeOf.get(scopeKey(it));
    if (g?.hasCity) it.cls.category = 'street';
    else if (g?.hasPref) it.cls.category = 'addressNoPref';
  }
  return out;
}

function refineWithDrops(items: Item[]): { items: Item[]; dropped: SplitDrop[] } {
  const out = items.map((i) => ({ ...i, cls: { ...i.cls } }));
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
    key: (item: Item) => string,
    accept: (idx: number[], size: number) => boolean,
    dropOversize: boolean,
  ) => {
    const groups = new Map<string, number[]>();
    for (const i of indices(cat)) {
      const k = key(at(i));
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
      splitBy(policy.from, policy.to, scopeKey, inPartOrder(policy.parts ?? []), false);
    }
  }

  // PBI-219: 順序固定の合成 split→leftover→narrow。(a) 分割retag・(b) drop は
  // 上の splitBy が所有し、(c) は dropLeftovers、(d) は narrowAddress が担う。
  // dropped 済み欄は leftover/narrow の前に取り除く：旧所在では droppedIds
  // ガードで走査から外していたのと等価（dropped 欄は city/prefecture/
  // addressFull になり得ないため scope 判定にも影響しない）。
  const droppedIds = new Set(dropped.map((d) => d.fieldId));
  const kept = out.filter((it) => !droppedIds.has(it.meta.id));
  return { items: narrowAddress(dropLeftovers(kept)), dropped };
}

// PBI-219: split→leftover→narrow の順序固定の合成は refineWithDrops が担い、
// 本関数は items だけを取り出す入口である（意味論不変）。
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
  // Fields that disappeared during refine (currently the only disappearance
  // path is oversized-group drops).
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
  const withRoles = resolved.map(withPersonRole);
  const refined = refineClassifications(withRoles);
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
