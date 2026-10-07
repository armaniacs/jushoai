import { describe, it, expect, vi, afterEach } from 'vitest';
import { analyzeCurrentTab } from '../../src/entrypoints/popup/main';

// Legacy Bridge (Low): `analyzeCurrentTab` folds any unknown future reason
// into 'no-form', so an old popup mislabels a new retryable failure as "no
// form found". This test locks the CURRENT mapping; Phase 5 should point the
// fallback at the generic message instead and update this test.

afterEach(() => vi.unstubAllGlobals());

function stubTabs(query: unknown, sendMessage: unknown) {
  vi.stubGlobal('chrome', {
    runtime: { openOptionsPage: vi.fn(async () => {}) },
    tabs: { query: vi.fn(async () => query), sendMessage: vi.fn(sendMessage as never) },
  });
}

describe('analyzeCurrentTab unknown-reason fallback (Legacy Bridge Low)', () => {
  it('maps a future reason to no-form today', async () => {
    stubTabs([{ id: 7 }], async () => ({ ok: false, reason: 'needs-permission' }));
    await expect(analyzeCurrentTab()).resolves.toEqual({ ok: false, reason: 'no-form' });
  });

  it('passes through the known vocabulary unchanged', async () => {
    stubTabs([{ id: 7 }], async () => ({ ok: false, reason: 'error' }));
    await expect(analyzeCurrentTab()).resolves.toEqual({ ok: false, reason: 'error' });
    stubTabs([{ id: 7 }], async () => ({ ok: true }));
    await expect(analyzeCurrentTab()).resolves.toEqual({ ok: true });
  });

  it('reports no-tab when the tab cannot be messaged', async () => {
    stubTabs([{ id: 7 }], async () => { throw new Error('no listener'); });
    await expect(analyzeCurrentTab()).resolves.toEqual({ ok: false, reason: 'no-tab' });
  });
});
