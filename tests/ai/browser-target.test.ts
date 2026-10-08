import { describe, it, expect } from 'vitest';
import { selectableProviders } from '../../src/ai/browser-target';

describe('selectableProviders', () => {
  it('offers every provider outside Firefox', () => {
    expect(selectableProviders(false)).toEqual(['none', 'built-in', 'openai', 'gemini']);
  });

  it('drops built-in on Firefox', () => {
    expect(selectableProviders(true)).toEqual(['none', 'openai', 'gemini']);
  });
});
