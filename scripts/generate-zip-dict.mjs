// Builds src/core/zip-dict-data.ts from the Japan Post KEN_ALL-format data.
// The table keeps the 3-digit prefix granularity the terminal lookup reads,
// so the lookup and the planner keep working unchanged.
//
// Usage:
//   node scripts/generate-zip-dict.mjs [--input <dir|zip file> ...] [--out <path>]
//
// Japan Post ended the nationwide ken_all.zip download and now distributes
// per-prefecture zips (plus monthly add_/del_ diffs), so with no --input the
// script fetches the 47 prefecture files (network) and merges them; every
// file must fetch and parse or nothing is written. --input reuses previously
// downloaded zips, which also makes the run reproducible offline. Zips merge
// in basename order whatever way the inputs were spelled out, so the same
// input set always produces byte-identical output.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// The old /zipcode/dl/ base is permanently 404 after a site rebuild; the
// distribution page itself also moved under /service/search/zipcode/download/.
const PREFECTURE_URL_BASE =
  'https://www.post.japanpost.jp/service/search/zipcode/download/oogaki/zip/';
// The 47 prefecture files linked from the distribution page
// (https://www.post.japanpost.jp/service/search/zipcode/download/oogaki-zip.html),
// excluding the monthly add_/del_ diffs (ken_all.zip is linked there again too).
const PREFECTURE_ZIPS = [
  '01hokkai.zip', '02aomori.zip', '03iwate.zip', '04miyagi.zip', '05akita.zip',
  '06yamaga.zip', '07fukush.zip', '08ibarak.zip', '09tochig.zip', '10gumma.zip',
  '11saitam.zip', '12chiba.zip', '13tokyo.zip', '14kanaga.zip', '15niigat.zip',
  '16toyama.zip', '17ishika.zip', '18fukui.zip', '19yamana.zip', '20nagano.zip',
  '21gifu.zip', '22shizuo.zip', '23aichi.zip', '24mie.zip', '25shiga.zip',
  '26kyouto.zip', '27osaka.zip', '28hyogo.zip', '29nara.zip', '30wakaya.zip',
  '31tottor.zip', '32shiman.zip', '33okayam.zip', '34hirosh.zip', '35yamagu.zip',
  '36tokush.zip', '37kagawa.zip', '38ehime.zip', '39kochi.zip', '40fukuok.zip',
  '41saga.zip', '42nagasa.zip', '43kumamo.zip', '44oita.zip', '45miyaza.zip',
  '46kagosh.zip', '47okinaw.zip',
];
const PREFECTURE_SOURCE = `Japan Post prefecture files (47) from ${PREFECTURE_URL_BASE}`;

const args = process.argv.slice(2);

const fail = (message) => {
  process.stderr.write(`generate-zip-dict: ${message}\n`);
  process.exit(1);
};

// A bare trailing --out must fail instead of falling back to the default:
// silently writing the seed table under src/ on a typo'd flag would be worse.
let outArg = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out') {
    if (i + 1 >= args.length) fail('--out requires a path');
    outArg = args[++i];
  }
}
const OUT = resolve(ROOT, outArg ?? 'src/core/zip-dict-data.ts');

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(
    'Usage: node scripts/generate-zip-dict.mjs [--input <dir|zip file> ...] [--out <path>]\n' +
      `With no --input, fetches the 47 per-prefecture zips from ${PREFECTURE_URL_BASE}\n` +
      'and merges them; every file must fetch and parse or nothing is written.\n' +
      '--input reads every *.zip in a directory, or one zip file (repeatable).\n' +
      'Zips always merge in basename order regardless of argument order, and\n' +
      'duplicate basenames fail. Writes src/core/zip-dict-data.ts by default.\n',
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
    // Compressed size: offset 24 holds the uncompressed size, which would
    // overshoot the deflated slice into trailing bytes.
    const size = buffer.readUInt32LE(dir + 20);
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

let zipBuild;
try {
  zipBuild = await import('../src/core/zip-build.ts');
} catch (error) {
  fail(
    'could not load ../src/core/zip-build.ts (Node type stripping required): ' +
      String(error?.message ?? error),
  );
}

const quote = (value) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

async function fetchZip(url) {
  let res;
  try {
    res = await fetch(url);
    if (!res.ok) fail(`download failed: ${res.status} ${res.statusText} (${url})`);
    return Buffer.from(await res.arrayBuffer());
  } catch (error) {
    fail(`download failed: ${url} (${String(error?.cause?.message ?? error?.message ?? error)})`);
  }
}

function readInput(path) {
  try {
    return readFileSync(path);
  } catch {
    return fail(`cannot read input file ${path}`);
  }
}

// Decodes the zip's single CSV entry and requires it to parse to at least
// one usable row: a file that contributes nothing would silently shrink the
// nationwide table, so any gap fails the whole run with the source named.
function csvTextOf(label, raw) {
  const entries = unzip(raw).filter((e) => e.name.toLowerCase().endsWith('.csv'));
  if (entries.length === 0) fail(`no CSV entry in ${label}`);
  if (entries.length > 1) {
    fail(`multiple CSV entries in ${label}: ${entries.map((e) => e.name).join(', ')}`);
  }
  const text = new TextDecoder('shift_jis').decode(decodeEntry(entries[0]));
  if (zipBuild.parseKenAllCsv(text).length === 0) fail(`no usable rows parsed from ${label}`);
  return text;
}

// --input is repeatable: a directory contributes its *.zip children in file
// name order, a file path must be a zip. The merge order below is basename
// dictionary order regardless of how the inputs arrived on the command line.
const INPUT_PATHS = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--input') {
    if (i + 1 >= args.length) fail('--input requires a path');
    INPUT_PATHS.push(args[++i]);
  }
}

