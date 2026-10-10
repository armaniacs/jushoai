// PBI-04 parity: pins the AI section display/save/test behavior before extracting
// keyField / render / onSave / onTest out of mountAiSection. DOM assertions only;
// no mutation of src. Secret strings must never leak into UI text or attributes.
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

const egressMocks = vi.hoisted(() => ({ validate: vi.fn() }));
vi.mock('../../src/ai/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/ai/settings')>();
  return { ...actual, validateAiSettingsResolved: egressMocks.validate };
});

const gwMocks = vi.hoisted(() => ({ test: vi.fn() }));
vi.mock('../../src/llm/background-gateway', () => ({
  testAiViaBackground: gwMocks.test,
}));

vi.mock('../../src/ai/secret-store', () => ({
  IdbKeyStore: class {},
}));

vi.stubGlobal('chrome', { runtime: { id: 'test-ext-id', getURL: (p: string) => `chrome-extension://test-ext-id/${p}` } });

import { mountAiSection } from '../../src/entrypoints/options/ai-section';
import type { PublicAiSettings } from '../../src/ai/types';

const flush = () => new Promise((r) => setTimeout(r, 0));
const settle = async (n = 8) => {
  for (let i = 0; i < n; i++) await flush();
};

const noneSettings = (): PublicAiSettings => ({
  provider: 'none',
  openai: { baseUrl: '', model: '' },
  gemini: { model: '', apiVersion: 'v1beta' },
  hasKey: { openai: false, gemini: false },
});

const openaiSaved = (): PublicAiSettings => ({
  provider: 'openai',
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-x' },
  gemini: { model: '', apiVersion: 'v1beta' },
  hasKey: { openai: true, gemini: false },
});

