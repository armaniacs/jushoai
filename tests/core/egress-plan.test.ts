import { describe, it, expect } from 'vitest';
import { mergeLlmSkip, planEgress, shouldDisableClassifier } from '../../src/core/egress-plan';
import { makeMeta } from '../helpers';

// PBI-145: the gate's pending list and the actual send come from the same
// plan, so the gate shows exactly what classifyAll will send and a taught
// field's metadata never reaches the LLM.

describe('planEgress', () => {
  it('keeps an untaught low-confidence field in the gate pending list', () => {
    const meta = makeMeta({ id: 'f-x', label: '', placeholder: '' });
    const plan = planEgress([meta], new Set());
    expect(plan.pending.map((m) => m.id)).toEqual(['f-x']);
    expect(plan.taughtIds.size).toBe(0);
    expect(plan.nonConfidentCount).toBe(1);
  });

  it('moves a taught low-confidence field out of pending and into taughtIds', () => {
    // rule classification cannot read 'xyz' as an email, so it stays
    // non-confident; the taught mapping makes the LLM attempt pointless.
    const meta = makeMeta({ id: 'f-x', name: 'xyz' });
    const plan = planEgress([meta], new Set(['xyz']));
    expect(plan.pending).toEqual([]);
    expect([...plan.taughtIds]).toEqual(['f-x']);
    expect(plan.nonConfidentCount).toBe(1);
  });

  it('leaves a confident field out of both pending and taughtIds', () => {
    const confident = makeMeta({ id: 'f-last', label: '氏名（姓）' });
    const plan = planEgress([confident], new Set(['last_name']));
    expect(plan.pending).toEqual([]);
    expect(plan.taughtIds.size).toBe(0);
    expect(plan.nonConfidentCount).toBe(0);
  });

  it('never teaches a field whose key cannot be resolved, even with taught keys', () => {
    // A field with no name/aria/label match has no fieldKey, so it can never
    // be taught: it stays in the gate pending list whatever the taught set.
    const meta = makeMeta({ id: 'f-n', label: '' });
    const plan = planEgress([meta], new Set(['last_name', 'email']));
    expect(plan.pending.map((m) => m.id)).toEqual(['f-n']);
    expect(plan.taughtIds.size).toBe(0);
  });

  it('counts the taught fields in nonConfidentCount for the disable check', () => {
    const taught = makeMeta({ id: 'f-x', name: 'xyz' });
    const open = makeMeta({ id: 'f-y', label: '' });
    const plan = planEgress([taught, open], new Set(['xyz']));
    expect(plan.pending.map((m) => m.id)).toEqual(['f-y']);
    expect([...plan.taughtIds]).toEqual(['f-x']);
    expect(plan.nonConfidentCount).toBe(2);
  });
});

describe('mergeLlmSkip', () => {
  it('unions the taught ids and the gate exclusions', () => {
    const skip = mergeLlmSkip(new Set(['f-x']), ['f-y']);
    expect([...skip!].sort()).toEqual(['f-x', 'f-y']);
  });

  it('reads as undefined when nothing is skipped', () => {
    expect(mergeLlmSkip(new Set(), [])).toBeUndefined();
  });
});

describe('shouldDisableClassifier', () => {
  it('disables the classifier when the skip set covers every non-confident field', () => {
    expect(shouldDisableClassifier(new Set(['a', 'b']), 2)).toBe(true);
  });

  it('keeps the classifier when only part of the fields is skipped', () => {
    expect(shouldDisableClassifier(new Set(['a']), 2)).toBe(false);
  });

  it('keeps the classifier when nothing is non-confident', () => {
    expect(shouldDisableClassifier(undefined, 0)).toBe(false);
  });
});