const inputs = [];
if (INPUT_PATHS.length > 0) {
  for (const path of INPUT_PATHS) {
    let st;
    try {
      st = statSync(path);
    } catch {
      fail(`cannot read input ${path}`);
    }
    if (st.isDirectory()) {
      // Dirent.isFile() is false for symlinks, so stat each *.zip entry
      // instead (following links); a broken symlink throws and is skipped.
      const names = readdirSync(path, { withFileTypes: true })
        .filter((e) => {
          if (!e.name.toLowerCase().endsWith('.zip')) return false;
          try {
            return statSync(join(path, e.name)).isFile();
          } catch {
            return false;
          }
        })
        .map((e) => e.name)
        .sort();
      if (names.length === 0) fail(`no zip files in ${path}`);
      for (const name of names) inputs.push({ path: join(path, name), basename: name });
    } else if (path.toLowerCase().endsWith('.zip')) {
      inputs.push({ path, basename: basename(path) });
    } else {
      fail(`not a zip file: ${path}`);
    }
  }
  const seen = new Map();
  for (const input of inputs) {
    // Duplicate check is case-insensitive (A.zip vs a.zip) so the same
    // logical file cannot enter the merge twice; the message keeps the
    // original spelling of the offender.
    const key = input.basename.toLowerCase();
    if (seen.has(key)) {
      fail(
        `duplicate input basename ${input.basename}: ` +
          `${seen.get(key)} and ${input.path}`,
      );
    }
    seen.set(key, input.path);
  }
  inputs.sort((a, b) => (a.basename < b.basename ? -1 : a.basename > b.basename ? 1 : 0));
} else {
  for (const name of PREFECTURE_ZIPS) {
    inputs.push({ path: PREFECTURE_URL_BASE + name, basename: name, remote: true });
  }
}

const texts = [];
for (const input of inputs) {
  const raw = input.remote ? await fetchZip(input.path) : readInput(input.path);
  texts.push(csvTextOf(input.path, raw));
}

// KEN_ALL has no multi-line fields, so joining the texts with exactly one
// newline (and ending the last with exactly one) is lossless for the row
// stream the parser reads; only redundant trailing newlines are normalized.
const merged = texts.map((text) => text.replace(/[\r\n]+$/, '')).join('\n') + '\n';
const source = INPUT_PATHS.length > 0
  ? inputs.map((input) => input.basename).join(', ')
  : PREFECTURE_SOURCE;

const parsed = zipBuild.parseKenAllCsv(merged);
if (parsed.length === 0) fail('no usable rows parsed from the merged input');
const { ranges, dropped } = zipBuild.buildPrefixRanges(parsed);
if (ranges.length === 0) fail('no prefix ranges built from the merged input');

const lines = ranges.map(
  (r) =>
    `  { lo: ${quote(r.lo)}, hi: ${quote(r.hi)}, prefecture: ${quote(r.prefecture)}, city: ${quote(r.city)} },`,
);
const header = `// Zip prefix table read by the terminal lookup in zip-dict.ts.
// Generated by scripts/generate-zip-dict.mjs from the Japan Post postal
// code data (https://www.post.japanpost.jp/zipcode/download.html).
// Source: ${source}
// Input: ${parsed.length} KEN_ALL rows from ${inputs.length} files
// (${ranges.length} prefix ranges, ${dropped.length} multi-prefecture prefixes omitted:
// ${dropped.length > 0 ? dropped.join(', ') : 'none'}).
// The output depends only on the input rows: rerunning the script against
// the same input files produces byte-identical output.
// Japan Post does not claim copyright on the postal code data itself and
// allows free redistribution. Rerunning the script against fresh prefecture
// files replaces this table in the same shape; the lookup reads whatever
// rows are here without code changes.
import type { ZipPrefixRange } from './zip-build';

export const ZIP_PREFIX_RANGES: ZipPrefixRange[] = [
${lines.join('\n')}
];
`;
try {
  writeFileSync(OUT, header);
} catch (error) {
  fail(`cannot write ${OUT}: ${String(error?.message ?? error)}`);
}

process.stdout.write(
  `generate-zip-dict: ${inputs.length} files, ${parsed.length} rows -> ${ranges.length} ranges ` +
    `(${dropped.length} dropped) written to ${OUT}\n`,
);
