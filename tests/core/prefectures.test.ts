import { describe, it, expect } from 'vitest';
import { PREFECTURES, matchPrefectureOption } from '../../src/core/prefectures';

describe('matchPrefectureOption', () => {
  it('has 47 prefectures', () => {
    expect(PREFECTURES).toHaveLength(47);
  });

  it('matches by text with suffix differences', () => {
    const opts = [{ value: 'a', text: '東京' }, { value: 'b', text: '大阪府' }];
    expect(matchPrefectureOption(opts, '東京都')?.value).toBe('a');
    expect(matchPrefectureOption(opts, '大阪府')?.value).toBe('b');
  });

  it('matches by JIS code value', () => {
    const opts = [{ value: '', text: '選択してください' }, { value: '13', text: 'とうきょう' }];
    expect(matchPrefectureOption(opts, '東京都')?.value).toBe('13');
  });

  it('keeps 北海道 and 京都府 distinct', () => {
    const opts = [{ value: '1', text: '北海道' }, { value: '26', text: '京都府' }];
    expect(matchPrefectureOption(opts, '北海道')?.value).toBe('1');
    expect(matchPrefectureOption(opts, '京都府')?.value).toBe('26');
  });

  it('returns null when nothing matches', () => {
    expect(matchPrefectureOption([{ value: 'x', text: '海外' }], '東京都')).toBeNull();
  });
});
