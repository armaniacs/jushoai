import { originPatternsFor, requestHostPermission } from '../../ai/permissions';
import { needsKeyReentry, resolveOpenAiToSave } from '../../ai/key-reentry';
import { IdbKeyStore } from '../../ai/secret-store';
import { normalizeAiSettings, validateAiSettings } from '../../ai/settings';
import { loadPublicAiSettings, saveAiSettings, type KeyUpdate } from '../../ai/settings-store';
import {
  OPENAI_PRESETS, type AiSettings, type KeyPresence, type ProviderKind,
} from '../../ai/types';
import { testAiViaBackground } from '../../llm/background-gateway';
import type { TestFailure } from '../../messages';
import { IS_FIREFOX, selectableProviders } from '../../ai/browser-target';
import { mountAuditSection } from './audit-section';
import { el, labeled, textInput } from './dom';
import { AI_SECTION_ID, applyActivePage } from './nav';

const ALL_PROVIDER_OPTIONS: { value: ProviderKind; label: string }[] = [
  { value: 'none', label: '使わない（ルールのみ）' },
  { value: 'built-in', label: 'ブラウザ内蔵 AI（Chrome / Edge。端末とフラグの設定が必要）' },
  { value: 'openai', label: 'OpenAI 互換 API（OpenAI / Groq / Mistral / Ollama / LM Studio など）' },
  { value: 'gemini', label: 'Google Gemini' },
];

export function providerOptions(isFirefox: boolean = IS_FIREFOX): { value: ProviderKind; label: string }[] {
  const allowed = selectableProviders(isFirefox);
  return ALL_PROVIDER_OPTIONS.filter((o) => allowed.includes(o.value));
}

// Firefox assigns a random UUID to the extension per install, so a stale allow-list entry silently stops working.
export function extensionOriginHint(origin: string, isFirefox: boolean = IS_FIREFOX): string {
  const base = `Ollama を使う場合は、Ollama 側の OLLAMA_ORIGINS に ${origin} を許可してください。`;
  return isFirefox ? `${base}Firefox ではこのオリジンがインストールごとに変わるため、再インストール後は設定し直してください。` : base;
}

const FAILURE_TEXT: Record<TestFailure, string> = {
  'not-configured': '設定が完了していません。保存してから試してください。',
  permission: '通信が許可されていません。保存し直して許可してください。',
  auth: '認証に失敗しました。まず API キーを確認してください。Ollama などローカルのサーバーの場合は、OLLAMA_ORIGINS の設定（拡張機能のオリジンの許可）を確認してください。',
  network: '接続に失敗しました。URL・モデル名・ネットワークを確認してください。',
  rejected: 'サーバーがリクエストを拒否しました。モデル名と、モデルが JSON 形式の出力に対応しているかを確認してください。',
  'bad-response': '応答を解釈できませんでした。モデルが JSON 形式の出力に対応しているか確認してください。',
  unavailable: 'ブラウザ内蔵 AI がまだ使えません。モデルのダウンロード状況を確認してください。',
};

const KEYED = ['openai', 'gemini'] as const;
type KeyedProvider = (typeof KEYED)[number];

// The mutable state formerly closed over by mountAiSection. Every extracted
// function below takes this explicitly, so display builders and the save/test
// side effects meet only through arguments. Only presence (KeyPresence) ever
// reaches the UI; key bodies stay in KeyUpdate/saveAiSettings.
interface AiSectionState {
  settings: AiSettings;
  hasKey: KeyPresence;
  keyInput: Record<KeyedProvider, string>;
  removeKey: Record<KeyedProvider, boolean>;
  savedOpenAi: { baseUrl: string; model: string };
  testing: boolean;
  notice: HTMLElement | null;
}

interface AiSectionRenderHooks {
  rerender: () => void;
  onSave: () => void;
  onTest: () => void;
}

interface AiSectionEffectHooks {
  rerender: () => void;
  notify: (text: string, kind: 'saved' | 'errors') => void;
}

export function mountAiSection(root: HTMLElement): void {
  const keyStore = new IdbKeyStore();
  // State is assembled only once the stored settings arrive, so settings is
  // never a lie: every render below works on a complete initial value.
  root.append(el('p', '読み込み中…'));

  const rerender = (state: AiSectionState) =>
    renderAiSection(root, state, {
      rerender: () => rerender(state),
      onSave: () => void saveAiSection(state, { keyStore, rerender: () => rerender(state), notify: (t, k) => setAiNotice(state, t, k, () => rerender(state)) }),
      onTest: () => void testAiSection(state, {
        rerender: () => rerender(state),
        notify: (t, k) => setAiNotice(state, t, k, () => rerender(state)),
      }),
    });

  void loadPublicAiSettings().then(({ hasKey: keys, ...loaded }) => {
    rerender({
      settings: loaded,
      hasKey: keys,
      keyInput: { openai: '', gemini: '' },
      removeKey: { openai: false, gemini: false },
      savedOpenAi: { ...loaded.openai },
      testing: false,
      notice: null,
    });
  });
}