const geminiFresh = (): PublicAiSettings => ({
  provider: 'none',
  openai: { baseUrl: '', model: '' },
  gemini: { model: 'gemini-2.0-flash', apiVersion: 'v1beta' },
  hasKey: { openai: false, gemini: false },
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

function selectOptions(select: HTMLSelectElement) {
  return [...select.options].map((o) => ({
    value: o.value,
    text: o.textContent,
    selected: o.selected,
  }));
}

function legends(root: ParentNode): (string | null)[] {
  return [...pageOf(root).querySelectorAll('fieldset')].map(
    (f) => f.querySelector('legend')?.textContent ?? null,
  );
}

function labelTexts(root: ParentNode): string[] {
  return [...pageOf(root).querySelectorAll('label > span')].map(
    (s) => s.textContent ?? '',
  );
}

function keyInput(root: ParentNode): HTMLInputElement | null {
  return pageOf(root).querySelector('input[type="password"]');
}

function removeCheckbox(root: ParentNode): HTMLInputElement | null {
  return pageOf(root).querySelector('input[type="checkbox"]');
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

function fireChange(select: HTMLSelectElement, value: string) {
  select.value = value;
  select.dispatchEvent(new Event('change'));
}

const PRIVACY_LINES = [
  'AI を使う設定にすると、ルールで判定できない入力欄のメタデータが、選んだプロバイダに送られます。内訳は name・label・placeholder・見出し・type・maxlength です。',
  '入力する個人情報の値や、欄にすでに入っている値は送りません。',
  'API キーは暗号化して保存します。ストレージだけが流出しても復号できませんが、この拡張機能自身のコードからは読み出せます。',
];

beforeEach(() => {
  vi.clearAllMocks();
  permMocks.request.mockResolvedValue(true);
  storeMocks.save.mockResolvedValue(undefined);
  gwMocks.test.mockResolvedValue({ ok: true, category: 'email' });
  egressMocks.validate.mockResolvedValue({ errors: [], unreachable: false });
  document.body.replaceChildren();
});

describe('display parity', () => {
  it('renders the title, privacy lines, provider select and buttons for none', async () => {
    const root = await mountWith(noneSettings());
    const page = pageOf(root);
    expect(page.querySelector('h2')?.textContent).toBe('AI 判定（任意）');
    const paras = [...page.querySelectorAll(':scope > div:first-of-type + div p, div p')];
    for (const line of PRIVACY_LINES) {
      expect(page.textContent).toContain(line);
    }
    expect(paras.length).toBeGreaterThanOrEqual(0);
    expect(selectOptions(providerSelect(root))).toEqual([
      { value: 'none', text: '使わない（ルールのみ）', selected: true },
      { value: 'built-in', text: 'ブラウザ内蔵 AI（Chrome / Edge。端末とフラグの設定が必要）', selected: false },
      { value: 'openai', text: 'OpenAI 互換 API（OpenAI / Groq / Mistral / Ollama / LM Studio など）', selected: false },
      { value: 'gemini', text: 'Google Gemini', selected: false },
    ]);
    expect(labelTexts(root)).toEqual(['AI プロバイダ']);
    expect(legends(root)).toEqual([]);
    expect(keyInput(root)).toBeNull();
    expect(removeCheckbox(root)).toBeNull();
    const save = buttonByText(root, '保存');
    expect(save.type).toBe('button');
    expect(save.className).toBe('primary');
    const test = buttonByText(root, '接続テスト（保存済みの設定で実行）');
    expect(test.type).toBe('button');
    expect(test.disabled).toBe(false);
    expect(test.closest('div.row')).not.toBeNull();
    // The audit section lives on its own page now; the AI page carries no audit log.
    expect(page.textContent).not.toContain('監査ログ');
  });

  it('renders the openai fieldset with presets, placeholders and localhost notes', async () => {
    const root = await mountWith({ ...openaiSaved(), hasKey: { openai: false, gemini: false } });
    expect(legends(root)).toEqual(['OpenAI 互換 API']);
    expect(labelTexts(root)).toEqual([
      'AI プロバイダ',
      'プリセット（ベース URL を埋めます）',
      'ベース URL',
      'モデル名',
      'API キー',
    ]);
    const selects = pageOf(root).querySelectorAll('select');
    expect(selectOptions(selects[1] as HTMLSelectElement).map((o) => [o.value, o.text])).toEqual([
      ['', 'プリセットから選ぶ'],
      ['https://api.openai.com/v1', 'OpenAI'],
      ['https://api.groq.com/openai/v1', 'Groq'],
      ['https://api.mistral.ai/v1', 'Mistral'],
      ['http://localhost:11434/v1', 'Ollama'],
      ['http://127.0.0.1:1234/v1', 'LM Studio'],
    ]);
    const key = keyInput(root)!;
    expect(key.placeholder).toBe('API キー');
    expect(key.autocomplete).toBe('off');
    expect(removeCheckbox(root)).toBeNull();
    expect(pageOf(root).textContent).toContain('Ollama / LM Studio など localhost の場合、API キーは不要です。');
    expect(pageOf(root).textContent).toContain('chrome-extension://test-ext-id を許可してください。');
  });

  it('shows the saved-key placeholder and remove checkbox when a key is stored', async () => {
    const root = await mountWith(openaiSaved());
    expect(keyInput(root)!.placeholder).toBe('保存済み（変更する場合のみ入力）');
    const box = removeCheckbox(root)!;
    expect(box.type).toBe('checkbox');
    expect(box.checked).toBe(false);
    expect(box.closest('label')?.textContent).toContain('保存済みの API キーを削除する');
  });

  it('renders the gemini fieldset with its labels', async () => {
    const root = await mountWith({ ...geminiFresh(), provider: 'gemini' });
    expect(legends(root)).toEqual(['Google Gemini']);
    expect(labelTexts(root)).toEqual(['AI プロバイダ', 'モデル名', 'API バージョン', 'API キー']);
    expect(keyInput(root)!.placeholder).toBe('API キー');
  });

  it('switches fieldsets when the provider select changes', async () => {
    const root = await mountWith(noneSettings());
    fireChange(providerSelect(root), 'gemini');
    await settle(2);
    expect(legends(root)).toEqual(['Google Gemini']);
    fireChange(providerSelect(root), 'openai');
    await settle(2);
    expect(legends(root)).toEqual(['OpenAI 互換 API']);
  });

  it('applies a preset to the base URL input', async () => {
    const root = await mountWith({ ...openaiSaved(), openai: { baseUrl: '', model: 'm' }, hasKey: { openai: false, gemini: false } });
    const preset = pageOf(root).querySelectorAll('select')[1] as HTMLSelectElement;
    fireChange(preset, 'https://api.groq.com/openai/v1');
    await settle(2);
    const baseUrl = [...pageOf(root).querySelectorAll('label')]
      .find((l) => l.querySelector('span')?.textContent === 'ベース URL')
      ?.querySelector('input');
    expect(baseUrl?.value).toBe('https://api.groq.com/openai/v1');
  });
});

describe('save parity', () => {
  it('blocks saving when the base URL changed without re-entering the key', async () => {
    const root = await mountWith(openaiSaved());
    const baseUrl = [...pageOf(root).querySelectorAll('label')]
      .find((l) => l.querySelector('span')?.textContent === 'ベース URL')
      ?.querySelector('input')!;
    setInput(baseUrl, 'https://other.example/v1');
    buttonByText(root, '保存').click();
    await settle();
    expect(storeMocks.save).not.toHaveBeenCalled();
    const n = notice(root)!;
    expect(n.className).toBe('errors-text');
    expect(n.textContent).toBe(
      'ベース URL を変更したため、API キーを入力し直してください（保存済みのキーは別のホストに送られません）。',
    );
  });

  it('saves with the typed key, requests permission first, and reloads presence', async () => {
    const root = await mountWith(openaiSaved());
    const order: string[] = [];
    permMocks.request.mockImplementation(async () => { order.push('permission'); return true; });
    storeMocks.save.mockImplementation(async () => { order.push('save'); });
    storeMocks.load.mockResolvedValueOnce(openaiSaved()).mockResolvedValue({
      ...openaiSaved(),
      hasKey: { openai: true, gemini: false },
    });
    const baseUrl = [...pageOf(root).querySelectorAll('label')]
      .find((l) => l.querySelector('span')?.textContent === 'ベース URL')
      ?.querySelector('input')!;
    setInput(baseUrl, 'https://other.example/v1');
    setInput(keyInput(root)!, 'sk-new-secret');
    buttonByText(root, '保存').click();
    await settle();
    expect(order).toEqual(['permission', 'save']);
    expect(storeMocks.save).toHaveBeenCalledOnce();
    const [savedSettings, update] = storeMocks.save.mock.calls[0] as [PublicAiSettings, Record<string, string>];
    expect(savedSettings.openai.baseUrl).toBe('https://other.example/v1');
    expect(update).toEqual({ openai: 'sk-new-secret' });
    const n = notice(root)!;
    expect(n.className).toBe('saved');
    expect(n.textContent).toBe('保存しました。');
    // Key input is cleared and only presence is shown afterwards.
    expect(keyInput(root)!.value).toBe('');
    expect(keyInput(root)!.placeholder).toBe('保存済み（変更する場合のみ入力）');
    expect(root.innerHTML).not.toContain('sk-new-secret');
  });

  it('notes a missing host permission while still saving', async () => {
    const settings = { ...openaiSaved(), hasKey: { openai: false, gemini: false } };
    const root = await mountWith(settings);
    storeMocks.load.mockResolvedValue({ ...settings, hasKey: { openai: true, gemini: false } });
    permMocks.request.mockResolvedValue(false);
    setInput(keyInput(root)!, 'sk-new-secret');
    buttonByText(root, '保存').click();
    await settle();
    expect(storeMocks.save).toHaveBeenCalledOnce();
    const n = notice(root)!;
    expect(n.className).toBe('errors-text');
    expect(n.textContent).toBe(
      '保存しました。通信が許可されていないため AI は使えません。使うには、もう一度保存して許可してください。',
    );
  });

  it('shows validation errors without saving', async () => {
    const root = await mountWith({ ...geminiFresh(), provider: 'gemini' });
    buttonByText(root, '保存').click();
    await settle();
    expect(storeMocks.save).not.toHaveBeenCalled();
    expect(permMocks.request).not.toHaveBeenCalled();
    expect(notice(root)!.textContent).toContain('API キーを入力してください');
    expect(notice(root)!.className).toBe('errors-text');
  });

  it('reports a save failure', async () => {
    const root = await mountWith({ ...geminiFresh(), provider: 'gemini' });
    storeMocks.save.mockRejectedValueOnce(new Error('io'));
    setInput(keyInput(root)!, 'gk-secret');
    buttonByText(root, '保存').click();
    await settle();
    expect(notice(root)!.textContent).toBe('保存に失敗しました。もう一度お試しください。');
  });

  it('deletes a stored key via the remove checkbox', async () => {
    // Loopback needs no key, so removing the stored key still validates.
    const root = await mountWith({
      ...openaiSaved(),
      openai: { baseUrl: 'http://localhost:11434/v1', model: 'm' },
    });
    const box = removeCheckbox(root)!;
    box.checked = true;
    box.dispatchEvent(new Event('change'));
    storeMocks.load.mockResolvedValue({ ...openaiSaved(), openai: { baseUrl: 'http://localhost:11434/v1', model: 'm' }, hasKey: { openai: false, gemini: false } });
    buttonByText(root, '保存').click();
    await settle();
    expect(storeMocks.save).toHaveBeenCalledOnce();
    expect(storeMocks.save.mock.calls[0]![1]).toEqual({ openai: '' });
  });

  it('reports a presence reload failure after saving', async () => {
    const root = await mountWith(openaiSaved());
    storeMocks.load.mockRejectedValueOnce(new Error('io'));
    buttonByText(root, '保存').click();
    await settle();
    expect(notice(root)!.textContent).toBe(
      '保存しましたが、保存状態の再読み込みに失敗しました。設定ページを開き直してください。',
    );
  });
});

describe('connection test parity', () => {
  it('disables the button while testing then shows success', async () => {
    const root = await mountWith(openaiSaved());
    let resolveTest!: (v: unknown) => void;
    gwMocks.test.mockImplementationOnce(() => new Promise((r) => { resolveTest = r; }));
    const first = buttonByText(root, '接続テスト（保存済みの設定で実行）');
    first.click();
    await flush();
    await flush();
    expect(notice(root)!.textContent).toBe('接続テスト中…');
    expect(notice(root)!.className).toBe('saved');
    expect(buttonByText(root, '接続テスト（保存済みの設定で実行）').disabled).toBe(true);
    resolveTest({ ok: true, category: 'email' });
    await settle();
    expect(notice(root)!.textContent).toBe('接続できました（判定: email）。');
    expect(notice(root)!.className).toBe('saved');
    expect(buttonByText(root, '接続テスト（保存済みの設定で実行）').disabled).toBe(false);
  });

  it('maps failure reasons to the fixed texts', async () => {
    const root = await mountWith(openaiSaved());
    gwMocks.test.mockResolvedValueOnce({ ok: false, reason: 'auth' });
    buttonByText(root, '接続テスト（保存済みの設定で実行）').click();
    await settle();
    expect(notice(root)!.textContent).toContain('認証に失敗しました');
    expect(notice(root)!.className).toBe('errors-text');

    gwMocks.test.mockResolvedValueOnce({ ok: false, reason: 'not-configured' });
    buttonByText(root, '接続テスト（保存済みの設定で実行）').click();
    await settle();
    expect(notice(root)!.textContent).toBe('設定が完了していません。保存してから試してください。');
  });

  it('reports when the background does not respond', async () => {
    const root = await mountWith(openaiSaved());
    gwMocks.test.mockResolvedValueOnce(null);
    buttonByText(root, '接続テスト（保存済みの設定で実行）').click();
    await settle();
    expect(notice(root)!.textContent).toBe('バックグラウンドが応答しませんでした。');
    expect(notice(root)!.className).toBe('errors-text');
  });

  it('guards double execution while a test is in flight', async () => {
    const root = await mountWith(openaiSaved());
    let resolveTest!: (v: unknown) => void;
    gwMocks.test.mockImplementationOnce(() => new Promise((r) => { resolveTest = r; }));
    const first = buttonByText(root, '接続テスト（保存済みの設定で実行）');
    first.click();
    first.click();
    await flush();
    expect(gwMocks.test).toHaveBeenCalledTimes(1);
    resolveTest({ ok: true, category: 'email' });
    await settle();
    expect(notice(root)!.textContent).toBe('接続できました（判定: email）。');
  });
});
