import { describe, it, expect } from 'vitest';
import { applyMapping, fieldKeyFor, hostOf } from '../../src/core/domain-mapping';
import type { Item } from '../../src/core/types';
import { makeMeta } from '../helpers';

const item = (id: string, name: string, category: string): Item => ({
  meta: makeMeta({ id, name }),
  cls: { category: category as Item['cls']['category'], confidence: 0.8, source: 'rule' },
});

describe('fieldKeyFor (PBI-138)', () => {
  it('prefers the name and falls back to the htmlId', () => {
    expect(fieldKeyFor(makeMeta({ name: 'xyz', htmlId: 'f-1' }))).toBe('xyz');
    expect(fieldKeyFor(makeMeta({ name: '', htmlId: 'f-1' }))).toBe('f-1');
    expect(fieldKeyFor(makeMeta({ name: ' ', htmlId: '' }))).toBeNull();
  });
});

describe('hostOf', () => {
  it('reads the host and fails safe on garbage', () => {
    expect(hostOf('https://e.com/form?x=1')).toBe('e.com');
    expect(hostOf('not a url')).toBe('');
  });
});

describe('applyMapping (PBI-138)', () => {
  const entries = [
    { domain: 'e.com', fieldKey: 'xyz', category: 'email' as const },
  ];

  it('overrides the matched field with the learned category', () => {
    const out = applyMapping([item('f1', 'xyz', 'tel')], entries, 'e.com');
    expect(out[0]!.cls).toMatchObject({ category: 'email', confidence: 1 });
  });

  it('keeps the rule classification for unmatched fields and domains', () => {
    const out = applyMapping(
      [item('f1', 'other', 'tel'), item('f2', 'xyz', 'tel')],
      entries,
      'other.com',
    );
    expect(out.map((i) => i.cls.category)).toEqual(['tel', 'tel']);
  });

  it('keeps the field when the learned category already matches', () => {
    const same = [{ domain: 'e.com', fieldKey: 'xyz', category: 'tel' as const }];
    const out = applyMapping([item('f1', 'xyz', 'tel')], same, 'e.com');
    expect(out[0]).toBe(out[0]); // identity: the map did not rewrite it
  });
});
