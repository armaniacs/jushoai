import { describe, it, expect, vi } from 'vitest';
import { EMPTY_ADDRESS, EMPTY_PROFILE } from '../../src/core/types';
import type { Address, Profile, StoredData } from '../../src/core/types';
import {
  ADDRESS_SPEC, PROFILE_SPEC, SIDE_SPECS, decideSaveSide,
  saveSide,
} from '../../src/entrypoints/options/save-side';
import type { SaveSideDeps, SideSpec } from '../../src/entrypoints/options/save-side';

function validProfileRaw(): Profile {
  return {
    ...EMPTY_PROFILE, id: 'p1', label: '個人用', lastName: '山田', firstName: '太郎',
    lastNameKana: 'ヤマダ', firstNameKana: 'タロウ', email: 'yamada@example.com', tel: '09012345678',
  };
}

function validAddressRaw(): Address {
  return {
    ...EMPTY_ADDRESS, id: 'a1', label: '自宅', zip: '1000001', prefecture: '東京都',
    city: '千代田区', street: '千代田1-1',
  };
}

function blankProfileRaw(): Profile {
  return { ...EMPTY_PROFILE, id: 'p9' };
}

function blankAddressRaw(): Address {
  return { ...EMPTY_ADDRESS, id: 'a9', label: '自宅' };
}

const SPECS: { name: string; spec: SideSpec; validOwn: () => Profile | Address; blankOwn: () => Profile | Address }[] = [
  { name: 'profile', spec: PROFILE_SPEC, validOwn: validProfileRaw, blankOwn: blankProfileRaw },
  { name: 'address', spec: ADDRESS_SPEC, validOwn: validAddressRaw, blankOwn: blankAddressRaw },
];

function stateFor(spec: SideSpec, own: (Profile | Address)[], otherValid: boolean): StoredData {
  const validOther = spec.kind === 'profile' ? validAddressRaw() : validProfileRaw();
  const blankOther = spec.kind === 'profile' ? blankAddressRaw() : blankProfileRaw();
  const other = otherValid ? validOther : blankOther;
  return spec.kind === 'profile'
    ? { profiles: own as Profile[], addresses: [other as Address] }
    : { profiles: [other as Profile], addresses: own as Address[] };
}

function fakeDeps(current: StoredData, overrides: Partial<SaveSideDeps> = {}): SaveSideDeps & {
  calls: string[]; setStateCalls: StoredData[]; errors: string[][]; toasts: string[][]; state: { current: StoredData };
} {
  const calls: string[] = [];
  const setStateCalls: StoredData[] = [];
  const errors: string[][] = [];
  const toasts: string[][] = [];
  const box = { current };
  const deps = {
    calls, setStateCalls, errors, toasts, state: box,
    getState: () => box.current,
    setState: (next: StoredData) => { calls.push('setState'); setStateCalls.push(next); box.current = next; },
    loadData: async () => { calls.push('load'); return box.current; },
    saveData: async (_d: StoredData) => { calls.push('save'); },
    ui: {
      showError: (m: string[], _a?: { label: string; onClick: () => void }) => { calls.push('error'); errors.push(m); },
      showToast: (m: string[], _a?: { label: string; onClick: () => void }) => { calls.push('toast'); toasts.push(m); },
      render: () => { calls.push('render'); },
      onTrial: () => { calls.push('trial'); },
      goOther: () => { calls.push('goOther'); },
    },
    ...overrides,
  } as SaveSideDeps & {
    calls: string[]; setStateCalls: StoredData[]; errors: string[][]; toasts: string[][]; state: { current: StoredData };
  };
  return deps;
}

describe('save-side spec table', () => {
  it('exposes one entry per kind', () => {
    expect(SIDE_SPECS.profile).toBe(PROFILE_SPEC);
    expect(SIDE_SPECS.address).toBe(ADDRESS_SPEC);
    expect(PROFILE_SPEC.kind).toBe('profile');
    expect(ADDRESS_SPEC.kind).toBe('address');
  });
});

