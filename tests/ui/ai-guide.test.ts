import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildGuide, showAiGuide } from '../../src/ui/ai-guide';
import type { AiState, AiStatusInfo } from '../../src/ai/types';

const RULE = 'ルールによる入力は AI なしでも使えます';
const all = (s: AiState, b: 'chrome' | 'edge' | 'unknown') => buildGuide({ status: s, provider: 'built-in' }, b).lines.join('\n');

describe('buildGuide', () => {
  it('always mentions that rule-based filling works', () => {
    for (const s of ['available', 'downloadable', 'downloading', 'unavailable', 'unsupported'] as const) {
      expect(all(s, 'chrome')).toContain(RULE);
    }
  });

  it('shows the flag name and URL for the detected browser', () => {
    for (const s of ['unsupported', 'unavailable'] as const) {
      expect(all(s, 'chrome')).toContain('chrome://flags/#prompt-api-for-gemini-nano');
      expect(all(s, 'chrome')).toContain('Prompt API for Gemini Nano');
      expect(all(s, 'edge')).toContain('edge://flags/#edge-llm-prompt-api-for-phi-mini');
      expect(all(s, 'edge')).toContain('再起動');
    }
  });

  it('gives generic wording without a URL for unknown browsers', () => {
    const t = all('unsupported', 'unknown');
    expect(t).not.toContain('://');
    expect(t).toContain('Chrome');
    expect(t).toContain('Edge');
  });

  it('describes the unsupported case', () => {
    expect(all('unsupported', 'chrome')).toContain('Gemini Nano');
    expect(all('unsupported', 'edge')).toContain('Phi-mini');
  });

  it('does not claim disk space as the cause', () => {
    const t = all('unavailable', 'chrome');
    expect(t).toContain('ディスク');
    expect(t).toContain('可能性');
  });

  it('explains downloadable and downloading', () => {
    expect(all('downloadable', 'chrome')).toContain('ダウンロード');
    expect(all('downloadable', 'chrome')).toContain('入力');
    expect(all('downloading', 'chrome')).toContain('完了');
  });
});

describe('showAiGuide', () => {
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

  function open(title: string, lines: string[]) {
    let root!: ShadowRoot;
    const attach = HTMLElement.prototype.attachShadow;
    vi.spyOn(HTMLElement.prototype, 'attachShadow').mockImplementation(function (this: HTMLElement) {
      root = attach.call(this, { mode: 'open' });
      return root;
    });
    const handle = showAiGuide({ title, lines });
    return { handle, root };
  }

  it('renders text only', () => {
    const { root } = open('<i>t</i>', ['<b>x</b>']);
    expect(root.querySelector('h2')!.textContent).toBe('<i>t</i>');
    expect(root.querySelector('p')!.textContent).toBe('<b>x</b>');
    expect(root.querySelector('b')).toBeNull();
  });

  it('closes on Escape and via the close button, calling onClose and removing the host', () => {
    const onClose = vi.fn();
    let root!: ShadowRoot;
    const attach = HTMLElement.prototype.attachShadow;
    vi.spyOn(HTMLElement.prototype, 'attachShadow').mockImplementation(function (this: HTMLElement) {
      root = attach.call(this, { mode: 'open' });
      return root;
    });
    showAiGuide({ title: 't', lines: ['a'] }, onClose);
    expect(document.querySelector('[data-jushoai]')).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(document.querySelector('[data-jushoai]')).toBeNull();

    showAiGuide({ title: 't', lines: ['a'] }, onClose);
    (root.querySelector('button') as HTMLButtonElement).click();
    expect(onClose).toHaveBeenCalledTimes(2);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

const gi = (status: AiStatusInfo['status'], provider: AiStatusInfo['provider']): AiStatusInfo => ({ status, provider });

describe('buildGuide: cloud providers', () => {
  it('points to the settings page when AI is off or not configured', () => {
    for (const status of ['disabled', 'not-configured', 'permission-missing', 'auth-error'] as const) {
      const g = buildGuide(gi(status, 'openai'), 'chrome');
      expect(g.openSettings).toBe(true);
      expect(g.lines.join('\n')).toContain('ルールによる入力は AI なしでも使えます');
    }
  });

  it('names what is missing per provider and mentions key re-entry', () => {
    const t = (p: AiStatusInfo['provider']) => buildGuide(gi('not-configured', p), 'chrome');
    expect(t('openai').title).toBe('AI の設定が未完了です');
    expect(t('openai').lines[0]).toBe('OpenAI 互換 の設定（ベース URL とモデル名（localhost 以外は API キー））を設定ページで確認してください。');
    expect(t('gemini').lines[0]).toContain('（モデル名と API キー）');
    expect(t('built-in').lines[0]).toBe('ブラウザ内蔵 の設定を設定ページで確認してください。');
    for (const p of ['openai', 'gemini', 'built-in'] as const) {
      expect(t(p).lines).toContain('API キーを保存済みなのにこの表示になる場合は、キーを入力し直してください。');
    }
  });

  it('has exact texts for permission-missing and auth-error', () => {
    const perm = buildGuide(gi('permission-missing', 'gemini'), 'chrome');
    expect(perm.title).toBe('AI への通信が許可されていません');
    expect(perm.lines[0]).toContain('設定ページで保存し直し、ブラウザの確認で許可してください');
    const auth = buildGuide(gi('auth-error', 'openai'), 'chrome');
    expect(auth.title).toBe('AI の認証に失敗しました');
    expect(auth.lines).toContain(
      'Ollama などローカルのサーバーの場合は、API キーではなく OLLAMA_ORIGINS の設定（拡張機能のオリジンの許可）を確認してください。',
    );
  });

  it('explains what is sent when a cloud provider is available', () => {
    const g = buildGuide(gi('available', 'gemini'), 'chrome');
    expect(g.title).toBe('AI 判定を利用できます');
    expect(g.lines.join('\n')).toContain('Gemini');
    expect(g.lines.join('\n')).toContain('入力する値は送りません');
    expect(g.openSettings).toBeFalsy();
  });

  it('keeps the browser flag guidance for built-in problems', () => {
    expect(buildGuide(gi('unsupported', 'built-in'), 'edge').lines.join('\n')).toContain('edge://flags');
  });
});

describe('showAiGuide: settings shortcut', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('renders the panel with a settings guide and can be closed', () => {
    const handle = showAiGuide({ title: 't', lines: ['l'], openSettings: true }, () => {}, vi.fn());
    expect(document.querySelector('[data-jushoai]')).not.toBeNull();
    handle.close();
    expect(document.querySelector('[data-jushoai]')).toBeNull();
  });
});
