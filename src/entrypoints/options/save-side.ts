// Single table for the two single-side saves (PBI-171): onSaveProfiles and
// onSaveAddresses were the same flow with seven per-kind differences buried
// in duplicated code (normalize/validate, empty wording, trial entry, the
// opposite side re-read, the guide check, the guide destination). The table
// below keeps one row per kind so the flow cannot drift again.
import { normalizeAddress, normalizeProfile } from '../../core/profile';
import { EMPTY_ADDRESS, EMPTY_PROFILE } from '../../core/types';
import type { Address, Profile, StoredData } from '../../core/types';
import {
  addressErrorsFor, hasValidAddress, hasValidProfile, profileErrorsFor, trialToastText,
} from './save-guide';

export type SideKind = 'profile' | 'address';

export interface SideSpec {
  kind: SideKind;
  emptyMessage: string;
  trialLabel: string;
  nextMessage: string;
  nextLabel: string;
  normalizeOwn(state: StoredData): Profile[] | Address[];
  errorsForOwn(own: Profile[] | Address[]): string[];
  otherValid(state: StoredData): boolean;
  otherFromLatest(latest: StoredData): Profile[] | Address[];
  buildSave(own: Profile[] | Address[], other: Profile[] | Address[]): StoredData;
  buildCommitted(own: Profile[] | Address[], current: StoredData): StoredData;
}

export const PROFILE_SPEC: SideSpec = {
  kind: 'profile',
  emptyMessage: 'プロファイルを1件以上登録してください',
  trialLabel: '架空の名前を作って試す',
  nextMessage: '保存しました。次は住所を入力してください',
  nextLabel: '住所を入力する',
  normalizeOwn: (s) => s.profiles.map(normalizeProfile),
  errorsForOwn: (own) => profileErrorsFor(own as Profile[]),
  otherValid: (s) => hasValidAddress(s.addresses.map(normalizeAddress)),
  otherFromLatest: (latest) => latest.addresses,
  buildSave: (own, other) => ({ profiles: own as Profile[], addresses: other as Address[] }),
  buildCommitted: (own, current) => ({ profiles: own as Profile[], addresses: current.addresses }),
};

export const ADDRESS_SPEC: SideSpec = {
  kind: 'address',
  emptyMessage: '住所を1件以上登録してください',
  trialLabel: '架空の住所を作って試す',
  nextMessage: '保存しました。次はプロファイルを入力してください',
  nextLabel: 'プロファイルを入力する',
  normalizeOwn: (s) => s.addresses.map(normalizeAddress),
  errorsForOwn: (own) => addressErrorsFor(own as Address[]),
  otherValid: (s) => hasValidProfile(s.profiles.map(normalizeProfile)),
  otherFromLatest: (latest) => latest.profiles,
  buildSave: (own, other) => ({ profiles: other as Profile[], addresses: own as Address[] }),
  buildCommitted: (own, current) => ({ profiles: current.profiles, addresses: own as Address[] }),
};

export const SIDE_SPECS: Record<SideKind, SideSpec> = {
  profile: PROFILE_SPEC,
  address: ADDRESS_SPEC,
};

export type SaveDecision =
  | { outcome: 'empty' }
  | { outcome: 'invalid'; errors: string[] }
  | { outcome: 'ready'; own: Profile[] | Address[]; otherValid: boolean };

// Pure validation half of a single-side save: no storage, no UI, no state
// writes. The async saveSide below runs this first and keeps the same order
// for both kinds.
export function decideSaveSide(spec: SideSpec, state: StoredData): SaveDecision {
  const own = spec.normalizeOwn(state);
  if (own.length === 0) return { outcome: 'empty' };
  const errors = spec.errorsForOwn(own);
  if (errors.length > 0) return { outcome: 'invalid', errors };
  return { outcome: 'ready', own, otherValid: spec.otherValid(state) };
}

export interface SaveSideUi {
  showError(messages: string[], action?: { label: string; onClick: () => void }): void;
  showToast(messages: string[], action?: { label: string; onClick: () => void }): void;
  render(): void;
  onTrial(): void;
  goOther(): void;
}

export interface SaveSideDeps {
  getState(): StoredData;
  setState(next: StoredData): void;
  loadData(): Promise<StoredData>;
  saveData(data: StoredData): Promise<void>;
  ui: SaveSideUi;
}

