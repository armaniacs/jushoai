import { describe, it, expect } from 'vitest';
import { zipAssistFor } from '../../src/core/zip-dict';

describe('zipAssistFor', () => {
  it('resolves a seed prefix with and without the hyphen', () => {
    // The nationwide table resolves 100 and 650 to prefecture-only (each spans municipalities).
    expect(zipAssistFor('100-0001')).toEqual({ prefecture: '東京都', city: '' });
    expect(zipAssistFor('1600022')).toEqual({ prefecture: '東京都', city: '新宿区' });
    expect(zipAssistFor('650-0001')).toEqual({ prefecture: '兵庫県', city: '' });
  });

  it('resolves range boundaries inclusively', () => {
    expect(zipAssistFor('105-0011')).toEqual({ prefecture: '東京都', city: '港区' });
    expect(zipAssistFor('108-0074')).toEqual({ prefecture: '東京都', city: '港区' });
    expect(zipAssistFor('154-0024')).toEqual({ prefecture: '東京都', city: '世田谷区' });
    expect(zipAssistFor('158-0095')).toEqual({ prefecture: '東京都', city: '世田谷区' });
  });

  it('returns null for unknown prefixes and short input', () => {
    // The nationwide table resolves 999 and 601, so unknown coverage uses 000 (never assigned).
    expect(zipAssistFor('000-0000')).toBeNull();
    expect(zipAssistFor('1-0')).toBeNull();
    expect(zipAssistFor('')).toBeNull();
  });
});
