import type { Category, Item } from '../core/types';
import type { PlanItem } from '../core/planner';
import type { Address, FieldMeta, Profile } from '../core/types';
import type { FeedbackSnapshot } from '../feedback/issue-url';
import type { ClassifyFailure } from '../messages';
import { hintForButton } from '../ai/failure-text';
import { applyAbbrevApprovals } from '../core/planner';
import {
  buildFeedbackInput, replanItems, snapshotItems,
} from '../content-run';
import { buildFeedbackIssueUrl, FEEDBACK_REPO } from '../feedback/issue-url';
import { resolveAddressId, resolveLastId } from '../core/selection';
import { shouldWarn, undoFill, type FillReport, type FillSummary, type UndoEntry, type UndoReport } from '../dom/fill-plan';
import { fieldKeyFor } from '../core/domain-mapping';
import type { PreviewRow } from '../ui/preview';
import type { BannerNotice } from '../ui/button';
// NOTE: type-only — erased at compile time, so the runtime re-export in the
// other direction (content-session → this module) forms no import cycle.
import type { SessionEnv, SessionInput, SessionPanel } from '../content-session';

// FillFlow: the single typed owner of the apply pipeline (PBI-178).
// consent→inject→persist→carryover→feedback→banner＋承認/割当/guest後処理 used
// to live in three files (content-session, content.ts, preview-bind) held
// together by call order and comments. Now every effect runs inside
// runApplyTransaction below and nowhere else: the steps are not separate
// public methods, so an out-of-order call is not expressible — the order is
// owned by this function body instead of being described by comments.
// start/apply are the only two entry points.
export interface FillFlowEnv extends SessionEnv {
  // PBI-128: the applied shape is recorded after a clean apply, so the next
  // visit to the same form shortens its preview. Folded in from PreviewBindInput.
  recordApproval?(rows: PreviewRow[]): void;
  // PBI-141: the profile used on this host is learned from use. Folded in
  // from PreviewBindInput — still host → profileId only, never a value.
  recordAssignment?(profileId: string): void;
  // PBI-144: a one-shot value is consumed with the fill. Folded in from
  // PreviewBindInput.
  onApplied?(): void;
}

// Everything apply() needs, assembled once by the caller: the fill-session
// inputs plus the full effect set. content.ts builds this single bundle
// instead of an env plus three separate bindPreview callbacks.
export interface FillBundle {
  input: SessionInput;
  env: FillFlowEnv;
}

// apply() takes one decisions object (not positional callbacks), so the call
// site cannot forget or reorder an argument.
export interface ApplyDecisions {
  sendFeedback: boolean;
  panel: SessionPanel;
  approvedAbbrevs?: ReadonlySet<string>;
}

export type FillStart =
  | { excluded: true; failureReason: ClassifyFailure | null }
  | { excluded: false; rows: PreviewRow[]; failureReason: ClassifyFailure | null };

export type FillFlowApplyResult =
  | { applied: true; summary: FillSummary; display: DisplayDecision; undoCount: number }
  | { applied: false; reason: string };

// What the caller shows after an application: silence (just close the panel)
// or one composed banner. The composition lives here so new entrypoints
// inherit the same wording instead of re-synthesizing summary + hint.
// The banner's timer behavior rides the kind (PBI-152): this transaction owns
// the "this is a partial-application banner" decision and passes it as a
// structured notice; the button times each kind without sniffing the text.
export interface DisplayDecision {
  banner: BannerNotice | null;
}

// Banner composition in one place: silence on full application, otherwise the
// partial-application note composed with the AI failure hint (if any) so the
// two never clobber each other on the shared error channel. The kind is
// always 'partial' here: shouldWarn means not everything was filled, and the
// persistent-banner behavior (PBI-08) is the one contract the button obeys.
export function decideDisplay(summary: FillSummary, failureHint?: string): DisplayDecision {
  if (!shouldWarn(summary)) return { banner: null };
  const partial = `一部のみ適用（${summary.filled}/${summary.total}件）`;
  return { banner: { kind: 'partial', text: failureHint ? `${failureHint}。${partial}` : partial } };
}

