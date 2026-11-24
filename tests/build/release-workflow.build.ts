// Guards the split release workflow against privilege and supply-chain regressions.
// Reads `.github/workflows/release.yml` as plain text (no YAML parser dependency)
// and asserts the hardening: the build job holds no secret and only
// contents:read (plus the attestation rights), the submit job holds the store
// credentials but runs no project code, artifacts cross jobs by hash-checked
// upload, provenance is attested, and the approval gate stays on submit.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const PATH = '.github/workflows/release.yml';
const text = readFileSync(PATH, 'utf8');
const lines = text.split('\n');

// A job region starts at its `  <name>:` head under `jobs:` and ends before
// the next job head or the end of the file.
const jobsStart = lines.findIndex((line) => line === 'jobs:');
const jobHeads = lines
  .map((line, index) => ({ line, index }))
  .filter(({ line, index }) => index > jobsStart && /^  [A-Za-z0-9_-]+:$/.test(line));

const region = (name: string): string => {
  const at = jobHeads.findIndex(({ line }) => line.trim() === `${name}:`);
  if (at === -1) throw new Error(`job ${name} is expected`);
  const start = jobHeads[at]?.index ?? 0;
  const end = at + 1 < jobHeads.length ? (jobHeads[at + 1]?.index ?? lines.length) : lines.length;
  return lines.slice(start, end).join('\n');
};

const build = region('build');
const submit = region('submit');

// A step head is the nearest `- name:` / `- uses:` / `- run:` line at or
// before the given index; the block runs until the next step head.
const stepHead = (index: number): number => {
  for (let i = index; i >= 0; i -= 1) {
    if (/^\s+- (name|uses|run):/.test(lines[i] ?? '')) return i;
  }
  return index;
};

const stepBlock = (startIndex: number): string => {
  const head = stepHead(startIndex);
  const out: string[] = [];
  for (let i = head; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    if (i > head && /^\s+- (name|uses|run):/.test(line)) break;
    out.push(line);
  }
  return out.join('\n');
};

const usesLines = lines.filter((line) => line.includes('uses:'));

describe('release workflow permissions', () => {
  it('declares no workflow-wide permissions', () => {
    const topLevel = lines.filter((line) => line.startsWith('permissions:'));
    expect(topLevel, 'permissions must be job-scoped, not workflow-wide').toEqual([]);
  });

  it('grants the build job read-only contents plus attestation rights only', () => {
    expect(build).toMatch(/contents:\s*read/);
    expect(build).toMatch(/id-token:\s*write/);
    expect(build).toMatch(/attestations:\s*write/);
    expect(build, 'build must never gain contents:write').not.toMatch(/contents:\s*write/);
  });

  it('grants contents:write to the submit job without attestation rights', () => {
    expect(submit).toMatch(/contents:\s*write/);
    expect(submit, 'attestation rights stay on the build job').not.toMatch(/id-token:/);
    expect(submit, 'attestation rights stay on the build job').not.toMatch(/attestations:/);
  });
});

describe('release workflow credential isolation', () => {
  it('keeps secrets out of the build job', () => {
    expect(build, 'no step in build may touch secrets').not.toContain('secrets.');
    expect(build, 'no step in build may touch secrets').not.toContain('github.token');
  });

  it('keeps the release environment off the build job', () => {
    expect(build, 'only submit waits for approval').not.toMatch(/environment:/);
  });

  it('orders submit after build', () => {
    expect(submit).toMatch(/needs:\s*\[?build\]?/);
  });
});

describe('release workflow checkout', () => {
  it('does not persist credentials', () => {
    const indexes = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.includes('actions/checkout'))
      .map(({ index }) => index);
    expect(indexes.length, 'a checkout step is expected').toBeGreaterThanOrEqual(1);
    for (const index of indexes) {
      expect(stepBlock(index)).toMatch(/persist-credentials:\s*false/);
    }
  });

  it('checks out no code in the submit job', () => {
    expect(submit, 'submit works from artifacts only').not.toMatch(/actions\/checkout/);
  });
});

