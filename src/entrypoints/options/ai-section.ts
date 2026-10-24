import { IdbKeyStore } from '../../ai/secret-store';
import { loadPublicAiSettings } from '../../ai/settings-store';
import { saveSettings } from '../../ai/settings-save';
import { resolveConfirmedAddresses } from '../../ai/settings';
import { confirmOrigin, isOriginConfirmed } from '../../ai/first-dial';
import { originOf } from '../../ai/key-reentry';
import {
  OPENAI_PRESETS, type AiSettings, type KeyPresence, type ProviderKind,
} from '../../ai/types';
import { testAiViaBackground } from '../../llm/background-gateway';
import { noticeForTest } from '../../ai/failure-text';
import { IS_FIREFOX, selectableProviders } from '../../ai/browser-target';
import { el, labeled, notice, textInput, buildSelect } from './dom';
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

// Firefox has no Prompt API, so a stored built-in choice is normalized to none.
// The store reports this gap as builtInDisabled; the page surfaces it here so
// the setting does not look like it silently reverted.
export const BUILT_IN_FALLBACK_NOTICE =
  'このブラウザではブラウザ内蔵AIは使えないため、ルールのみで動作しています（Prompt APIがありません）。OpenAI互換APIかGeminiを選んで保存すると切り替えられます。';

const KEYED = ['openai', 'gemini'] as const;
type KeyedProvider = (typeof KEYED)[number];

// Connection-test cooldown (anti double-charge on rapid clicks).
// Lower bound of the 3-5s acceptance window: short enough to keep single-test
// UX intact, long enough to swallow follow-up clicks.
export const TEST_COOLDOWN_MS = 3000;

export function isTestCoolingDown(state: { cooldownUntil: number }, now: number = Date.now()): boolean {
  return now < state.cooldownUntil;
}

export function testCooldownRemainingSec(state: { cooldownUntil: number }, now: number = Date.now()): number {
  return Math.max(1, Math.ceil((state.cooldownUntil - now) / 1000));
}

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
  cooldownUntil: number;
  cooldownTimer: ReturnType<typeof setTimeout> | null;
  notice: HTMLElement | null;
  // First-dial confirmation state for the saved OpenAI-compatible endpoint
  // (VULN-001). null until the async refresh below resolves; confirmed === null
  // means the origin could not be resolved, so no confirmation is offered.
  firstDial: { confirmed: boolean | null; addresses: string[] } | null;
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

export function mountAiSection(root: HTMLElement): () => void {
  const keyStore = new IdbKeyStore();
  // State is assembled only once the stored settings arrive, so settings is
  // never a lie: every render below works on a complete initial value.
  root.append(el('p', '読み込み中…'));
  // Owns the assembled state once it arrives, so dispose() below can drop a
  // pending test-cooldown timer instead of rerendering a detached tree.
  const slot: { state?: AiSectionState; disposed: boolean } = { disposed: false };

  const rerender = (state: AiSectionState) =>
    renderAiSection(root, state, {
      rerender: () => rerender(state),
      onSave: () => void saveAiSection(state, { keyStore, rerender: () => rerender(state), notify: (t, k) => setAiNotice(state, t, k, () => rerender(state)) }),
      onTest: () => void testAiSection(state, {
        rerender: () => rerender(state),
        notify: (t, k) => setAiNotice(state, t, k, () => rerender(state)),
      }),
    });

  void loadPublicAiSettings().then(({ hasKey: keys, builtInDisabled, ...loaded }) => {
    // A load resolving after dispose() must neither render into a detached
    // root nor leave state behind for a later teardown to trip over.
    if (slot.disposed) return;
    // The shared notice vocabulary (PBI-151): the built-in fallback renders as
    // ul.errors like every other notice in the section, not a drifting
    // p.errors-text (the only CSS user of that class left in the options UI).
    const fallbackNotice = builtInDisabled ? notice('errors', [BUILT_IN_FALLBACK_NOTICE]) : null;
    const state: AiSectionState = {
      settings: loaded,
      hasKey: keys,
      keyInput: { openai: '', gemini: '' },
      removeKey: { openai: false, gemini: false },
      savedOpenAi: { ...loaded.openai },
      testing: false,
      cooldownUntil: 0,
      cooldownTimer: null,
      notice: fallbackNotice,
      firstDial: null,
    };
    slot.state = state;
    rerender(state);
    // First-dial confirmation display: loads after the section renders so the
    // block appears with the resolved addresses once storage and DoH answer.
    void refreshFirstDial(state, { rerender: () => rerender(state) });
  });
  // Drop a pending test-cooldown timer when the section is torn down, and
  // clear the slot so a late-arriving load cannot reattach state to a
  // disposed section.
  return () => {
    if (slot.state?.cooldownTimer) clearTimeout(slot.state.cooldownTimer);
    slot.state = undefined;
    slot.disposed = true;
  };
}

