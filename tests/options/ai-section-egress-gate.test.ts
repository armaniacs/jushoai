// Pins the save-time resolved-address gate wiring in ai-section: a name that resolves
// into a private range must not reach the store, an unreachable resolver only warns (the
// save proceeds), and the gate runs after the permission prompt (the prompt needs the
// click's user gesture as the first await).
import { describe, it, expect, vi, beforeEach } from 'vitest';

const storeMocks = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }));
vi.mock('../../src/ai/settings-store', () => ({
  loadPublicAiSettings: storeMocks.load,
  saveAiSettings: storeMocks.save,
}));

const permMocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../src/ai/permissions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/ai/permissions')>();
  return { ...actual, requestHostPermission: permMocks.request };
});

const gwMocks = vi.hoisted(() => ({ test: vi.fn() }));
vi.mock('../../src/llm/background-gateway', () => ({
  testAiViaBackground: gwMocks.test,
}));

vi.mock('../../src/ai/secret-store', () => ({
  IdbKeyStore: class {},
}));

const egressMocks = vi.hoisted(() => ({ validate: vi.fn() }));
vi.mock('../../src/ai/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/ai/settings')>();
  return { ...actual, validateAiSettingsResolved: egressMocks.validate };
});

vi.stubGlobal('chrome', { runtime: { id: 'test-ext-id', getURL: (p: string) => `chrome-extension://test-ext-id/${p}` } });

import { mountAiSection } from '../../src/entrypoints/options/ai-section';
import type { PublicAiSettings } from '../../src/ai/types';

const flush = () => new Promise((r) => setTimeout(r, 0));
const settle = async (n = 8) => {
  for (let i = 0; i < n; i++) await flush();
};

const openaiSaved = (): PublicAiSettings => ({
  provider: 'openai',
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-x' },
  gemini: { model: '', apiVersion: 'v1beta' },
  hasKey: { openai: true, gemini: false },
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

function keyInput(root: ParentNode): HTMLInputElement | null {
  return pageOf(root).querySelector('input[type="password"]');
}

function notice(root: ParentNode): HTMLParagraphElement | null {
  return pageOf(root).querySelector('p.saved, p.errors-text');
}

function buttonByText(root: ParentNode, text: string): HTMLButtonElement {
  const found = [...pageOf(root).querySelectorAll('button')].find(
    (b) => b.textContent === text,
  );
  if (!found) throw new Error(`button not found: ${text}`);
  return found as HTMLButtonElement;
}

function setInput(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

beforeEach(() => {
  vi.clearAllMocks();
  permMocks.request.mockResolvedValue(true);
  storeMocks.save.mockResolvedValue(undefined);
  gwMocks.test.mockResolvedValue({ ok: true, category: 'email' });
  egressMocks.validate.mockResolvedValue({ errors: [], unreachable: false });
  document.body.replaceChildren();
});

describe('save-time resolved-address gate', () => {
  it('blocks the store write when the name resolves into a private range', async () => {
    const root = await mountWith(openaiSaved());
    egressMocks.validate.mockResolvedValue({
      errors: ['接続先が内部ネットワークのアドレスに解決されるため指定できません'],
      unreachable: false,
    });
    setInput(keyInput(root)!, 'sk-new-secret');
    buttonByText(root, '保存').click();
    await settle();
    expect(storeMocks.save).not.toHaveBeenCalled();
    const n = notice(root)!;
    expect(n.className).toBe('errors-text');
    expect(n.textContent).toBe('接続先が内部ネットワークのアドレスに解決されるため指定できません');
  });

  it('saves with a warning when the resolver is unreachable', async () => {
    const root = await mountWith(openaiSaved());
    egressMocks.validate.mockResolvedValue({ errors: [], unreachable: true });
    setInput(keyInput(root)!, 'sk-new-secret');
    buttonByText(root, '保存').click();
    await settle();
    expect(storeMocks.save).toHaveBeenCalledOnce();
    const n = notice(root)!;
    expect(n.className).toBe('errors-text');
    expect(n.textContent).toBe('保存しました。接続先のアドレスを解決できなかったため、検証できていません。');
  });

  it('runs the gate after the permission prompt and before the store write', async () => {
    const root = await mountWith(openaiSaved());
    const order: string[] = [];
    permMocks.request.mockImplementation(async () => { order.push('permission'); return true; });
    egressMocks.validate.mockImplementation(async () => { order.push('gate'); return { errors: [], unreachable: false }; });
    storeMocks.save.mockImplementation(async () => { order.push('save'); });
    setInput(keyInput(root)!, 'sk-new-secret');
    buttonByText(root, '保存').click();
    await settle();
    expect(order).toEqual(['permission', 'gate', 'save']);
    expect(storeMocks.save).toHaveBeenCalledOnce();
    const [savedSettings] = storeMocks.save.mock.calls[0] as [PublicAiSettings, Record<string, string>];
    expect(savedSettings.openai.baseUrl).toBe('https://api.openai.com/v1');
    expect(notice(root)!.textContent).toBe('保存しました。');
  });

  it('passes the normalized settings to the gate on an OpenAI-path save', async () => {
    const root = await mountWith(openaiSaved());
    setInput(keyInput(root)!, 'sk-new-secret');
    buttonByText(root, '保存').click();
    await settle();
    expect(egressMocks.validate).toHaveBeenCalledOnce();
    const [savedSettings] = egressMocks.validate.mock.calls[0] as [PublicAiSettings, unknown, unknown];
    expect(savedSettings.openai.baseUrl).toBe('https://api.openai.com/v1');
    expect(storeMocks.save).toHaveBeenCalledOnce();
  });
});
