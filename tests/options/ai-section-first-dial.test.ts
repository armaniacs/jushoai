// Pins the first-dial confirmation block copy (VULN-001): the unconfirmed block
// must name the origin and explain what the address list is (the DNS-resolved
// IPs of the saved hostname), so a bare IP never stands alone.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const storeMocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('../../src/ai/settings-store', () => ({
  loadPublicAiSettings: storeMocks.load,
}));

vi.mock('../../src/llm/background-gateway', () => ({
  testAiViaBackground: vi.fn(),
}));

vi.mock('../../src/ai/secret-store', () => ({
  IdbKeyStore: class {},
}));

const fdMocks = vi.hoisted(() => ({ isConfirmed: vi.fn(), confirm: vi.fn() }));
vi.mock('../../src/ai/first-dial', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/ai/first-dial')>();
  return { ...actual, isOriginConfirmed: fdMocks.isConfirmed, confirmOrigin: fdMocks.confirm };
});

const resolveMocks = vi.hoisted(() => ({ resolve: vi.fn() }));
vi.mock('../../src/ai/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/ai/settings')>();
  return { ...actual, resolveConfirmedAddresses: resolveMocks.resolve };
});

vi.stubGlobal('chrome', { runtime: { id: 'test-ext-id', getURL: (p: string) => `chrome-extension://test-ext-id/${p}` } });

import { mountAiSection } from '../../src/entrypoints/options/ai-section';
import type { PublicAiSettings } from '../../src/ai/types';

const flush = () => new Promise((r) => setTimeout(r, 0));
const settle = async (n = 10) => {
  for (let i = 0; i < n; i++) await flush();
};

const openaiSaved = (): PublicAiSettings => ({
  provider: 'openai',
  openai: { baseUrl: 'https://api.example.com/v1', model: 'gpt-x' },
  gemini: { model: '', apiVersion: 'v1beta' },
  hasKey: { openai: true, gemini: false },
});

function pageOf(root: ParentNode): HTMLElement {
  return root.querySelector('#ai') as HTMLElement;
}

function approveButton(root: ParentNode): HTMLButtonElement | undefined {
  return [...pageOf(root).querySelectorAll('button')].find(
    (b) => b.textContent === 'この接続先を承認する',
  ) as HTMLButtonElement | undefined;
}

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

describe('first-dial confirmation block copy', () => {
  it('names the origin and explains the address list before approval', async () => {
    storeMocks.load.mockResolvedValue({ ...openaiSaved() });
    fdMocks.isConfirmed.mockResolvedValue(false);
    resolveMocks.resolve.mockResolvedValue(['153.120.132.21']);
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    mountAiSection(root);
    await settle();

    const text = pageOf(root).textContent ?? '';
    expect(text).toContain('このAIプロバイダを使うには');
    expect(text).toContain('への送信を承認しなければなりません');
    expect(text).toContain('承認するまで送信しません');
    expect(text).toContain('https://api.example.com');
    expect(text).toContain('api.example.com');
    expect(text).toContain('153.120.132.21');
    expect(text).toContain('IPアドレス');
    expect(text).toContain('ベースURL');
    expect(approveButton(root)).toBeTruthy();
  });

  it('approves the saved origin with the shown addresses', async () => {
    storeMocks.load.mockResolvedValue({ ...openaiSaved() });
    fdMocks.isConfirmed.mockResolvedValue(false);
    resolveMocks.resolve.mockResolvedValue(['153.120.132.21']);
    fdMocks.confirm.mockResolvedValue(undefined);
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    mountAiSection(root);
    await settle();

    approveButton(root)!.click();
    await settle();
    expect(fdMocks.confirm).toHaveBeenCalledWith('https://api.example.com', ['153.120.132.21']);
  });

  it('hides the block when the endpoint cannot be resolved', async () => {
    storeMocks.load.mockResolvedValue({ ...openaiSaved() });
    fdMocks.isConfirmed.mockResolvedValue(false);
    resolveMocks.resolve.mockResolvedValue([]);
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    mountAiSection(root);
    await settle();

    expect(approveButton(root)).toBeUndefined();
    expect(pageOf(root).textContent ?? '').not.toContain('IPアドレス');
  });

  it('names the origin in the confirmed state line', async () => {    storeMocks.load.mockResolvedValue({ ...openaiSaved() });
    fdMocks.isConfirmed.mockResolvedValue(true);
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    mountAiSection(root);
    await settle();

    const text = pageOf(root).textContent ?? '';
    expect(text).toContain('https://api.example.com');
    expect(text).toContain('確認済み');
    expect(approveButton(root)).toBeUndefined();
  });
});
