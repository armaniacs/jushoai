import { describe, it, expect } from 'vitest';
import { parseAssignments } from '../src/assignment-store';

describe('parseAssignments (PBI-141)', () => {
  it('reads valid pairs and drops junk', () => {
    expect(parseAssignments({
      'e.com': 'p1',
      'empty.com': '',
      'junk.com': 3,
      'null.com': null,
    })).toEqual({ 'e.com': 'p1' });
  });

  it('reads a missing, corrupted or hand-edited value as an empty map', () => {
    expect(parseAssignments(undefined)).toEqual({});
    expect(parseAssignments(null)).toEqual({});
    expect(parseAssignments('junk')).toEqual({});
    expect(parseAssignments(['p1'])).toEqual({});
  });
});
