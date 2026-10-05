import { describe, it, expect, vi, afterEach } from 'vitest';
import { showPreview } from '../../src/ui/preview';
import type { PreviewOptions, PreviewRow } from '../../src/ui/preview';

const row = (status: PreviewRow['status']): PreviewRow => ({
  label: '姓', display: '山田', status, source: 'rule',
});

const attach = HTMLElement.prototype.attachShadow;

function open(opts: Partial<PreviewOptions> = {}) {
  let root!: ShadowRoot;
  vi.spyOn(HTMLElement.prototype, 'attachShadow').mockImplementation(function (this: HTMLElement, init) {
    root = attach.call(this, { mode: 'open' });
    return root;
  });
  const handle = showPreview({
    rows: [], addresses: [], selectedAddressId: '', onAddressChange: () => {},
    profiles: [], selectedProfileId: '', onProfileChange: () => {},
    onApply: () => {}, onCancel: () => {}, ...opts,
  });
  return { handle, root };
}

const feedbackLabel = (root: ShadowRoot) =>
  [...root.querySelectorAll('label')].find((l) => l.textContent === '開発にFBする');
const isFeedbackVisible = (root: ShadowRoot) => {
  const l = feedbackLabel(root);
  return !!l && !(l as HTMLElement).hidden;
};
const applyButton = (root: ShadowRoot) =>
  [...root.querySelectorAll('button')].find((b) => b.textContent === '入力する');

afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('preview feedback checkbox', () => {
  it('is hidden before reanalysis and shown after success, right of apply', async () => {
    const onReanalyze = vi.fn(async () => {});
    const { root } = open({ rows: [row('ok')], onReanalyze });
    expect(isFeedbackVisible(root)).toBe(false);
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'LLM で再分析')!.click();
    await vi.waitFor(() => expect(isFeedbackVisible(root)).toBe(true));
    const actions = [...root.querySelectorAll('.actions')[0]!.children].map((el) => el.textContent);
    expect(actions.indexOf('開発にFBする')).toBeGreaterThan(actions.indexOf('入力する'));
    expect(applyButton(root)!.disabled).toBe(false);
  });

  it('stays hidden when reanalysis fails', async () => {
    const onReanalyze = vi.fn(async () => { throw new Error('x'); });
    const { root } = open({ rows: [row('ok')], onReanalyze });
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'LLM で再分析')!.click();
    await vi.waitFor(() => expect(onReanalyze).toHaveBeenCalledOnce());
    await new Promise((r) => setTimeout(r, 20));
    expect(isFeedbackVisible(root)).toBe(false);
  });

  it('carries a privacy note that values are never sent', async () => {
    const onReanalyze = vi.fn(async () => {});
    const { root } = open({ rows: [row('ok')], onReanalyze });
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'LLM で再分析')!.click();
    await vi.waitFor(() => expect(isFeedbackVisible(root)).toBe(true));
    const label = feedbackLabel(root)! as HTMLElement;
    expect(label.title).toContain('プロファイルの値は送りません');
  });

  it('passes the checked flag to onApply', async () => {
    const onApply = vi.fn();
    const onReanalyze = vi.fn(async () => {});
    const { root } = open({ rows: [row('ok')], onReanalyze, onApply });
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'LLM で再分析')!.click();
    await vi.waitFor(() => expect(isFeedbackVisible(root)).toBe(true));
    feedbackLabel(root)!.querySelector('input')!.click();
    applyButton(root)!.click();
    expect(onApply).toHaveBeenCalledWith(true);
  });
});
