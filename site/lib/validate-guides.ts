// Pure ja/en parity checks shared by the build (loadGuides/loadStrings)
// and the site tests. No Node APIs here so the same interface validates
// both real content and hand-built fixtures.
export interface PairHeading {
  level: number;
  text: string;
  id: string;
}

export interface PairGuide {
  slug: string;
  order: number;
  title: string;
  description: string;
  headings: PairHeading[];
  links: string[];
  html: string;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

// Compares the shape (keys, array lengths, value types) of the ja and en dictionaries.
export function diffShape(ja: unknown, en: unknown, path = ''): string[] {
  if (Array.isArray(ja) || Array.isArray(en)) {
    if (!Array.isArray(ja) || !Array.isArray(en)) return [`${path}: type`];
    const out = ja.length !== en.length ? [`${path}: length ${ja.length} vs ${en.length}`] : [];
    for (let i = 0; i < Math.min(ja.length, en.length); i++) out.push(...diffShape(ja[i], en[i], `${path}[${i}]`));
    return out;
  }
  if (ja === null || en === null) return ja === en ? [] : [`${path}: type`];
  if (isObject(ja) && isObject(en)) {
    const keys = new Set([...Object.keys(ja), ...Object.keys(en)]);
    return [...keys].flatMap((k) => {
      const p = path ? `${path}.${k}` : k;
      if (k in ja && k in en) return diffShape(ja[k], en[k], p);
      return [`${p}: missing in ${k in ja ? 'en' : 'ja'}`];
    });
  }
  return typeof ja === typeof en ? [] : [`${path}: type`];
}

export function findEmptyStrings(v: unknown, path = ''): string[] {
  if (typeof v === 'string') return v.trim() === '' ? [path] : [];
  if (Array.isArray(v)) return v.flatMap((x, i) => findEmptyStrings(x, `${path}[${i}]`));
  if (isObject(v)) return Object.entries(v).flatMap(([k, x]) => findEmptyStrings(x, path ? `${path}.${k}` : k));
  return [];
}

// Bundles the dictionary parity checks run at build time.
export function validateStrings(ja: unknown, en: unknown): string[] {
  return [
    ...diffShape(ja, en),
    ...findEmptyStrings(ja).map((p) => `ja ${p}: empty`),
    ...findEmptyStrings(en).map((p) => `en ${p}: empty`),
  ];
}

// Normalizes the language-dependent parts of a guide link so ja and en
// sources compare equal: the /en prefix on site-absolute links, the hl
// query on store links, and the locale segment on AMO links.
export function normalizeGuideLink(href: string): string {
  let out = href;
  if (out === '/en' || out.startsWith('/en/')) out = out.slice(3) || '/';
  out = out.replace(/([?&])hl=(ja|en)(?=&|$)/, '').replace(/[?&]$/, '').replace(/\?&/, '?');
  out = out.replace(/(addons\.mozilla\.org\/)(ja|en-US)(\/)/, '$1');
  return out;
}

// Extracts badge labels from the badge table (the table whose first header
// cell is バッジ/Badge). Cells holding the raw label stay as-is; cells with
// translations keep only the <code> source labels and drop the prose, and
// slash-joined cells split into one label each. Other tables are ignored.
export function extractBadgeLabels(html: string): string[] {
  const labels: string[] = [];
  for (const table of html.matchAll(/<table>([\s\S]*?)<\/table>/g)) {
    const head = /<thead>([\s\S]*?)<\/thead>/.exec(table[1] ?? '')?.[1] ?? '';
    const headerText = (/<th>([\s\S]*?)<\/th>/.exec(head)?.[1] ?? '').replace(/<[^>]+>/g, '').trim();
    if (headerText !== 'バッジ' && headerText !== 'Badge') continue;
    const body = /<tbody>([\s\S]*?)<\/tbody>/.exec(table[1] ?? '')?.[1] ?? table[1] ?? '';
    for (const row of body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
      const cell = /<td>([\s\S]*?)<\/td>/.exec(row[1] ?? '')?.[1];
      if (cell === undefined) continue;
      const codes = [...cell.matchAll(/<code>([\s\S]*?)<\/code>/g)]
        .map((c) => (c[1] ?? '').trim())
        .filter((c) => c !== '');
      if (codes.length > 0) {
        labels.push(...codes);
      } else {
        for (const part of cell.replace(/<[^>]+>/g, '').split('/')) {
          const t = part.trim();
          if (t !== '') labels.push(t);
        }
      }
    }
  }
  return labels;
}

// Validates one ja/en guide pair: presence, order, non-empty front matter,
// h2 sequence parity (count in order, no empty or duplicate ids per guide),
// normalized link parity, and badge-label set parity.
export function validateGuidePair(ja: PairGuide | undefined, en: PairGuide | undefined): string[] {
  const slug = ja?.slug ?? en?.slug ?? 'unknown';
  if (!ja || !en) return [`${slug}: missing in ${!ja ? 'ja' : 'en'}`];
  const problems: string[] = [];
  if (ja.order !== en.order) problems.push(`${slug}: order differs (ja ${ja.order} vs en ${en.order})`);
  if (ja.title.trim() === '') problems.push(`ja/${slug}.md: title is empty`);
  if (en.title.trim() === '') problems.push(`en/${slug}.md: title is empty`);
  if (ja.description.trim() === '') problems.push(`ja/${slug}.md: description is empty`);
  if (en.description.trim() === '') problems.push(`en/${slug}.md: description is empty`);

  const h2ja = ja.headings.filter((h) => h.level === 2);
  const h2en = en.headings.filter((h) => h.level === 2);
  if (h2ja.length !== h2en.length) {
    problems.push(`${slug}: h2 section count differs (ja ${h2ja.length} vs en ${h2en.length})`);
  }
  for (const [lang, hs] of [['ja', h2ja], ['en', h2en]] as const) {
    const seen = new Set<string>();
    hs.forEach((h, i) => {
      if (h.text.trim() === '') problems.push(`${lang}/${slug}.md: h2 #${i + 1} has empty text`);
      if (h.id.trim() === '') problems.push(`${lang}/${slug}.md: h2 #${i + 1} has empty id`);
      else if (seen.has(h.id)) problems.push(`${lang}/${slug}.md: duplicate h2 id "${h.id}"`);
      else seen.add(h.id);
    });
  }

  const count = (xs: string[]) => {
    const m = new Map<string, number>();
    for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
    return m;
  };
  const nja = count(ja.links.map(normalizeGuideLink).sort());
  const nen = count(en.links.map(normalizeGuideLink).sort());
  const jaOnly = [...nja].filter(([l, n]) => (nen.get(l) ?? 0) !== n).map(([l]) => l);
  const enOnly = [...nen].filter(([l, n]) => (nja.get(l) ?? 0) !== n).map(([l]) => l);
  if (jaOnly.length > 0 || enOnly.length > 0) {
    problems.push(`${slug}: links differ (ja-only: ${jaOnly.join(', ') || '—'}; en-only: ${enOnly.join(', ') || '—'})`);
  }

  const bja = extractBadgeLabels(ja.html);
  const ben = extractBadgeLabels(en.html);
  if (bja.length > 0 || ben.length > 0) {
    const sja = new Set(bja);
    const sen = new Set(ben);
    const jOnly = [...sja].filter((b) => !sen.has(b));
    const eOnly = [...sen].filter((b) => !sja.has(b));
    if (jOnly.length > 0 || eOnly.length > 0) {
      problems.push(`${slug}: badge labels differ (ja-only: ${jOnly.join(', ') || '—'}; en-only: ${eOnly.join(', ') || '—'})`);
    }
  }
  return problems;
}
