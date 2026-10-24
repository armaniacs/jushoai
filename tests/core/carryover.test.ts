import { describe, it, expect } from 'vitest';
import { carryoverFor, mergeCarryover } from '../../src/core/carryover';
import { makeMeta } from '../helpers';

describe('carryoverFor (PBI-142)', () => {
  const carry = { zip: '100-0001', tel: '03-0000-0000' };

  it('returns the carried value for the field signature', () => {
    expect(carryoverFor(makeMeta({ name: 'zip' }), carry)).toBe('100-0001');
    expect(carryoverFor(makeMeta({ name: 'tel', htmlId: 'f-1' }), carry)).toBe('03-0000-0000');
  });

  it('returns empty for an unknown signature, a select or a missing key', () => {
    expect(carryoverFor(makeMeta({ name: 'other' }), carry)).toBe('');
    expect(carryoverFor(makeMeta({ name: 'zip', tag: 'select' }), carry)).toBe('');
    expect(carryoverFor(makeMeta({ name: 'zip' }), undefined)).toBe('');
    expect(carryoverFor(makeMeta({ name: '' }), carry)).toBe('');
  });
});

describe('mergeCarryover (PBI-142)', () => {
  it('merges entries and keeps the latest value', () => {
    expect(mergeCarryover({ zip: '100-0001' }, [{ key: 'tel', value: '03-0000-0000' }]))
      .toEqual({ zip: '100-0001', tel: '03-0000-0000' });
    expect(mergeCarryover({ zip: '100-0001' }, [{ key: 'zip', value: '150-0001' }]))
      .toEqual({ zip: '150-0001' });
  });

  it('drops empty keys and values', () => {
    expect(mergeCarryover({}, [{ key: '', value: 'x' }, { key: 'zip', value: '' }]))
      .toEqual({});
  });
});
