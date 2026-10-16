import { describe, it, expect } from 'vitest';
import { buildPreviewRows } from '../../src/content-run';
import type { PlanItem } from '../../src/core/planner';
import { makeMeta } from '../helpers';

// Blue / System Architect / Domain Logic (Low): `buildPreviewRows` must not
// throw when a stale plan meets a fresh field map (e.g. a leftover plan after
// `reanalyze()`). Missing entries degrade to a fallback row keyed by fieldId
// instead of killing the whole preview.

const row = (fieldId: string): PlanItem => ({
  fieldId, category: 'lastName', source: 'rule', value: '山田', display: '山田', status: 'ok',
});

describe('buildPreviewRows stale-plan guard (Blue/System/Domain Low)', () => {
  it('maps a consistent plan to rows', () => {
    const rows = buildPreviewRows([row('f')], new Map([['f', makeMeta({ id: 'f', label: '氏名' })]]));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.label).toBe('氏名');
  });

  it('degrades plan entries missing from the map to fallback rows', () => {
    const rows = buildPreviewRows(
      [row('f'), row('gone')],
      new Map([['f', makeMeta({ id: 'f', label: '氏名' })]]),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]?.label).toBe('氏名');
    expect(rows[1]).toMatchObject({ label: 'gone', display: '山田', status: 'ok', source: 'rule' });
  });
});
