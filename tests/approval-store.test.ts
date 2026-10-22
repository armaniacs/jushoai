import { describe, it, expect } from 'vitest';
import { parseApprovals } from '../src/approval-store';

describe('parseApprovals (PBI-128)', () => {
  it('reads valid records and drops junk', () => {
    expect(parseApprovals({
      'e.com': {
        domain: 'e.com', signature: '123', profileId: 'p1', addressId: 'a1',
        digests: { f1: 7 },
      },
      'broken.com': { domain: 'broken.com', signature: 3, profileId: 'p1', addressId: 'a1', digests: {} },
      'no-digests.com': { domain: 'x', signature: '1', profileId: 'p1', addressId: 'a1' },
      'junk-digest.com': {
        domain: 'j', signature: '1', profileId: 'p1', addressId: 'a1',
        digests: { f1: 'nope', f2: 2.5 },
      },
      'junk.com': 'not-a-record',
    })).toEqual({
      'e.com': {
        domain: 'e.com', signature: '123', profileId: 'p1', addressId: 'a1',
        digests: { f1: 7 },
      },
      'junk-digest.com': {
        domain: 'junk-digest.com', signature: '1', profileId: 'p1', addressId: 'a1',
        digests: { f2: 2 },
      },
    });
  });

  it('reads a missing, corrupted or hand-edited value as an empty map', () => {
    expect(parseApprovals(undefined)).toEqual({});
    expect(parseApprovals(null)).toEqual({});
    expect(parseApprovals('junk')).toEqual({});
    expect(parseApprovals(['array'])).toEqual({});
  });
});
