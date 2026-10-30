// PBI-194 parity: pins the trial-apply consolidation against the pre-refactor
// trio (withTrialProfile / withTrialAddress / withTrialBoth), re-implemented
// below as the oracle. The pinned cases include the empty list (exactly one
// built card per side, never a prepend that would add a second — the e2e
// zero-count recovery depends on it) and the in-place repair of a non-blank
// first card (no fork). Pure state assertions; the mocks below only let the
// entrypoint module import. The oracle calls the real (unchanged)
// applyTrialSampleTo* helpers, so this file pins the consolidation itself, not
// the per-key fill.
import { describe, it, expect, vi } from 'vitest';
import { selectImportTargets } from '../../src/core/import-targets';
import type { Address, Profile, StoredData } from '../../src/core/types';

if (!globalThis.crypto?.randomUUID) {
  const g = globalThis as unknown as { crypto: Crypto };
  const c = g.crypto ?? ({} as Crypto);
  (c as unknown as Record<string, unknown>).randomUUID ??= (() =>
    `00000000-0000-4000-8000-${Math.floor(Math.random() * 0xffffffffffff)
      .toString(16)
      .padStart(12, '0')}`) as unknown as Crypto['randomUUID'];
  g.crypto = c;
}

vi.mock('../../src/storage', () => ({
  newId: () => 'test-id',
  loadData: async () => ({ profiles: [], addresses: [] }),
  saveData: async () => {},
}));

vi.mock('../../src/entrypoints/options/ai-section', () => ({
  mountAiSection: vi.fn(),
}));

vi.mock('../../src/entrypoints/options/exclusion-section', () => ({
  mountExclusionSection: vi.fn(),
}));

vi.mock('../../src/entrypoints/options/mapping-section', () => ({
  mountMappingSection: vi.fn(),
}));

document.body.innerHTML = '<div id="side"></div><main id="app"></main><main id="ai-app"></main><main id="exclusion-app"></main><main id="mapping-app"></main><main id="audit-app"></main>';

const { withTrialSample, applyTrialSampleToProfile, applyTrialSampleToAddress } = await import(
  '../../src/entrypoints/options/main'
);

// Lets the module-level `void loadData().then(...)` settle so `state` is set.
await new Promise((r) => setTimeout(r, 0));

// The pre-refactor trio, frozen as the oracle (verbatim from main.ts before
// PBI-194): selectImportTargets -> blank check -> apply -> head replacement.
function oracleWithTrialProfile(
  current: StoredData, sample: Omit<Profile, 'id'>, ids: { profileId: string; addressId: string },
): StoredData {
  const targets = selectImportTargets(current.profiles, current.addresses, ids);
  const base = targets.blankProfile ? targets.target : current.profiles[0]!;
  const filled = applyTrialSampleToProfile(base, sample);
  return {
    profiles: current.profiles.length === 0 ? [filled] : [filled, ...current.profiles.slice(1)],
    addresses: current.addresses,
  };
}

function oracleWithTrialAddress(
  current: StoredData, sample: Omit<Address, 'id' | 'profileId'>, ids: { profileId: string; addressId: string },
): StoredData {
  const targets = selectImportTargets(current.profiles, current.addresses, ids);
  const base = targets.blankAddress ? targets.targetAddress : current.addresses[0]!;
  const filled = applyTrialSampleToAddress(base, sample);
  return {
    profiles: current.profiles,
    addresses: current.addresses.length === 0 ? [filled] : [filled, ...current.addresses.slice(1)],
  };
}

function oracleWithTrialBoth(
  current: StoredData,
  sampleP: Omit<Profile, 'id'>,
  sampleA: Omit<Address, 'id' | 'profileId'>,
  ids: { profileId: string; addressId: string },
): StoredData {
  const targets = selectImportTargets(current.profiles, current.addresses, ids);
  const baseP = targets.blankProfile ? targets.target : current.profiles[0]!;
  const baseA = targets.blankAddress ? targets.targetAddress : current.addresses[0]!;
  return {
    profiles: [
      applyTrialSampleToProfile(baseP, sampleP),
      ...(current.profiles.length === 0 ? [] : current.profiles.slice(1)),
    ],
    addresses: [
      applyTrialSampleToAddress(baseA, sampleA),
      ...(current.addresses.length === 0 ? [] : current.addresses.slice(1)),
    ],
  };
}

