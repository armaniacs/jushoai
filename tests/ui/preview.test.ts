import { describe, it, expect, vi, afterEach } from 'vitest';
import { showPreview } from '../../src/ui/preview';
import type { PreviewOptions, PreviewRow } from '../../src/ui/preview';

const row = (status: PreviewRow['status']): PreviewRow => ({
  label: '姓', display: '山田', status, source: 'rule',
});

// Captured once at import time: vi.spyOn reuses the same spy object, so a
// re-captured property would point at the spy itself and recurse forever.
const attach = HTMLElement.prototype.attachShadow;

function open(opts: Partial<PreviewOptions> = {}) {
  let root!: ShadowRoot;
  vi.spyOn(HTMLElement.prototype, 'attachShadow').mockImplementation(function (this: HTMLElement, init) {
    root = attach.call(this, { mode: 'open' });
    return root;
  });
  const handle = showPreview({
    rows: [], addresses: [], selectedAddressId: '', onAddressChange: () => {},
    onApply: () => {}, onCancel: () => {}, ...opts,
  });
  return { handle, root };
}

const button = (root: ShadowRoot, text: string) =>
  [...root.querySelectorAll('button')].find((b) => b.textContent === text);

afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('showPreview', () => {
  it('renders the reanalyze button only when a handler is given', () => {
    const withButton = open({ onReanalyze: () => {} });
    expect(button(withButton.root, 'LLM で再分析')).toBeTruthy();
    const without = open();
    expect(button(without.root, 'LLM で再分析')).toBeUndefined();
  });

  it('keeps the apply gating by row status', () => {
    const ok = open({ rows: [row('ok')] });
    expect(button(ok.root, '入力する')!.disabled).toBe(false);
    const filled = open({ rows: [row('filled')] });
    expect(button(filled.root, '入力する')!.disabled).toBe(true);
  });

  it('locks the panel while reanalysis runs and restores after', async () => {
    let resolve!: () => void;
    const onReanalyze = vi.fn(() => new Promise<void>((r) => { resolve = r; }));
    const { root } = open({ rows: [row('ok')], onReanalyze });
    button(root, 'LLM で再分析')!.click();
    // The handler now runs on a microtask instead of synchronously in the click.
    await vi.waitFor(() => expect(onReanalyze).toHaveBeenCalledOnce());
    expect(button(root, '分析中…')!.disabled).toBe(true);
    expect(button(root, '入力する')!.disabled).toBe(true);
    expect(button(root, 'キャンセル')!.disabled).toBe(true);
    resolve();
    await vi.waitFor(() => expect(button(root, 'LLM で再分析')!.disabled).toBe(false));
    expect(button(root, '入力する')!.disabled).toBe(false);
    expect(button(root, 'キャンセル')!.disabled).toBe(false);
  });

  it('re-enables the panel after a failed reanalysis', async () => {
    const onReanalyze = vi.fn(async () => { throw new Error('x'); });
    const { root } = open({ rows: [row('ok')], onReanalyze });
    button(root, 'LLM で再分析')!.click();
    await vi.waitFor(() => expect(button(root, 'LLM で再分析')!.disabled).toBe(false));
    expect(button(root, '入力する')!.disabled).toBe(false);
  });

  it('re-enables the panel after a synchronously throwing reanalysis', async () => {
    const onReanalyze = vi.fn(() => { throw new Error('sync'); });
    const { root } = open({ rows: [row('ok')], onReanalyze });
    button(root, 'LLM で再分析')!.click();
    await vi.waitFor(() => expect(button(root, 'LLM で再分析')!.disabled).toBe(false));
    expect(button(root, '入力する')!.disabled).toBe(false);
    expect(button(root, 'キャンセル')!.disabled).toBe(false);
  });
});
