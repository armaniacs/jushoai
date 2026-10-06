import type { Item } from '../core/classify-rules';
import { buildPlan, type PlanItem } from '../core/planner';
import type { Address, FieldMeta, Profile } from '../core/types';
import type { FeedbackInput, FeedbackSnapshot } from '../feedback/issue-url';
import type { PreviewRow } from '../ui/preview';

// Pure slices of the content-script `run()` flow. DOM / Chrome API side
// effects (scanContainer, showPreview, button.setStatus, window.open,
// applyPlan wiring) stay in `content.ts`; only the data transforms live here
// so they are unit-testable without a DOM. No profile or address values flow
// into feedback inputs: only FieldMeta plus classification snapshots.

export function snapshotItems(list: Item[]): Map<string, FeedbackSnapshot> {
  return new Map(list.map((i) => [i.meta.id, { category: i.cls.category, source: i.cls.source }]));
}

export function buildPreviewRows(plan: PlanItem[], metasById: Map<string, FieldMeta>): PreviewRow[] {
  return plan.map((p) => {
    const m = metasById.get(p.fieldId)!;
    return {
      label: m.label || m.nearby || m.placeholder || m.name || m.htmlId,
      display: p.display,
      status: p.status,
      source: p.source,
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
