// Pins the declaration / request / use agreement for host permissions. The audit failure
// class this prevents: the code fetches a host the permission request does not cover, and
// every test stays green because nobody compares the three sides. It also asserts the
// exported egress policy and the gate behavior agree, so the fail-closed declaration and
// the enforcement cannot drift apart silently.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createEgressCheck, DOH_ORIGIN, EGRESS_UNVERIFIED_POLICY } from '../../src/ai/settings';
import { originPatternsFor, requiredHostOrigins } from '../../src/ai/permissions';
import { DEFAULT_AI_SETTINGS, type AiSettings } from '../../src/ai/types';

const sample = (provider: AiSettings['provider']): AiSettings => ({
  ...DEFAULT_AI_SETTINGS,
  provider,
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'm' },
});

// The use set is taken from the code so new fetch targets are followed automatically.
// openai: the saved connection origin (originPatternsFor) plus the resolver origin the
// dial-time gate resolves (DOH_ORIGIN). gemini: the compile-time destination only; the
// dial-time gate is not wired for gemini (recorded in pbi/2026-10-11-12).
const fetchTargets = (s: AiSettings): string[] =>
  s.provider === 'gemini' ? originPatternsFor(s) : [...originPatternsFor(s), DOH_ORIGIN];

// A pattern covers another when the scheme and host match; a `*` host covers every host.
const covers = (outer: string, inner: string): boolean => {
  const parsed = (pattern: string): { scheme: string; host: string } => {
    const [scheme, rest] = pattern.split('://');
    return { scheme: scheme ?? '', host: (rest ?? '').split('/')[0] ?? '' };
  };
  const o = parsed(outer);
  const i = parsed(inner);
  return (o.scheme === i.scheme || o.scheme === '*') && (o.host === '*' || o.host === i.host);
};

const readManifest = (dir: string) =>
  JSON.parse(readFileSync(`dist/${dir}/manifest.json`, 'utf8')) as {
    host_permissions?: string[];
    optional_host_permissions?: string[];
  };

describe('the request set covers the fetch targets', () => {
  it.each(['openai', 'gemini'] as const)('covers every fetch target for %s', (provider) => {
    const requests = requiredHostOrigins(sample(provider));
    for (const target of fetchTargets(sample(provider))) {
      const covered = requests.some((pattern) => covers(pattern, target));
      expect(covered, `no requested pattern covers the fetch target ${target}`).toBe(true);
    }
  });

  it('requests nothing for providers that use no network', () => {
    expect(requiredHostOrigins(sample('none'))).toEqual([]);
    expect(requiredHostOrigins(sample('built-in'))).toEqual([]);
  });

  it('requests the resolver origin for cloud providers', () => {
    expect(requiredHostOrigins(sample('openai'))).toContain('https://dns.google/*');
  });
});

describe('the manifest declaration covers the request set', () => {
  it.each(['chrome-mv3', 'firefox-mv3'])('%s declares every requested origin', (dir) => {
    const manifest = readManifest(dir);
    const declared = [...(manifest.host_permissions ?? []), ...(manifest.optional_host_permissions ?? [])];
    for (const pattern of requiredHostOrigins(sample('openai'))) {
      const found = declared.some((d) => covers(d, pattern));
      expect(found, `${dir} does not declare the requested pattern ${pattern}`).toBe(true);
    }
  });
});

describe('the egress policy declaration matches the gate behavior', () => {
  it('keeps the declared policy and the unconfirmed-resolution verdict in agreement', async () => {
    expect(EGRESS_UNVERIFIED_POLICY).toBe('block');
    const unreachable = createEgressCheck({
      fetch: (async () => {
        throw new TypeError('doh unreachable');
      }) as typeof fetch,
    });
    await expect(unreachable(new URL('https://api.openai.com/v1'))).resolves.toEqual({ ok: false, internal: false });
  });
});