const IDS = { profileId: 'new-profile', addressId: 'new-address' };

function blankProfile(id: string): Profile {
  return {
    id, label: '',
    lastName: '', firstName: '', lastNameKana: '', firstNameKana: '',
    lastNameRomaji: '', firstNameRomaji: '', gender: '',
    birthday: '', school: '', department: '',
    companyName: '', companyDepartment: '', companyNameKana: '',
    email: '', tel: '',
  };
}

// Blank by PROFILE_BLANK_KEYS with only a display label/gender: blankness is a
// key set, so the card is still repaired in place and keeps both values.
function labeledBlankProfile(id: string): Profile {
  return { ...blankProfile(id), label: '家', gender: '男性' };
}

function filledProfile(id: string): Profile {
  return {
    id, label: '家',
    lastName: '鈴木', firstName: '', lastNameKana: '', firstNameKana: 'スズキ',
    lastNameRomaji: '', firstNameRomaji: '', gender: '',
    birthday: '', school: '', department: '経済学部',
    companyName: '', companyDepartment: '', companyNameKana: '',
    email: '', tel: '0312345678',
  };
}

function blankAddress(id: string): Address {
  return {
    id, label: '', profileId: '', zip: '', prefecture: '',
    city: '', street: '', building: '',
    country: '', address1: '', address2: '', address3: '', address4: '', postalCode: '',
  };
}

// Blank by ADDRESS_BLANK_KEYS (zip/city/street/building) with only a
// prefecture/label: blankness is a key set, so the card is still repaired in
// place and its prefecture survives the fill.
function prefilledBlankAddress(id: string): Address {
  return { ...blankAddress(id), prefecture: '沖縄県', label: '実家' };
}

function filledAddress(id: string): Address {
  return {
    id, label: '', profileId: 'p1', zip: '1500001', prefecture: '神奈川県',
    city: '', street: '駅前1-2-3', building: '',
    country: '', address1: '', address2: '', address3: '', address4: '', postalCode: '',
  };
}

// Partial samples: empty keys stay observable (an empty sample key never
// overwrites the base, and a blank base key keeps '' when the sample is empty
// too).
const SAMPLE_P: Omit<Profile, 'id'> = {
  label: 'お試し',
  lastName: '山田', firstName: '太郎', lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
  lastNameRomaji: '', firstNameRomaji: '',
  gender: '男性',
  birthday: '', school: 'サンプル高校', department: '',
  companyName: '', companyDepartment: '', companyNameKana: '',
  email: 'yamada.taro@example.com', tel: '',
};

const SAMPLE_P_FULL: Omit<Profile, 'id'> = {
  label: '勤務先',
  lastName: '佐藤', firstName: '花子', lastNameKana: 'サトウ', firstNameKana: 'ハナコ',
  lastNameRomaji: 'Sato', firstNameRomaji: 'Hanako',
  gender: '女性',
  birthday: '1990-05-07', school: 'サンプル大学', department: '文学部',
  companyName: '株式会社サンプル', companyDepartment: '開発部',
  companyNameKana: 'カブシキガイシャサンプル',
  email: 'sato@example.com', tel: '09012345678',
};

const SAMPLE_A: Omit<Address, 'id' | 'profileId'> = {
  label: '自宅', zip: '1000001', prefecture: '東京都',
  city: '千代田区', street: '', building: '',
  country: '', address1: '', address2: '', address3: '', address4: '', postalCode: '',
};

const SAMPLE_A_FULL: Omit<Address, 'id' | 'profileId'> = {
  label: '勤務先', zip: '1600022', prefecture: '東京都',
  city: '新宿区', street: '新宿1-2-3', building: 'サンプルビル',
  country: '', address1: '', address2: '', address3: '', address4: '', postalCode: '',
};