describe('release workflow dependency install', () => {
  it('installs dependencies without running scripts', () => {
    const installLines = lines.filter((line) => /npm (ci|install)/.test(line));
    expect(installLines.length, 'an install step is expected').toBeGreaterThanOrEqual(1);
    for (const line of installLines) {
      expect(line, `install must use --ignore-scripts: ${line.trim()}`).toContain('--ignore-scripts');
    }
  });

  it('never installs the project dependencies in the submit job', () => {
    expect(submit, 'submit must not run npm ci').not.toContain('npm ci');
  });

  it('uses no dependency cache', () => {
    expect(lines.filter((line) => /^\s+cache:/.test(line)), 'cached setups widen the supply chain').toEqual(
      [],
    );
  });
});

describe('release workflow artifact handoff', () => {
  it('hashes the zips in the build job', () => {
    expect(build).toMatch(/sha256sum/);
    expect(build).toMatch(/SHA256SUMS/);
  });

  it('rechecks the hashes before submitting', () => {
    expect(submit).toMatch(/sha256sum -c/);
    expect(submit).toMatch(/SHA256SUMS/);
  });

  it('hands artifacts over with pinned upload and download actions', () => {
    const upload = usesLines.filter((line) => line.includes('actions/upload-artifact'));
    const download = usesLines.filter((line) => line.includes('actions/download-artifact'));
    expect(upload.length, 'build must upload the artifacts').toBe(1);
    expect(download.length, 'submit must download the artifacts').toBe(1);
    expect(build).toContain(upload[0]);
    expect(submit).toContain(download[0]);
  });
});

describe('release workflow provenance', () => {
  it('attests the zips from the build job with a pinned action', () => {
    const attest = usesLines.filter((line) => line.includes('actions/attest-build-provenance'));
    expect(attest.length, 'build must attest the provenance').toBe(1);
    expect(build).toContain(attest[0]);
    expect(submit, 'attestation stays on the build job').not.toMatch(/attest-build-provenance/);
  });
});

describe('release workflow action pins', () => {
  it('pins every action to a commit SHA with a version comment', () => {
    expect(usesLines.length, 'a uses: step is expected').toBeGreaterThanOrEqual(1);
    for (const line of usesLines) {
      expect(line, `action must be SHA-pinned: ${line.trim()}`).toMatch(/@[0-9a-f]{40}\s+# v/);
    }
  });
});

describe('release workflow submit', () => {
  it('submits with the pinned tool instead of the project dependencies', () => {
    expect(submit).toMatch(/publish-browser-extension@\d+\.\d+\.\d+/);
    expect(submit, 'submit must not invoke wxt or make').not.toMatch(/npx wxt/);
    expect(submit, 'submit must not invoke wxt or make').not.toMatch(/make (check|zip)/);
  });

  it('supports a dry run that skips submission and the release', () => {
    expect(text).toMatch(/workflow_dispatch:/);
    expect(text).toMatch(/dry_run:/);
    expect(submit).toMatch(/--dry-run/);
  });
});

describe('release workflow release creation', () => {
  it('creates the release after a successful submit with the hashes attached', () => {
    const submitIndex = lines.findIndex((line) => line.includes('publish-extension'));
    const releaseIndex = lines.findIndex((line) => line.includes('gh release create'));
    expect(submitIndex, 'a submit step is expected').toBeGreaterThanOrEqual(0);
    expect(releaseIndex, 'a release step is expected').toBeGreaterThanOrEqual(0);
    expect(releaseIndex, 'the release must stay after the submit').toBeGreaterThan(submitIndex);
    expect(stepBlock(releaseIndex)).toMatch(/SHA256SUMS/);
  });

  it('skips the release on dry runs', () => {
    const releaseIndex = lines.findIndex((line) => line.includes('gh release create'));
    expect(stepBlock(releaseIndex)).toMatch(/dry_run/);
  });
});

describe('release workflow approval gate', () => {
  it('binds the submit job to the release environment', () => {
    expect(submit).toMatch(/environment:\s*(release|name:\s*release)/);
  });

  it('still checks that the tag matches package.json', () => {
    expect(build).toMatch(/package\.json/);
    expect(build).toMatch(/GITHUB_REF_NAME/);
  });
});
