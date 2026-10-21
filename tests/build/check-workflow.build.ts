// Guards the check workflow against privilege and supply-chain regressions.
// Reads `.github/workflows/check.yml` as plain text (no YAML parser dependency)
// and asserts the hardening: no workflow-wide permissions, read-only job
// permission, no persisted checkout credentials, no install scripts, an
// explicit WXT types generation, both pull_request and push triggers, and a
// make check step.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const PATH = '.github/workflows/check.yml';
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

describe('check workflow permissions', () => {
  it('declares no workflow-wide permissions', () => {
    const topLevel = lines.filter((line) => /^permissions:/.test(line));
    expect(topLevel, 'permissions must be job-scoped, not workflow-wide').toEqual([]);
  });

  it('grants read-only contents permission to the check job', () => {
    const scoped = lines.filter((line) => /^\s+permissions:/.test(line));
    expect(scoped.length, 'exactly one job-scoped permissions block is expected').toBe(1);
    const head = scoped[0] ?? '';
    const block = lines.slice(lines.indexOf(head), lines.indexOf(head) + 3).join('\n');
    expect(block).toMatch(/contents:\s*read/);
    expect(block, 'the check job must not gain write access').not.toMatch(/contents:\s*write/);
  });
});

describe('check workflow checkout', () => {
  it('does not persist credentials', () => {
    expect(checkoutIndex, 'actions/checkout step is expected').toBeGreaterThanOrEqual(0);
    expect(stepBlock(checkoutIndex)).toMatch(/persist-credentials:\s*false/);
  });
});

describe('check workflow dependency install', () => {
  it('installs dependencies without running scripts and generates WXT types', () => {
    const installLines = lines.filter((line) => line.includes('npm ci'));
    expect(installLines.length, 'an npm ci step is expected').toBeGreaterThanOrEqual(1);
    for (const line of installLines) {
      expect(line, `install must use --ignore-scripts: ${line.trim()}`).toContain('--ignore-scripts');
    }
    const prepareLines = lines.filter((line) => line.includes('wxt prepare'));
    expect(
      prepareLines.length,
      'an explicit npx wxt prepare step is expected because --ignore-scripts skips postinstall',
    ).toBeGreaterThanOrEqual(1);
  });

  it('installs dependencies before generating WXT types', () => {
    const installIndex = lines.findIndex((line) => line.includes('npm ci'));
    const prepareIndex = lines.findIndex((line) => line.includes('wxt prepare'));
    expect(installIndex, 'an npm ci step is expected').toBeGreaterThanOrEqual(0);
    expect(prepareIndex, 'an npx wxt prepare step is expected').toBeGreaterThanOrEqual(0);
    expect(
      installIndex,
      'npm ci must run before npx wxt prepare so npx does not fetch wxt from the registry',
    ).toBeLessThan(prepareIndex);
  });
});

describe('check workflow triggers', () => {
  it('runs on pull_request and push', () => {
    expect(text).toMatch(/pull_request:/);
    expect(text).toMatch(/push:/);
  });

  it('runs make check', () => {
    expect(
      lines.some((line) => /^\s+run: make check$/.test(line)),
      'a make check step is expected',
    ).toBe(true);
  });
});
