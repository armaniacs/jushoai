import { describe, it, expect, vi, afterEach } from 'vitest';
import { showPreview } from '../../src/ui/preview';
import type { PreviewOptions, PreviewRow } from '../../src/ui/preview';
import { EMPTY_PROFILE, EMPTY_ADDRESS, type Address, type Profile } from '../../src/core/types';

const row = (status: PreviewRow['status']): PreviewRow => ({
  label: '姓', display: '山田', status, source: 'rule',
});

// Captured once at import time: vi.spyOn reuses the same spy object, so a
// re-captured property would point at the spy itself and recurse forever.
const attach = HTMLElement.prototype.attachShadow;

function open(opts: Partial<PreviewOptions> = {}) {
  let root!: ShadowRoot;
  vi.spyOn(HTMLElement.prototype, 'attachShadow').mockImplementation(function (this: HTMLElement) {
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

const button = (root: ShadowRoot, text: string) =>
  [...root.querySelectorAll('button')].find((b) => b.textContent === text);

afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('showPreview', () => {
  it('renders the reanalyze button only when a handler is given', () => {
    const withButton = open({ onReanalyze: () => {} });
    expect(button(withButton.root, 'AI で分析')).toBeTruthy();
    const without = open();
    expect(button(without.root, 'AI で分析')).toBeUndefined();
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
    button(root, 'AI で分析')!.click();
    // The handler runs on a microtask, so the click itself does not finish the analysis;
    // the test must wait for the restore.
    await vi.waitFor(() => expect(onReanalyze).toHaveBeenCalledOnce());
    expect(button(root, '分析中…')!.disabled).toBe(true);
    expect(button(root, '入力する')!.disabled).toBe(true);
    expect(button(root, 'キャンセル')!.disabled).toBe(true);
    resolve();
    await vi.waitFor(() => expect(button(root, 'AI で分析')!.disabled).toBe(false));
    expect(button(root, '入力する')!.disabled).toBe(false);
    expect(button(root, 'キャンセル')!.disabled).toBe(false);
  });

  it('re-enables the panel after a failed reanalysis', async () => {
    const onReanalyze = vi.fn(async () => { throw new Error('x'); });
    const { root } = open({ rows: [row('ok')], onReanalyze });
    button(root, 'AI で分析')!.click();
    await vi.waitFor(() => expect(button(root, 'AI で分析')!.disabled).toBe(false));
    expect(button(root, '入力する')!.disabled).toBe(false);
  });

  it('re-enables the panel after a synchronously throwing reanalysis', async () => {
    const onReanalyze = vi.fn(() => { throw new Error('sync'); });
    const { root } = open({ rows: [row('ok')], onReanalyze });
    button(root, 'AI で分析')!.click();
    await vi.waitFor(() => expect(button(root, 'AI で分析')!.disabled).toBe(false));
    expect(button(root, '入力する')!.disabled).toBe(false);
    expect(button(root, 'キャンセル')!.disabled).toBe(false);
  });

  it('reports no apply point when the button has no box (jsdom has no layout)', () => {
    const { handle } = open({ rows: [row('ok')] });
    expect(handle.getApplyPoint()).toBeNull();
  });

  it('stops the cancel→close→cancel cycle instead of recursing', () => {
    const onCancel = vi.fn();
    let handle!: ReturnType<typeof showPreview>;
    // Same wiring as content.ts: onCancel closes the preview it came from, and
    // the panel close fires onCancel again. The chain must stop at the second
    // close (panel idempotency), so onCancel runs exactly twice, not forever.
    const opened = open({ onCancel: () => { handle.close(); onCancel(); } });
    handle = opened.handle;
    button(opened.root, 'キャンセル')!.click();
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('exposes busy state to screen readers without visual change', async () => {
    let resolve!: () => void;
    const onReanalyze = vi.fn(() => new Promise<void>((r) => { resolve = r; }));
    const { root } = open({ rows: [row('ok')], onReanalyze });
    const list = root.querySelector('ul')!;
    const status = root.querySelector('[role="status"]')!;
    expect(list.getAttribute('aria-busy')).toBe('false');
    expect(status.textContent).toBe('');
    button(root, 'AI で分析')!.click();
    await vi.waitFor(() => expect(onReanalyze).toHaveBeenCalledOnce());
    expect(list.getAttribute('aria-busy')).toBe('true');
    expect(status.textContent).toBe('分析中…');
    // Visible copy is unchanged apart from the pre-existing button label swap.
    expect(button(root, '分析中…')!.textContent).toBe('分析中…');
    resolve();
    await vi.waitFor(() => expect(button(root, 'AI で分析')!.disabled).toBe(false));
    expect(list.getAttribute('aria-busy')).toBe('false');
    expect(status.textContent).toBe('');
  });

  it('does not re-announce while busy (setRows keeps the live region stable)', () => {
    const { handle, root } = open({ rows: [row('ok')], onReanalyze: () => {} });
    const list = root.querySelector('ul')!;
    const status = root.querySelector('[role="status"]') as HTMLElement;
    expect(status.getAttribute('role')).toBe('status');
    handle.setReanalyzing(true);
    expect(list.getAttribute('aria-busy')).toBe('true');
    expect(status.textContent).toBe('分析中…');
    // Mid-analysis row updates must not touch the live region again.
    handle.setRows([row('ok')]);
    expect(list.getAttribute('aria-busy')).toBe('true');
    expect(status.textContent).toBe('分析中…');
    handle.setReanalyzing(false);
    expect(list.getAttribute('aria-busy')).toBe('false');
    expect(status.textContent).toBe('');
  });
});

const prof = (id: string, label: string): Profile => ({ ...EMPTY_PROFILE, id, label });
const addr = (id: string, label: string): Address => ({ ...EMPTY_ADDRESS, id, label });

const twoProfiles = {
  profiles: [prof('p1', 'メイン'), prof('p2', '仕事用')],
  selectedProfileId: 'p1', onProfileChange: () => {},
};
const twoAddresses = {
  addresses: [addr('a1', '自宅'), addr('a2', '実家')],
  selectedAddressId: 'a1', onAddressChange: () => {},
};

describe('showPreview profile select', () => {
  it('renders the profile select only when multiple profiles exist', () => {
    const one = open({ profiles: [prof('p1', 'メイン')], selectedProfileId: 'p1', onProfileChange: () => {} });
    expect(one.root.querySelectorAll('select')).toHaveLength(0);
    const two = open({
      profiles: [prof('p1', 'メイン'), prof('p2', '仕事用')],
      selectedProfileId: 'p1', onProfileChange: () => {},
    });
    const selects = two.root.querySelectorAll('select');
    expect(selects).toHaveLength(1);
    expect([...selects[0]!.options].map((o) => o.text)).toEqual(['メイン', '仕事用']);
  });

  it('notifies profile changes', () => {
    const onProfileChange = vi.fn();
    const { root } = open({
      profiles: [prof('p1', 'メイン'), prof('p2', '仕事用')],
      selectedProfileId: 'p1', onProfileChange,
    });
    const select = root.querySelector('select')!;
    select.value = 'p2';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onProfileChange).toHaveBeenCalledWith('p2');
  });
});

describe('showPreview select labels', () => {
  it('marks the profile and address selects with distinguishable captions', () => {
    const { root } = open({ ...twoProfiles, ...twoAddresses });
    const selects = [...root.querySelectorAll('select')];
    expect(selects).toHaveLength(2);
    const captions = selects.map((s) => s.closest('label')?.querySelector('span')?.textContent);
    expect(captions).toEqual(['プロファイル', '住所']);
  });

  it('gives each select an associated label for screen readers', () => {
    const { root } = open({ ...twoProfiles, ...twoAddresses });
    for (const select of root.querySelectorAll('select')) {
      // A wrapping <label> associates the caption as the accessible name.
      const label = select.closest('label');
      expect(label).not.toBeNull();
      expect(label!.textContent).toContain(select === root.querySelectorAll('select')[0] ? 'プロファイル' : '住所');
    }
  });

  it('renders no select when only one profile and one address exist', () => {
    const { root } = open({
      profiles: [prof('p1', 'メイン')], selectedProfileId: 'p1', onProfileChange: () => {},
      addresses: [addr('a1', '自宅')], selectedAddressId: 'a1', onAddressChange: () => {},
    });
    expect(root.querySelectorAll('select')).toHaveLength(0);
  });
});

describe('showResult (PBI-55)', () => {
  const summary = {
    filled: 1,
    unapplied: 2,
    total: 3,
    byResult: {
      filled: 1,
      'skipped-status': 1,
      'missing-target': 0,
      detached: 0,
      'already-filled': 1,
      'no-option': 0,
      error: 0,
    },
  };

  it('swaps the panel to the breakdown with a report button', () => {
    const onReport = vi.fn();
    const { handle, root } = open({ rows: [row('ok')] });
    handle.showResult(summary, onReport);
    expect(root.querySelector('h2')!.textContent).toBe('入力結果');
    expect(root.textContent).toContain('適用済み 1 / 3件');
    expect(root.textContent).toContain('見送り（仕様どおり）');
    const report = button(root, '内訳をissueで報告')!;
    expect(report).toBeTruthy();
    report.click();
    expect(onReport).toHaveBeenCalledOnce();
  });

  it('lists only nonzero reasons', () => {
    const { handle, root } = open({ rows: [row('ok')] });
    handle.showResult(summary, () => {});
    expect(root.textContent).not.toContain('選択肢なし');
  });

  it('moves focus to the report button (PBI-56)', () => {
    const { handle, root } = open({ rows: [row('ok')] });
    handle.showResult(summary, () => {});
    // Focus inside a shadow root surfaces as the shadow root's activeElement.
    expect(root.activeElement?.textContent).toBe('内訳をissueで報告');
  });

  it('ignores setRows once in result mode (PBI-59)', () => {
    const { handle, root } = open({ rows: [row('ok')] });
    handle.showResult(summary, () => {});
    handle.setRows([row('filled')]);
    expect(root.textContent).toContain('入力結果');
    expect(root.textContent).not.toContain('上書きしません');
  });

  it('renders labels from the shared fill-plan table (PBI-58)', () => {
    const { handle, root } = open({ rows: [row('ok')] });
    handle.showResult(summary, () => {});
    expect(root.textContent).toContain('適用済み');
    expect(root.textContent).toContain('見送り（仕様どおり）');
  });
});
