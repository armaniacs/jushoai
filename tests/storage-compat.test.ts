import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  FORMAT_VERSION, loadData, loadFormatInfo, migrateData, saveData, storedFormatVersion,
} from '../src/storage';
import { exportTransferFile, importTransferFile } from '../src/transfer';
import { normalizeAddress, normalizeProfile } from '../src/core/profile';
import { EMPTY_ADDRESS, EMPTY_PROFILE, type StoredData } from '../src/core/types';
import { storedV0120, storedV0130, storedV0139 } from './fixtures/storage-compat';

let store: Record<string, unknown>;
let uuid = 0;

beforeEach(() => {
  store = {};
  uuid = 0;
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: async (key: string) => (key in store ? { [key]: store[key] } : {}),
        set: async (obj: Record<string, unknown>) => { Object.assign(store, obj); },
      },
    },
  });
  vi.stubGlobal('crypto', { randomUUID: () => `uuid-${++uuid}` });
});

const rawOf = (): Record<string, unknown> => store['jushoai:data'] as Record<string, unknown>;

describe('format version basics', () => {
  it('starts at 1 and treats a version-less store as 0', () => {
    expect(FORMAT_VERSION).toBe(1);
    expect(storedFormatVersion(undefined)).toBe(0);
    expect(storedFormatVersion({ profiles: [], addresses: [] })).toBe(0);
    expect(storedFormatVersion({ version: 1, profiles: [], addresses: [] })).toBe(1);
    expect(storedFormatVersion({ version: 2, profiles: [], addresses: [] })).toBe(2);
    expect(storedFormatVersion({ version: 'x', profiles: [], addresses: [] })).toBe(0);
  });

  it('stamps version 1 when saving over legacy data', async () => {
    store['jushoai:data'] = storedV0139;
    await saveData(await loadData());
    expect(rawOf().version).toBe(1);
  });

  it('reports no update prompt for current and legacy data', async () => {
    store['jushoai:data'] = storedV0139;
    await expect(loadFormatInfo()).resolves.toEqual({ version: 0, needsUpdate: false });
    await saveData(await loadData());
    await expect(loadFormatInfo()).resolves.toEqual({ version: 1, needsUpdate: false });
  });
});

describe('past-version golden fixtures', () => {
  it.each([
    ['0.1.20', storedV0120, { companyName: '', companyDepartment: '', companyNameKana: '', jobTitle: '' }],
    ['0.1.30', storedV0130, { jobTitle: '' }],
    ['0.1.39', storedV0139, {}],
  ] as const)('%s data loads with every era field kept', (_tag, raw, expectedDefaults) => {
    const out = migrateData(raw as never);
    expect(out.profiles).toHaveLength(1);
    expect(out.profiles[0]).toMatchObject({ id: 'p1', label: '本人', lastName: '山田', tel: '09012345678' });
    expect(out.profiles[0]).toMatchObject({ schoolGrade: '', juku: '', ...expectedDefaults });
    expect(out.addresses).toHaveLength(1);
    expect(out.addresses[0]).toMatchObject({ id: 'a1', prefecture: '東京都' });
  });

  it.each([
    ['0.1.20', storedV0120],
    ['0.1.30', storedV0130],
    ['0.1.39', storedV0139],
  ] as const)('%s data survives a load-save-load round trip unchanged', async (_tag, raw) => {
    store['jushoai:data'] = structuredClone(raw);
    const first = await loadData();
    await saveData(first);
    const second = await loadData();
    expect(second).toEqual(first);
    expect(second.profiles[0]?.id).toBe('p1');
    expect(second.addresses[0]?.id).toBe('a1');
  });
});

