// Builds src/core/zip-dict-data.ts from the Japan Post KEN_ALL data.
// The table keeps the 3-digit prefix granularity the terminal lookup reads,
// so the lookup and the planner keep working unchanged.
//
// Usage:
//   node scripts/generate-zip-dict.mjs [--input <ken_all.zip|KEN_ALL.CSV>]
//                                       [--out <path>] [--url <url>]
//
// Defaults fetch the nationwide bulk file from Japan Post at generation
// time (network). Pass --input to reuse a previously downloaded file,
// which also makes the run reproducible offline. The output only depends
// on the input rows: same input rows always produce the same table.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_URL = 'https://www.post.japanpost.jp/zipcode/dl/oogaki/zip/ken_all.zip';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
};
const INPUT = flag('--input');
const OUT = resolve(ROOT, flag('--out') ?? 'src/core/zip-dict-data.ts');
const URL = flag('--url') ?? DEFAULT_URL;

const fail = (message) => {
  process.stderr.write(`generate-zip-dict: ${message}\n`);
  process.exit(1);
};

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(
    'Usage: node scripts/generate-zip-dict.mjs [--input <ken_all.zip|KEN_ALL.CSV>] [--out <path>] [--url <url>]\n' +
      `Defaults fetch ${DEFAULT_URL} and write src/core/zip-dict-data.ts.\n`,
  );
  process.exit(0);
}

// Minimal zip reader: KEN_ALL ships as stored or deflated entries, which
// is all this covers (no encryption, no zip64; both are rejected loudly).
function unzip(buffer) {
  const findEocd = () => {
    for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65558); i--) {
      if (buffer.readUInt32LE(i) === 0x06054b50) return i;
    }
    return -1;
  };
  const eocd = findEocd();
  if (eocd < 0) fail('not a zip archive (end-of-central-directory not found)');
  const count = buffer.readUInt16LE(eocd + 10);
  let dir = buffer.readUInt32LE(eocd + 16);
  const entries = [];
  for (let n = 0; n < count; n++) {
    if (buffer.readUInt32LE(dir) !== 0x02014b50) fail('central directory entry expected');
    const method = buffer.readUInt16LE(dir + 10);
    const size = buffer.readUInt32LE(dir + 24);
    const nameLen = buffer.readUInt16LE(dir + 28);
    const extraLen = buffer.readUInt16LE(dir + 30);
    const commentLen = buffer.readUInt16LE(dir + 32);
    const headerOffset = buffer.readUInt32LE(dir + 42);
    const name = buffer.subarray(dir + 46, dir + 46 + nameLen).toString('latin1');
    if (buffer.readUInt32LE(headerOffset) !== 0x04034b50) fail(`local header expected for ${name}`);
    const dataOffset =
      headerOffset + 30
      + buffer.readUInt16LE(headerOffset + 26)
      + buffer.readUInt16LE(headerOffset + 28);
    const raw = buffer.subarray(dataOffset, dataOffset + size);
    entries.push({ name, method, raw });
    dir += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function decodeEntry(entry) {
  if (entry.method === 0) return entry.raw;
  if (entry.method === 8) return inflateRawSync(entry.raw);
  fail(`unsupported compression method ${entry.method} for ${entry.name}`);
}

async function loadCsvText() {
  if (INPUT) {
    let raw;
    try {
      raw = readFileSync(INPUT);
    } catch {
      fail(`cannot read input file ${INPUT}`);
    }
    if (INPUT.toLowerCase().endsWith('.zip')) {
      const csv = unzip(raw).find((e) => e.name.toLowerCase().endsWith('.csv'));
      if (!csv) fail(`no CSV entry in ${INPUT}`);
      return { text: new TextDecoder('shift_jis').decode(decodeEntry(csv)), source: INPUT };
    }
    return { text: new TextDecoder('shift_jis').decode(raw), source: INPUT };
  }
  const res = await fetch(URL);
  if (!res.ok) fail(`download failed: ${res.status} ${res.statusText} (${URL})`);
  const csv = unzip(Buffer.from(await res.arrayBuffer())).find((e) =>
    e.name.toLowerCase().endsWith('.csv'),
  );
  if (!csv) fail(`no CSV entry in ${URL}`);
  return { text: new TextDecoder('shift_jis').decode(decodeEntry(csv)), source: URL };
}

const quote = (value) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

let zipBuild;
try {
  zipBuild = await import('../src/core/zip-build.ts');
} catch (error) {
  fail(
    'could not load ../src/core/zip-build.ts (Node type stripping required): ' +
      String(error?.message ?? error),
  );
}

const { text, source } = await loadCsvText();
const parsed = zipBuild.parseKenAllCsv(text);
if (parsed.length === 0) fail(`no usable rows parsed from ${source}`);
const { ranges, dropped } = zipBuild.buildPrefixRanges(parsed);
if (ranges.length === 0) fail(`no prefix ranges built from ${source}`);

const lines = ranges.map(
  (r) =>
    `  { lo: ${quote(r.lo)}, hi: ${quote(r.hi)}, prefecture: ${quote(r.prefecture)}, city: ${quote(r.city)} },`,
);
const header = `// Zip prefix table read by the terminal lookup in zip-dict.ts.
// Generated by scripts/generate-zip-dict.mjs from the Japan Post KEN_ALL
// data (https://www.post.japanpost.jp/zipcode/download.html).
// Source: ${source}
// Input: ${parsed.length} KEN_ALL rows
// (${ranges.length} prefix ranges, ${dropped.length} multi-prefecture prefixes omitted:
// ${dropped.length > 0 ? dropped.join(', ') : 'none'}).
// The output depends only on the input rows: rerunning the script against
// the same file produces byte-identical output.
// Japan Post does not claim copyright on the postal code data itself and
// allows free redistribution. Rerunning the script against a fresh KEN_ALL
// replaces this table in the same shape; the lookup reads whatever rows
// are here without code changes.
import type { ZipPrefixRange } from './zip-build';

export const ZIP_PREFIX_RANGES: ZipPrefixRange[] = [
${lines.join('\n')}
];
`;
writeFileSync(OUT, header);

process.stdout.write(
  `generate-zip-dict: ${parsed.length} rows -> ${ranges.length} ranges ` +
    `(${dropped.length} dropped) written to ${OUT}\n`,
);