const STATES: { name: string; state: StoredData }[] = [
  { name: 'empty both sides', state: { profiles: [], addresses: [] } },
  { name: 'blank first cards', state: { profiles: [blankProfile('p1')], addresses: [blankAddress('a1')] } },
  {
    name: 'labeled blank first cards',
    state: { profiles: [labeledBlankProfile('p1')], addresses: [prefilledBlankAddress('a1')] },
  },
  {
    name: 'blank first cards with extras',
    state: {
      profiles: [blankProfile('p1'), labeledBlankProfile('p2'), filledProfile('p3')],
      addresses: [blankAddress('a1'), prefilledBlankAddress('a2'), filledAddress('a3')],
    },
  },
  {
    name: 'filled first cards with extras',
    state: {
      profiles: [filledProfile('p1'), blankProfile('p2')],
      addresses: [filledAddress('a1'), blankAddress('a2')],
    },
  },
];

const PROFILE_SAMPLES: { name: string; sample: Omit<Profile, 'id'> }[] = [
  { name: 'partial sample', sample: SAMPLE_P },
  { name: 'full sample', sample: SAMPLE_P_FULL },
];

const ADDRESS_SAMPLES: { name: string; sample: Omit<Address, 'id' | 'profileId'> }[] = [
  { name: 'partial sample', sample: SAMPLE_A },
  { name: 'full sample', sample: SAMPLE_A_FULL },
];

// Independent clones per side: a mutation by either implementation must not
// leak into the other's input.
const clone = (state: StoredData): StoredData => JSON.parse(JSON.stringify(state)) as StoredData;

describe('withTrialSample parity with the pre-refactor trio', () => {
  for (const { name, state } of STATES) {
    for (const { name: pName, sample: sampleP } of PROFILE_SAMPLES) {
      it(`profile side matches withTrialProfile on ${name} (${pName})`, () => {
        expect(withTrialSample(clone(state), { profile: sampleP }, IDS))
          .toEqual(oracleWithTrialProfile(clone(state), sampleP, IDS));
      });
    }
    for (const { name: aName, sample: sampleA } of ADDRESS_SAMPLES) {
      it(`address side matches withTrialAddress on ${name} (${aName})`, () => {
        expect(withTrialSample(clone(state), { address: sampleA }, IDS))
          .toEqual(oracleWithTrialAddress(clone(state), sampleA, IDS));
      });
    }
    for (const { name: pName, sample: sampleP } of PROFILE_SAMPLES) {
      for (const { name: aName, sample: sampleA } of ADDRESS_SAMPLES) {
        it(`both sides match withTrialBoth on ${name} (${pName}, ${aName})`, () => {
          expect(withTrialSample(clone(state), { profile: sampleP, address: sampleA }, IDS))
            .toEqual(oracleWithTrialBoth(clone(state), sampleP, sampleA, IDS));
        });
      }
    }
  }
});

describe('empty-list rebuild', () => {
  it('builds exactly one card per side from empty lists (never two)', () => {
    const next = withTrialSample(
      { profiles: [], addresses: [] },
      { profile: SAMPLE_P_FULL, address: SAMPLE_A_FULL },
      IDS,
    );
    expect(next.profiles).toHaveLength(1);
    // The fresh card carries the injected id, not ''.
    expect(next.profiles[0]).toEqual({ ...SAMPLE_P_FULL, id: IDS.profileId });
    expect(next.addresses).toHaveLength(1);
    // The address label falls back to 自宅, not the sample's label, and the
    // fresh card keeps EMPTY_ADDRESS's owner key (the trial never sets it).
    expect(next.addresses[0]).toEqual({ ...SAMPLE_A_FULL, id: IDS.addressId, label: '自宅', profileId: '' });
  });

  it('rebuilds exactly one profile on a single-side trial from an empty profile list', () => {
    const next = withTrialSample(
      { profiles: [], addresses: [filledAddress('a1')] },
      { profile: SAMPLE_P },
      IDS,
    );
    expect(next.profiles).toHaveLength(1);
    expect(next.profiles[0]!.id).toBe(IDS.profileId);
    expect(next.addresses).toEqual([filledAddress('a1')]);
  });
});

