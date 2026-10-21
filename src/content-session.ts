import type { Item } from './core/types';
import type { PlanItem } from './core/planner';
import type { Address, FieldMeta, Profile } from './core/types';
import type { FeedbackSnapshot } from './feedback/issue-url';
import { classifyAll } from './core/analyze';
import type { FieldClassifier } from './core/classifier';
import type { ClassifyFailure } from './messages';
import { asClassifyFailure } from './messages';
import { hintForButton } from './ai/failure-text';
import { applyAbbrevApprovals } from './core/planner';
import {
  buildFeedbackInput, replanItems, snapshotItems,
} from './content-run';
import { buildFeedbackIssueUrl, FEEDBACK_REPO } from './feedback/issue-url';
import { resolveAddressId, resolveLastId } from './core/selection';
import { shouldWarn, type FillSummary } from './dom/fill-plan';
import type { PreviewRow } from './ui/preview';

// Fill-session inputs that never touch the DOM: the stored profiles/addresses,
// the last-used selection, and the scanned field metadata.
export interface SessionInput {
  profiles: Profile[];
  addresses: Address[];
  lastProfileId?: string;
  lastAddressId?: string;
  metas: FieldMeta[];
  metasById: Map<string, FieldMeta>;
  englishPage: boolean;
  canReanalyze: boolean;
}

// One classification run through the unified attempt seam (PBI-42/45). The
// pending split (ACCEPT_THRESHOLD: confident fields never reach the LLM) stays
// inside classifyAll: this adapter only binds the attempt's failureReason to
// the run's return value, so no caller closure needs to catch the reason on
// the side. A null classifier (or no pending fields) means rule-only:
// classifyAll emits its single aggregated trace line and the reason stays
// null — no second audit record is produced here because the audited adapters
// log once per attempt call either way.
export interface SessionClassifyResult {
  items: Item[];
  failureReason: ClassifyFailure | null;
}

export async function classifyWithReason(
  classifier: FieldClassifier | null,
  metas: FieldMeta[],
  opts: { force?: boolean; englishPage?: boolean } = {},
): Promise<SessionClassifyResult> {
  if (!classifier) {
    return { items: await classifyAll(metas, null, opts), failureReason: null };
  }
  // Session-local binding (not a run-closure escape): classifyAll only calls
  // classify(), so both seam members record the same attempt reason here and
  // it leaves on the return value below.
  let failureReason: ClassifyFailure | null = null;
  const seam: FieldClassifier = {
    // PBI-48: non-throwing by contract — the partial map is returned WITHOUT
    // rethrowing outcome.error (unlike a raw classifier's classify(), which
    // throws). A failed chunk's partial results still reach classifyAll, which
    // keeps rule results for the missing fields (fail-safe: analyze's own
    // try/catch stays as the backstop for a throwing classify).
    classify: async (fields, schedule) => {
      const outcome = await classifier.attempt(fields, schedule);
      failureReason = asClassifyFailure(outcome.failureReason);
      return outcome.map;
    },
    attempt: async (fields, schedule) => {
      const outcome = await classifier.attempt(fields, schedule);
      failureReason = asClassifyFailure(outcome.failureReason);
      return { ...outcome, failureReason };
    },
  };
  return { items: await classifyAll(metas, seam, opts), failureReason };
}

// Every DOM / Chrome side effect the session needs, injected so the ordering is
// unit-testable with fakes. Rendering (showPreview) and status display stay with
// the caller; only the data flow and its order live here.
export interface SessionEnv {
  // Seam-shaped: the failure reason travels on the return value (never into a
  // caller closure). The caller passes intent (which classifier) via
  // classifyWithReason; the apply ordering below owns the reason from there.
  classify(metas: FieldMeta[], opts: { force?: boolean; englishPage?: boolean }): Promise<SessionClassifyResult>;
  // Consent gate over the apply panel; the caller builds it from the panel
  // handle because the button lives inside the closed shadow root.
  checkConsent(panel: SessionPanel): { ok: true } | { ok: false; reason: string };
  // Returns the fill summary so the caller can display failures and decide
  // retries; never throws for per-field outcomes (fillPlan isolates those).
  injectPlan(plan: PlanItem[]): FillSummary;
  persistSelection(sel: { profileId: string; addressId: string }): void;
  openUrl(url: string): void;
  feedbackContext(): { pageHref: string; provider: string; version: string };
  isExcluded(): boolean;
}

// The minimal panel surface the consent gate reads.
export interface SessionPanel {
  getApplyPoint(): { x: number; y: number } | null;
  getHost(): Element;
}

export type SessionStart =
  | { excluded: true; failureReason: ClassifyFailure | null }
  | { excluded: false; rows: PreviewRow[]; failureReason: ClassifyFailure | null };

// What the caller shows after an application: silence (just close the panel)
// or one composed banner. The composition lives here so new entrypoints
// inherit the same wording instead of re-synthesizing summary + hint.
export interface DisplayDecision {
  banner: string | null;
}

