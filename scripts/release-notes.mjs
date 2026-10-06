// Prints the CHANGELOG section for a version (argument like "0.1.7" or "v0.1.7").
import { readFileSync } from 'node:fs';

export function extractNotes(changelog, version) {
  const v = version.replace(/^v/, '');
  const lines = changelog.split('\n');
  const start = lines.findIndex((l) => l.startsWith(`## [${v}]`));
  if (start === -1) throw new Error(`CHANGELOG.md has no section for ${v}`);
  let end = lines.findIndex((l, i) => i > start && (l.startsWith('## [') || /^\[[^\]]+\]:/.test(l)));
  if (end === -1) end = lines.length;
  return lines.slice(start + 1, end).join('\n').trim();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const version = process.argv[2];
  if (!version) throw new Error('usage: node scripts/release-notes.mjs <version>');
  const notes = extractNotes(readFileSync('CHANGELOG.md', 'utf8'), version);
  if (notes === '') throw new Error(`CHANGELOG.md section for ${version} is empty`);
  console.log(notes);
}
