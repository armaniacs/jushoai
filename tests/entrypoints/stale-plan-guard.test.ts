import { describe, it, expect } from 'vitest';
import { buildPreviewRows } from '../../src/content-run';
import type { PlanItem } from '../../src/core/planner';
import { makeMeta } from '../helpers';

// Blue / System Architect / Domain Logic (Low): `buildPreviewRows` uses a
// non-null assertion on `metasById.get(p.fieldId)`. When a stale plan meets a
// fresh field map (e.g. a leftover plan after `reanalyze()`), the preview
// update throws instead of degrading. `it.fails` encodes the DESIRED guard
// (`if (!m) continue`) without touching production code — Phase 5 adds the
// guard and drops the `.fails` marker.

const row = (fieldId: string): PlanItem => ({
  fieldId, category: 'lastName', source: 'rule', value: '山田', display: '山田', status: 'ok',
});

describe('buildPreviewRows stale-plan guard (Blue/System/Domain Low)', () => {
  it('maps a consistent plan to rows', () => {
    const rows = buildPreviewRows([row('f')], new Map([['f', makeMeta({ id: 'f', label: '氏名' })]]));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.label).toBe('氏名');
  });

  it.fails('skips plan entries whose fieldId is missing from the map', () => {
    const rows = buildPreviewRows(
      [row('f'), row('gone')],
      new Map([['f', makeMeta({ id: 'f', label: '氏名' })]]),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.label).toBe('氏名');
  });
});
