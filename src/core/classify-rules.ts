import type { Category, Classification, FieldMeta, KanaKind } from './types';
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
};

const EXCLUDE = /company|corp|organi[sz]ation|会社|法人|部署|役職|企業|学校|店舗/;
// Applied only to the person-name step so e.g. a user_email field stays an email.
const NAME_EXCLUDE =
  /件名|題名|商品|品名|店名|国名|ユーザー|ログイン|届け先名|担当者|名義|user|subject|title|holder|card|(^|[^a-z])cc([^a-z]|$)/;
const KANA = /kana|furigana|yomi|フリガナ|ふりがな|フリカナ|カナ|ひらがな|読み|セイ|メイ|せい|めい/;
const LAST = /last.?name|family.?name|surname|(^|[^a-z])l_?name|(^|[^a-z])sei([^a-z]|$)|姓|苗字|名字|セイ|せい/;
const FIRST = /first.?name|given.?name|(^|[^a-z])f_?name|(^|[^a-z])mei([^a-z]|$)|(^|[\s（(［\[「【])名($|[\s）)］\]」】*＊:：（(])|メイ|めい/;
const FULL_NAME = /氏名|お名前|名前|full.?name|your.?name|(^|[^a-z])name([^a-z]|$)/;

const norm = (s: string) => s.normalize('NFKC').toLowerCase();

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

  const hasCity = out.some((it) => it.cls.category === 'city');
  const hasPref = out.some((it) => it.cls.category === 'prefecture');
  for (const it of out) {
    if (it.cls.category !== 'addressFull') continue;
    if (hasCity) it.cls.category = 'street';
    else if (hasPref) it.cls.category = 'addressNoPref';
  }
  return out.filter((_, i) => !dropped.has(i));
}
