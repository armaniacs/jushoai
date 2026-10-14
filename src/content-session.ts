import type { Item } from './core/classify-rules';
import type { PlanItem } from './core/planner';
import type { Address, FieldMeta, Profile } from './core/types';
import type { FeedbackSnapshot } from './feedback/issue-url';
import {
  buildFeedbackInput, replanItems, snapshotItems,
} from './content-run';
import { buildFeedbackIssueUrl, FEEDBACK_REPO } from './feedback/issue-url';
import { resolveAddressId, resolveLastId } from './storage';
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

// Every DOM / Chrome side effect the session needs, injected so the ordering is
// unit-testable with fakes. Rendering (showPreview) and status display stay with
// the caller; only the data flow and its order live here.
export interface SessionEnv {
  classify(metas: FieldMeta[], opts: { force?: boolean; englishPage?: boolean }): Promise<Item[]>;
  // Consent gate over the apply panel; the caller builds it from the panel
  // handle because the button lives inside the closed shadow root.
  checkConsent(panel: SessionPanel): { ok: true } | { ok: false; reason: string };
  injectPlan(plan: PlanItem[]): void;
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
  | { excluded: true }
  | { excluded: false; rows: PreviewRow[] };

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
      items = await env.classify(input.metas, { englishPage: input.englishPage });
      before = snapshotItems(items);
      resolveSelection();
      // Classification takes long enough for the settings to change under it; an
      // exclusion that landed meanwhile must not open a panel on this page.
      if (env.isExcluded()) return { excluded: true };
      return { excluded: false, rows: replan() };
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

    async reanalyze(): Promise<PreviewRow[] | null> {
      if (!input.canReanalyze) return null;
      items = await env.classify(input.metas, { force: true, englishPage: input.englishPage });
      after = snapshotItems(items);
      return replan();
    },

    apply(sendFeedback: boolean, panel: SessionPanel): { applied: true } | { applied: false; reason: string } {
      // Last trust point: abort before injecting anything when the panel was
      // hidden, moved, or covered. The panel stays open for cancel or retry.
      const consent = env.checkConsent(panel);
      if (!consent.ok) return { applied: false, reason: consent.reason };
      env.persistSelection({ profileId, addressId });
      env.injectPlan(plan);
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
      return { applied: true };
    },
  };
}

export type FillSession = ReturnType<typeof createFillSession>;
