// PBI-158: pure-data invariants of the field catalog — the single vocabulary
// table for the Profile/Address inputs the options cards and the guest panel
// both render. DOM-free assertions only; the guest-panel side is pinned in
// tests/ui/guest-panel.test.ts.
import { describe, it, expect } from 'vitest';
import {
  ADDRESS_FIELD_CATALOG,
  GUEST_ADDRESS_FIELDS,
  GUEST_PROFILE_FIELDS,
  OPTIONS_ADDRESS_FIELDS,
  OPTIONS_PROFILE_FIELDS,
  PREFECTURE_FIELD_LABEL,
  PROFILE_FIELD_CATALOG,
} from '../../src/core/field-catalog';

describe('field catalog (PBI-158)', () => {
  it('keeps one row per key with label/placeholder/guest on every row', () => {
    for (const table of [PROFILE_FIELD_CATALOG, ADDRESS_FIELD_CATALOG]) {
      const keys = table.map((f) => f.key);
      expect(keys.length).toBeGreaterThan(0);
      expect(new Set(keys).size).toBe(keys.length);
      for (const f of table) {
        expect(typeof f.guest).toBe('boolean');
        expect(f.label.length).toBeGreaterThan(0);
        expect(f.placeholder.length).toBeGreaterThan(0);
      }
    }
  });

  it('exposes the guest set as a strict subset of the tables', () => {
    expect(GUEST_PROFILE_FIELDS.length).toBeLessThan(PROFILE_FIELD_CATALOG.length);
    expect(GUEST_ADDRESS_FIELDS.length).toBeLessThan(ADDRESS_FIELD_CATALOG.length);
    const profileKeys = new Set(PROFILE_FIELD_CATALOG.map((f) => f.key));
    for (const f of GUEST_PROFILE_FIELDS) expect(profileKeys.has(f.key)).toBe(true);
    const addressKeys = new Set(ADDRESS_FIELD_CATALOG.map((f) => f.key));
    for (const f of GUEST_ADDRESS_FIELDS) expect(addressKeys.has(f.key)).toBe(true);
  });

  // The kana wording difference is data: the options-only note column holds
  // the supplement, the guest panel shows the base label as-is.
  it('records the kana difference as the options-only note column', () => {
    const kana = PROFILE_FIELD_CATALOG.find((f) => f.key === 'lastNameKana')!;
    expect(kana.label).toBe('セイ');
    expect(kana.optionsNote).toBe('（フリガナ・ふりがな入力可）');
    expect(OPTIONS_PROFILE_FIELDS.find((f) => f.key === 'lastNameKana')!.label)
      .toBe('セイ（フリガナ・ふりがな入力可）');
    expect(GUEST_PROFILE_FIELDS.find((f) => f.key === 'lastNameKana')!.label).toBe('セイ');
  });

  // PBI-160: 会社名フリガナは options のみに載り、guest には載らない。
  it('carries the company-kana row for options only, not guest', () => {
    const row = PROFILE_FIELD_CATALOG.find((f) => f.key === 'companyNameKana')!;
    expect(row.label).toBe('会社名（フリガナ・任意）');
    expect(row.placeholder).toBe('カブシキガイシャサンプル');
    expect(row.guest).toBe(false);
    expect(OPTIONS_PROFILE_FIELDS.find((f) => f.key === 'companyNameKana')!.label)
      .toBe('会社名（フリガナ・任意）');
    expect(GUEST_PROFILE_FIELDS.some((f) => f.key === 'companyNameKana')).toBe(false);
  });

  it('marks the building note as options-only too', () => {
    expect(OPTIONS_ADDRESS_FIELDS.find((f) => f.key === 'building')!.label)
      .toBe('建物名・部屋番号（任意）');
    expect(GUEST_ADDRESS_FIELDS.find((f) => f.key === 'building')!.label)
      .toBe('建物名・部屋番号');
  });

  it('keeps 都道府県 a select row on the options side and a text row for guest', () => {
    expect(PREFECTURE_FIELD_LABEL).toBe('都道府県');
    expect(OPTIONS_ADDRESS_FIELDS.some((f) => f.key === 'prefecture')).toBe(false);
    expect(GUEST_ADDRESS_FIELDS.map((f) => f.key))
      .toEqual(['zip', 'prefecture', 'city', 'street', 'building']);
  });

  it('keeps placeholders identical across both projections on shared text rows', () => {
    const optionsByPlaceholders = new Map(
      [...OPTIONS_PROFILE_FIELDS, ...OPTIONS_ADDRESS_FIELDS].map((f) => [f.key, f.placeholder]),
    );
    for (const f of [...GUEST_PROFILE_FIELDS, ...GUEST_ADDRESS_FIELDS]) {
      // 都道府県 is a select row on the options side: no text row to share.
      if (f.key === 'prefecture') {
        expect(optionsByPlaceholders.has(f.key)).toBe(false);
        continue;
      }
      expect(optionsByPlaceholders.get(f.key)).toBe(f.placeholder);
    }
  });

  // The wide (two-column) layout of the guest panel is data: only the
  // guestWide column holds it, and the options projection carries no wide.
  it('marks only zip/street/building with the guestWide column', () => {
    const wideKeys = [...PROFILE_FIELD_CATALOG, ...ADDRESS_FIELD_CATALOG]
      .filter((f) => f.guestWide === true).map((f) => f.key);
    expect(wideKeys).toEqual(['zip', 'street', 'building']);
    for (const f of [...GUEST_PROFILE_FIELDS, ...GUEST_ADDRESS_FIELDS]) {
      expect(f.wide).toBe(['zip', 'street', 'building'].includes(f.key));
    }
    for (const f of [...OPTIONS_PROFILE_FIELDS, ...OPTIONS_ADDRESS_FIELDS]) {
      expect(f.wide).toBeUndefined();
    }
  });
});
