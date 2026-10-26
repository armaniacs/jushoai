import { describe, it, expect } from 'vitest';
import { draftFromPage, draftFromMetas } from '../../src/core/import-draft';
import { IMPORT_DRAFT_MESSAGE, IMPORT_DRAFT_MESSAGE_TYPE } from '../../src/import-message';
import type { Category, FieldMeta, Item } from '../../src/core/types';
import { makeMeta } from '../helpers';

let seq = 0;
const filled = (category: Category, value: string, meta: Partial<FieldMeta> = {}): Item => ({
  meta: makeMeta({ id: `f${seq++}`, value, ...meta }),
  cls: { category, confidence: 0.8, source: 'rule' },
});
const empty = (category: Category, meta: Partial<FieldMeta> = {}): Item =>
  filled(category, '', meta);

describe('draftFromPage (PBI-127)', () => {
  it('maps filled confident fields onto the profile keys', () => {
    const draft = draftFromPage([
      filled('lastName', ' 山田 '), filled('firstName', '太郎'),
      filled('lastNameKana', 'ヤマダ'), filled('email', 'yamada@example.com'),
      filled('tel', '09012345678'),
    ]);
    expect(draft.profile).toEqual({
      lastName: '山田', firstName: '太郎', lastNameKana: 'ヤマダ',
      email: 'yamada@example.com', tel: '09012345678',
    });
    expect(draft.address).toEqual({});
  });

  it('maps address fields and reassembles a split zip', () => {
    const draft = draftFromPage([
      filled('zip1', '100'), filled('zip2', '0001'),
      filled('prefecture', '東京都'), filled('city', '千代田区'), filled('street', '千代田1-1'),
    ]);
    expect(draft.address).toEqual({
      zip: '1000001', prefecture: '東京都', city: '千代田区', street: '千代田1-1',
    });
  });

  it('ignores empty, blocked and unknown fields', () => {
    const draft = draftFromPage([
      empty('lastName'), filled('lastName', '山田', { readOnly: true }),
      filled('lastName', '山田', { disabled: true }),
      { meta: makeMeta({ id: 'fx', value: 'xxx' }), cls: { category: 'unknown', confidence: 0.2, source: 'rule' } },
    ]);
    expect(draft.profile).toEqual({});
    expect(draft.address).toEqual({});
  });

  it('keeps the first value when a category repeats and drops a lone zip half', () => {
    const draft = draftFromPage([
      filled('lastName', '山田'), filled('lastName', '鈴木'),
      filled('zip1', '100'),
    ]);
    expect(draft.profile).toEqual({ lastName: '山田' });
    expect(draft.address).toEqual({});
  });
});

describe('draftFromMetas via the pipeline entry (PBI-150)', () => {
  it('reaches the kana profile keys from a filled furigana pair', () => {
    // 本番ハンドラ（content.ts）と同一の入口: resolveKana が挟まれるので、
    // filled なフリガナ欄 2 欄が lastNameKana/firstNameKana に分かれ、
    // PROFILE_KEYS の kana 行に載る。迂回するとカタカナ値が漢字用キーに混入する。
    const draft = draftFromMetas([
      makeMeta({ id: 'k1', label: 'フリガナ', value: ' ヤマダ ' }),
      makeMeta({ id: 'k2', label: 'フリガナ', value: 'タロウ' }),
    ]);
    expect(draft.profile.lastNameKana).toBe('ヤマダ');
    expect(draft.profile.firstNameKana).toBe('タロウ');
    expect(draft.profile.lastName).toBeUndefined();
    expect(draft.profile.firstName).toBeUndefined();
  });

  it('keeps a lone furigana field out of the kanji keys', () => {
    // 単独のフリガナ欄は fullNameKana のまま（PROFILE_KEYS に無い）: カタカナ値
    // が lastName/firstName に混入せず、下書きにも漢字用キーに載らない。
    const draft = draftFromMetas([
      makeMeta({ id: 'k1', label: 'フリガナ', value: 'ヤマダ タロウ' }),
    ]);
    expect(draft.profile.lastName).toBeUndefined();
    expect(draft.profile.firstName).toBeUndefined();
    expect(draft.profile.lastNameKana).toBeUndefined();
    expect(draft.profile.firstNameKana).toBeUndefined();
  });

  it('reaches the company-kana profile key from a filled company-kana field (PBI-160)', () => {
    // fixture 形状（name + th 見出し）: 会社カナ欄の値が companyNameKana に載り、
    // 人名カナや会社名（漢字）のキーに混入しない。
    const draft = draftFromMetas([
      makeMeta({ id: 'ck', name: 'company_kana', nearby: '会社名（フリガナ）', value: 'カブシキガイシャサンプル' }),
    ]);
    expect(draft.profile.companyNameKana).toBe('カブシキガイシャサンプル');
    expect(draft.profile.lastNameKana).toBeUndefined();
    expect(draft.profile.firstNameKana).toBeUndefined();
    expect(draft.profile.companyName).toBeUndefined();
  });
});

describe('import message shape (PBI-127)', () => {
  it('shares one chrome-free type between the options sender and content receiver', () => {
    expect(IMPORT_DRAFT_MESSAGE).toEqual({ type: 'import-draft' });
    expect(IMPORT_DRAFT_MESSAGE.type).toBe(IMPORT_DRAFT_MESSAGE_TYPE);
  });
});
