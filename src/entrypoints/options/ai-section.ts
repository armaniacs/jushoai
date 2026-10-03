import { originPatternsFor, requestHostPermission } from '../../ai/permissions';
import { needsKeyReentry } from '../../ai/key-reentry';
import { IdbKeyStore } from '../../ai/secret-store';
import { normalizeAiSettings, validateAiSettings } from '../../ai/settings';
import { loadPublicAiSettings, saveAiSettings, type KeyUpdate } from '../../ai/settings-store';
import {
  OPENAI_PRESETS, type AiSettings, type KeyPresence, type ProviderKind,
} from '../../ai/types';
import { testAiViaBackground } from '../../llm/background-gateway';
import type { TestFailure } from '../../messages';

const PROVIDER_OPTIONS: { value: ProviderKind; label: string }[] = [
  { value: 'none', label: '使わない（ルールのみ）' },
  { value: 'built-in', label: 'ブラウザ内蔵 AI（Chrome / Edge。端末とフラグの設定が必要）' },
  { value: 'openai', label: 'OpenAI 互換 API（OpenAI / Groq / Mistral / Ollama / LM Studio など）' },
  { value: 'gemini', label: 'Google Gemini' },
];

const FAILURE_TEXT: Record<TestFailure, string> = {
  'not-configured': '設定が完了していません。保存してから試してください。',
  permission: '通信が許可されていません。保存し直して許可してください。',
  auth: '認証に失敗しました。API キーを確認してください。',
  network: '接続に失敗しました。URL・モデル名・ネットワークを確認してください。',
  'bad-response': '応答を解釈できませんでした。モデルが JSON 形式の出力に対応しているか確認してください。',
};

const KEYED = ['openai', 'gemini'] as const;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function labeled(text: string, control: HTMLElement): HTMLLabelElement {
  const label = el('label');
  label.append(el('span', text), control);
  return label;
}

