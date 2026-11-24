import { describe, it, expect, vi } from 'vitest';
import { parseKenAllCsv, buildPrefixRanges } from '../../src/core/zip-build';
import { buildPlan } from '../../src/core/planner';
import type { Address, Item, Profile } from '../../src/core/types';
import { makeMeta } from '../helpers';

const cityBlankAssist = vi.hoisted(() => ({ prefecture: '', city: '' }));

// The planner reads the checked-in seed table, so a prefecture-only entry is
// stood in here: the test proves the grouping yields the blank city first,
// then rides that exact value through the plan.
vi.mock('../../src/core/zip-dict', () => ({
  zipAssistFor: () => ({ ...cityBlankAssist }),
}));

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

describe('prefecture-only range through the planner', () => {
  it('offers the prefecture while the city stays a warning', () => {
    const { ranges } = buildPrefixRanges([
      { zip: '9990001', prefecture: 'A県', city: 'A市' },
      { zip: '9990002', prefecture: 'A県', city: 'B町' },
    ]);
    expect(ranges).toEqual([{ lo: '999', hi: '999', prefecture: 'A県', city: '' }]);
    cityBlankAssist.prefecture = ranges[0]!.prefecture;
    cityBlankAssist.city = ranges[0]!.city;

    const profile: Profile = {
      id: 'p1', label: 'メイン',
      lastName: '山田', firstName: '太郎', lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
      lastNameRomaji: 'Yamada', firstNameRomaji: 'Taro',
      gender: '女性', birthday: '', school: '', department: '', schoolGrade: '', juku: '',
      companyName: '', companyDepartment: '', jobTitle: '', companyNameKana: '',
      email: '', tel: '',
    };
    const address: Address = {
      id: 'a1', label: '郵便番号のみ', profileId: '', zip: '9990001',
      prefecture: '', city: '', street: '', building: '',
      country: '', address1: '', address2: '', address3: '', address4: '', postalCode: '',
    };
    const items: Item[] = [
      { meta: makeMeta({ id: 'zip-pref' }), cls: { category: 'prefecture', confidence: 1, source: 'rule' } },
      { meta: makeMeta({ id: 'zip-city' }), cls: { category: 'city', confidence: 1, source: 'rule' } },
    ];
    const plan = buildPlan(items, { profile, address });
    expect(plan.map((p) => [p.status, p.display])).toEqual([
      ['warn-no-value', '候補: A県'],
      ['warn-no-value', ''],
    ]);
    expect(plan[0]).toMatchObject({ assist: 'A県' });
    expect('assist' in plan[1]!).toBe(false);
  });
});