describe('newer-version tolerance (BDD scenario 2)', () => {
  const newer = () => ({
    version: FORMAT_VERSION + 1,
    profiles: [{
      ...EMPTY_PROFILE, id: 'p1', label: '本人',
      lastName: '山田', firstName: '太郎', lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
      nickname: 'たろちゃん',
    }],
    addresses: [{
      ...EMPTY_ADDRESS, id: 'a1', label: '自宅', profileId: 'p1',
      zip: '1000001', prefecture: '東京都', city: '千代田区', street: '千代田1-1',
      memo: '裏口から入る',
    }],
  });

  it('loads newer data with known fields working and flags an update prompt', async () => {
    store['jushoai:data'] = newer();
    const loaded = await loadData();
    expect(loaded.profiles[0]).toMatchObject({ lastName: '山田', firstName: '太郎' });
    await expect(loadFormatInfo()).resolves.toEqual({ version: FORMAT_VERSION + 1, needsUpdate: true });
  });

  it('keeps the newer version and unknown entries across load, edit, and save', async () => {
    store['jushoai:data'] = newer();
    const loaded = await loadData();
    const edited: StoredData = {
      ...loaded,
      profiles: loaded.profiles.map((p) => ({ ...p, lastName: '鈴木' })),
    };
    await saveData(edited);
    const raw = rawOf();
    expect(raw.version).toBe(FORMAT_VERSION + 1);
    expect(raw.profiles).toMatchObject([{ nickname: 'たろちゃん', lastName: '鈴木' }]);
    expect(raw.addresses).toMatchObject([{ memo: '裏口から入る' }]);
    const reloaded = await loadData();
    expect(reloaded.profiles[0]).toMatchObject({ lastName: '鈴木' });
    expect(reloaded.profiles[0] as unknown as Record<string, unknown>).toMatchObject({ nickname: 'たろちゃん' });
  });

  it('keeps unknown top-level keys across a save', async () => {
    store['jushoai:data'] = { ...newer(), syncedAt: '2026-11-24T00:00:00Z' };
    await saveData(await loadData());
    expect(rawOf().syncedAt).toBe('2026-11-24T00:00:00Z');
  });
});

describe('normalize keeps unknown entries', () => {
  it('normalizeProfile carries future fields through', () => {
    const out = normalizeProfile({ ...EMPTY_PROFILE, lastName: ' 山田 ', nickname: 'たろちゃん' } as never);
    expect(out.lastName).toBe('山田');
    expect((out as unknown as Record<string, unknown>).nickname).toBe('たろちゃん');
  });

  it('normalizeAddress carries future fields through', () => {
    const out = normalizeAddress({ ...EMPTY_ADDRESS, label: '自宅', memo: '裏口' } as never);
    expect(out.label).toBe('自宅');
    expect((out as unknown as Record<string, unknown>).memo).toBe('裏口');
  });
});

describe('transfer carries the version', () => {
  const ready: StoredData = {
    profiles: [{
      ...EMPTY_PROFILE, id: 'p1', label: 'メイン',
      lastName: '山田', firstName: '太郎', lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
    }],
    addresses: [{
      ...EMPTY_ADDRESS, id: 'a1', label: '自宅', profileId: '',
      zip: '1000001', prefecture: '東京都', city: '千代田区', street: '千代田1-1',
    }],
  };

  it('exports version 1 and keeps unknown entries', async () => {
    store['jushoai:data'] = {
      version: 1,
      profiles: [{ ...ready.profiles[0], nickname: 'たろちゃん' }],
      addresses: [{ ...ready.addresses[0], memo: '裏口' }],
    };
    const parsed = JSON.parse(await exportTransferFile()) as Record<string, unknown>;
    expect(parsed.version).toBe(1);
    expect(parsed.profiles).toMatchObject([{ nickname: 'たろちゃん' }]);
    expect(parsed.addresses).toMatchObject([{ memo: '裏口' }]);
  });

  it('rejects a file written by a newer version without touching storage', async () => {
    await saveData(ready);
    const result = await importTransferFile(JSON.stringify({
      version: FORMAT_VERSION + 1, profiles: [], addresses: [],
    }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join('\n')).toContain('新しい');
    expect(await loadData()).toEqual(ready);
  });

  it('accepts version-less (pre-1.0) and version-1 files', async () => {
    const legacy = JSON.stringify({ profiles: [], addresses: [{ ...ready.addresses[0] }] });
    const withVersion = JSON.stringify({ version: 1, profiles: [], addresses: [{ ...ready.addresses[0] }] });
    expect((await importTransferFile(legacy)).ok).toBe(true);
    store = {};
    expect((await importTransferFile(withVersion)).ok).toBe(true);
  });

  it('keeps imported unknown entries through validation and save', async () => {
    const result = await importTransferFile(JSON.stringify({
      version: 1,
      profiles: [{
        id: 'pX', label: '最小', lastName: '山田', firstName: '太郎',
        lastNameKana: 'ヤマダ', firstNameKana: 'タロウ', nickname: 'たろちゃん',
      }],
      addresses: [],
    }));
    expect(result.ok).toBe(true);
    const reloaded = await loadData();
    expect((reloaded.profiles[0] as unknown as Record<string, unknown>).nickname).toBe('たろちゃん');
    expect(rawOf().version).toBe(1);
  });
});
