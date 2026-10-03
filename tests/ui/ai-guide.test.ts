import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildGuide, showAiGuide } from '../../src/ui/ai-guide';
import type { AiStatus } from '../../src/llm/availability';

const RULE = 'ルールによる入力は AI なしでも使えます';
const all = (s: AiStatus, b: 'chrome' | 'edge' | 'unknown') => buildGuide(s, b).lines.join('\n');

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
