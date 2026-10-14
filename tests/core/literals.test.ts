import { describe, it, expect } from 'vitest';
import { includesLiteral } from '../../src/core/literals';

const VOCAB = ['no-form', 'no-tab', 'error'] as const;

describe('includesLiteral', () => {
  it('narrows members to the literal type', () => {
    const v: unknown = 'no-form';
    if (includesLiteral(VOCAB, v)) {
      expect(v).toBe('no-form');
      const narrowed: (typeof VOCAB)[number] = v;
      expect(narrowed).toBe('no-form');
    } else {
      expect.unreachable();
    }
  });

  it('rejects outside values without throwing', () => {
    expect(includesLiteral(VOCAB, 'bogus')).toBe(false);
    expect(includesLiteral(VOCAB, '')).toBe(false);
  });

  it('returns false for non-string inputs', () => {
    for (const v of [42, null, undefined, ['no-form'], { 0: 'no-form' }]) {
      expect(includesLiteral(VOCAB, v)).toBe(false);
    }
  });
});
