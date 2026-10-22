import type { createFillSession } from '../content-session';
import { buildPartialIssueUrl, FEEDBACK_REPO } from '../feedback/issue-url';
import { hintForButton } from '../ai/failure-text';
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
}

// Preview wiring extracted from the entrypoint run() (PBI-64): reanalysis,
// profile/address switching, apply (with the PBI-55 result mode), and cancel.
// run() keeps classification, the panel-open decision, and the exclusion
// guard; everything after showPreview lives here. Behavior is unchanged —
// this is a move, verified by the existing E2E suite.
export function bindPreview(input: PreviewBindInput): PreviewHandle {
  const { session, button } = input;
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
    rows: input.rows,
    addresses: input.addresses,
    selectedAddressId: session.selectedAddressId,
    onReanalyze: input.reanalyzable ? () => {
      void session.reanalyze().then((res) => {
        if (res?.failureReason) button.showError(hintForButton(res.failureReason));
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
    onApply: (sendFeedback, approvedAbbrevs) => {
      // Last trust point: the session aborts before injecting anything when
      // the panel was hidden, moved, or covered. The panel stays open for
      // cancel or retry, and the reason goes to the form button, which stays
      // visible even when the panel is hidden. The abbreviation approvals
      // (PBI-122) ride the same call: only rows the user explicitly checked
      // in the preview promote into the fill plan.
      const result = session.apply(sendFeedback, preview, approvedAbbrevs);
      if (!result.applied) {
        button.showError(result.reason);
        return;
      }
      // The banner text arrives composed; this side only displays it.
      if (result.display.banner) button.showError(result.display.banner);
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