function setAiNotice(
  state: AiSectionState,
  text: string,
  kind: 'saved' | 'errors',
  rerender: () => void,
): void {
  state.notice = el('p', text);
  state.notice.className = kind === 'saved' ? 'saved' : 'errors-text';
  rerender();
}

function buildKeyField(state: AiSectionState, provider: KeyedProvider): HTMLElement {
  const input = textInput(
    state.keyInput[provider],
    state.hasKey[provider] ? '保存済み（変更する場合のみ入力）' : 'API キー',
    (v) => { state.keyInput[provider] = v; },
    'password',
  );
  const wrap = el('div');
  wrap.append(labeled('API キー', input));
  if (state.hasKey[provider]) {
    const remove = el('input');
    remove.type = 'checkbox';
    remove.checked = state.removeKey[provider];
    remove.addEventListener('change', () => { state.removeKey[provider] = remove.checked; });
    const row = el('label');
    row.append(remove, el('span', '保存済みの API キーを削除する'));
    wrap.append(row);
  }
  return wrap;
}

function buildProviderSelect(state: AiSectionState, onProviderChange: (next: ProviderKind) => void): HTMLSelectElement {
  const select = el('select');
  for (const o of providerOptions()) {
    const opt = el('option', o.label);
    opt.value = o.value;
    opt.selected = state.settings.provider === o.value;
    select.append(opt);
  }
  select.addEventListener('change', () => {
    onProviderChange(select.value as ProviderKind);
  });
  return select;
}

function buildOpenAiFieldset(state: AiSectionState, rerender: () => void): HTMLFieldSetElement {
  const set = el('fieldset');
  set.append(el('legend', 'OpenAI 互換 API'));
  const presets = el('select');
  const placeholder = el('option', 'プリセットから選ぶ');
  placeholder.value = '';
  presets.append(placeholder);
  for (const p of OPENAI_PRESETS) {
    const opt = el('option', p.label);
    opt.value = p.baseUrl;
    presets.append(opt);
  }
  presets.addEventListener('change', () => {
    if (presets.value) {
      state.settings.openai.baseUrl = presets.value;
      rerender();
    }
  });
  set.append(
    labeled('プリセット（ベース URL を埋めます）', presets),
    labeled('ベース URL', textInput(state.settings.openai.baseUrl, 'https://api.openai.com/v1', (v) => { state.settings.openai.baseUrl = v; })),
    labeled('モデル名', textInput(state.settings.openai.model, 'プロバイダのモデル名', (v) => { state.settings.openai.model = v; })),
    buildKeyField(state, 'openai'),
    el('p', 'Ollama / LM Studio など localhost の場合、API キーは不要です。'),
    el('p', extensionOriginHint(chrome.runtime.getURL('').replace(/\/$/, ''))),
  );
  return set;
}

function buildGeminiFieldset(state: AiSectionState): HTMLFieldSetElement {
  const set = el('fieldset');
  set.append(el('legend', 'Google Gemini'));
  set.append(
    labeled('モデル名', textInput(state.settings.gemini.model, 'Gemini のモデル名', (v) => { state.settings.gemini.model = v; })),
    labeled('API バージョン', textInput(state.settings.gemini.apiVersion, 'v1beta', (v) => { state.settings.gemini.apiVersion = v; })),
    buildKeyField(state, 'gemini'),
  );
  return set;
}

function buildActionRow(state: AiSectionState, onSave: () => void, onTest: () => void): HTMLDivElement {
  const save = el('button', '保存');
  save.type = 'button';
  save.className = 'primary';
  save.addEventListener('click', onSave);
  const test = el('button', '接続テスト（保存済みの設定で実行）');
  test.type = 'button';
  test.disabled = state.testing;
  test.addEventListener('click', onTest);
  const actions = el('div');
  actions.className = 'row';
  actions.append(save, test);
  return actions;
}

