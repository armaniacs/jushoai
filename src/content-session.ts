import type { Category, Item } from './core/types';
import type { PlanItem } from './core/planner';
import type { Address, FieldMeta, Profile } from './core/types';
import { runClassifyPipeline } from './classify-pipeline/pipeline';
import type { FieldClassifier } from './core/classifier';
import type { ClassifyFailure } from './messages';
import { createFillFlow, type DisplayDecision, type FillFlowEnv } from './content/fill-flow';
export { decideDisplay, type DisplayDecision } from './content/fill-flow';
import type { FillReport, FillSummary, UndoReport } from './dom/fill-plan';
import type { PreviewRow } from './ui/preview';

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

// One classify → preview → apply flow (PBI-178: FillFlow facade).
// The apply pipeline itself (consent→inject→persist→carryover→feedback→
// banner＋承認/割当/guest後処理) is owned by createFillFlow
// (content/fill-flow.ts); this facade keeps the historical triple-arg apply
// shape so existing callers (preview-bind) and tests keep working, and adapts
// it to the flow's single-decisions transaction. SessionEnv keeps the six
// apply-side effects; the three post-apply callbacks (recordApproval /
// recordAssignment / onApplied) arrive via FillFlowEnv when the caller has
// them (content.ts), and are simply absent here.
export function createFillSession(input: SessionInput, env: SessionEnv) {
  const flow = createFillFlow({ input, env: env as FillFlowEnv });

  return {
    get selectedProfileId(): string { return flow.selectedProfileId; },
    get selectedAddressId(): string { return flow.selectedAddressId; },
    // PBI-138: the current category of a field, for the chooser's default.
    get categoryFor(): (fieldId: string) => string {
      return flow.categoryFor;
    },

    async start(): Promise<SessionStart> {
      return flow.start();
    },

    selectProfile(id: string): PreviewRow[] {
      return flow.selectProfile(id);
    },

    selectAddress(id: string): PreviewRow[] {
      return flow.selectAddress(id);
    },

    // PBI-138: the preview's 分類を直す entry (rule-only re-plan; see fill-flow).
    recategorize(fieldId: string, category: Category): PreviewRow[] {
      return flow.recategorize(fieldId, category);
    },

    async reanalyze(): Promise<{ rows: PreviewRow[]; failureReason: ClassifyFailure | null } | null> {
      return flow.reanalyze();
    },

    apply(
      sendFeedback: boolean,
      panel: SessionPanel,
      approvedAbbrevs?: ReadonlySet<string>,
    ): { applied: true; summary: FillSummary; display: DisplayDecision } | { applied: false; reason: string } {
      const result = flow.apply({ sendFeedback, panel, approvedAbbrevs });
      // The historical exact shape: the flow's undoCount rides flow.undoCount,
      // never the result object.
      if (!result.applied) return { applied: false, reason: result.reason };
      return { applied: true, summary: result.summary, display: result.display };
    },

    // PBI-132: how many fields the latest apply recorded for undo (0 when
    // nothing filled yet or everything was a by-design skip).
    get undoCount(): number { return flow.undoCount; },

    // One-shot 直後のundo (see fill-flow).
    undoLast(): UndoReport | null {
      return flow.undoLast();
    },
  };
}

export type FillSession = ReturnType<typeof createFillSession>;
