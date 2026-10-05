// Registry-driven fixture sync: read tests/target-url.md, and for every URL
// without a wired fixture, fetch the page, scaffold the fixture, wire the test,
// and write the `→ fixture` mapping back to the registry.
// Static HTML only; expectations stay '<expected>' placeholders for humans.
import { readFileSync, writeFileSync } from 'node:fs';
import { buildWiring, fixtureNameFromUrl } from './add-fixture.mjs';

export function parseRegistry(md) {
  const out = [];
  for (const line of md.split('\n')) {
    const m = line.match(/^\s*-\s*(\S+)(?:\s*(?:→|->)\s*(\S+))?\s*$/);
    if (m) out.push({ url: m[1], file: m[2] ?? null });
  }
  return out;
}

export function stampRegistry(md, url, file) {
  const lines = md.split('\n');
  let touched = false;
  const next = lines.map((line) => {
    const m = line.match(/^(\s*-\s*\S+?)((?:\s*(?:→|->)\s*\S+)?)\s*$/);
    if (m && m[1].trim().slice(2) === url && !m[2]) {
      touched = true;
      return `${m[1]} → ${file}`;
    }
    return line;
  });
  if (!touched && !next.some((l) => l.includes(url))) next.push(`- ${url} → ${file}`);
  return next.join('\n');
}

// CLI: node scripts/sync-target-urls.mjs
if (process.argv[1]?.endsWith('scripts/sync-target-urls.mjs')) {
  const mdPath = new URL('../tests/target-url.md', import.meta.url);
  const testPath = new URL('../tests/integration/samples.test.ts', import.meta.url);
  const md = readFileSync(mdPath, 'utf8');
  let testSource = readFileSync(testPath, 'utf8');
  let updated = md;
  for (const { url, file } of parseRegistry(md)) {
    if (file && testSource.includes(`'${file}'`)) {
      console.log(`skip ${url} (already wired)`);
      continue;
    }
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`fetch failed: ${url}: ${res.status}`);
      continue;
    }
    const name = file ?? fixtureNameFromUrl(url);
    const wiring = buildWiring(await res.text(), url, name);
    writeFileSync(new URL(`../samples/${name}`, import.meta.url), wiring.fixture);
    testSource = wiring.applyTest(testSource);
    updated = stampRegistry(updated, url, name);
    console.log(`wired ${url} → samples/${name} (${wiring.controls} controls)`);
  }
  writeFileSync(testPath, testSource);
  writeFileSync(mdPath, updated);
  console.log('next: trim new fixtures, fill expectations, run vitest.');
}
