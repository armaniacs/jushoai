import { describe, expect, it } from 'vitest';
import { createAuthBlock } from '../../src/llm/auth-block';
import type { ProviderKind } from '../../src/ai/types';

describe('createAuthBlock', () => {
  it('blocks after recording and clears explicitly', () => {
    const store = new Set<ProviderKind>();
    const block = createAuthBlock(store);
    expect(block.isBlocked('openai')).toBe(false);
    block.record('openai');
    expect(block.isBlocked('openai')).toBe(true);
    expect(store.has('openai')).toBe(true);
    block.clear('openai');
    expect(block.isBlocked('openai')).toBe(false);
  });

  it('heals recorded entries after the window with injected time', () => {
    let now = 1_000_000;
    const store = new Set<ProviderKind>();
    const block = createAuthBlock(store, 5 * 60 * 1000, () => now);
    block.record('openai');
    now += 4 * 60 * 1000;
    expect(block.isBlocked('openai')).toBe(true);
    now += 2 * 60 * 1000;
    expect(block.isBlocked('openai')).toBe(false);
    expect(store.has('openai')).toBe(false);
  });

  it('never expires externally seeded entries', () => {
    let now = 1_000_000;
    const store = new Set<ProviderKind>(['openai']);
    const block = createAuthBlock(store, 5 * 60 * 1000, () => now);
    now += 60 * 60 * 1000;
    expect(block.isBlocked('openai')).toBe(true);
  });
});
