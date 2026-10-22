import { describe, it, expect } from 'vitest';
import { parseMappings } from '../src/mapping-store';

describe('parseMappings (PBI-138)', () => {
  it('reads valid pairs and drops junk', () => {
    expect(parseMappings([
      { domain: 'e.com', fieldKey: 'xyz', category: 'email' },
      { domain: '', fieldKey: 'xyz', category: 'email' },
      { domain: 'e.com', fieldKey: '', category: 'email' },
      { domain: 'e.com', fieldKey: 'xyz', category: 'unknown' },
      { domain: 'e.com', fieldKey: 'xyz', category: 'not-a-category' },
      'junk',
      null,
    ])).toEqual([{ domain: 'e.com', fieldKey: 'xyz', category: 'email' }]);
  });

  it('reads a missing, corrupted or hand-edited value as an empty list', () => {
    expect(parseMappings(undefined)).toEqual([]);
    expect(parseMappings(null)).toEqual([]);
    expect(parseMappings({ domain: 'e.com' })).toEqual([]);
    expect(parseMappings('junk')).toEqual([]);
  });
});
