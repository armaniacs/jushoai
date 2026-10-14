import { describe, it, expect } from 'vitest';
import { MAX_ITEMS, isAtLimit } from '../../src/entrypoints/options/dom';

describe('collection cap guard', () => {
  it('shares one cap between profiles and addresses', () => {
    expect(MAX_ITEMS).toBe(10);
  });

  it('allows adding below the cap and blocks at and above it', () => {
    expect(isAtLimit(9)).toBe(false);
    expect(isAtLimit(10)).toBe(true);
    expect(isAtLimit(11)).toBe(true);
  });
});
