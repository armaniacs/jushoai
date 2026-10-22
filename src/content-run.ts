import type { Item } from './core/types';
import { buildPlan, hasAbbrev, type PlanItem } from './core/planner';
import type { Address, FieldMeta, Profile } from './core/types';
import type { FeedbackInput, FeedbackSnapshot } from './feedback/issue-url';
import type { PreviewRow } from './ui/preview';

// Pure slices of the content-script `run()` flow. DOM / Chrome API side
// effects (scanContainer, showPreview, button.setStatus, window.open,
// fillPlan wiring) stay in `content.ts`; only the data transforms live here
// so they are unit-testable without a DOM. No profile or address values flow
// into feedback inputs: only FieldMeta plus classification snapshots.

export function snapshotItems(list: Item[]): Map<string, FeedbackSnapshot> {
  return new Map(list.map((i) => [i.meta.id, { category: i.cls.category, source: i.cls.source }]));
}

export function buildPreviewRows(plan: PlanItem[], metasById: Map<string, FieldMeta>): PreviewRow[] {
  return plan.map((p) => {
    const m = metasById.get(p.fieldId);
    // A plan/map mismatch (stale preview after rescan) must not kill the whole
    // preview: fall back to the field id as the label and keep the plan's own
    // display/status/source, which stay truthful without the meta.
    // レビュー指摘: the row object is assembled once — the abbrev spread was
    // duplicated across the two branches and the presence check is the shared
    // hasAbbrev judgment, so an empty candidate can never ride a row.
    const abbrev = hasAbbrev(p.abbrev) ? { fieldId: p.fieldId, abbrev: p.abbrev } : {};
    // PBI-125: the zip assist candidate rides the row like the abbrev does;
    // both spreads set the same fieldId, so an empty candidate can never ride.
    const assist = hasAbbrev(p.assist) ? { fieldId: p.fieldId, assist: p.assist } : {};
    return {
      label: m ? (m.label || m.nearby || m.placeholder || m.name || m.htmlId) : p.fieldId,
      display: p.display,
      status: p.status,
      source: p.source,
      ...abbrev,
      ...assist,
    };
  });
}

export function replanItems(
  items: Item[],
  profile: Profile,
  address: Address | null,
  metasById: Map<string, FieldMeta>,
): { plan: PlanItem[]; rows: PreviewRow[] } {
  const plan = buildPlan(items, { profile, address });
  return { plan, rows: buildPreviewRows(plan, metasById) };
}

export interface FeedbackRequestInput {
  pageHref: string;
  provider: string;
  version: string;
  before: Map<string, FeedbackSnapshot>;
  after: Map<string, FeedbackSnapshot> | null;
  fields: FieldMeta[];
  sendFeedback: boolean;
}

export function buildFeedbackInput(req: FeedbackRequestInput): FeedbackInput | null {
  if (!req.sendFeedback || !req.after) return null;
  return {
    pageHref: req.pageHref,
    provider: req.provider,
    version: req.version,
    before: req.before,
    after: req.after,
    fields: req.fields,
  };
}
