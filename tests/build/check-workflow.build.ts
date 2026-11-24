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
    const topLevel = lines.filter((line) => line.startsWith('permissions:'));
    expect(topLevel, 'permissions must be job-scoped, not workflow-wide').toEqual([]);
  });

  it('grants read-only contents permission to every job', () => {
    // Job ids are the two-space-indented keys directly under `jobs:`. A new
    // job without its own block would inherit the repository default, so the
    // block count must track the job count exactly.
    const jobsIndex = lines.findIndex((line) => line.startsWith('jobs:'));
    const jobIds = lines
      .slice(jobsIndex + 1)
      .filter((line) => /^  [A-Za-z0-9_-]+:\s*$/.test(line));
    expect(jobIds.length, 'at least one job is expected').toBeGreaterThan(0);
    const heads: number[] = [];
    lines.forEach((line, i) => {
      if (/^\s+permissions:/.test(line)) heads.push(i);
    });
    expect(
      heads.length,
      'every job must scope its own permissions block (one per job, none workflow-wide)',
    ).toBe(jobIds.length);
    for (const i of heads) {
      const block = lines.slice(i, i + 3).join('\n');
      expect(block).toMatch(/contents:\s*read/);
      expect(block, 'no job must gain write access').not.toMatch(/contents:\s*write/);
    }
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

describe('check workflow dependency audit', () => {
  // Audit step blocks are scanned from their `- name:` line because step
  // options such as continue-on-error sit above the `run:` line.
  const auditBlock = (marker: string): string => {
    const nameIndex = lines.findIndex((line) => line.includes(marker));
    expect(nameIndex, `a step named like "${marker}" is expected`).toBeGreaterThanOrEqual(0);
    return stepBlock(nameIndex);
  };

  it('fails on high-or-worse production advisories via the official registry', () => {
    const block = auditBlock('Audit production dependencies');
    expect(block).toMatch(/npm audit --omit=dev/);
    expect(block).toMatch(/--audit-level=high/);
    expect(block).toMatch(/--registry=https:\/\/registry\.npmjs\.org\//);
    expect(block, 'the production audit must fail the job').not.toMatch(/continue-on-error:\s*true/);
  });

  it('warns only on development advisories', () => {
    const block = auditBlock('Audit development dependencies');
    expect(block).toMatch(/npm audit --omit=prod/);
    expect(block).toMatch(/--audit-level=high/);
    expect(block).toMatch(/--registry=https:\/\/registry\.npmjs\.org\//);
    expect(block, 'the dev audit must not fail the job').toMatch(/continue-on-error:\s*true/);
  });

  it('never rewrites the lockfile from the audit steps', () => {
    const auditIndexes = lines
      .map((line, i) => ({ line, i }))
      .filter(({ line }) => line.includes('npm audit'))
      .map(({ i }) => i);
    expect(auditIndexes.length, 'audit steps are expected').toBeGreaterThanOrEqual(2);
    for (const i of auditIndexes) {
      expect(stepBlock(i), 'audit must not reinstall dependencies').not.toMatch(/npm install/);
    }
  });
});
