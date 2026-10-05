// One command for the URL-fixture workflow: fetch a page, scaffold a fixture,
// and wire it into tests/integration/samples.test.ts.
// Static HTML only: JS-rendered pages still need a manual save, and the generated
// expectations stay '<expected>' placeholders until a human fills and trims them.
import { readFileSync, writeFileSync } from 'node:fs';
import { extractControls, renderFixture, renderTestStub } from './scaffold-fixture.mjs';

export function fixtureNameFromUrl(href) {
  try {
    const u = new URL(href);
    const seg = u.pathname.split('/').filter(Boolean).pop() ?? '';
    const base = (seg || u.host).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `${base || 'form'}.html`;
  } catch {
    return 'form.html';
  }
}

export function varNameFromFile(file) {
  const base = file.replace(/\.html$/, '');
  const words = base.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  return words.map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1))).join('') || 'sample';
}

export function insertImport(source, varName, file) {
  const line = `import ${varName} from '../../samples/${file}?raw';`;
  if (source.includes(line)) return source;
  return source.replace(/(import \w+ from '\.\.\/\.\.\/samples\/[^']+\?raw';\n)(?!import \w+ from '\.\.\/\.\.\/samples\/)/, `$1${line}\n`);
}

export function insertSampleEntry(source, file, varName) {
  const entry = `  '${file}': ${varName},\n`;
  if (source.includes(entry)) return source;
  return source.replace(/(const SAMPLES: Record<string, string> = \{[\s\S]*?\n)(\};)/, `$1${entry}$2`);
}

export function insertTestCase(source, stub) {
  const firstLine = stub.trim().split('\n')[0];
  if (firstLine && source.includes(firstLine)) return source;
  const idx = source.lastIndexOf('\n});');
  if (idx === -1) return source;
  return `${source.slice(0, idx)}\n${stub}${source.slice(idx + 1)}`;
}

export function buildWiring(html, sourceLabel, file) {
  const extracted = extractControls(html);
  const varName = varNameFromFile(file);
  return {
    file,
    fixture: renderFixture(sourceLabel, extracted),
    controls: extracted.controls.filter((c) => c.name).length,
    applyTest(testSource) {
      let s = insertImport(testSource, varName, file);
      s = insertSampleEntry(s, file, varName);
      return insertTestCase(s, renderTestStub(file, extracted));
    },
  };
}

// CLI: node scripts/add-fixture.mjs <url> [fixture-name]
// Guarded so importing the pure functions has no side effects.
if (process.argv[1]?.endsWith('scripts/add-fixture.mjs')) {
  const [url, wanted] = process.argv.slice(2);
  if (url) {
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`fetch failed: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const html = await res.text();
  const wiring = buildWiring(html, url, wanted ?? fixtureNameFromUrl(url));
  writeFileSync(new URL(`../samples/${wiring.file}`, import.meta.url), wiring.fixture);
  const testPath = new URL('../tests/integration/samples.test.ts', import.meta.url);
  writeFileSync(testPath, wiring.applyTest(readFileSync(testPath, 'utf8')));
  console.log(`wrote samples/${wiring.file} and wired a case into samples.test.ts (${wiring.controls} controls, expectations are '<expected>' placeholders).`);
  console.log('next: trim the fixture to the smallest reproduction, fill the expectations, run vitest.');
}
}
