// Guide visibility across tab switches: the floating first-time guide lives
// in #float-root (outside the hidden #app), so side-nav clicks — which go
// through setActivePage/replaceState with no hashchange and no render — must
// still sync its visibility. No mutation of src; DOM assertions only.
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
  loadData: async () => ({
    profiles: [],
    addresses: [],
  }),
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

const guide = () => document.querySelector('#float-root .float-guide');

function clickNav(section: string): void {
  const link = document.querySelector(`#side nav a[data-section="${section}"]`);
  expect(link).not.toBeNull();
  (link as HTMLAnchorElement).click();
}

describe('floating guide visibility on tab switches', () => {
  it('shows on profiles, hides on the AI tab, and shows again back on profiles', () => {
    expect(guide()).not.toBeNull();
    clickNav('ai');
    expect(guide()).toBeNull();
    clickNav('profiles');
    expect(guide()).not.toBeNull();
  });
});
