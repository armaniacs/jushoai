// PBI-89: connection-test cooldown regression tests.
// Uses fake timers so the 3s cooldown is deterministic: mount settles and the
// cooldown expiry are both driven via advanceTimersByTimeAsync.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

const gwMocks = vi.hoisted(() => ({ test: vi.fn() }));
vi.mock('../../src/llm/background-gateway', () => ({
  testAiViaBackground: gwMocks.test,
}));

vi.mock('../../src/ai/secret-store', () => ({
  IdbKeyStore: class {},
}));

vi.stubGlobal('chrome', { runtime: { id: 'test-ext-id', getURL: (p: string) => `chrome-extension://test-ext-id/${p}` } });

import {
  mountAiSection, TEST_COOLDOWN_MS, isTestCoolingDown, testCooldownRemainingSec,
} from '../../src/entrypoints/options/ai-section';
import type { PublicAiSettings } from '../../src/ai/types';

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
  await vi.advanceTimersByTimeAsync(0);
  return root;
}

function testButton(root: ParentNode): HTMLButtonElement {
  const found = [...root.querySelectorAll('button')].find(
    (b) => b.textContent === '接続テスト（保存済みの設定で実行）',
  );
  if (!found) throw new Error('test button not found');
  return found as HTMLButtonElement;
}

function notice(root: ParentNode): HTMLElement | null {
  return root.querySelector('p.saved, ul.errors');
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  gwMocks.test.mockResolvedValue({ ok: true, category: 'email' });
  document.body.replaceChildren();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('cooldown constant', () => {
  it('stays inside the 3-5s acceptance window and never 0', () => {
    expect(TEST_COOLDOWN_MS).toBeGreaterThan(0);
    expect(TEST_COOLDOWN_MS).toBeGreaterThanOrEqual(3000);
    expect(TEST_COOLDOWN_MS).toBeLessThanOrEqual(5000);
  });

  it('isTestCoolingDown flips exactly at the boundary', () => {
    const state = { cooldownUntil: 10_000 };
    expect(isTestCoolingDown(state, 9999)).toBe(true);
    expect(isTestCoolingDown(state, 10_000)).toBe(false);
    expect(isTestCoolingDown(state, 10_001)).toBe(false);
  });

  it('remaining seconds never shows 0', () => {
    expect(testCooldownRemainingSec({ cooldownUntil: 10_000 }, 9999)).toBe(1);
    expect(testCooldownRemainingSec({ cooldownUntil: 13_000 }, 10_000)).toBe(3);
  });
});

describe('cooldown behavior', () => {
  it('single press still resolves promptly with the unchanged texts', async () => {
    const root = await mountWith(openaiSaved());
    testButton(root).click();
    // The "testing" notice is rendered synchronously before the await.
    expect(notice(root)!.textContent).toBe('接続テスト中…');
    await vi.advanceTimersByTimeAsync(0);
    expect(gwMocks.test).toHaveBeenCalledTimes(1);
    expect(notice(root)!.textContent).toBe('接続できました（判定: email）。');
  });

  it('disables the button after success and blocks extra ai-test requests', async () => {
    const root = await mountWith(openaiSaved());
    testButton(root).click();
    await vi.advanceTimersByTimeAsync(0);
    const btn = testButton(root);
    expect(btn.disabled).toBe(true);
    btn.click();
    btn.click();
    await vi.advanceTimersByTimeAsync(0);
    expect(gwMocks.test).toHaveBeenCalledTimes(1);
    expect(testButton(root).disabled).toBe(true);
    // Cooldown is visible without changing the label: disabled + title.
    expect(testButton(root).title).toContain('あと');
  });

  it('enters cooldown on failure and on background silence too', async () => {
    const root = await mountWith(openaiSaved());
    gwMocks.test.mockResolvedValueOnce({ ok: false, reason: 'auth' });
    testButton(root).click();
    await vi.advanceTimersByTimeAsync(0);
    expect(notice(root)!.textContent).toContain('認証に失敗しました');
    expect(testButton(root).disabled).toBe(true);
    testButton(root).click();
    await vi.advanceTimersByTimeAsync(0);
    expect(gwMocks.test).toHaveBeenCalledTimes(1);

    const root2 = await mountWith(openaiSaved());
    gwMocks.test.mockResolvedValueOnce(null);
    testButton(root2).click();
    await vi.advanceTimersByTimeAsync(0);
    expect(notice(root2)!.textContent).toBe('バックグラウンドが応答しませんでした。');
    expect(testButton(root2).disabled).toBe(true);
    testButton(root2).click();
    await vi.advanceTimersByTimeAsync(0);
    expect(gwMocks.test).toHaveBeenCalledTimes(2);
  });

  it('re-enables automatically after the cooldown and accepts a retest', async () => {
    const root = await mountWith(openaiSaved());
    testButton(root).click();
    await vi.advanceTimersByTimeAsync(0);
    expect(testButton(root).disabled).toBe(true);
    await vi.advanceTimersByTimeAsync(TEST_COOLDOWN_MS);
    expect(testButton(root).disabled).toBe(false);
    expect(testButton(root).title).toBe('');
    testButton(root).click();
    await vi.advanceTimersByTimeAsync(0);
    expect(gwMocks.test).toHaveBeenCalledTimes(2);
  });

  it('keeps the in-flight double-execution guard', async () => {
    const root = await mountWith(openaiSaved());
    let resolveTest!: (v: unknown) => void;
    gwMocks.test.mockImplementationOnce(() => new Promise((r) => { resolveTest = r; }));
    const first = testButton(root);
    first.click();
    first.click();
    await vi.advanceTimersByTimeAsync(0);
    expect(gwMocks.test).toHaveBeenCalledTimes(1);
    resolveTest({ ok: true, category: 'email' });
    await vi.advanceTimersByTimeAsync(0);
    expect(notice(root)!.textContent).toBe('接続できました（判定: email）。');
  });
});

describe('dispose', () => {
  it('cancels the pending cooldown timer', async () => {
    storeMocks.load.mockResolvedValue({ ...openaiSaved() });
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const dispose = mountAiSection(root);
    await vi.advanceTimersByTimeAsync(0);
    testButton(root).click();
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    dispose();
    expect(vi.getTimerCount()).toBe(0);
    // Firing nothing on advance: no rerender can touch the torn-down section.
    await vi.advanceTimersByTimeAsync(TEST_COOLDOWN_MS);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('drops a settings load that resolves after dispose instead of rendering', async () => {
    let resolveLoad!: (v: PublicAiSettings) => void;
    storeMocks.load.mockReturnValue(new Promise((r) => { resolveLoad = r; }));
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const dispose = mountAiSection(root);
    expect(root.textContent).toContain('読み込み中…');
    dispose();
    resolveLoad(openaiSaved());
    await vi.advanceTimersByTimeAsync(0);
    // The disposed instance must not render: no button ever appears.
    expect(root.textContent).toContain('読み込み中…');
    expect(root.querySelector('button')).toBeNull();
  });
});
