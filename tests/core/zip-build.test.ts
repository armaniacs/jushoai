import { describe, it, expect } from 'vitest';
import { parseKenAllCsv, buildPrefixRanges } from '../../src/core/zip-build';

const row = (zip: string, prefecture: string, city: string) => ({ zip, prefecture, city });

describe('parseKenAllCsv', () => {
  it('reads the zip, prefecture and city columns from headerless rows', () => {
    const csv =
      '01101,"060  ","0600001","ホッカイドウ","サッポロシチュウオウク","カブトチョウ","北海道","札幌市中央区","兜町",0,0,0,0,0,0\n' +
      '13101,"100  ","1000001","トウキョウト","チヨダク","チヨダ","東京都","千代田区","千代田",0,0,1,0,0,0\n';
    expect(parseKenAllCsv(csv)).toEqual([
      { zip: '0600001', prefecture: '北海道', city: '札幌市中央区' },
      { zip: '1000001', prefecture: '東京都', city: '千代田区' },
    ]);
  });

  it('handles CRLF and quoted commas inside fields', () => {
    const csv =
      '16201,"930  ","9300001","トヤマケン","トヤマシ","マルノウチ","富山県","富山市","丸の内,一丁目",0,0,1,0,0,0\r\n' +
      'not-a-row\r\n' +
      '16201,"930  ","9300002","トヤマケン","トヤマシ","マルノウチ","富山県","富山市","丸の内,二丁目",0,0,1,0,0,0\r\n';
    expect(parseKenAllCsv(csv)).toEqual([
      { zip: '9300001', prefecture: '富山県', city: '富山市' },
      { zip: '9300002', prefecture: '富山県', city: '富山市' },
    ]);
  });

  it('skips rows without a 7-digit zip or with empty names', () => {
    const csv =
      '13101,"100  ","10000","トウキョウト","チヨダク","チヨダ","東京都","千代田区","千代田",0,0,0,0,0,0\n' +
      '13101,"100  ","1000001","トウキョウト","チヨダク","チヨダ","","千代田区","千代田",0,0,0,0,0,0\n' +
      '13101,"100  ","1000002","トウキョウト","チヨダク","チヨダ","東京都","","千代田",0,0,0,0,0,0\n';
    expect(parseKenAllCsv(csv)).toEqual([]);
  });
});

describe('buildPrefixRanges', () => {
  it('resolves a single-municipality prefix to the full entry', () => {
    const { ranges, dropped } = buildPrefixRanges([row('9300001', '富山県', '富山市')]);
    expect(ranges).toEqual([{ lo: '930', hi: '930', prefecture: '富山県', city: '富山市' }]);
    expect(dropped).toEqual([]);
  });

  it('collapses a prefix shared by several municipalities to prefecture-only', () => {
    const { ranges, dropped } = buildPrefixRanges([
      row('9990001', 'A県', 'A市'),
      row('9990002', 'A県', 'B町'),
    ]);
    expect(ranges).toEqual([{ lo: '999', hi: '999', prefecture: 'A県', city: '' }]);
    expect(dropped).toEqual([]);
  });

  it('drops a prefix shared by several prefectures and reports it', () => {
    const { ranges, dropped } = buildPrefixRanges([
      row('9980001', 'A県', 'A市'),
      row('9980002', 'C県', 'C市'),
    ]);
    expect(ranges).toEqual([]);
    expect(dropped).toEqual(['998']);
  });

  it('coalesces consecutive prefixes with the same value into one range', () => {
    const { ranges, dropped } = buildPrefixRanges([
      row('1000001', '東京都', '千代田区'),
      row('1010001', '東京都', '千代田区'),
      row('1020001', '東京都', '千代田区'),
      row('1040001', '東京都', '中央区'),
    ]);
    expect(ranges).toEqual([
      { lo: '100', hi: '102', prefecture: '東京都', city: '千代田区' },
      { lo: '104', hi: '104', prefecture: '東京都', city: '中央区' },
    ]);
    expect(dropped).toEqual([]);
  });

  it('is deterministic regardless of input order', () => {
    const rows = [
      row('1040001', '東京都', '中央区'),
      row('9990002', 'A県', 'B町'),
      row('1000001', '東京都', '千代田区'),
      row('9990001', 'A県', 'A市'),
      row('1020001', '東京都', '千代田区'),
    ];
    const first = buildPrefixRanges(rows);
    const reversed = buildPrefixRanges([...rows].reverse());
    expect(reversed).toEqual(first);
  });

  it('returns empty ranges for empty input', () => {
    expect(buildPrefixRanges([])).toEqual({ ranges: [], dropped: [] });
  });
});
