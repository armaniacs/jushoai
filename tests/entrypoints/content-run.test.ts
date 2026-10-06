import { describe, expect, it } from 'vitest';
import type { Item } from '../../src/core/classify-rules';
import { buildPlan, type PlanItem } from '../../src/core/planner';
import type { Address, FieldMeta, Profile } from '../../src/core/types';
import type { FeedbackSnapshot } from '../../src/feedback/issue-url';
import type { PreviewRow } from '../../src/ui/preview';
import {
  buildFeedbackInput, buildPreviewRows, replanItems, snapshotItems,
} from '../../src/entrypoints/content-run';
import { makeMeta } from '../helpers';
import { EMPTY_ADDRESS, EMPTY_PROFILE } from '../../src/core/types';

// Verbatim oracles of the pre-extraction `run()` closures in
// `src/entrypoints/content.ts` (snapshot at 71-73, replan at 79-92,
// onApply feedback args at 128-136). Kept inline so the parity tests fail if
// the extracted functions drift from the original logic.
function snapshotInline(list: Item[]): Map<string, FeedbackSnapshot> {
  return new Map(list.map((i) => [i.meta.id, { category: i.cls.category, source: i.cls.source }]));
}

function rowsInline(plan: PlanItem[], byId: Map<string, { meta: FieldMeta }>): PreviewRow[] {
  return plan.map((p) => {
    const m = byId.get(p.fieldId)!.meta;
    return {
      label: m.label || m.nearby || m.placeholder || m.name || m.htmlId,
      display: p.display,
      status: p.status,
      source: p.source,
    };
  });
}

const profile: Profile = {
  ...EMPTY_PROFILE, id: 'p1', label: '自宅', lastName: '山田', firstName: '太郎',
  lastNameKana: 'ヤマダ', firstNameKana: 'タロウ', email: 'taro@example.jp', tel: '0312345678',
};
const address: Address = {
  ...EMPTY_ADDRESS, id: 'a1', label: '自宅', zip: '1000001',
  prefecture: '東京都', city: '千代田区', street: '千代田1-1',
};

function items(): Item[] {
  return [
    { meta: makeMeta({ id: 'f-last', label: '氏名（姓）' }), cls: { category: 'lastName', confidence: 0.9, source: 'rule' } },
    { meta: makeMeta({ id: 'f-first', label: '', nearby: '名', placeholder: '名' }), cls: { category: 'firstName', confidence: 0.9, source: 'rule' } },
    { meta: makeMeta({ id: 'f-zip', label: '', nearby: '', placeholder: '郵便番号', name: 'zip' }), cls: { category: 'zip', confidence: 0.5, source: 'llm' } },
    { meta: makeMeta({ id: 'f-x', label: '', nearby: '', placeholder: '', name: '', htmlId: 'x' }), cls: { category: 'unknown', confidence: 0.1, source: 'rule' } },
  ];
}

function metasById(list: Item[]): Map<string, FieldMeta> {
  return new Map(list.map((i) => [i.meta.id, i.meta]));
}

function byIdShape(list: Item[]): Map<string, { meta: FieldMeta }> {
  return new Map(list.map((i) => [i.meta.id, { meta: i.meta }]));
}

describe('snapshotItems parity', () => {
  it('matches the pre-extraction snapshot closure', () => {
    const list = items();
    expect([...snapshotItems(list)]).toEqual([...snapshotInline(list)]);
  });

  it('carries category and source only, never profile values', () => {
    const snap = snapshotItems(items());
    for (const [, v] of snap) expect(Object.keys(v).sort()).toEqual(['category', 'source']);
    expect(JSON.stringify([...snap.values()])).not.toContain('山田');
  });
});

describe('buildPreviewRows / replanItems parity', () => {
  it('matches the pre-extraction replan row mapping', () => {
    const list = items();
    const plan = buildPlan(list, { profile, address });
    expect(buildPreviewRows(plan, metasById(list))).toEqual(rowsInline(plan, byIdShape(list)));
  });

  it('replanItems equals buildPlan plus the row mapping', () => {
    const list = items();
    const got = replanItems(list, profile, address, metasById(list));
    const plan = buildPlan(list, { profile, address });
    expect(got.plan).toEqual(plan);
    expect(got.rows).toEqual(rowsInline(plan, byIdShape(list)));
  });

  it('keeps the label fallback chain label -> nearby -> placeholder -> name -> htmlId', () => {
    const rows = replanItems(
      [
        { meta: makeMeta({ id: 'a', label: 'L' }), cls: { category: 'lastName', confidence: 1, source: 'rule' } },
        { meta: makeMeta({ id: 'b', label: '', nearby: 'N' }), cls: { category: 'firstName', confidence: 1, source: 'rule' } },
        { meta: makeMeta({ id: 'c', label: '', nearby: '', placeholder: 'P' }), cls: { category: 'email', confidence: 1, source: 'rule' } },
      ],
      { ...profile, email: 'a@b.jp' },
      null,
      new Map([
        ['a', makeMeta({ id: 'a', label: 'L' })],
        ['b', makeMeta({ id: 'b', label: '', nearby: 'N' })],
        ['c', makeMeta({ id: 'c', label: '', nearby: '', placeholder: 'P' })],
      ]),
    ).rows;
    expect(rows.map((r) => r.label)).toEqual(['L', 'N', 'P']);
  });

  it('handles null address the same way as the original replan', () => {
    const list = items();
    const got = replanItems(list, profile, null, metasById(list));
    expect(got.plan).toEqual(buildPlan(list, { profile, address: null }));
  });
});

describe('buildFeedbackInput parity', () => {
  const base = () => {
    const list = items();
    return {
      pageHref: 'https://example.jp/form?x=1#y',
      provider: 'built-in',
      version: '1.2.3',
      before: snapshotItems(list),
      after: snapshotItems(list),
      fields: list.map((i) => i.meta),
    };
  };

  it('assembles the same FeedbackInput the old onApply passed to buildFeedbackIssueUrl', () => {
    const b = base();
    expect(buildFeedbackInput({ ...b, sendFeedback: true })).toEqual({
      pageHref: b.pageHref,
      provider: b.provider,
      version: b.version,
      before: b.before,
      after: b.after,
      fields: b.fields,
    });
  });

  it('returns null when the old `sendFeedback && afterItems` gate was closed', () => {
    const b = base();
    expect(buildFeedbackInput({ ...b, after: null, sendFeedback: true })).toBeNull();
    expect(buildFeedbackInput({ ...b, sendFeedback: false })).toBeNull();
  });

  it('never carries profile or address values', () => {
    const b = base();
    const out = buildFeedbackInput({ ...b, sendFeedback: true })!;
    expect(JSON.stringify(out)).not.toContain('山田');
    expect(JSON.stringify(out)).not.toContain('千代田');
  });
});
