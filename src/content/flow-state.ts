import { readKvBatch } from '../kv-store';
import { DATA_STORE, LAST_USED_STORE, type LastUsed } from '../storage';
import type { StoredData } from '../core/types';
import { APPROVALS_STORE } from '../approval-store';
import type { ApprovalRecord } from '../core/site-approval';
import { ASSIGNMENTS_STORE } from '../assignment-store';
import { MAPPINGS_STORE } from '../mapping-store';
import type { MappingEntry } from '../core/domain-mapping';

// The flow-unit state bundles (PBI-159). The content entries used to
// hand-assemble their own read bundles at each entry point (run(): 5 keys
// across 4 modules, fillOne: 3 keys), so every new learning store rippled into
// every entry. This module is the one place that knows which stores a flow
// needs: each loader returns the flow's whole bundle behind one batched
// get([keys...]) call (readKvBatch), and a new store joins by being added to
// the spec list below — no entry-point edit.

export interface RunStateBundle {
  data: StoredData;
  last: LastUsed;
  priorApprovals: Record<string, ApprovalRecord>;
  assignments: Record<string, string>;
  activeMappings: MappingEntry[];
}

export interface FillOneStateBundle {
  data: StoredData;
  last: LastUsed;
  mappings: MappingEntry[];
}

// The in-page run flow (button press, action popup, guest): the profile data,
// the last-used selection and the per-site learned state in one bundle.
export function loadRunState(): Promise<RunStateBundle> {
  return readKvBatch([
    DATA_STORE, LAST_USED_STORE, APPROVALS_STORE, ASSIGNMENTS_STORE, MAPPINGS_STORE,
  ]).then(([data, last, priorApprovals, assignments, activeMappings]) => ({
    data,
    last,
    priorApprovals,
    assignments,
    activeMappings,
  }));
}

// The single-field flow (right-click, Alt+J): no per-site learned state except
// the taught correction layer.
export function loadFillOneState(): Promise<FillOneStateBundle> {
  return readKvBatch([DATA_STORE, LAST_USED_STORE, MAPPINGS_STORE]).then(
    ([data, last, mappings]) => ({ data, last, mappings }),
  );
}
