import { describe, it, expect } from 'vitest';
import { isRecordValue } from '../../src/core/types';

describe('isRecordValue', () => {
  it('accepts a plain object and narrows the type', () => {
    const v: unknown = { a: 1 };
    if (isRecordValue(v)) {
      const narrowed: Record<string, unknown> = v;
      expect(narrowed.a).toBe(1);
    } else {
      expect.unreachable();
    }
  });

  it('rejects arrays', () => {
    expect(isRecordValue([1, 2])).toBe(false);
    expect(isRecordValue([])).toBe(false);
  });

  it('rejects null', () => {
    expect(isRecordValue(null)).toBe(false);
  });

  it('rejects primitives', () => {
    for (const v of [42, 0, 's', '', true, false, undefined, Symbol('x')]) {
      expect(isRecordValue(v)).toBe(false);
    }
  });
});