// Mutable transaction state. All flow/session fields live here — no second
// copy in a closure — so runApplyTransaction mutates the same object the
// selectors and undoLast observe. reportOf-coupled: lastUndo always mirrors
// the latest inject report (PBI-132).
export interface FillApplyState {
  items: Item[];
  plan: PlanItem[];
  before: Map<string, FeedbackSnapshot>;
  after: Map<string, FeedbackSnapshot> | null;
  profileId: string;
  addressId: string;
  lastFailureReason: ClassifyFailure | null;
  lastUndo: UndoEntry[];
  // The rows the preview was built from (frozen at start): recordApproval
  // records the applied shape, i.e. what the user approved, not a later
  // re-plan. Matches the old bindPreview input.rows behavior.
  approvalRows: PreviewRow[];
  metas: FieldMeta[];
  metasById: Map<string, FieldMeta>;
}

// The single typed transaction (PBI-178). Every side effect of one apply runs
// here in this order and nowhere else:
// consent → inject → persist → carryover → feedback → banner → 承認/割当/guest.
// A reorder means editing this function, which the fake-env order tests pin.
export function runApplyTransaction(
  state: FillApplyState,
  env: FillFlowEnv,
  decisions: ApplyDecisions,
): FillFlowApplyResult {
  // Last trust point: abort before injecting anything when the panel was
  // hidden, moved, or covered. The panel stays open for cancel or retry.
  const consent = env.checkConsent(decisions.panel);
  if (!consent.ok) return { applied: false, reason: consent.reason };
  // PBI-122: only the preview's explicit approval promotes an abbreviation
  // candidate into the fill plan; without it the row keeps warn-maxlength
  // and nothing injects (NOT-TODO 12). The flip happens here, once per
  // apply, so the fill module keeps its single "status ok fills" contract.
  if (decisions.approvedAbbrevs && decisions.approvedAbbrevs.size > 0) {
    state.plan = applyAbbrevApprovals(state.plan, decisions.approvedAbbrevs);
  }
  // Inject before persisting so the saved selection reflects an attempted
  // application; the outcomes ride the return value for display and retry.
  const report: FillReport = env.injectPlan(state.plan);
  state.lastUndo = report.undo;
  const summary = report.summary;
  env.persistSelection({ profileId: state.profileId, addressId: state.addressId });
  // PBI-142: the filled values merge into the tab-scoped carryover, so the
  // next page of the same tab re-offers them. Profile values are never
  // part of the merge — the signature and the value only.
  if (env.recordCarryover) {
    // A plan fieldId is built from the same metasById, so the lookup cannot
    // miss in practice — the guard keeps a contract drift from throwing
    // inside apply after the injection already happened.
    env.recordCarryover(state.plan.flatMap((p) => {
      if (!p.value) return [];
      const meta = state.metasById.get(p.fieldId);
      const key = meta ? fieldKeyFor(meta) : null;
      if (!key) return [];
      return [{ key, value: p.value }];
    }));
  }
  const ctx = env.feedbackContext();
  const feedbackInput = buildFeedbackInput({
    pageHref: ctx.pageHref,
    provider: ctx.provider,
    version: ctx.version,
    before: state.before,
    after: state.after,
    fields: state.metas,
    sendFeedback: decisions.sendFeedback,
  });
  if (feedbackInput) {
    env.openUrl(buildFeedbackIssueUrl(FEEDBACK_REPO, feedbackInput));
  }
  // The banner composes the partial-application note with the stored AI
  // failure hint (if any) so the two never clobber each other on the
  // shared error channel. The hint comes from the flow-owned reason —
  // callers no longer thread it through.
  const failureHint = state.lastFailureReason ? hintForButton(state.lastFailureReason) : undefined;
  const display = decideDisplay(summary, failureHint);
  // Post-apply bookkeeping folded in from PreviewBindInput (PBI-128/141/144):
  // the approval memory, the per-site assignment, and the one-shot guest
  // consumption all ride the same transaction instead of trailing callbacks.
  env.recordApproval?.(state.approvalRows);
  env.recordAssignment?.(state.profileId);
  env.onApplied?.();
  return { applied: true, summary, display, undoCount: state.lastUndo.length };
}