export function mountAiSection(root: HTMLElement): void {
  let settings: AiSettings;
  let hasKey: KeyPresence = { openai: false, gemini: false };
  const keyInput = { openai: '', gemini: '' };
  const removeKey = { openai: false, gemini: false };
  let savedOpenAiBaseUrl = '';
  let notice: HTMLElement | null = null;
  const keyStore = new IdbKeyStore();

  const setNotice = (text: string, kind: 'saved' | 'errors') => {
    notice = el('p', text);
    notice.className = kind === 'saved' ? 'saved' : 'errors-text';
    render();
  };

  function textInput(value: string, placeholder: string, onInput: (v: string) => void, type = 'text') {
    const input = el('input');
    input.type = type;
    input.value = value;
    input.placeholder = placeholder;
    input.autocomplete = 'off';
    input.addEventListener('input', () => onInput(input.value));
    return input;
  }

  function keyField(provider: (typeof KEYED)[number]) {
    const input = textInput(
      keyInput[provider],
      hasKey[provider] ? '保存済み（変更する場合のみ入力）' : 'API キー',
      (v) => { keyInput[provider] = v; },
      'password',
    );
    const wrap = el('div');
    wrap.append(labeled('API キー', input));
    if (hasKey[provider]) {
      const remove = el('input');
      remove.type = 'checkbox';
      remove.checked = removeKey[provider];
      remove.addEventListener('change', () => { removeKey[provider] = remove.checked; });
      const row = el('label');
      row.append(remove, el('span', '保存済みの API キーを削除する'));
      wrap.append(row);
    }
    return wrap;
  }

  function render() {
    const title = el('h2', 'AI 判定（任意）');
    const privacy = el('div');
    for (const line of [
      'AI を使う設定にすると、ルールで判定できない入力欄のメタデータ（name・label・placeholder・見出し・type・maxlength）が、選んだプロバイダに送られます。',
      '入力する個人情報の値や、欄にすでに入っている値は送りません。',
      'API キーは暗号化して保存します。ストレージだけが流出しても復号できませんが、この拡張機能自身のコードからは読み出せます。',
    ]) privacy.append(el('p', line));

    const select = el('select');
    for (const o of PROVIDER_OPTIONS) {
      const opt = el('option', o.label);
      opt.value = o.value;
      opt.selected = settings.provider === o.value;
      select.append(opt);
    }
    select.addEventListener('change', () => {
      settings.provider = select.value as ProviderKind;
      render();
    });

    const parts: HTMLElement[] = [title, privacy, labeled('AI プロバイダ', select)];

    if (settings.provider === 'openai') {
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
          settings.openai.baseUrl = presets.value;
          render();
        }
      });
      set.append(
        labeled('プリセット（ベース URL を埋めます）', presets),
        labeled('ベース URL', textInput(settings.openai.baseUrl, 'https://api.openai.com/v1', (v) => { settings.openai.baseUrl = v; })),
        labeled('モデル名', textInput(settings.openai.model, 'プロバイダのモデル名', (v) => { settings.openai.model = v; })),
        keyField('openai'),
        el('p', 'Ollama / LM Studio など localhost の場合、API キーは不要です。'),
        el('p', `Ollama を使う場合は、Ollama 側の OLLAMA_ORIGINS に chrome-extension://${chrome.runtime.id} を許可してください。`),
      );
      parts.push(set);
    }

    if (settings.provider === 'gemini') {
      const set = el('fieldset');
      set.append(el('legend', 'Google Gemini'));
      set.append(
        labeled('モデル名', textInput(settings.gemini.model, 'Gemini のモデル名', (v) => { settings.gemini.model = v; })),
        labeled('API バージョン', textInput(settings.gemini.apiVersion, 'v1beta', (v) => { settings.gemini.apiVersion = v; })),
        keyField('gemini'),
      );
      parts.push(set);
    }

    const save = el('button', '保存');
    save.type = 'button';
    save.className = 'primary';
    save.addEventListener('click', () => void onSave());
    const test = el('button', '接続テスト（保存済みの設定で実行）');
    test.type = 'button';
    test.addEventListener('click', () => void onTest());
    const actions = el('div');
    actions.className = 'row';
    actions.append(save, test);
    parts.push(actions);
    if (notice) parts.push(notice);

    root.replaceChildren(...parts);
  }

  async function onSave() {
    const update: KeyUpdate = {};
    for (const p of KEYED) {
      if (removeKey[p]) update[p] = '';
      else if (keyInput[p] !== '') update[p] = keyInput[p];
    }
    const effective: KeyPresence = {
      openai: !removeKey.openai && (hasKey.openai || keyInput.openai !== ''),
      gemini: !removeKey.gemini && (hasKey.gemini || keyInput.gemini !== ''),
    };
    const normalized = normalizeAiSettings(settings);
    if (
      normalized.provider === 'openai' &&
      needsKeyReentry({
        savedBaseUrl: savedOpenAiBaseUrl,
        newBaseUrl: normalized.openai.baseUrl,
        hadKey: hasKey.openai,
        typedKey: keyInput.openai,
        removing: removeKey.openai,
      })
    ) {
      setNotice('ベース URL を変更したため、API キーを入力し直してください（保存済みのキーは別のホストに送られません）。', 'errors');
      return;
    }
    const errors = validateAiSettings(normalized, effective);
    if (errors.length > 0) {
      setNotice(errors.join(' / '), 'errors');
      return;
    }
    // The permission prompt needs the click's user gesture, so it must be the first await.
    const origins = originPatternsFor(normalized);
    const granted = origins.length === 0 ? true : await requestHostPermission(origins);
    await saveAiSettings(normalized, update, keyStore);
    settings = normalized;
    savedOpenAiBaseUrl = normalized.openai.baseUrl;
    hasKey = effective;
    keyInput.openai = '';
    keyInput.gemini = '';
    removeKey.openai = false;
    removeKey.gemini = false;
    setNotice(
      granted ? '保存しました。' : '保存しました。通信が許可されていないため AI は使えません。もう一度保存して、許可してください。',
      granted ? 'saved' : 'errors',
    );
  }

  async function onTest() {
    setNotice('接続テスト中…', 'saved');
    const result = await testAiViaBackground();
    if (!result) setNotice('バックグラウンドが応答しませんでした。', 'errors');
    else if (result.ok) setNotice(`接続できました（判定: ${result.category}）。`, 'saved');
    else setNotice(FAILURE_TEXT[result.reason], 'errors');
  }

  void loadPublicAiSettings().then(({ hasKey: keys, ...loaded }) => {
    settings = loaded;
    savedOpenAiBaseUrl = loaded.openai.baseUrl;
    hasKey = keys;
    render();
  });
}
