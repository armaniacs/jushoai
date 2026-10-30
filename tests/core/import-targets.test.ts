import { describe, it, expect } from 'vitest';
import { selectImportTargets } from '../../src/core/import-targets';
import { EMPTY_ADDRESS, EMPTY_PROFILE } from '../../src/core/types';

const ids = () => ({ profileId: 'p-new', addressId: 'a-new' });

describe('selectImportTargets (PBI-173)', () => {
  it('empty state: both blank with injected ids and default labels', () => {
    const targets = selectImportTargets([], [], ids());
    expect(targets.blankProfile).toBe(true);
    expect(targets.blankAddress).toBe(true);
    expect(targets.target).toMatchObject({ ...EMPTY_PROFILE, id: 'p-new' });
    expect(targets.targetAddress).toMatchObject({ ...EMPTY_ADDRESS, id: 'a-new', label: '自宅' });
  });

  it('blank first cards are reused in place', () => {
    const first = { ...EMPTY_PROFILE, id: 'p1' };
    const firstAddress = { ...EMPTY_ADDRESS, id: 'a1', label: '自宅' };
    const targets = selectImportTargets([first], [firstAddress], ids());
    expect(targets.blankProfile).toBe(true);
    expect(targets.blankAddress).toBe(true);
    expect(targets.target).toBe(first);
    expect(targets.targetAddress).toBe(firstAddress);
  });

  it('non-blank first cards fork a new card instead of overwriting', () => {
    const first = { ...EMPTY_PROFILE, id: 'p1', lastName: '山田' };
    const firstAddress = { ...EMPTY_ADDRESS, id: 'a1', label: '自宅', city: '千代田区' };
    const targets = selectImportTargets([first], [firstAddress], ids());
    expect(targets.blankProfile).toBe(false);
    expect(targets.blankAddress).toBe(false);
    expect(targets.target).toMatchObject({ ...EMPTY_PROFILE, id: 'p-new', label: '新規' });
    expect(targets.targetAddress).toMatchObject({ ...EMPTY_ADDRESS, id: 'a-new', label: '新規' });
    // The existing first cards are never part of the forked target.
    expect(targets.target).not.toBe(first);
    expect(targets.targetAddress).not.toBe(firstAddress);
  });

  it('one-side-empty state: only the missing side is created', () => {
    const firstAddress = { ...EMPTY_ADDRESS, id: 'a1', label: '自宅' };
    const targets = selectImportTargets([], [firstAddress], ids());
    expect(targets.blankProfile).toBe(true);
    expect(targets.blankAddress).toBe(true);
    expect(targets.target).toMatchObject({ id: 'p-new' });
    expect(targets.targetAddress).toBe(firstAddress);

    const first = { ...EMPTY_PROFILE, id: 'p1', lastName: '山田' };
    const flipped = selectImportTargets([first], [], ids());
    expect(flipped.blankProfile).toBe(false);
    expect(flipped.blankAddress).toBe(true);
    expect(flipped.target).toMatchObject({ id: 'p-new', label: '新規' });
    expect(flipped.targetAddress).toMatchObject({ id: 'a-new', label: '自宅' });
  });

  it('label exception: an address with only its default label still counts as blank', () => {
    const labelOnly = { ...EMPTY_ADDRESS, id: 'a1', label: '自宅' };
    const targets = selectImportTargets([], [labelOnly], ids());
    expect(targets.blankAddress).toBe(true);
    expect(targets.targetAddress).toBe(labelOnly);
  });

  it('label exception: a profile with only a name label still counts as blank', () => {
    const labelOnly = { ...EMPTY_PROFILE, id: 'p1', label: '個人用' };
    const targets = selectImportTargets([labelOnly], [], ids());
    expect(targets.blankProfile).toBe(true);
    expect(targets.target).toBe(labelOnly);
  });

  it('whitespace-only values still count as blank', () => {
    const first = { ...EMPTY_PROFILE, id: 'p1', lastName: '   ' };
    const firstAddress = { ...EMPTY_ADDRESS, id: 'a1', label: '自宅', city: '  ' };
    const targets = selectImportTargets([first], [firstAddress], ids());
    expect(targets.blankProfile).toBe(true);
    expect(targets.blankAddress).toBe(true);
    expect(targets.target).toBe(first);
    expect(targets.targetAddress).toBe(firstAddress);
  });
});
