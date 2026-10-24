import type { createFillSession } from '../content-session';
import { buildPartialIssueUrl, FEEDBACK_REPO } from '../feedback/issue-url';
import { hintForButton } from '../ai/failure-text';
import { changedRows } from '../core/site-approval';
import type { ApprovalRecord } from '../core/site-approval';
import type { Address, Profile } from '../core/types';
import type { ClassifyFailure } from '../messages';
import type { ButtonHandle } from '../ui/button';
import { showPreview, type PreviewHandle, type PreviewRow } from '../ui/preview';

export type FillSession = ReturnType<typeof createFillSession>;

export interface PreviewBindInput {
  session: FillSession;
  button: ButtonHandle;
  rows: PreviewRow[];
  addresses: Address[];
  profiles: Profile[];
  reanalyzable: boolean;
  feedbackContext(): { pageHref: string; provider: string; version: string };
  openFeedbackUrl(url: string): void;
  // Called when the panel closes (cancel button, Escape, or report flow),
  // so the caller drops its panel handle and a later open starts clean.
  onClosed(): void;
  // Called with the reanalysis failure reason (if any) so the caller can
  // keep the badge guide failure-aware; the button hint is still shown here.
  onFailure?(reason: ClassifyFailure | null): void;
  // PBI-138: the preview's 分類を直す flow. The handler opens the chooser, runs
  // the correction through the session and decides whether the site learns it.
  onFix?(fieldId: string, label: string, preview: PreviewHandle): void | Promise<void>;
  // PBI-128: a matching per-site approval record shortens the preview to the
  // changed rows; the record save runs after a successful apply.
  approval?: ApprovalRecord | null;
  recordApproval?(rows: PreviewRow[]): void;
  // PBI-141: the profile used on this host is learned from use after a
  // successful apply, so the next visit suggests it as the first candidate.
  recordAssignment?(profileId: string): void;
  // PBI-144: called once after a successful apply, so a one-shot value (the
  // guest overlay) is consumed with the fill instead of lingering for the
  // next button press.
  onApplied?(): void;
}

// Preview wiring extracted from the entrypoint run() (PBI-64): reanalysis,
// profile/address switching, apply (with the PBI-55 result mode), and cancel.
// run() keeps classification, the panel-open decision, and the exclusion
// guard; everything after showPreview lives here. Behavior is unchanged —
// this is a move, verified by the existing E2E suite.
export function bindPreview(input: PreviewBindInput): PreviewHandle {
  const { session, button } = input;
  // PBI-128: a matching approval collapses the unchanged rows into one muted
  // line. The plan itself is untouched — the apply still injects the full
  // plan; only the view shortens.
  const shortRows = (): PreviewRow[] => {
    if (!input.approval) return input.rows;
    const changed = changedRows(input.rows, input.approval);
    const hidden = input.rows.length - changed.length;
    if (hidden === 0 || changed.length === 0) return input.rows;
    return [
      ...changed,
      {
        label: '前回と同じ',
        display: `${hidden}件を前回の承認どおりに入力します`,
        status: 'ok',
        source: 'rule',
        synthetic: true,
      },
    ];
  };
  // Single teardown for every close path (cancel, report flow, clean apply):
  // close the panel, then let the caller drop its handle.
  // teardown reads the `preview` declared below, which stays in the temporal
  // dead zone until showPreview returns. Safe only because every callback
  // fires on user interaction, never synchronously during construction.
  const teardown = (): void => {
    preview.close();
    input.onClosed();
  };
  const preview = showPreview({
    rows: shortRows(),
    addresses: input.addresses,
    selectedAddressId: session.selectedAddressId,
    onReanalyze: input.reanalyzable ? () => {
      void session.reanalyze().then((res) => {
        if (res?.failureReason) {
          button.showError({ kind: 'transient', text: hintForButton(res.failureReason) });
        }
        input.onFailure?.(res?.failureReason ?? null);
        if (res) preview.setRows(res.rows);
      });
    } : undefined,
    profiles: input.profiles,
    selectedProfileId: session.selectedProfileId,
    onProfileChange: (id) => {
      const rows = session.selectProfile(id);
      preview.setAddressId(session.selectedAddressId);
      preview.setRows(rows);
    },
    onAddressChange: (id) => {
      preview.setRows(session.selectAddress(id));
    },
    onFix: input.onFix
      ? (fieldId, label) => { void input.onFix!(fieldId, label, preview); }
      : undefined,
    onExpandAll: input.approval ? () => preview.setRows(input.rows) : undefined,
    onApply: (sendFeedback, approvedAbbrevs) => {
      // Last trust point: the session aborts before injecting anything when
      // the panel was hidden, moved, or covered. The panel stays open for
      // cancel or retry, and the reason goes to the form button, which stays
      // visible even when the panel is hidden. The abbreviation approvals
      // (PBI-122) ride the same call: only rows the user explicitly checked
      // in the preview promote into the fill plan.
      const result = session.apply(sendFeedback, preview, approvedAbbrevs);
      if (!result.applied) {
        button.showError({ kind: 'transient', text: result.reason });
        return;
      }
      // The banner arrives with its kind; this side only displays it.
      if (result.display.banner) button.showError(result.display.banner);
      // PBI-128: the approval memory records the applied shape after a clean
      // apply, so the next visit to the same form shortens its preview.
      input.recordApproval?.(input.rows);
      // PBI-141: the profile used on this host is learned from use — the next
      // visit suggests it as the first candidate. 切替は候補提示のみ.
      input.recordAssignment?.(session.selectedProfileId);
      // PBI-144: the fill completed — a one-shot value is consumed here so a
      // second press starts from the stored data again.
      input.onApplied?.();
      // PBI-55: a partial apply (not everything filled) keeps the preview
      // open in result mode with a one-click breakdown report; PBI-132: a
      // clean apply with undo history also keeps it open so 元に戻す is
      // reachable right after the injection. The banner above still fires
      // for true runtime failures independently of this view.
      const undoCount = session.undoCount;
      if (result.summary.filled < result.summary.total || undoCount > 0) {
        const ctx = input.feedbackContext();
        const onReport = () => {
          input.openFeedbackUrl(buildPartialIssueUrl(
            FEEDBACK_REPO,
            {
              pageHref: ctx.pageHref,
              provider: ctx.provider,
              version: ctx.version,
              filled: result.summary.filled,
              unapplied: result.summary.unapplied,
              total: result.summary.total,
              byResult: result.summary.byResult,
            },
          ));
          teardown();
        };
        preview.showResult(
          result.summary,
          onReport,
          undoCount > 0
            ? {
                count: undoCount,
                onUndo: () => {
                  // One-shot: the session consumes the entries. The view
                  // swaps to the undo confirmation from here.
                  const r = session.undoLast();
                  preview.showUndoResult(r?.restored.length ?? 0, r?.skipped.length ?? 0);
                },
              }
            : undefined,
        );
        return;
      }
      teardown();
    },
    // Re-entrant by design: preview.close() fires the panel onClose, which
    // is this onCancel, which calls preview.close() again. The chain always
    // stops at the second close because the panel close is idempotent — do
    // not remove that guard without unwinding this cycle first.
    onCancel: () => {
      teardown();
    },
  });
  return preview;
}