// One classify → preview → apply flow. DOM / Chrome side effects (scan,
// showPreview, button status, window.open, fillPlan wiring) stay in the
// caller (`content.ts`); the selection state, the replan order, the consent
// gate position, and the feedback assembly live here so they are testable
// without a DOM.
export function createFillSession(input: SessionInput, env: SessionEnv) {
  let items: Item[] = [];
  let plan: PlanItem[] = [];
  let before: Map<string, FeedbackSnapshot> = new Map();
  let after: Map<string, FeedbackSnapshot> | null = null;
  let profileId = '';
  let addressId = '';
  // The latest classification run's failure reason, owned by the session
  // (PBI-45): start()/reanalyze() set it from the seam return value, apply()
  // reads it for the banner composition. It is never cleared by display or
  // by apply(), so a retry shows the same hint until a newer run overwrites
  // it — the single place the failureReason-overwrite order is expressed.
  let lastFailureReason: ClassifyFailure | null = null;

  const currentProfile = (): Profile =>
    input.profiles.find((p) => p.id === profileId) ?? input.profiles[0]!;
  const currentAddress = (): Address | null =>
    input.addresses.find((a) => a.id === addressId) ?? null;

  const replan = (): PreviewRow[] => {
    const out = replanItems(items, currentProfile(), currentAddress(), input.metasById);
    plan = out.plan;
    return out.rows;
  };

  const resolveSelection = (): void => {
    // The caller (content.ts run()) only creates a session for ready data, so
    // both lists are non-empty here; the `!` only satisfies
    // noUncheckedIndexedAccess.
    profileId = resolveLastId(input.lastProfileId, input.profiles.map((p) => p.id))
      ?? input.profiles[0]!.id;
    addressId = resolveAddressId(input.addresses, profileId, input.lastAddressId)
      ?? input.addresses[0]!.id;
  };

  return {
    get selectedProfileId(): string { return profileId; },
    get selectedAddressId(): string { return addressId; },

    async start(): Promise<SessionStart> {
      const result = await env.classify(input.metas, { englishPage: input.englishPage });
      items = result.items;
      lastFailureReason = result.failureReason;
      before = snapshotItems(items);
      resolveSelection();
      // Classification takes long enough for the settings to change under it; an
      // exclusion that landed meanwhile must not open a panel on this page.
      if (env.isExcluded()) return { excluded: true, failureReason: lastFailureReason };
      return { excluded: false, rows: replan(), failureReason: lastFailureReason };
    },

    selectProfile(id: string): PreviewRow[] {
      profileId = id;
      // Same non-empty premise as resolveSelection above.
      addressId = resolveAddressId(input.addresses, id, addressId) ?? input.addresses[0]!.id;
      return replan();
    },

    selectAddress(id: string): PreviewRow[] {
      addressId = id;
      return replan();
    },

    async reanalyze(): Promise<{ rows: PreviewRow[]; failureReason: ClassifyFailure | null } | null> {
      if (!input.canReanalyze) return null;
      const result = await env.classify(input.metas, { force: true, englishPage: input.englishPage });
      items = result.items;
      lastFailureReason = result.failureReason;
      after = snapshotItems(items);
      return { rows: replan(), failureReason: lastFailureReason };
    },

    apply(
      sendFeedback: boolean,
      panel: SessionPanel,
      approvedAbbrevs?: ReadonlySet<string>,
    ): { applied: true; summary: FillSummary; display: DisplayDecision } | { applied: false; reason: string } {
      // Last trust point: abort before injecting anything when the panel was
      // hidden, moved, or covered. The panel stays open for cancel or retry.
      const consent = env.checkConsent(panel);
      if (!consent.ok) return { applied: false, reason: consent.reason };
      // PBI-122: only the preview's explicit approval promotes an abbreviation
      // candidate into the fill plan; without it the row keeps warn-maxlength
      // and nothing injects (NOT-TODO 12). The flip happens here, once per
      // apply, so the fill module keeps its single "status ok fills" contract.
      if (approvedAbbrevs && approvedAbbrevs.size > 0) {
        plan = applyAbbrevApprovals(plan, approvedAbbrevs);
      }
      // Inject before persisting so the saved selection reflects an attempted
      // application; the outcomes ride the return value for display and retry.
      const summary = env.injectPlan(plan);
      env.persistSelection({ profileId, addressId });
      const ctx = env.feedbackContext();
      const feedbackInput = buildFeedbackInput({
        pageHref: ctx.pageHref,
        provider: ctx.provider,
        version: ctx.version,
        before,
        after,
        fields: input.metas,
        sendFeedback,
      });
      if (feedbackInput) {
        env.openUrl(buildFeedbackIssueUrl(FEEDBACK_REPO, feedbackInput));
      }
      // The banner composes the partial-application note with the stored AI
      // failure hint (if any) so the two never clobber each other on the
      // shared error channel. The hint comes from the session-owned reason —
      // callers no longer thread it through.
      const failureHint = lastFailureReason ? hintForButton(lastFailureReason) : undefined;
      return { applied: true, summary, display: decideDisplay(summary, failureHint) };
    },
  };
}

// Banner composition in one place: silence on full application, otherwise the
// partial-application note composed with the AI failure hint (if any) so the
// two never clobber each other on the shared error channel.
export function decideDisplay(summary: FillSummary, failureHint?: string): DisplayDecision {
  if (!shouldWarn(summary)) return { banner: null };
  const partial = `一部のみ適用（${summary.filled}/${summary.total}件）`;
  return { banner: failureHint ? `${failureHint}。${partial}` : partial };
}

export type FillSession = ReturnType<typeof createFillSession>;
