// Guards the release workflow against privilege and supply-chain regressions.
// Reads `.github/workflows/release.yml` as plain text (no YAML parser dependency)
// and asserts the hardening: job-scoped write permission, no persisted checkout
// credentials, no install scripts, and an approval-gated environment.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const PATH = '.github/workflows/release.yml';
const text = readFileSync(PATH, 'utf8');
const lines = text.split('\n');

// A step block starts at a `- name:` / `- uses:` line and ends before the next
// step or the end of the steps list.
const stepBlock = (startIndex: number): string => {
  const out: string[] = [];
  for (let i = startIndex; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    if (i > startIndex && /^\s+- (name|uses):/.test(line)) break;
    out.push(line);
  }
  return out.join('\n');
};

const checkoutIndex = lines.findIndex((line) => line.includes('actions/checkout'));

describe('release workflow permissions', () => {
  it('declares no workflow-wide permissions', () => {
    const topLevel = lines.filter((line) => /^permissions:/.test(line));
    expect(topLevel, 'permissions must be job-scoped, not workflow-wide').toEqual([]);
  });

  it('grants contents:write only to the release job', () => {
    const scoped = lines.filter((line) => /^\s+permissions:/.test(line));
    expect(scoped.length, 'exactly one job-scoped permissions block is expected').toBe(1);
    const head = scoped[0] ?? '';
    const block = lines.slice(lines.indexOf(head), lines.indexOf(head) + 3).join('\n');
    expect(block).toMatch(/contents:\s*write/);
  });
});

describe('release workflow checkout', () => {
  it('does not persist credentials', () => {
    expect(checkoutIndex, 'actions/checkout step is expected').toBeGreaterThanOrEqual(0);
    expect(stepBlock(checkoutIndex)).toMatch(/persist-credentials:\s*false/);
  });
});

describe('release workflow dependency install', () => {
  it('installs dependencies without running scripts', () => {
    const installLines = lines.filter((line) => line.includes('npm ci'));
    expect(installLines.length, 'an npm ci step is expected').toBeGreaterThanOrEqual(1);
    for (const line of installLines) {
      expect(line, `install must use --ignore-scripts: ${line.trim()}`).toContain('--ignore-scripts');
    }
  });
});

describe('release workflow approval gate', () => {
  it('binds the release job to the release environment', () => {
    expect(text).toMatch(/environment:\s*(release|name:\s*release)/);
  });
});
