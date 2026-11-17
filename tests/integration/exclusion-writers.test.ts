import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountExclusionSection } from '../../src/entrypoints/options/exclusion-section';
import { registerExclusionChoice } from '../../src/content/exclusion-register';
import { EXCLUDED_URLS_KEY, loadExcludedUrls, saveExcludedUrls } from '../../src/exclusions-store';

// PBI-241: the exclusion list has two writers — the options page (edit list,
// then 保存 overwrites the whole store) and the banner quick-register
// (load → add → save). These tests run both against one fake storage, with the
// real section, the real store adapter and the real register flow, so the
// interleaving is the real one: the options page boots, the other tab
// registers, then the options page saves.
const EXISTING = 'https://example.com/legacy/';
const QUICK = 'https://docs.google.com/spreadsheets/';
const ADDED = 'https://example.com/added/';

let store: Record<string, unknown>;
let getError: Error | null;
let setError: Error | null;

beforeEach(() => {
  store = {};
  getError = null;
  setError = null;
  document.body.innerHTML = '<div id="app"></div><main id="ai-app"></main><main id="exclusion-app"></main><main id="audit-app"></main>';
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: async (key: string) => {
          if (getError) throw getError;
          return key in store ? { [key]: store[key] } : {};
        },
        set: async (obj: Record<string, unknown>) => {
          if (setError) throw setError;
          Object.assign(store, obj);
        },
      },
    },
  });
});

const mount = async (): Promise<void> => {
  mountExclusionSection(root());
  await vi.waitFor(() => { if (!document.querySelector('#exclusion-app h2')) throw new Error('not rendered'); });
};

const root = (): HTMLElement => document.getElementById('exclusion-app')!;

// The content-side writer: the same load→add→save flow as the banner, wired to
// the real store so it races the options page on the same storage.
const quickRegister = async (raw: string): Promise<void> => {
  const showError = vi.fn();
  await registerExclusionChoice('prefix', {
    loadExcluded: loadExcludedUrls,
    saveExcluded: saveExcludedUrls,
    candidates: { exact: raw, prefix: raw },
    showError,
    close: vi.fn(),
    setBusy: vi.fn(),
  });
  expect(showError).not.toHaveBeenCalled();
};

const buttonByText = (text: string): HTMLButtonElement => {
  const found = [...root().querySelectorAll('button')].find((b) => b.textContent === text);
  if (!found) throw new Error(`button not found: ${text}`);
  return found as HTMLButtonElement;
};

const click = (el: HTMLElement): void => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); };

const type = (value: string): void => {
  const field = root().querySelector('input')! as HTMLInputElement;
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
};

const items = (): string[] => [...root().querySelectorAll('.exclusion-list li')].map((li) => li.textContent ?? '');

const saved = async (): Promise<void> => {
  await vi.waitFor(() => { if (!root().querySelector('.saved')) throw new Error('not saved'); });
};

const failed = async (): Promise<void> => {
  await vi.waitFor(() => { if (!root().querySelector('.errors')) throw new Error('no error'); });
};

describe('exclusion list with two writers (PBI-241)', () => {
  it('Scenario 1: オプション保存がクイック登録を消さない', async () => {
    await saveExcludedUrls([EXISTING]);
    await mount();

    await quickRegister(QUICK);
    type(ADDED);
    click(buttonByText('追加'));
    click(buttonByText('保存'));
    await saved();

    const stored = await loadExcludedUrls();
    expect(stored).toContain(QUICK);
    expect(stored).toContain(ADDED);
    expect(stored).toContain(EXISTING);
    // The saved view reflects the merge: the registration made while the page
    // was open shows up in the list instead of staying invisible.
    expect(items().join('')).toContain(QUICK);
  });

  it('Scenario 2: クイック登録がオプション編集中の削除を復活させない', async () => {
    await saveExcludedUrls([EXISTING]);
    await mount();

    click(buttonByText('削除'));
    await quickRegister(QUICK);
    click(buttonByText('保存'));
    await saved();

    expect(await loadExcludedUrls()).toEqual([QUICK]);
  });

  it('Scenario 3: 保存成功通知の前の整合確認 — 再読み込み失敗は失敗扱い', async () => {
    await saveExcludedUrls([EXISTING]);
    await mount();

    getError = new Error('storage unavailable');
    click(buttonByText('保存'));
    await failed();

    expect(root().querySelector('.saved')).toBeNull();
    expect(root().querySelector('.errors')?.textContent).toContain('保存に失敗');
    expect(store[EXCLUDED_URLS_KEY]).toEqual([EXISTING]);
  });

  it('Scenario 3: 保存成功通知の前の整合確認 — 書き込み失敗は失敗扱い', async () => {
    await saveExcludedUrls([EXISTING]);
    await mount();

    type(ADDED);
    click(buttonByText('追加'));
    setError = new Error('quota exceeded');
    click(buttonByText('保存'));
    await failed();

    expect(root().querySelector('.saved')).toBeNull();
    expect(store[EXCLUDED_URLS_KEY]).toEqual([EXISTING]);
  });
});
