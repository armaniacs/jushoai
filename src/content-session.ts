import type { Category, Item } from './core/types';
import type { PlanItem } from './core/planner';
import type { Address, FieldMeta, Profile } from './core/types';
import type { FeedbackSnapshot } from './feedback/issue-url';
import { runClassifyPipeline } from './classify-pipeline/pipeline';
import type { FieldClassifier } from './core/classifier';
import type { ClassifyFailure } from './messages';
import { hintForButton } from './ai/failure-text';
import { applyAbbrevApprovals } from './core/planner';
import {
  buildFeedbackInput, replanItems, snapshotItems,
} from './content-run';
import { buildFeedbackIssueUrl, FEEDBACK_REPO } from './feedback/issue-url';
import { resolveAddressId, resolveLastId } from './core/selection';
import { shouldWarn, undoFill, type FillReport, type FillSummary, type UndoEntry, type UndoReport } from './dom/fill-plan';
import { fieldKeyFor } from './core/domain-mapping';
import type { PreviewRow } from './ui/preview';
import type { BannerNotice } from './ui/button';

// Fill-session inputs that never touch the DOM: the stored profiles/addresses,
// the last-used selection, and the scanned field metadata.
export interface SessionInput {
  profiles: Profile[];
  addresses: Address[];
  lastProfileId?: string;
  // PBI-141: the per-site assignment for this host, when it still exists.
  // 切替は候補提示のみ — it only changes the initial selection.
  assignedProfileId?: string | null;
  lastAddressId?: string;
  metas: FieldMeta[];
  metasById: Map<string, FieldMeta>;
  // PBI-142: the earlier page's approved values for this tab (content-script
  // memory only). A field whose profile value is empty falls back to it.
  carryover?: Record<string, string>;
  englishPage: boolean;
  canReanalyze: boolean;
}

// One classification run through the unified attempt seam (PBI-42/45/174).
// The run boundary (pending split, chunking, failureReason binding) is owned
// by runClassifyPipeline (classify-pipeline/): this adapter only forwards the
// caller intent (which classifier, which field ids the egress gate excluded).
// A null classifier (or no pending fields) means rule-only: the run emits its
// single aggregated trace line and the reason stays null.
export interface SessionClassifyResult {
  items: Item[];
  failureReason: ClassifyFailure | null;
}

export async function classifyWithReason(
  classifier: FieldClassifier | null,
  metas: FieldMeta[],
  opts: { force?: boolean; englishPage?: boolean; llmSkip?: ReadonlySet<string> } = {},
): Promise<SessionClassifyResult> {
  return runClassifyPipeline(classifier, metas, opts);
}

// Every DOM / Chrome side effect the session needs, injected so the ordering is
// unit-testable with fakes. Rendering (showPreview) and status display stay with
// the caller; only the data flow and its order live here.
export interface SessionEnv {
  // Seam-shaped: the failure reason travels on the return value (never into a
  // caller closure). The caller passes intent (which classifier, which field
  // ids the egress gate excluded) via classifyWithReason; the apply ordering
  // below owns the reason from there.
  classify(metas: FieldMeta[], opts: { force?: boolean; englishPage?: boolean; llmSkip?: ReadonlySet<string> }): Promise<SessionClassifyResult>;
  // Consent gate over the apply panel; the caller builds it from the panel
  // handle because the button lives inside the closed shadow root.
  checkConsent(panel: SessionPanel): { ok: true } | { ok: false; reason: string };
  // Returns the fill report so the caller can display failures and decide
  // retries; never throws for per-field outcomes (fillPlan isolates those).
  // The undo entries ride the report (PBI-132) and stay in session memory.
  injectPlan(plan: PlanItem[]): FillReport;
  persistSelection(sel: { profileId: string; addressId: string }): void;
  openUrl(url: string): void;
  feedbackContext(): { pageHref: string; provider: string; version: string };
  isExcluded(): boolean;
  // PBI-142: the filled entries of an apply merge into the tab-scoped
  // carryover, so the next page of the same tab re-offers them.
  recordCarryover?(entries: readonly { key: string; value: string }[]): void;
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
// The banner's timer behavior rides the kind (PBI-152): this session owns the
// "this is a partial-application banner" decision and passes it as a
// structured notice; the button times each kind without sniffing the text.
export interface DisplayDecision {
  banner: BannerNotice | null;
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
  // PBI-132: the latest fill run's undo history, held in this content-script
  // session's memory only — never persisted, never sent (BDD: 履歴は外部に出ない).
  // A later apply overwrites it, so undo is always the 直後の注入.
  let lastUndo: UndoEntry[] = [];

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
    // PBI-141: the per-site assignment wins over the last-used selection — it
    // is the more specific hint and only suggests a candidate.
    profileId = (input.assignedProfileId
      && input.profiles.some((p) => p.id === input.assignedProfileId)
      ? input.assignedProfileId
      : null)
      ?? resolveLastId(input.lastProfileId, input.profiles.map((p) => p.id))
      ?? input.profiles[0]!.id;
    addressId = resolveAddressId(input.addresses, profileId, input.lastAddressId)
      ?? input.addresses[0]!.id;
  };

  return {
    get selectedProfileId(): string { return profileId; },
    get selectedAddressId(): string { return addressId; },
    // PBI-138: the current category of a field, for the chooser's default.
    get categoryFor(): (fieldId: string) => string {
      return (fieldId) => items.find((i) => i.meta.id === fieldId)?.cls.category ?? 'unknown';
    },

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

    // PBI-138: the preview's 分類を直す entry. A correction overrides one
    // field's classification and re-plans synchronously (rule-only, no LLM):
    // the corrected plan is what the next apply injects, and the feedback
    // snapshot follows the correction.
    recategorize(fieldId: string, category: Category): PreviewRow[] {
      items = items.map((i) =>
        i.meta.id === fieldId
          ? { ...i, cls: { category, confidence: 1, source: 'rule' } }
          : i,
      );
      after = snapshotItems(items);
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
      const report = env.injectPlan(plan);
      lastUndo = report.undo;
      const summary = report.summary;
      env.persistSelection({ profileId, addressId });
      // PBI-142: the filled values merge into the tab-scoped carryover, so the
      // next page of the same tab re-offers them. Profile values are never
      // part of the merge — the signature and the value only.
      if (env.recordCarryover) {
        // A plan fieldId is built from the same metasById, so the lookup cannot
        // miss in practice — the guard keeps a contract drift from throwing
        // inside apply after the injection already happened.
        env.recordCarryover(plan.flatMap((p) => {
          if (!p.value) return [];
          const meta = input.metasById.get(p.fieldId);
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

    // PBI-132: how many fields the latest apply recorded for undo (0 when
    // nothing filled yet or everything was a by-design skip). The preview
    // wiring reads it to decide the undo button's visibility.
    get undoCount(): number { return lastUndo.length; },

    // One-shot 直後のundo: fields still holding exactly what JushoAI filled go
    // back to their empty state; user-edited fields are skipped (never wiped).
    // The entries are consumed, so a second click finds nothing and a later
    // apply overwrites the history anyway.
    undoLast(): UndoReport | null {
      if (lastUndo.length === 0) return null;
      const report = undoFill(lastUndo);
      lastUndo = [];
      return report;
    },
  };
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

export type FillSession = ReturnType<typeof createFillSession>;
