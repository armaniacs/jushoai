import { describe, it, expect } from 'vitest';
import { readingFor } from '../../src/core/name-readings';

describe('readingFor', () => {
  it('resolves seed surnames to katakana readings', () => {
    expect(readingFor('山田', 'surname')).toBe('ヤマダ');
    expect(readingFor('佐々木', 'surname')).toBe('ササキ');
    expect(readingFor('斉藤', 'surname')).toBe('サイトウ');
    expect(readingFor('斎藤', 'surname')).toBe('サイトウ');
  });

  it('resolves seed given names to katakana readings', () => {
    expect(readingFor('太郎', 'given')).toBe('タロウ');
    expect(readingFor('美咲', 'given')).toBe('ミサキ');
  });

  it('returns null for unknown names', () => {
    expect(readingFor('未知', 'surname')).toBeNull();
    expect(readingFor('未知子', 'given')).toBeNull();
  });
});