function setAiNotice(
  state: AiSectionState,
  text: string,
  kind: 'saved' | 'errors',
  rerender: () => void,
): void {
  // The shared notice vocabulary (PBI-151): errors render as ul.errors like
  // the other three sections instead of a drifting p.errors-text.
  state.notice = notice(kind, [text]);
  rerender();
}

// Reload the first-dial confirmation state for the saved OpenAI-compatible
// endpoint (VULN-001): confirmed comes from the confirmation record, the
// address list from the pinned DoH resolution. A storage or DoH failure leaves
// the block hidden (confirmed === null) so no confirmation is offered; the gate
// still blocks the dial, so the display failure never widens the dial surface.
async function refreshFirstDial(state: AiSectionState, hooks: { rerender: () => void }): Promise<void> {
  const baseUrl = state.savedOpenAi.baseUrl;
  const origin = originOf(baseUrl);
  if (state.settings.provider !== 'openai' || origin === null) {
    state.firstDial = null;
    hooks.rerender();
    return;
  }
  try {
    const confirmed = await isOriginConfirmed(origin);
    const addresses = confirmed ? [] : await resolveConfirmedAddresses(baseUrl, { fetch: globalThis.fetch.bind(globalThis) });
    state.firstDial = { confirmed, addresses };
  } catch {
    state.firstDial = null;
  }
  hooks.rerender();
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
  return buildSelect(
    (v) => onProviderChange(v as ProviderKind),
    providerOptions().map((o) => ({
      value: o.value,
      text: o.label,
      selected: state.settings.provider === o.value,
    })),
  );
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
    el('p', '信頼できるプロバイダの URL のみ入力してください。'),
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
  const cooling = isTestCoolingDown(state);
  test.disabled = state.testing || cooling;
  if (cooling) {
    test.title = `連打防止のため、あと${testCooldownRemainingSec(state)}秒お待ちください。`;
  } else {
    test.removeAttribute('title');
  }
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
  const confirmBlock = buildFirstDialBlock(state, hooks.rerender);
  if (confirmBlock) parts.push(confirmBlock);

  const page = el('div');
  page.id = AI_SECTION_ID;
  page.append(...parts);
  root.replaceChildren(page);
  applyActivePage();
}

async function saveAiSection(state: AiSectionState, env: { keyStore: IdbKeyStore } & AiSectionEffectHooks): Promise<void> {
  const result = await saveSettings(
    {
      settings: state.settings,
      hasKey: state.hasKey,
      keyInput: state.keyInput,
      removeKey: state.removeKey,
      savedOpenAi: state.savedOpenAi,
    },
    { keyStore: env.keyStore, fetch: globalThis.fetch.bind(globalThis) },
  );
  if (!result.ok) {
    env.notify(result.message, 'errors');
    return;
  }
  state.settings = result.settings;
  state.savedOpenAi = result.savedOpenAi;
  state.keyInput.openai = '';
  state.keyInput.gemini = '';
  state.removeKey.openai = false;
  state.removeKey.gemini = false;
  state.hasKey = result.hasKey;
  // The saved endpoint may have changed: reload the first-dial confirmation state.
  void refreshFirstDial(state, { rerender: env.rerender });
  // The save-time gate is fail-closed, so reaching this point means the resolved address
  // was confirmed public. Only a denied permission leaves AI unusable.
  env.notify(
    result.permissionGranted
      ? '保存しました。'
      : '保存しました。通信が許可されていないため AI は使えません。使うには、もう一度保存して許可してください。',
    result.permissionGranted ? 'saved' : 'errors',
  );
}