describe.each(SPECS)('decideSaveSide ($name)', ({ spec, validOwn, blankOwn }) => {
  it('returns empty when the own side has zero entries', () => {
    const state = stateFor(spec, [], true);
    expect(decideSaveSide(spec, state)).toEqual({ outcome: 'empty' });
  });

  it('returns invalid when the own side fails validation', () => {
    const state = stateFor(spec, [blankOwn()], true);
    const d = decideSaveSide(spec, state);
    expect(d.outcome).toBe('invalid');
    if (d.outcome === 'invalid') expect(d.errors.length).toBeGreaterThan(0);
  });

  it('returns ready with otherValid=true when the opposite side is valid', () => {
    const state = stateFor(spec, [validOwn()], true);
    const d = decideSaveSide(spec, state);
    expect(d.outcome).toBe('ready');
    if (d.outcome === 'ready') expect(d.otherValid).toBe(true);
  });

  it('returns ready with otherValid=false when the opposite side is invalid', () => {
    const state = stateFor(spec, [validOwn()], false);
    const d = decideSaveSide(spec, state);
    expect(d.outcome).toBe('ready');
    if (d.outcome === 'ready') expect(d.otherValid).toBe(false);
  });
});

describe.each(SPECS)('saveSide ($name)', ({ spec, validOwn, blankOwn }) => {
  it('shows the empty message with the trial action and never touches storage', async () => {
    const deps = fakeDeps(stateFor(spec, [], true));
    const save = vi.spyOn(deps, 'saveData');
    const load = vi.spyOn(deps, 'loadData');
    await saveSide(spec, deps);
    expect(deps.errors).toEqual([[spec.emptyMessage]]);
    expect(deps.calls).toContain('render');
    expect(load).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(deps.setStateCalls).toHaveLength(0);
  });

  it('shows validation errors and never touches storage', async () => {
    const before = stateFor(spec, [blankOwn()], true);
    const deps = fakeDeps(before);
    const save = vi.spyOn(deps, 'saveData');
    await saveSide(spec, deps);
    expect(deps.errors.length).toBe(1);
    expect(deps.errors[0]?.length).toBeGreaterThan(0);
    expect(save).not.toHaveBeenCalled();
    expect(deps.setStateCalls).toHaveLength(0);
    expect(deps.state.current).toBe(before);
  });

  it('commits normalized own side only after a successful save, in validate->load->save->commit order', async () => {
    const deps = fakeDeps(stateFor(spec, [validOwn()], true));
    await saveSide(spec, deps);
    expect(deps.calls).toEqual(['load', 'save', 'setState', 'toast', 'render']);
    expect(deps.toasts).toEqual([['保存しました']]);
    expect(deps.setStateCalls).toHaveLength(1);
  });

  it('invites the other side when it has no valid entry', async () => {
    const deps = fakeDeps(stateFor(spec, [validOwn()], false));
    let toastAction: { label: string; onClick: () => void } | undefined;
    deps.ui.showToast = (m: string[], a?: { label: string; onClick: () => void }) => {
      deps.calls.push('toast'); deps.toasts.push(m); toastAction = a;
    };
    await saveSide(spec, deps);
    expect(deps.toasts).toEqual([[spec.nextMessage]]);
    expect(toastAction?.label).toBe(spec.nextLabel);
  });

  it('keeps memory state untouched when the save fails', async () => {
    const before = stateFor(spec, [validOwn()], true);
    const deps = fakeDeps(before, {
      saveData: async () => { depsRef.calls.push('save'); throw new Error('quota'); },
    });
    const depsRef = deps;
    await saveSide(spec, deps);
    expect(deps.errors).toEqual([['保存に失敗しました。容量不足の可能性があります。']]);
    expect(deps.calls).toEqual(['load', 'save', 'error', 'render']);
    expect(deps.setStateCalls).toHaveLength(0);
    expect(deps.state.current).toBe(before);
  });

  it('falls back to the in-memory opposite side when the reload fails, then saves', async () => {
    const current = stateFor(spec, [validOwn()], true);
    let saved: StoredData | undefined;
    const deps = fakeDeps(current, {
      loadData: async () => { throw new Error('io'); },
      saveData: async (d: StoredData) => { depsRef.calls.push('save'); saved = d; },
    });
    const depsRef = deps;
    await saveSide(spec, deps);
    expect(saved).toBeDefined();
    expect(deps.toasts).toEqual([['保存しました']]);
    expect(deps.setStateCalls).toHaveLength(1);
  });
});