// One classify → preview → apply flow. DOM / Chrome side effects (scan,
// showPreview, button status, window.open, fillPlan wiring) stay in the
// caller (`content.ts`); the selection state, the replan order, the consent
// gate position, and the feedback assembly live here so they are testable
// without a DOM.
export function createFillFlow(bundle: FillBundle) {
  const { input, env } = bundle;
  const state: FillApplyState = {
    items: [],
    plan: [],
    before: new Map(),
    after: null,
    profileId: '',
    addressId: '',
    lastFailureReason: null,
    lastUndo: [],
    approvalRows: [],
    metas: input.metas,
    metasById: input.metasById,
  };

  const currentProfile = (): Profile =>
    input.profiles.find((p) => p.id === state.profileId) ?? input.profiles[0]!;
  const currentAddress = (): Address | null =>
    input.addresses.find((a) => a.id === state.addressId) ?? null;

  const replan = (): PreviewRow[] => {
    const out = replanItems(state.items, currentProfile(), currentAddress(), input.metasById);
    state.plan = out.plan;
    return out.rows;
  };

  const resolveSelection = (): void => {
    // The caller (content.ts run()) only creates a flow for ready data, so
    // both lists are non-empty here; the `!` only satisfies
    // noUncheckedIndexedAccess.
    // PBI-141: the per-site assignment wins over the last-used selection — it
    // is the more specific hint and only suggests a candidate.
    state.profileId = (input.assignedProfileId
      && input.profiles.some((p) => p.id === input.assignedProfileId)
      ? input.assignedProfileId
      : null)
      ?? resolveLastId(input.lastProfileId, input.profiles.map((p) => p.id))
      ?? input.profiles[0]!.id;
    state.addressId = resolveAddressId(input.addresses, state.profileId, input.lastAddressId)
      ?? input.addresses[0]!.id;
  };

  return {
    get selectedProfileId(): string { return state.profileId; },
    get selectedAddressId(): string { return state.addressId; },
    // PBI-138: the current category of a field, for the chooser's default.
    get categoryFor(): (fieldId: string) => string {
      return (fieldId) => state.items.find((i) => i.meta.id === fieldId)?.cls.category ?? 'unknown';
    },

    async start(): Promise<FillStart> {
      const result = await env.classify(input.metas, { englishPage: input.englishPage });
      state.items = result.items;
      state.lastFailureReason = result.failureReason;
      state.before = snapshotItems(state.items);
      resolveSelection();
      // Classification takes long enough for the settings to change under it; an
      // exclusion that landed meanwhile must not open a panel on this page.
      if (env.isExcluded()) return { excluded: true, failureReason: state.lastFailureReason };
      state.approvalRows = replan();
      return { excluded: false, rows: state.approvalRows, failureReason: state.lastFailureReason };
    },

    selectProfile(id: string): PreviewRow[] {
      state.profileId = id;
      // Same non-empty premise as resolveSelection above.
      state.addressId = resolveAddressId(input.addresses, id, state.addressId) ?? input.addresses[0]!.id;
      return replan();
    },

    selectAddress(id: string): PreviewRow[] {
      state.addressId = id;
      return replan();
    },

    // PBI-138: the preview's 分類を直す entry. A correction overrides one
    // field's classification and re-plans synchronously (rule-only, no LLM):
    // the corrected plan is what the next apply injects, and the feedback
    // snapshot follows the correction.
    recategorize(fieldId: string, category: Category): PreviewRow[] {
      state.items = state.items.map((i) =>
        i.meta.id === fieldId
          ? { ...i, cls: { category, confidence: 1, source: 'rule' } }
          : i,
      );
      state.after = snapshotItems(state.items);
      return replan();
    },

    async reanalyze(): Promise<{ rows: PreviewRow[]; failureReason: ClassifyFailure | null } | null> {
      if (!input.canReanalyze) return null;
      const result = await env.classify(input.metas, { force: true, englishPage: input.englishPage });
      state.items = result.items;
      state.lastFailureReason = result.failureReason;
      state.after = snapshotItems(state.items);
      return { rows: replan(), failureReason: state.lastFailureReason };
    },

    apply(decisions: ApplyDecisions): FillFlowApplyResult {
      return runApplyTransaction(state, env, decisions);
    },

    // PBI-132: how many fields the latest apply recorded for undo (0 when
    // nothing filled yet or everything was a by-design skip). The preview
    // wiring reads it to decide the undo button's visibility.
    get undoCount(): number { return state.lastUndo.length; },

    // One-shot 直後のundo: fields still holding exactly what JushoAI filled go
    // back to their empty state; user-edited fields are skipped (never wiped).
    // The entries are consumed, so a second click finds nothing and a later
    // apply overwrites the history anyway.
    undoLast(): UndoReport | null {
      if (state.lastUndo.length === 0) return null;
      const report = undoFill(state.lastUndo);
      state.lastUndo = [];
      return report;
    },
  };
}

export type FillFlow = ReturnType<typeof createFillFlow>;