// Thin async shell with one fixed order for both kinds: validate, re-read the
// opposite side, save, commit to memory only on success, then toast and
// render. A failed save leaves the memory state untouched; a failed re-read
// falls back to the in-memory opposite side (the old stale-write discipline
// minus the pre-assignment, so the stale value never reaches memory either).
export async function saveSide(spec: SideSpec, deps: SaveSideDeps): Promise<void> {
  const current = deps.getState();
  const decision = decideSaveSide(spec, current);
  if (decision.outcome === 'empty') {
    deps.ui.showError([spec.emptyMessage], { label: spec.trialLabel, onClick: () => deps.ui.onTrial() });
    deps.ui.render();
    return;
  }
  if (decision.outcome === 'invalid') {
    deps.ui.showError(decision.errors);
    deps.ui.render();
    return;
  }
  let other: Profile[] | Address[];
  try {
    other = spec.otherFromLatest(await deps.loadData());
  } catch {
    other = spec.otherFromLatest(current);
  }
  try {
    await deps.saveData(spec.buildSave(decision.own, other));
  } catch (e) {
    console.warn('[JushoAI] save failed', e);
    deps.ui.showError(['保存に失敗しました。容量不足の可能性があります。']);
    deps.ui.render();
    return;
  }
  deps.setState(spec.buildCommitted(decision.own, current));
  if (decision.otherValid) {
    deps.ui.showToast(['保存しました']);
  } else {
    deps.ui.showToast([spec.nextMessage], { label: spec.nextLabel, onClick: () => deps.ui.goOther() });
  }
  deps.ui.render();
}

// Both-side trial save (PBI-182): the old onTrialSave wrote normalized values
// into memory before storage succeeded, so a failed save left polluted state.
// The both-side equivalent of the SideSpec discipline is validate both sides,
// save once, and commit to memory only on success. There is no opposite side
// to re-read (the single-side re-read exists to avoid a stale overwrite of
// the side being kept; here both sides come from the caller draft), and the
// caller prepares the draft before calling, so this shell never assigns state
// before the save resolves. A failed save leaves memory untouched.
export type BothDecision =
  | { outcome: 'empty' }
  | { outcome: 'invalid'; errors: string[] }
  | { outcome: 'ready'; profiles: Profile[]; addresses: Address[] };

// Pure validation half of the both-side save: no storage, no UI, no state
// writes. Both sides are normalized and validated before anything is written.
export function decideSaveBoth(draft: StoredData): BothDecision {
  const profiles = draft.profiles.map(normalizeProfile);
  const addresses = draft.addresses.map(normalizeAddress);
  if (profiles.length === 0 || addresses.length === 0) return { outcome: 'empty' };
  const errors = [...profileErrorsFor(profiles), ...addressErrorsFor(addresses)];
  if (errors.length > 0) return { outcome: 'invalid', errors };
  return { outcome: 'ready', profiles, addresses };
}

export interface SaveBothDeps {
  setState(next: StoredData): void;
  saveData(data: StoredData): Promise<void>;
  ui: {
    showError(messages: string[]): void;
    showToast(messages: string[]): void;
    render(): void;
  };
}

// Thin async shell with one fixed order: validate both, save, commit to memory
// only on success, then toast and render.
export async function saveBoth(draft: StoredData, deps: SaveBothDeps): Promise<void> {
  const decision = decideSaveBoth(draft);
  if (decision.outcome === 'empty') {
    deps.ui.showError(['プロファイルと住所を1件以上登録してください']);
    deps.ui.render();
    return;
  }
  if (decision.outcome === 'invalid') {
    deps.ui.showError(decision.errors);
    deps.ui.render();
    return;
  }
  try {
    await deps.saveData({ profiles: decision.profiles, addresses: decision.addresses });
  } catch (e) {
    console.warn('[JushoAI] save failed', e);
    deps.ui.showError(['保存に失敗しました。容量不足の可能性があります。']);
    deps.ui.render();
    return;
  }
  deps.setState({ profiles: decision.profiles, addresses: decision.addresses });
  const savedProfile = decision.profiles[0] ?? EMPTY_PROFILE;
  const savedAddress = decision.addresses[0] ?? EMPTY_ADDRESS;
  deps.ui.showToast([trialToastText(savedProfile, savedAddress)]);
  deps.ui.render();
}
