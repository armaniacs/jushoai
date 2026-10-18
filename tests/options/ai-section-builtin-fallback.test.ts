// PBI-32: Firefoxでbuilt-in保存値がnoneに正規化されたとき、設定UIに
// Prompt APIなしの旨の注意が表示され、クラウド切替の保存で消えること。
import { describe, it, expect, vi, beforeEach } from 'vitest';

const storeMocks = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }));
vi.mock('../../src/ai/settings-store', () => ({
  loadPublicAiSettings: storeMocks.load,
  saveAiSettings: storeMocks.save,
}));

vi.mock('../../src/ai/permissions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/ai/permissions')>();
  return { ...actual, requestHostPermission: vi.fn(async () => true) };
});

vi.mock('../../src/ai/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/ai/settings')>();
  return { ...actual, validateAiSettingsResolved: vi.fn(async () => ({ errors: [] })) };
});

vi.mock('../../src/llm/background-gateway', () => ({
  testAiViaBackground: vi.fn(),
}));

vi.mock('../../src/ai/secret-store', () => ({
  IdbKeyStore: class {},
}));

vi.stubGlobal('chrome', { runtime: { id: 'test-ext-id', getURL: (p: string) => `chrome-extension://test-ext-id/${p}` } });

import { BUILT_IN_FALLBACK_NOTICE, mountAiSection } from '../../src/entrypoints/options/ai-section';
import type { PublicAiSettings } from '../../src/ai/types';

const flush = () => new Promise((r) => setTimeout(r, 0));
const settle = async (n = 8) => {
  for (let i = 0; i < n; i++) await flush();
};

const fallbackSettings = (): PublicAiSettings => ({
  provider: 'none',
  openai: { baseUrl: '', model: '' },
  gemini: { model: '', apiVersion: 'v1beta' },
  hasKey: { openai: false, gemini: false },
  builtInDisabled: true,
});

async function mountWith(settings: PublicAiSettings) {
  storeMocks.load.mockResolvedValue({ ...settings });
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  mountAiSection(root);
  await settle();
  return root;
}

function pageOf(root: ParentNode): HTMLElement {
  return root.querySelector('#ai') as HTMLElement;
}

function providerSelect(root: ParentNode): HTMLSelectElement {
  return pageOf(root).querySelectorAll('select')[0] as HTMLSelectElement;
}

function fireChange(select: HTMLSelectElement, value: string) {
  select.value = value;
  select.dispatchEvent(new Event('change'));
}

function setInput(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function buttonByText(root: ParentNode, text: string): HTMLButtonElement {
  const found = [...pageOf(root).querySelectorAll('button')].find(
    (b) => b.textContent === text,
  );
  if (!found) throw new Error(`button not found: ${text}`);
  return found as HTMLButtonElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  storeMocks.save.mockResolvedValue(undefined);
  document.body.replaceChildren();
});

describe('built-in fallback notice (PBI-32)', () => {
  it('shows the Prompt API notice and serves none when built-in was disabled', async () => {
    const root = await mountWith(fallbackSettings());
    const page = pageOf(root);
    expect(page.textContent).toContain(BUILT_IN_FALLBACK_NOTICE);
    expect(page.textContent).toContain('Prompt API');
    expect(providerSelect(root).value).toBe('none');
  });

  it('shows no notice without the fallback flag', async () => {
    const root = await mountWith({ ...fallbackSettings(), builtInDisabled: false });
    expect(pageOf(root).textContent).not.toContain(BUILT_IN_FALLBACK_NOTICE);
  });

  it('clears the notice after switching to a cloud provider and saving (no write-back)', async () => {
    const root = await mountWith(fallbackSettings());
    expect(pageOf(root).textContent).toContain(BUILT_IN_FALLBACK_NOTICE);
    fireChange(providerSelect(root), 'openai');
    await settle(2);
    // Loopback endpoints need no API key, so the save validates without secrets.
    const baseUrl = [...pageOf(root).querySelectorAll('label')]
      .find((l) => l.querySelector('span')?.textContent === 'ベース URL')
      ?.querySelector('input')!;
    const model = [...pageOf(root).querySelectorAll('label')]
      .find((l) => l.querySelector('span')?.textContent === 'モデル名')
      ?.querySelector('input')!;
    setInput(baseUrl, 'http://localhost:11434/v1');
    setInput(model, 'm');
    storeMocks.load.mockResolvedValue({
      ...fallbackSettings(),
      provider: 'openai',
      openai: { baseUrl: 'http://localhost:11434/v1', model: 'm' },
      builtInDisabled: false,
    });
    buttonByText(root, '保存').click();
    await settle();
    expect(storeMocks.save).toHaveBeenCalledOnce();
    expect(pageOf(root).textContent).not.toContain(BUILT_IN_FALLBACK_NOTICE);
    expect(pageOf(root).textContent).toContain('保存しました。');
  });
});
