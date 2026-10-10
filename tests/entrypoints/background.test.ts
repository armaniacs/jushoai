import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUDIT_KEY, appendEntry, EMPTY_AUDIT_STATE, type AuditDraft } from '../../src/ai/audit-log';

type Listener = (
  msg: unknown,
  sender: { id?: string; tab?: { url?: string } },
  sendResponse: (res: unknown) => void,
) => boolean;

const draft = (over: Partial<AuditDraft> = {}): AuditDraft => ({
  provider: 'openai', host: 'h', model: 'm', purpose: 'classify', pageUrl: 'https://e.com/p',
  fieldCount: 1, request: 'P', response: 'R', chunkIndex: null, chunkCount: null,
  result: 'success', httpStatus: 200, retried: false, durationMs: 1, ...over,
});

const listeners: Listener[] = [];
let store: Record<string, unknown>;
let setFailure: Error | null = null;
let loaded = false;

const setup = async () => {
  store = {};
  setFailure = null;
  vi.stubGlobal('chrome', {
    runtime: {
      id: 'ext-id',
      onMessage: { addListener: (fn: Listener) => { listeners.push(fn); } },
    },
    storage: {
      local: {
        get: async (key: string) => (key in store ? { [key]: store[key] } : {}),
        set: async (obj: Record<string, unknown>) => {
          await Promise.resolve();
          if (setFailure) throw setFailure;
          Object.assign(store, obj);
        },
      },
      onChanged: { addListener: () => {} },
    },
  });
  vi.stubGlobal('defineBackground', (fn: () => void) => fn());
  if (!loaded) {
    await import('../../src/entrypoints/background');
    loaded = true;
  }
};

afterEach(() => { vi.unstubAllGlobals(); });

const dispatch = (msg: unknown, sender: { id?: string } = { id: 'ext-id' }) => {
  let resolve!: (v: unknown) => void;
  const responded = new Promise<unknown>((r) => { resolve = r; });
  const ret = listeners[0]!(msg, sender, (res) => resolve(res));
  return { ret, responded };
};

describe('background: audit-clear dispatch', () => {
  it('clears the shared store under the sender gate and answers ok', async () => {
    await setup();
    const seeded = appendEntry(EMPTY_AUDIT_STATE, draft(), 1000);
    store[AUDIT_KEY] = seeded;
    const { ret, responded } = dispatch({ type: 'audit-clear' });
    expect(ret).toBe(true);
    expect(await responded).toEqual({ ok: true });
    expect(store[AUDIT_KEY]).toEqual({ nextId: seeded.nextId, entries: [] });
  });

  it('answers ok:false and keeps entries when the clear write fails', async () => {
    await setup();
    const seeded = appendEntry(EMPTY_AUDIT_STATE, draft(), 1000);
    store[AUDIT_KEY] = seeded;
    setFailure = new Error('quota exceeded');
    const { responded } = dispatch({ type: 'audit-clear' });
    expect(await responded).toEqual({ ok: false });
    expect(store[AUDIT_KEY]).toEqual(seeded);
  });

  it('ignores audit-clear from a foreign sender id', async () => {
    await setup();
    const seeded = appendEntry(EMPTY_AUDIT_STATE, draft(), 1000);
    store[AUDIT_KEY] = seeded;
    const { ret } = dispatch({ type: 'audit-clear' }, { id: 'other-extension' });
    expect(ret).toBe(false);
    expect(store[AUDIT_KEY]).toEqual(seeded);
  });
});
