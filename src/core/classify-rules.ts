import type { Category, Classification, FieldMeta, KanaKind } from './types';

export const ACCEPT_THRESHOLD = 0.6;

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
const KANA = /kana|furigana|yomi|フリガナ|ふりがな|フリカナ|カナ|ひらがな|読み|セイ|メイ|せい|めい/;
const LAST = /last.?name|family.?name|surname|lname|(^|[^a-z])sei([^a-z]|$)|姓|苗字|名字|セイ|せい/;
const FIRST = /first.?name|given.?name|fname|(^|[^a-z])mei([^a-z]|$)|(?<!氏)名(?![前字])|メイ|めい/;
const FULL_NAME = /氏名|お名前|名前|full.?name|your.?name|(^|[^a-z])name([^a-z]|$)/;

const norm = (s: string) => s.normalize('NFKC').toLowerCase();
const stripExample = (s: string) => s.replace(/^例[)）:：]?/, '').trim();

function classifyText(raw: string, kana: boolean): Category | null {
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
  if (/city|municipal|市区町村|市町村|市区郡/.test(t)) return 'city';
  if (/street|番地|丁目|町名/.test(t)) return 'street';
  const last = LAST.test(t);
  const first = FIRST.test(t);
  if (last && !first) return kana ? 'lastNameKana' : 'lastName';
  if (first && !last) return kana ? 'firstNameKana' : 'firstName';
  if (last || first || FULL_NAME.test(t) || kana) return kana ? 'fullNameKana' : 'fullName';
  if (/address|住所|addr/.test(t)) return 'addressFull';
  return null;
}

export function detectKanaKind(m: FieldMeta): KanaKind {
  const ph = stripExample(m.placeholder);
  if (/^[ｦ-ﾟ\s]+$/.test(ph)) return 'halfKatakana';
  if (/^[ぁ-ゖー\s　]+$/.test(ph)) return 'hiragana';
  if (/^[ァ-ヶー\s　]+$/.test(ph)) return 'katakana';
  if (/[ｦ-ﾟ]/.test(m.pattern)) return 'halfKatakana';
  if (/ぁ|ぃ|ん/.test(m.pattern)) return 'hiragana';
  if (/ァ|ア|ン/.test(m.pattern)) return 'katakana';
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
  const kana =
    placeholderIsKana || KANA.test(norm([m.name, m.htmlId, m.label, m.placeholder, m.nearby].join(' ')));

  const sources: [string, number][] = [
    [`${m.name} ${m.htmlId}`, 0.8],
    [`${m.label} ${m.placeholder}`, 0.7],
    [m.nearby, 0.65],
  ];
  for (const [text, confidence] of sources) {
    const category = classifyText(text, kana);
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

  const tel = indices('tel');
  if (tel.length === 3) retag(tel, ['tel1', 'tel2', 'tel3']);
  const zip = indices('zip');
  if (zip.length === 2) retag(zip, ['zip1', 'zip2']);
  const name = indices('fullName');
  if (name.length === 2) retag(name, ['lastName', 'firstName']);
  const nameKana = indices('fullNameKana');
  if (nameKana.length === 2) retag(nameKana, ['lastNameKana', 'firstNameKana']);

  const hasCity = out.some((it) => it.cls.category === 'city');
  const hasPref = out.some((it) => it.cls.category === 'prefecture');
  for (const it of out) {
    if (it.cls.category !== 'addressFull') continue;
    if (hasCity) it.cls.category = 'street';
    else if (hasPref) it.cls.category = 'addressNoPref';
  }
  return out;
}
