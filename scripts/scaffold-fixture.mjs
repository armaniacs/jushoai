// Scaffold generator: real-page HTML excerpt -> minimal samples/ fixture + planFor test stub.
// No dependencies; regex-based extraction is intentionally lossy. A human trims the
// output to the smallest reproduction before committing it as a fixture.
import { readFileSync } from 'node:fs';

const IN_SCOPE_TYPES = new Set(['text', 'email', 'tel', 'search']);
const SKIP_REASONS = {
  radio: 'grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
  checkbox: 'out of scope (skip fixed)',
  hidden: 'empty-submit shim or server state, never a fill target (exclude)',
  submit: 'action element, never a fill target (exclude)',
  button: 'action element, never a fill target (exclude)',
  image: 'action element, never a fill target (exclude)',
};

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? (m[2] ?? m[3] ?? m[4] ?? '') : '';
};
const stripTags = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

export function extractControls(html) {
  const labels = new Map();
  for (const m of html.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/gi)) {
    const htmlFor = attr(m[1], 'for');
    if (htmlFor) labels.set(htmlFor, stripTags(m[2]));
  }
  const legends = [...html.matchAll(/<legend\b[^>]*>([\s\S]*?)<\/legend>/gi)].map((m) => stripTags(m[1]));
  const controls = [];
  const skipped = [];
  for (const m of html.matchAll(/<(input|select|textarea|button)\b([^>]*)>/gi)) {
    const tag = m[1].toLowerCase();
    const attrs = m[2];
    const type = tag === 'input' ? (attr(attrs, 'type') || 'text').toLowerCase() : tag;
    const name = attr(attrs, 'name');
    const id = attr(attrs, 'id');
    const key = name || id;
    if (!key) {
      skipped.push({ tag, type, key: '(no name/id)', reason: 'unaddressable (exclude)' });
      continue;
    }
    if (tag === 'select') {
      controls.push({
        tag, type: 'select', name, id,
        label: labels.get(id) ?? '',
        legend: legends[0] ?? '',
        placeholder: '', maxLength: '', pattern: '',
      });
      continue;
    }
    if (tag === 'input' && IN_SCOPE_TYPES.has(type)) {
      controls.push({
        tag, type, name, id,
        label: labels.get(id) ?? '',
        legend: legends[0] ?? '',
        placeholder: attr(attrs, 'placeholder'),
        maxLength: attr(attrs, 'maxlength'),
        pattern: attr(attrs, 'pattern'),
      });
      continue;
    }
    const reason = SKIP_REASONS[type] ?? `not scanned (scan covers ${[...IN_SCOPE_TYPES].join('/')} + select; exclude)`;
    skipped.push({ tag, type, key, reason });
  }
  return { controls, skipped };
}

export function renderFixture(sourceName, { controls, skipped }) {
  const fields = controls.map((c) => {
    const label = c.label ? `      <label for="${c.id}">${c.label}</label>\n` : '';
    const extra = [
      c.placeholder ? ` placeholder="${c.placeholder}"` : '',
      c.maxLength ? ` maxlength="${c.maxLength}"` : '',
      c.pattern ? ` pattern="${c.pattern}"` : '',
    ].join('');
    if (c.type === 'select') {
      return `${label}      <select name="${c.name}" id="${c.id}"><option value="">--</option></select>`;
    }
    return `${label}      <input name="${c.name}" id="${c.id}" type="${c.type}" value=""${extra}>`;
  });
  const skipNote = skipped.map((s) => `<!-- skip: ${s.key} (${s.type}): ${s.reason} -->`).join('\n');
  return `<!-- Minimal reproduction of ${sourceName}. Values stripped; trim further before committing. -->\n<form>\n${fields.join('\n')}\n${skipNote ? skipNote + '\n' : ''}</form>\n`;
}

export function renderTestStub(fileName, { controls, skipped }) {
  const keys = controls.map((c) => `      '${c.name || c.id}': '<expected>',`).join('\n');
  const skipKeys = skipped.map((s) => `//   ${s.key} (${s.type}): ${s.reason}`).join('\n');
  return `  it('${fileName} fills the in-scope fields', async () => {\n    expect(await planFor('${fileName}')).toEqual({\n${keys}\n    });\n${skipKeys ? skipKeys + '\n' : ''}  });\n`;
}

// CLI: node scripts/scaffold-fixture.mjs <source.html> [fixture-name]
// Guarded so importing the pure functions has no side effects.
if (process.argv[1]?.endsWith('scripts/scaffold-fixture.mjs')) {
  const [src, fixtureName] = process.argv.slice(2);
  if (src) {
    const html = readFileSync(src, 'utf8');
    const extracted = extractControls(html);
    const name = fixtureName ?? 'new-fixture.html';
    process.stdout.write(renderFixture(src, extracted));
    process.stdout.write('\n');
    process.stdout.write(renderTestStub(name, extracted));
  }
}
