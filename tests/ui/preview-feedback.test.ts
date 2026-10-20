import { describe, it, expect, vi, afterEach } from 'vitest';
import { showPreview } from '../../src/ui/preview';
import type { PreviewOptions } from '../../src/ui/preview';
import { attachOpenShadow, makeRow } from '../helpers';

function open(opts: Partial<PreviewOptions> = {}) {
  const sh = attachOpenShadow();
  const handle = showPreview({
    rows: [], addresses: [], selectedAddressId: '', onAddressChange: () => {},
    profiles: [], selectedProfileId: '', onProfileChange: () => {},
    onApply: () => {}, onCancel: () => {}, ...opts,
  });
  return { handle, root: sh.root };
}

const feedbackLabel = (root: ShadowRoot) =>
  [...root.querySelectorAll('label')].find((l) => l.textContent === '開発に報告する');
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
    const { root } = open({ rows: [makeRow('ok')], onReanalyze });
    expect(isFeedbackVisible(root)).toBe(false);
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'AI で分析')!.click();
    await vi.waitFor(() => expect(isFeedbackVisible(root)).toBe(true));
    const actions = [...root.querySelectorAll('.actions')[0]!.children].map((el) => el.textContent);
    expect(actions.indexOf('開発に報告する')).toBeGreaterThan(actions.indexOf('入力する'));
    expect(applyButton(root)!.disabled).toBe(false);
  });

  it('stays hidden when reanalysis fails', async () => {
    const onReanalyze = vi.fn(async () => { throw new Error('x'); });
    const { root } = open({ rows: [makeRow('ok')], onReanalyze });
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'AI で分析')!.click();
    await vi.waitFor(() => expect(onReanalyze).toHaveBeenCalledOnce());
    await new Promise((r) => setTimeout(r, 20));
    expect(isFeedbackVisible(root)).toBe(false);
  });

  it('carries a privacy note that values are never sent', async () => {
    const onReanalyze = vi.fn(async () => {});
    const { root } = open({ rows: [makeRow('ok')], onReanalyze });
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'AI で分析')!.click();
    await vi.waitFor(() => expect(isFeedbackVisible(root)).toBe(true));
    const label = feedbackLabel(root)! as HTMLElement;
    expect(label.title).toContain('プロファイルの値は送りません');
  });

  it('passes the checked flag to onApply', async () => {
    const onApply = vi.fn();
    const onReanalyze = vi.fn(async () => {});
    const { root } = open({ rows: [makeRow('ok')], onReanalyze, onApply });
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'AI で分析')!.click();
    await vi.waitFor(() => expect(isFeedbackVisible(root)).toBe(true));
    feedbackLabel(root)!.querySelector('input')!.click();
    applyButton(root)!.click();
    expect(onApply).toHaveBeenCalledWith(true);
  });
});
