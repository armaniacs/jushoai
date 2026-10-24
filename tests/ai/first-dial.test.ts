// First-dial confirmation (trust-on-first-use, VULN-001, CWE-367): the store and
// the gate. Classify/test dial a user-configured cloud origin only after the user
// confirmed it in the settings page; the record is chrome.storage.local, so a
// forged or stale entry fails closed to unconfirmed.
import { describe, it, expect, vi } from 'vitest';
import {
  CONFIRMED_ORIGINS_KEY, confirmOrigin, createFirstDialGate, isOriginConfirmed, loadConfirmedOrigins,
} from '../../src/ai/first-dial';

function storageFake(initial: unknown = undefined) {
  const store = new Map<string, unknown>(initial === undefined ? [] : [[CONFIRMED_ORIGINS_KEY, initial]]);
  return {
    get: async (key: string) => (store.has(key) ? { [key]: store.get(key) } : {}),
    set: async (patch: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(patch)) store.set(k, v);
    },
  };
}

describe('createFirstDialGate', () => {
  it('blocks a never-confirmed origin', async () => {
    const gate = createFirstDialGate({ load: async () => [] });
    expect(await gate('https://never-confirmed.example.com')).toEqual({ ok: false, reason: 'unconfirmed' });
  });

  it('allows a confirmed origin', async () => {
    const gate = createFirstDialGate({
      load: async () => [{ origin: 'https://confirmed.example.com', addresses: ['93.184.216.34'], confirmedAt: 1 }],
    });
    expect(await gate('https://confirmed.example.com')).toEqual({ ok: true });
  });

  it('counts a port change as a new origin to confirm', async () => {
    const gate = createFirstDialGate({
      load: async () => [{ origin: 'https://host.example.com', addresses: ['93.184.216.34'], confirmedAt: 1 }],
    });
    expect(await gate('https://host.example.com:8443')).toEqual({ ok: false, reason: 'unconfirmed' });
  });

  it('fails closed on a malformed origin', async () => {
    const gate = createFirstDialGate({ load: async () => [] });
    expect(await gate('not a url')).toEqual({ ok: false, reason: 'unconfirmed' });
  });

  it('reads a storage failure as unconfirmed instead of throwing', async () => {
    const gate = createFirstDialGate({ load: async () => { throw new Error('storage gone'); } });
    await expect(gate('https://any.example.com')).resolves.toEqual({ ok: false, reason: 'unconfirmed' });
  });
});

describe('confirmed-origin record', () => {
  it('starts empty and filters malformed entries fail-safe', async () => {
    const fake = storageFake([{ origin: 'https://ok.example.com', addresses: ['1.2.3.4'], confirmedAt: 1 }, { nope: true }, null]);
    vi.stubGlobal('chrome', { storage: { local: fake } });
    try {
      expect(await loadConfirmedOrigins()).toEqual([
        { origin: 'https://ok.example.com', addresses: ['1.2.3.4'], confirmedAt: 1 },
      ]);
      expect(await isOriginConfirmed('https://ok.example.com')).toBe(true);
      expect(await isOriginConfirmed('https://other.example.com')).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('upserts one confirmation keyed by origin', async () => {
    const fake = storageFake();
    vi.stubGlobal('chrome', { storage: { local: fake } });
    try {
      await confirmOrigin('https://a.example.com', ['93.184.216.34']);
      await confirmOrigin('https://b.example.com', ['2606:2800:220:1:248:1893:25c8:1946']);
      await confirmOrigin('https://a.example.com', ['93.184.216.35']);
      const stored = await loadConfirmedOrigins();
      expect(stored).toHaveLength(2);
      expect(stored.find((c) => c.origin === 'https://a.example.com')?.addresses).toEqual(['93.184.216.35']);
      expect(stored.find((c) => c.origin === 'https://b.example.com')?.addresses).toEqual([
        '2606:2800:220:1:248:1893:25c8:1946',
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