describe('in-place repair of a non-blank first card', () => {
  it('fills only the blank keys of a filled first profile without forking', () => {
    const state = { profiles: [filledProfile('p1'), blankProfile('p2')], addresses: [filledAddress('a1')] };
    const next = withTrialSample(state, { profile: SAMPLE_P }, IDS);
    expect(next.profiles).toHaveLength(2);
    expect(next.profiles[0]!.id).toBe('p1');
    expect(next.profiles[0]).toEqual({
      id: 'p1',
      label: '家', // kept (non-blank)
      lastName: '鈴木', // kept
      firstName: '太郎', // filled
      lastNameKana: 'ヤマダ', // filled
      firstNameKana: 'スズキ', // kept
      lastNameRomaji: '', // sample is empty: untouched
      firstNameRomaji: '',
      gender: '男性', // filled
      birthday: '', // sample is empty: untouched
      school: 'サンプル高校', // filled
      department: '経済学部', // kept
      companyName: '',
      companyDepartment: '',
      companyNameKana: '',
      email: 'yamada.taro@example.com', // filled
      tel: '0312345678', // kept
    });
    expect(next.profiles[1]).toEqual(blankProfile('p2'));
    expect(next.addresses).toEqual(state.addresses);
  });

  it('fills only the blank keys of a filled first address without forking', () => {
    const state = { profiles: [blankProfile('p1')], addresses: [filledAddress('a1'), blankAddress('a2')] };
    const next = withTrialSample(state, { address: SAMPLE_A }, IDS);
    expect(next.addresses).toHaveLength(2);
    expect(next.addresses[0]!.id).toBe('a1');
    expect(next.addresses[0]!.zip).toBe('1500001'); // kept
    expect(next.addresses[0]!.city).toBe('千代田区'); // filled
    expect(next.addresses[0]!.street).toBe('駅前1-2-3'); // kept
    expect(next.addresses[0]!.building).toBe(''); // sample is empty: untouched
    expect(next.addresses[0]!.prefecture).toBe('神奈川県'); // kept (non-blank)
    expect(next.addresses[0]!.label).toBe('自宅'); // default when blank
    expect(next.profiles).toEqual(state.profiles);
  });
});

describe('recorded divergences kept as-is', () => {
  it('fills a blank prefecture from the sample even though it is outside ADDRESS_BLANK_KEYS', () => {
    const next = withTrialSample(
      { profiles: [blankProfile('p1')], addresses: [blankAddress('a1')] },
      { address: SAMPLE_A },
      IDS,
    );
    expect(next.addresses[0]!.prefecture).toBe('東京都');
  });

  it('keeps a non-blank prefecture on an otherwise blank card (blankness is a key set)', () => {
    const next = withTrialSample(
      { profiles: [blankProfile('p1')], addresses: [prefilledBlankAddress('a1')] },
      { address: SAMPLE_A },
      IDS,
    );
    expect(next.addresses[0]!.id).toBe('a1');
    expect(next.addresses[0]!.prefecture).toBe('沖縄県');
    expect(next.addresses[0]!.label).toBe('実家');
    expect(next.addresses[0]!.zip).toBe('1000001');
  });

  it('does not validate the sample — the save side owns validation', () => {
    const next = withTrialSample(
      { profiles: [blankProfile('p1')], addresses: [blankAddress('a1')] },
      { profile: { ...SAMPLE_P, tel: 'not-a-number' } },
      IDS,
    );
    expect(next.profiles[0]!.tel).toBe('not-a-number');
  });
});

describe('purity', () => {
  it('does not mutate the input state', () => {
    const state = {
      profiles: [filledProfile('p1'), blankProfile('p2')],
      addresses: [filledAddress('a1'), blankAddress('a2')],
    };
    const snapshot = clone(state);
    withTrialSample(state, { profile: SAMPLE_P_FULL, address: SAMPLE_A_FULL }, IDS);
    expect(state).toEqual(snapshot);
  });
});
