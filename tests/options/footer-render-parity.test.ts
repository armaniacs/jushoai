// PBI-220 rendered-pages pin: the profile and address pages rendered by the
// real options entrypoint carry identical footers. The dom-level
// footer-parity.test.ts pins the generator itself; this file pins that both
// pages actually use it (BDD scenario 1 end to end).
import { describe, it, expect, vi } from 'vitest';

if (!globalThis.crypto?.randomUUID) {
  const g = globalThis as unknown as { crypto: Crypto };
  const c = g.crypto ?? ({} as Crypto);
  (c as unknown as Record<string, unknown>).randomUUID ??= (() =>
    `00000000-0000-4000-8000-${Math.floor(Math.random() * 0xffffffffffff)
      .toString(16)
      .padStart(12, '0')}`) as unknown as Crypto['randomUUID'];
  g.crypto = c;
}

vi.mock('../../src/storage', () => ({
  newId: () => 'test-id',
  loadData: async () => ({ profiles: [], addresses: [] }),
  saveData: async () => {},
}));

vi.mock('../../src/entrypoints/options/ai-section', () => ({
  mountAiSection: vi.fn(),
}));

vi.mock('../../src/entrypoints/options/exclusion-section', () => ({
  mountExclusionSection: vi.fn(),
}));

vi.mock('../../src/entrypoints/options/mapping-section', () => ({
  mountMappingSection: vi.fn(),
}));

document.body.innerHTML = '<div id="side"></div><main id="app"></main><main id="ai-app"></main><main id="exclusion-app"></main><main id="mapping-app"></main><main id="audit-app"></main>';

await import('../../src/entrypoints/options/main');

// Lets the module-level `void loadData().then(...)` settle so `state` is set.
await new Promise((r) => setTimeout(r, 0));

describe('rendered profile/address footers (PBI-220)', () => {
  it('are identical across both pages', () => {
    const app = document.getElementById('app')!;
    const profileFooter = app.querySelector('#profiles')!.lastElementChild!;
    const addressFooter = app.querySelector('#addresses')!.lastElementChild!;
    expect(profileFooter.tagName).toBe('DIV');
    expect(profileFooter.className).toBe('row');
    expect(addressFooter.tagName).toBe('DIV');
    expect(addressFooter.className).toBe('row');
    expect(profileFooter.outerHTML).toBe(addressFooter.outerHTML);
    expect(profileFooter.outerHTML).toBe(
      '<div class="row"><button type="button">保存</button><button type="button">フォームから取り込む</button></div>',
    );
  });
});
