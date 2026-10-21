import { describe, it, expect, vi, afterEach } from 'vitest';
import { bindPreview } from '../../src/content/preview-bind';
import type { FillSession } from '../../src/content/preview-bind';
import type { SessionPanel } from '../../src/content-session';
import type { PreviewRow } from '../../src/ui/preview';
import type { ButtonHandle } from '../../src/ui/button';
import type { FillResult, FillSummary } from '../../src/dom/fill-plan';
import { hintForButton } from '../../src/ai/failure-text';
import { FEEDBACK_REPO } from '../../src/feedback/issue-url';
import { attachOpenShadow, buttonIn, makeRow } from '../helpers';

// Wiring test for the preview binding extracted from run() (PBI-64): the real
// preview mounts in jsdom (same pattern as tests/ui/preview.test.ts) and a
// fake session / button pins the contract bindPreview owes each side — the
// reanalyzable gate, the teardown paths, and the partial-apply result mode.
type ReanalyzeResult = Awaited<ReturnType<FillSession['reanalyze']>>;
type ApplyResult = ReturnType<FillSession['apply']>;

const summary = (filled: number, total: number): FillSummary => ({
  filled, unapplied: total - filled, total,
  byResult: {
    filled,
    'skipped-status': 0, 'missing-target': 0, detached: 0,
    'already-filled': total - filled, 'no-option': 0, error: 0,
  } satisfies Record<FillResult, number>,
});

const fakeSession = (overrides: Partial<FillSession> = {}): FillSession => ({
  selectedProfileId: 'p1',
  selectedAddressId: 'a1',
  start: async () => ({ excluded: false, rows: [], failureReason: null }),
  reanalyze: async () => null,
  selectProfile: () => [],
  selectAddress: () => [],
  apply: () => ({ applied: false, reason: 'unused' }),
  ...overrides,
});

function bind(session: FillSession, reanalyzable = true) {
  const sh = attachOpenShadow();
  const buttonHandle: ButtonHandle = {
    setStatus: vi.fn(), showError: vi.fn(), reposition: vi.fn(), destroy: vi.fn(),
  };
  const input = {
    session,
    button: buttonHandle,
    rows: [makeRow('ok', '初期値')],
    addresses: [],
    profiles: [],
    reanalyzable,
    feedbackContext: () => ({ pageHref: 'https://example.com/form', provider: 'none', version: '0.1.20' }),
    openFeedbackUrl: vi.fn(),
    onClosed: vi.fn(),
  };
  bindPreview(input);
  return { root: sh.root, buttonHandle, input };
}

afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('bindPreview (PBI-64 wiring)', () => {
  it('wires the reanalyze path only when a classifier is present', () => {
    const withClassifier = bind(fakeSession(), true);
    expect(buttonIn(withClassifier.root, 'AI で分析')).toBeTruthy();
    const without = bind(fakeSession(), false);
    expect(buttonIn(without.root, 'AI で分析')).toBeUndefined();
  });

  it('routes reanalysis results to the button hint and the rows', async () => {
    const session = fakeSession({
      reanalyze: vi.fn(async (): Promise<ReanalyzeResult> => ({ rows: [makeRow('ok', '山田')], failureReason: 'network' })),
    });
    const { root, buttonHandle } = bind(session, true);
    buttonIn(root, 'AI で分析')!.click();
    await vi.waitFor(() => expect(buttonHandle.showError).toHaveBeenCalledWith(hintForButton('network')));
    expect(root.textContent).toContain('山田');
  });

  it('reports a reanalysis failure to onFailure for the badge guide', async () => {
    const onFailure = vi.fn();
    const sh = attachOpenShadow();
    const buttonHandle: ButtonHandle = {
      setStatus: vi.fn(), showError: vi.fn(), reposition: vi.fn(), destroy: vi.fn(),
    };
    bindPreview({
      session: fakeSession({
        reanalyze: vi.fn(async (): Promise<ReanalyzeResult> => ({ rows: [], failureReason: 'auth' })),
      }),
      button: buttonHandle,
      rows: [makeRow('ok', '初期値')],
      addresses: [],
      profiles: [],
      reanalyzable: true,
      feedbackContext: () => ({ pageHref: 'https://example.com/form', provider: 'none', version: '0.1.20' }),
      openFeedbackUrl: vi.fn(),
      onClosed: vi.fn(),
      onFailure,
    });
    expect(sh.root).toBeTruthy();
    buttonIn(sh.root, 'AI で分析')!.click();
    await vi.waitFor(() => expect(onFailure).toHaveBeenCalledWith('auth'));
  });

  it('surfaces the abort reason on the button and keeps the panel for retry', () => {
    const session = fakeSession({
      apply: vi.fn((): ApplyResult => ({ applied: false, reason: 'パネルが隠れています' })),
    });
    const { root, buttonHandle, input } = bind(session, false);
    buttonIn(root, '入力する')!.click();
    expect(session.apply).toHaveBeenCalledOnce();
    expect(buttonHandle.showError).toHaveBeenCalledWith('パネルが隠れています');
    expect(input.onClosed).not.toHaveBeenCalled();
    expect(root.host.isConnected).toBe(true);
  });

  it('hands the preview handle to apply and closes on a clean apply', () => {
    let receivedPanel: SessionPanel | null = null;
    const session = fakeSession({
      apply: vi.fn((_sendFeedback: boolean, panel: SessionPanel): ApplyResult => {
        receivedPanel = panel;
        return { applied: true, summary: summary(2, 2), display: { banner: null } };
      }),
    });
    const { root, input } = bind(session, false);
    buttonIn(root, '入力する')!.click();
    // The consent gate reads the same handle the preview returned (last trust point).
    expect(receivedPanel!.getHost()).toBe(root.host);
    expect(input.onClosed).toHaveBeenCalled();
    expect(root.host.isConnected).toBe(false);
  });

  it('keeps a partial apply in result mode and reports on demand', () => {
    const session = fakeSession({
      apply: vi.fn((): ApplyResult => ({ applied: true, summary: summary(1, 2), display: { banner: null } })),
    });
    const { root, input } = bind(session, false);
    buttonIn(root, '入力する')!.click();
    // Partial apply: result mode instead of close (PBI-55).
    expect(input.onClosed).not.toHaveBeenCalled();
    const report = buttonIn(root, '内訳をissueで報告');
    expect(report).toBeTruthy();
    report!.click();
    expect(input.openFeedbackUrl).toHaveBeenCalledOnce();
    const url = new URL(String(input.openFeedbackUrl.mock.calls[0]![0]));
    expect(`${url.origin}${url.pathname}`).toBe(`${FEEDBACK_REPO}/issues/new`);
    const body = url.searchParams.get('body') ?? '';
    expect(body).toContain('Applied: 1 / 2');
    // The minimized public label (PBI-63), never the raw href with queries.
    expect(body).toContain('Page: https://example.com/form');
    expect(body).not.toContain('token=');
    expect(input.onClosed).toHaveBeenCalled();
    expect(root.host.isConnected).toBe(false);
  });

  it('closes through cancel and stops the re-entrant chain', () => {
    const { root, input } = bind(fakeSession(), false);
    buttonIn(root, 'キャンセル')!.click();
    // The re-entrant chain (close → onClose → onCancel → teardown) re-runs the
    // idempotent onClosed bookkeeping twice per close, so this pins "at least
    // once"; the stable observable is the detached host below.
    expect(input.onClosed).toHaveBeenCalled();
    expect(root.host.isConnected).toBe(false);
  });
});