// First-dial confirmation block (VULN-001): shown for the saved OpenAI-compatible
// endpoint only. Unconfirmed: the origin, what the address list is (the
// DoH-resolved IPs of the saved hostname), and an approval button — nothing
// dials the origin until the user approves. Confirmed: a read-only state line.
// The block keys off the SAVED endpoint (savedOpenAi), not the typed form
// value, so it always describes what the gate actually reads.
function buildFirstDialBlock(state: AiSectionState, rerender: () => void): HTMLElement | null {
  if (state.settings.provider !== 'openai' || state.firstDial === null) return null;
  const origin = originOf(state.savedOpenAi.baseUrl);
  if (origin === null) return null;
  let hostname = origin;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    hostname = origin;
  }
  const wrap = el('div');
  if (state.firstDial.confirmed === true) {
    const line = el('p', `接続先 ${origin} を確認済みです。AI 判定でこの接続先に送信できます。`);
    line.className = 'saved';
    wrap.append(line);
    return wrap;
  }
  if (state.firstDial.confirmed === null || state.firstDial.addresses.length === 0) return null;
  const intro = el('p', `接続先 ${origin} に初めて送信する前の確認です。下の一覧はホスト名 ${hostname} をDNSで解決して得られたIPアドレスです。`);
  const warn = el('p', '送信先が想定どおりか確かめてから承認してください（承認するまで送信しません）。見覚えのないアドレスがある場合は承認せず、ベースURLを確認してください。');
  const list = el('ul');
  for (const address of state.firstDial.addresses) {
    const item = el('li', address);
    list.append(item);
  }
  const approve = el('button', 'この接続先を承認する');
  approve.addEventListener('click', () => {
    const origin = originOf(state.savedOpenAi.baseUrl);
    if (origin === null) return;
    void confirmOrigin(origin, state.firstDial?.addresses ?? []).then(() => {
      const slot = state;
      void refreshFirstDial(slot, { rerender });
    });
  });
  wrap.append(intro, list, warn, approve);
  return wrap;
}

function beginTestCooldown(state: AiSectionState, env: AiSectionEffectHooks): void {  state.cooldownUntil = Date.now() + TEST_COOLDOWN_MS;
  if (state.cooldownTimer) clearTimeout(state.cooldownTimer);
  state.cooldownTimer = setTimeout(() => {
    state.cooldownTimer = null;
    env.rerender();
  }, TEST_COOLDOWN_MS);
}

async function testAiSection(state: AiSectionState, env: AiSectionEffectHooks): Promise<void> {
  if (state.testing || isTestCoolingDown(state)) return;
  state.testing = true;
  env.notify('接続テスト中…', 'saved');
  try {
    const result = await testAiViaBackground();
    state.testing = false;
    // Enter cooldown before notifying so the rerender inside notify already
    // shows the disabled button; the expiry timer re-enables it.
    beginTestCooldown(state, env);
    if (!result) env.notify('バックグラウンドが応答しませんでした。', 'errors');
    else if (result.ok) env.notify(`接続できました（判定: ${result.category}）。`, 'saved');
    else env.notify(noticeForTest(result.reason), 'errors');
  } finally {
    if (state.testing) {
      // testAiViaBackground threw: keep the pre-existing behavior (no result
      // notice) but still enter cooldown so a retry storm cannot bill more.
      state.testing = false;
      beginTestCooldown(state, env);
      env.rerender();
    }
  }
}
