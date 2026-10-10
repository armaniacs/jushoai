import { describe, it, expect, vi } from 'vitest';
import { GENDERS } from '../../src/core/genders';
import { PREFECTURES } from '../../src/core/prefectures';

// PBI-19 parity: pins the exact option order/value/text/initial-selection and
// change-callback behavior of the three select builders before aggregation.
vi.mock('../../src/storage', () => ({
  newId: () => 'test-id',
  loadData: async () => ({
    profiles: [
      {
        id: 'p1', label: '個人用',
        lastName: '', firstName: '', lastNameKana: '', firstNameKana: '',
        lastNameRomaji: '', firstNameRomaji: '', gender: '',
        birthday: '', school: '', department: '', email: '', tel: '',
      },
      {
        id: 'p2', label: '',
        lastName: '', firstName: '', lastNameKana: '', firstNameKana: '',
        lastNameRomaji: '', firstNameRomaji: '', gender: '',
        birthday: '', school: '', department: '', email: '', tel: '',
      },
      {
        id: '', label: '空ID',
        lastName: '', firstName: '', lastNameKana: '', firstNameKana: '',
        lastNameRomaji: '', firstNameRomaji: '', gender: '',
        birthday: '', school: '', department: '', email: '', tel: '',
      },
    ],
    addresses: [
      {
        id: 'a1', label: '自宅', profileId: '', zip: '', prefecture: '',
        city: '', street: '', building: '',
        country: '', address1: '', address2: '', address3: '',
        address4: '', postalCode: '',
      },
    ],
  }),
  saveData: async () => {},
}));

vi.mock('../../src/entrypoints/options/ai-section', () => ({
  mountAiSection: vi.fn(),
}));

document.body.innerHTML = '<div id="side"></div><main id="app"></main><main id="ai-app"></main><main id="audit-app"></main>';

const { prefectureSelect, genderSelect, ownerSelect } = await import(
  '../../src/entrypoints/options/main'
);

// Lets the module-level `void loadData().then(...)` settle so `state` is set.
await new Promise((r) => setTimeout(r, 0));

function snapshot(select: HTMLSelectElement) {
  return [...select.options].map((o) => ({
    value: o.value,
    text: o.textContent,
    selected: o.selected,
  }));
}

function fireChange(select: HTMLSelectElement, value: string) {
  select.value = value;
  select.dispatchEvent(new Event('change'));
}

describe('prefectureSelect parity', () => {
  it('lists the placeholder then every prefecture in order', () => {
    const select = prefectureSelect('', () => {});
    expect(snapshot(select).map((o) => [o.value, o.text])).toEqual(
      ['', ...PREFECTURES].map((p) => [p, p || '選択してください']),
    );
  });

  it('selects the matching prefecture, the placeholder for empty, none for unknown', () => {
    expect(snapshot(prefectureSelect('東京都', () => {})).filter((o) => o.selected))
      .toEqual([{ value: '東京都', text: '東京都', selected: true }]);
    expect(snapshot(prefectureSelect('', () => {})).filter((o) => o.selected))
      .toEqual([{ value: '', text: '選択してください', selected: true }]);
    expect(snapshot(prefectureSelect('火星', () => {})).filter((o) => o.selected)).toEqual([
      { value: '', text: '選択してください', selected: true },
    ]);
    expect(prefectureSelect('火星', () => {}).selectedIndex).toBe(0);
  });

  it('calls onChange once with the new value', () => {
    const onChange = vi.fn();
    const select = prefectureSelect('', onChange);
    fireChange(select, '大阪府');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('大阪府');
  });
});

describe('genderSelect parity', () => {
  it('lists the optional placeholder then every gender in order', () => {
    const select = genderSelect('', () => {});
    expect(snapshot(select).map((o) => [o.value, o.text])).toEqual(
      ['', ...GENDERS].map((g) => [g, g || '選択してください（任意）']),
    );
  });

  it('selects the matching gender, the placeholder for empty, none for unknown', () => {
    expect(snapshot(genderSelect('女性', () => {})).filter((o) => o.selected))
      .toEqual([{ value: '女性', text: '女性', selected: true }]);
    expect(snapshot(genderSelect('', () => {})).filter((o) => o.selected))
      .toEqual([{ value: '', text: '選択してください（任意）', selected: true }]);
    expect(snapshot(genderSelect('不明', () => {})).filter((o) => o.selected)).toEqual([
      { value: '', text: '選択してください（任意）', selected: true },
    ]);
    expect(genderSelect('不明', () => {}).selectedIndex).toBe(0);
  });

  it('calls onChange once with the new value', () => {
    const onChange = vi.fn();
    const select = genderSelect('', onChange);
    fireChange(select, '男性');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('男性');
  });
});

describe('ownerSelect parity', () => {
  const PROFILES = [
    { id: 'p1', label: '個人用' },
    { id: 'p2', label: '' },
    { id: '', label: '空ID' },
  ];

  it('lists the shared option then one per profile with label fallback', () => {
    const select = ownerSelect('', () => {}, PROFILES);
    expect(snapshot(select).map((o) => [o.value, o.text])).toEqual([
      ['', '共通（どのプロファイルでも使う）'],
      ['p1', '個人用'],
      ['p2', 'プロファイル 2'],
      ['', '空ID'],
    ]);
  });

  it('selects shared for empty but never an empty-id profile', () => {
    const selected = snapshot(ownerSelect('', () => {}, PROFILES)).filter((o) => o.selected);
    expect(selected).toEqual([
      { value: '', text: '共通（どのプロファイルでも使う）', selected: true },
    ]);
  });

  it('selects the matching profile, none for unknown', () => {
    expect(snapshot(ownerSelect('p1', () => {}, PROFILES)).filter((o) => o.selected))
      .toEqual([{ value: 'p1', text: '個人用', selected: true }]);
    expect(snapshot(ownerSelect('zzz', () => {}, PROFILES)).filter((o) => o.selected)).toEqual([
      { value: '', text: '共通（どのプロファイルでも使う）', selected: true },
    ]);
    expect(ownerSelect('zzz', () => {}, PROFILES).selectedIndex).toBe(0);
  });

  it('calls onChange once with the new value', () => {
    const onChange = vi.fn();
    const select = ownerSelect('', onChange, PROFILES);
    fireChange(select, 'p2');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('p2');
  });
});