function renderAiSection(root: HTMLElement, state: AiSectionState, hooks: AiSectionRenderHooks): void {
  const title = el('h2', 'AI 判定（任意）');
  const privacy = el('div');
  for (const line of [
    'AI を使う設定にすると、ルールで判定できない入力欄のメタデータが、選んだプロバイダに送られます。内訳は name・label・placeholder・見出し・type・maxlength です。',
    '入力する個人情報の値や、欄にすでに入っている値は送りません。',
    'API キーは暗号化して保存します。ストレージだけが流出しても復号できませんが、この拡張機能自身のコードからは読み出せます。',
  ]) privacy.append(el('p', line));

  const select = buildProviderSelect(state, (next) => {
    state.settings.provider = next;
    hooks.rerender();
  });

  const parts: HTMLElement[] = [title, privacy, labeled('AI プロバイダ', select)];

  if (state.settings.provider === 'openai') {
    parts.push(buildOpenAiFieldset(state, hooks.rerender));
  }

  if (state.settings.provider === 'gemini') {
    parts.push(buildGeminiFieldset(state));
  }

  parts.push(buildActionRow(state, hooks.onSave, hooks.onTest));
  if (state.notice) parts.push(state.notice);

  const auditRoot = el('div');
  mountAuditSection(auditRoot);
  parts.push(auditRoot);

  const page = el('div');
  page.id = AI_SECTION_ID;
  page.append(...parts);
  root.replaceChildren(page);
  applyActivePage();
}

async function saveAiSection(state: AiSectionState, env: { keyStore: IdbKeyStore } & AiSectionEffectHooks): Promise<void> {
  const update: KeyUpdate = {};
  for (const p of KEYED) {
    if (state.removeKey[p]) update[p] = '';
    else if (state.keyInput[p] !== '') update[p] = state.keyInput[p];
  }
  const effective: KeyPresence = {
    openai: !state.removeKey.openai && (state.hasKey.openai || state.keyInput.openai !== ''),
    gemini: !state.removeKey.gemini && (state.hasKey.gemini || state.keyInput.gemini !== ''),
  };
  const normalized = normalizeAiSettings({
    ...state.settings,
    openai: resolveOpenAiToSave(state.settings.provider, state.settings.openai, state.savedOpenAi),
  });
  if (
    normalized.provider === 'openai' &&
    needsKeyReentry({
      savedBaseUrl: state.savedOpenAi.baseUrl,
      newBaseUrl: normalized.openai.baseUrl,
      hadKey: state.hasKey.openai,
      typedKey: state.keyInput.openai,
      removing: state.removeKey.openai,
    })
  ) {
    env.notify('ベース URL を変更したため、API キーを入力し直してください（保存済みのキーは別のホストに送られません）。', 'errors');
    return;
  }
  const errors = validateAiSettings(normalized, effective);
  if (errors.length > 0) {
    env.notify(errors.join(' / '), 'errors');
    return;
  }
  // The permission prompt needs the click's user gesture, so it must be the first await.
  const origins = originPatternsFor(normalized);
  const granted = origins.length === 0 ? true : await requestHostPermission(origins);
  try {
    await saveAiSettings(normalized, update, env.keyStore);
  } catch {
    env.notify('保存に失敗しました。もう一度お試しください。', 'errors');
    return;
  }
  state.settings = normalized;
  state.savedOpenAi = { ...normalized.openai };
  state.keyInput.openai = '';
  state.keyInput.gemini = '';
  state.removeKey.openai = false;
  state.removeKey.gemini = false;
  // The store drops a kept key when the origin changed, so presence is re-read instead of assumed.
  try {
    state.hasKey = (await loadPublicAiSettings()).hasKey;
  } catch {
    env.notify('保存しましたが、保存状態の再読み込みに失敗しました。設定ページを開き直してください。', 'errors');
    return;
  }
  env.notify(
    granted ? '保存しました。' : '保存しました。通信が許可されていないため AI は使えません。使うには、もう一度保存して許可してください。',
    granted ? 'saved' : 'errors',
  );
}

async function testAiSection(state: AiSectionState, env: AiSectionEffectHooks): Promise<void> {
  if (state.testing) return;
  state.testing = true;
  env.notify('接続テスト中…', 'saved');
  try {
    const result = await testAiViaBackground();
    state.testing = false;
    if (!result) env.notify('バックグラウンドが応答しませんでした。', 'errors');
    else if (result.ok) env.notify(`接続できました（判定: ${result.category}）。`, 'saved');
    else env.notify(FAILURE_TEXT[result.reason], 'errors');
  } finally {
    if (state.testing) {
      state.testing = false;
      env.rerender();
    }
  }
}
