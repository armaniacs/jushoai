import { describe, it, expect } from 'vitest';
import { zipAssistFor } from '../../src/core/zip-dict';

describe('zipAssistFor', () => {
  it('resolves a seed prefix with and without the hyphen', () => {
    expect(zipAssistFor('100-0001')).toEqual({ prefecture: '東京都', city: '千代田区' });
    expect(zipAssistFor('1600022')).toEqual({ prefecture: '東京都', city: '新宿区' });
    expect(zipAssistFor('650-0001')).toEqual({ prefecture: '兵庫県', city: '神戸市中央区' });
  });

  it('resolves range boundaries inclusively', () => {
    expect(zipAssistFor('105-0011')).toEqual({ prefecture: '東京都', city: '港区' });
    expect(zipAssistFor('108-0074')).toEqual({ prefecture: '東京都', city: '港区' });
    expect(zipAssistFor('154-0024')).toEqual({ prefecture: '東京都', city: '世田谷区' });
    expect(zipAssistFor('158-0095')).toEqual({ prefecture: '東京都', city: '世田谷区' });
  });

  it('returns null for unknown prefixes and short input', () => {
    expect(zipAssistFor('999-0000')).toBeNull();
    expect(zipAssistFor('601-8001')).toBeNull();
    expect(zipAssistFor('1-0')).toBeNull();
    expect(zipAssistFor('')).toBeNull();
  });
});
