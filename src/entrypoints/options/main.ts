import { GENDERS } from '../../core/genders';
// Field vocabulary (PBI-158): the profile/address card rows come from the core
// field catalog, so a new row is one table entry for both UIs and the kana
// label difference stays an explicit column instead of a drift.
import {
  OPTIONS_ADDRESS_FIELDS, OPTIONS_PROFILE_FIELDS, PREFECTURE_FIELD_LABEL,
} from '../../core/field-catalog';
import { PREFECTURES } from '../../core/prefectures';
import { makeSampleAddress, makeSampleProfile } from '../../core/sample-data';
import {
  normalizeAddress, normalizeProfile,
} from '../../core/profile';
import { EMPTY_ADDRESS, EMPTY_PROFILE } from '../../core/types';
import type { Address, Profile, StoredData } from '../../core/types';
import { loadData, newId, saveData } from '../../storage';
import { applyImportDraft, applyImportToState } from '../../core/import-apply';
import { IMPORT_DRAFT_MESSAGE } from '../../import-message';
import { el, labeled, textInput, kanaHiraganaHint, isAtLimit, MAX_ITEMS, buildSelect, cardFieldset, actionButton } from './dom';
import {
  dismissGuideForSession, hideFloatGuide, isGuideDismissed, showFloatError, showFloatGuide, showFloatToast,
} from './float-layer';
import { mountAiSection } from './ai-section';
import { mountAuditSection } from './audit-section';
import { mountExclusionSection } from './exclusion-section';
import { defaultTransferDeps, mountTransferSection } from './transfer-section';
import { ADDRESSES_SECTION_ID, applyActivePage, getActivePage, mountNav, setActivePage, PROFILES_SECTION_ID, AUDIT_SECTION_ID } from './nav';
import {
  addressErrorsFor, hasValidAddress, hasValidProfile, profileErrorsFor, trialToastText,
} from './save-guide';
import { mountMappingSection } from './mapping-section';

const OVERSEAS_FIELDS: { key: keyof Address; label: string; placeholder: string }[] = [
  { key: 'country', label: '国名（半角英数・任意）', placeholder: 'United States' },
  { key: 'address1', label: '建物名（半角英数・任意）', placeholder: '#123 Central Apartment' },
  { key: 'address2', label: '番地（半角英数・任意）', placeholder: '25-15 M.G.Peterson Ave' },
  { key: 'address3', label: '市（半角英数・任意）', placeholder: 'Long Island City' },
  { key: 'address4', label: '州・地域（半角英数・任意）', placeholder: 'NEW YORK' },
  { key: 'postalCode', label: '英語の郵便番号（半角英数・任意）', placeholder: '11375' },
];

const app = document.getElementById('app')!;
let state: StoredData;

// The export/import section (PBI-117) is mounted once like the audit and
// exclusion sections; render() re-appends the same holder so the section keeps
// its element (and its feedback) across the profile/address re-renders. The
// holder is a div: <main id="app"> already is the page's main element, and a
// main nested inside it is invalid HTML.
const transferHolder = document.createElement('div');
transferHolder.id = 'transfer-app';

export function prefectureSelect(value: string, onChange: (v: string) => void) {
  return buildSelect(onChange, ['', ...PREFECTURES].map((p) => ({
    value: p,
    text: p || '選択してください',
    selected: p === value,
  })));
}

export function genderSelect(value: string, onChange: (v: string) => void) {
  return buildSelect(onChange, ['', ...GENDERS].map((g) => ({
    value: g,
    text: g || '選択してください（任意）',
    selected: g === value,
  })));
}

export function ownerSelect(value: string, onChange: (v: string) => void, profiles: Pick<Profile, 'id' | 'label'>[]) {
  return buildSelect(onChange, [
    { value: '', text: '共通（どのプロファイルでも使う）', selected: value === '' },
    ...profiles.map((p, i) => ({
      value: p.id,
      text: p.label || `プロファイル ${i + 1}`,
      selected: p.id !== '' && p.id === value,
    })),
  ]);
}

// Card/button assembly lives in dom.ts (el-based single path); the select
// builders above stay thin wrappers over the generic buildSelect.
function buildLimitNote(message: string, atLimit: boolean): HTMLParagraphElement {
  return el('p', atLimit ? message : '');
}

function appendPlainField(
  set: HTMLElement,
  label: string,
  placeholder: string,
  value: string,
  onInput: (v: string) => void,
  type?: string,
): void {
  set.append(labeled(label, textInput(value, placeholder, onInput, type)));
}

function appendProfileField(
  set: HTMLElement,
  field: { key: keyof Profile; label: string; placeholder: string; type?: string },
  value: string,
  onInput: (v: string) => void,
): void {
  const isKana = field.key === 'lastNameKana' || field.key === 'firstNameKana';
  const hint = isKana ? el('p') : null;
  if (hint) hint.className = 'kana-preview';
  const syncHint = (v: string) => {
    if (hint) hint.textContent = v.trim() ? `ひらがな表示: ${kanaHiraganaHint(v)}` : '';
  };
  const input = textInput(value, field.placeholder, (v) => {
    onInput(v);
    syncHint(v);
  }, field.type);
  syncHint(value);
  set.append(labeled(field.label, input));
  if (hint) set.append(hint);
}

function renderProfilePage(profiles: Profile[], rerender: () => void): HTMLElement {
  const page = document.createElement('div');
  page.id = PROFILES_SECTION_ID;
  const heading = document.createElement('h2');
  heading.textContent = 'プロファイル';
  const cards = profiles.map((p, i) => {
    const set = cardFieldset(`プロファイル ${i + 1}`);
    appendPlainField(set, '名前（個人用・家族用など）', '個人用', p.label, (v) => { p.label = v; });
    for (const f of OPTIONS_PROFILE_FIELDS) {
      appendProfileField(set, f, p[f.key], (v) => { p[f.key] = v; });
    }
    set.append(labeled('性別（任意）', genderSelect(p.gender, (v) => { p.gender = v; })));
    const copy = actionButton('このプロファイルを複製', isAtLimit(profiles.length), () => {
      profiles.push({ ...p, id: newId(), label: `${p.label} のコピー` });
      rerender();
    });
    // The last profile stays deletable like the last address: an empty list
    // renders only the add button, and saving with zero profiles is blocked
    // with a message until one is added back.
    const remove = actionButton('このプロファイルを削除', false, () => {
      profiles.splice(i, 1);
      rerender();
    });
    set.append(copy, remove);
    return set;
  });
  const addProfile = actionButton('プロファイルを新規追加', isAtLimit(profiles.length), () => {
    profiles.push({ ...EMPTY_PROFILE, id: newId() });
    rerender();
  });
  const limitNote = buildLimitNote(`プロファイルは${MAX_ITEMS}件まで登録できます`, isAtLimit(profiles.length));
  const save = actionButton('保存', false, () => { void onSaveProfiles(); });
  const importButton = actionButton('フォームから取り込む', false, () => {
    void onImportDraft().catch(() => {
      showFloatError(['取り込みに失敗しました。フォームを開いているタブで実行してください。']);
      render();
    });
  });
  const footer = document.createElement('div');
  footer.className = 'row';
  footer.append(save, importButton);
  page.append(heading, ...cards, addProfile, ...(limitNote.textContent ? [limitNote] : []), footer);
  return page;
}

function renderAddressPage(addresses: Address[], profiles: Profile[], rerender: () => void): HTMLElement {
  const page = document.createElement('div');
  page.id = ADDRESSES_SECTION_ID;
  const heading = document.createElement('h2');
  heading.textContent = '住所';
  const cards = addresses.map((a, i) => {
    const set = cardFieldset();
    set.append(labeled('使うプロファイル', ownerSelect(a.profileId, (v) => { a.profileId = v; }, profiles)));
    for (const f of OPTIONS_ADDRESS_FIELDS.slice(0, 2)) {
      appendPlainField(set, f.label, f.placeholder, a[f.key], (v) => { a[f.key] = v; });
    }
    set.append(labeled(PREFECTURE_FIELD_LABEL, prefectureSelect(a.prefecture, (v) => { a.prefecture = v; })));
    for (const f of OPTIONS_ADDRESS_FIELDS.slice(2)) {
      appendPlainField(set, f.label, f.placeholder, a[f.key], (v) => { a[f.key] = v; });
    }
    const overseasTitle = document.createElement('h3');
    overseasTitle.textContent = '英語住所（任意）';
    set.append(overseasTitle);
    for (const f of OVERSEAS_FIELDS) {
      appendPlainField(set, f.label, f.placeholder, a[f.key] ?? '', (v) => { a[f.key] = v; });
    }
    const remove = actionButton('この住所を削除', false, () => {
      addresses.splice(i, 1);
      rerender();
    });
    set.append(remove);
    return set;
  });
  const add = actionButton('住所を追加', isAtLimit(addresses.length), () => {
    addresses.push({ ...EMPTY_ADDRESS, id: newId() });
    rerender();
  });
  const limitNote = buildLimitNote(`住所は${MAX_ITEMS}件まで登録できます`, isAtLimit(addresses.length));
  const save = actionButton('保存', false, () => { void onSaveAddresses(); });
  const importButton = actionButton('フォームから取り込む', false, () => {
    void onImportDraft().catch(() => {
      showFloatError(['取り込みに失敗しました。フォームを開いているタブで実行してください。']);
      render();
    });
  });
  const footer = document.createElement('div');
  footer.className = 'row';
  footer.append(save, importButton);
  page.append(heading, ...cards, add, ...(limitNote.textContent ? [limitNote] : []), footer);
  return page;
}

async function onTrialSave(): Promise<void> {
  // Same card-ensuring and blanks-only fill as the old trial input.
  const sampleP = makeSampleProfile();
  let first = state.profiles[0];
  if (!first) {
    first = { ...EMPTY_PROFILE, id: newId() };
    state.profiles.push(first);
  }
  for (const k of Object.keys(sampleP) as (keyof typeof sampleP)[]) {
    if ((first[k] ?? '').trim() === '' && sampleP[k] !== '') {
      (first[k] as string) = sampleP[k];
    }
  }
  const sampleA = makeSampleAddress();
  let firstAddress = state.addresses[0];
  if (!firstAddress) {
    firstAddress = { ...EMPTY_ADDRESS, id: newId(), label: '自宅' };
    state.addresses.push(firstAddress);
  }
  if (firstAddress.label.trim() === '') firstAddress.label = '自宅';
  for (const k of (['zip', 'prefecture', 'city', 'street', 'building'] as const)) {
    if ((firstAddress[k] ?? '').trim() === '' && sampleA[k] !== '') {
      firstAddress[k] = sampleA[k];
    }
  }
  // Both sides are validated before anything is written, so no unvalidated
  // value can reach storage from this path.
  const profiles = state.profiles.map(normalizeProfile);
  const addresses = state.addresses.map(normalizeAddress);
  const errors = [...profileErrorsFor(profiles), ...addressErrorsFor(addresses)];
  if (errors.length > 0) {
    showFloatError(errors);
    render();
    return;
  }
  state = { profiles, addresses };
  try {
    await saveData(state);
  } catch (e) {
    console.warn('[JushoAI] save failed', e);
    showFloatError(['保存に失敗しました。容量不足の可能性があります。']);
    render();
    return;
  }
  const savedProfile = profiles[0] ?? { ...EMPTY_PROFILE };
  const savedAddress = addresses[0] ?? { ...EMPTY_ADDRESS };
  showFloatToast([trialToastText(savedProfile, savedAddress)]);
  render();
}

function buildGuideNode(): HTMLElement {
  const wrap = el('div');
  const head = el('p');
  head.textContent = '初めてですか？架空の名前と住所で試せます';
  const trial = actionButton('架空の名前と住所を作って試す', false, () => { void onTrialSave(); });
  const toProfiles = actionButton('名前を登録する', false, () => setActivePage(PROFILES_SECTION_ID));
  const toAddresses = actionButton('住所を登録する', false, () => setActivePage(ADDRESSES_SECTION_ID));
  const x = actionButton('×', false, () => dismissGuideForSession());
  x.classList.add('float-close');
  const row = el('div');
  row.className = 'float-row';
  row.append(trial, toProfiles, toAddresses, x);
  wrap.append(head, row);
  return wrap;
}

function syncGuide(): void {
  const page = getActivePage();
  const relevant = page === PROFILES_SECTION_ID || page === ADDRESSES_SECTION_ID;
  if (!isGuideDismissed() && relevant && !hasValidProfile(state.profiles.map(normalizeProfile))) {
    showFloatGuide(buildGuideNode());
  } else {
    hideFloatGuide();
  }
}

function render() {
  const rerender = () => render();
  const profilePage = renderProfilePage(state.profiles, rerender);
  const addressPage = renderAddressPage(state.addresses, state.profiles, rerender);
  syncGuide();
  const title = document.createElement('h1');
  title.textContent = 'JushoAI 設定';

  app.replaceChildren(title, profilePage, addressPage, transferHolder);
  applyActivePage();
}

// PBI-127: ask the active tab's content script for the page draft, then run it
// through normalizeProfile/normalizeAddress + validate. Only the fields that
// pass become form values. The first card receives them when it is still
// blank (a new user's card); a card that already has values is never silently
// overwritten — the import creates a new card instead. Save stays a separate
// explicit step.
async function onImportDraft(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    showFloatError(['取り込み先のタブが見つかりません。フォームを開いているタブで実行してください。']);
    render();
    return;
  }
  const res = await chrome.tabs.sendMessage(tab.id, IMPORT_DRAFT_MESSAGE);
  if (!res || !res.ok) {
    showFloatError(['取り込めるフォームがありません。自動入力済みのフォームを開いてから実行してください。']);
    render();
    return;
  }
  const first = state.profiles[0];
  const blankProfile = first === undefined || OPTIONS_PROFILE_FIELDS.every((f) => (first[f.key] ?? '').trim() === '');
  const target = blankProfile ? first ?? { ...EMPTY_PROFILE, id: newId() } : { ...EMPTY_PROFILE, id: newId(), label: '新規' };
  const firstAddress = state.addresses[0];
  // The address label is not a form value — a card with only the default
  // label still counts as blank, so the import fills it instead of forking.
  const blankAddress = firstAddress === undefined
    || OPTIONS_ADDRESS_FIELDS.filter((f) => f.key !== 'label').every((f) => (firstAddress[f.key] ?? '').trim() === '');
  const targetAddress = blankAddress
    ? firstAddress ?? { ...EMPTY_ADDRESS, id: newId(), label: '自宅' }
    : { ...EMPTY_ADDRESS, id: newId(), label: '新規' };
  const targets = { target, targetAddress, blankProfile, blankAddress };
  const result = applyImportDraft(target, targetAddress, res.draft);
  if (result.taken === 0) {
    showFloatError(['取り込める項目がありません。氏名・住所が入力済みのフォームで実行してください。']);
    render();
    return;
  }
  const next = applyImportToState(state, targets, result);
  state.profiles = next.profiles;
  state.addresses = next.addresses;
  const lines = [
    `${result.taken}件を取り込みました。保存ボタンで確定します。`,
    ...(result.dropped > 0 ? [`${result.dropped}件は検証を通らず除外しました。`] : []),
  ];
  showFloatToast(lines);
  render();
}

const goProfiles = (): void => setActivePage(PROFILES_SECTION_ID);
const goAddresses = (): void => setActivePage(ADDRESSES_SECTION_ID);

async function onSaveProfiles() {
  const profiles = state.profiles.map(normalizeProfile);
  const errors = profileErrorsFor(profiles);
  if (profiles.length === 0) errors.push('プロファイルを1件以上登録してください');
  if (errors.length > 0) {
    showFloatError(errors);
    render();
    return;
  }
  state = { profiles, addresses: state.addresses };
  let storedAddresses = state.addresses;
  try {
    const latest = await loadData();
    storedAddresses = latest.addresses;
  } catch {
    storedAddresses = state.addresses;
  }
  try {
    await saveData({ profiles, addresses: storedAddresses });
  } catch (e) {
    console.warn('[JushoAI] save failed', e);
    showFloatError(['保存に失敗しました。容量不足の可能性があります。']);
    render();
    return;
  }
  if (hasValidAddress(state.addresses.map(normalizeAddress))) {
    showFloatToast(['保存しました']);
    render();
    return;
  }
  showFloatToast(['保存しました。次は住所を入力してください'], {
    label: '住所を入力する', onClick: goAddresses,
  });
  render();
}

async function onSaveAddresses() {
  const addresses = state.addresses.map(normalizeAddress);
  const errors = addressErrorsFor(addresses);
  if (addresses.length === 0) errors.push('住所を1件以上登録してください');
  if (errors.length > 0) {
    showFloatError(errors);
    render();
    return;
  }
  state = { profiles: state.profiles, addresses };
  let storedProfiles = state.profiles;
  try {
    const latest = await loadData();
    storedProfiles = latest.profiles;
  } catch {
    storedProfiles = state.profiles;
  }
  try {
    await saveData({ profiles: storedProfiles, addresses });
  } catch (e) {
    console.warn('[JushoAI] save failed', e);
    showFloatError(['保存に失敗しました。容量不足の可能性があります。']);
    render();
    return;
  }
  if (hasValidProfile(state.profiles.map(normalizeProfile))) {
    showFloatToast(['保存しました']);
    render();
    return;
  }
  showFloatToast(['保存しました。次はプロファイルを入力してください'], {
    label: 'プロファイルを入力する', onClick: goProfiles,
  });
  render();
}

// Read storage again and redraw. Used at boot and after an import rewrites
// storage behind the open page; unsaved card edits are discarded, like a
// manual reload.
async function reloadState(): Promise<void> {
  state = await loadData();
  if (state.profiles.length === 0) {
    state.profiles.push({ ...EMPTY_PROFILE, id: newId() });
  }
  if (state.addresses.length === 0) {
    state.addresses.push({ ...EMPTY_ADDRESS, id: newId(), label: '自宅' });
  }
  render();
}

// Boot and post-import re-reads must not swallow rejections (PBI-117 review):
// a failed first read used to leave a silently empty page, and a failed
// post-import re-read used to leave a stale 取り込みました. At boot state
// cannot come from storage, so the same empty cards reloadState would push
// are seeded and the failure surfaces as a notice.
const showReadFailure = (): void => {
  if (!state) {
    state = {
      profiles: [{ ...EMPTY_PROFILE, id: newId() }],
      addresses: [{ ...EMPTY_ADDRESS, id: newId(), label: '自宅' }],
    };
  }
  showFloatError(['保存済みのデータを読み込めませんでした。ページを再読み込みしてください。']);
  render();
};

void reloadState().catch(showReadFailure);

mountAiSection(document.getElementById('ai-app')!);
// Where JushoAI must not start is its own page: the list can grow, and the
// save button belongs with the list it saves.
mountExclusionSection(document.getElementById('exclusion-app')!);
// The taught correction layer is its own page: the list grows with each 教えた
// pair and the remove buttons belong with it.
mountMappingSection(document.getElementById('mapping-app')!);
// The audit log is its own page so it can grow without pushing the AI settings down.
const auditPage = document.createElement('div');
auditPage.id = AUDIT_SECTION_ID;
mountAuditSection(auditPage);
document.getElementById('audit-app')!.replaceChildren(auditPage);
// The transfer section lives at the bottom of the profile/address pages: the
// holder is created above and render() keeps re-appending it.
mountTransferSection(transferHolder, {
  ...defaultTransferDeps(),
  // An import writes storage behind the open page: re-read and redraw so the
  // cards show what was imported. The returned promise is awaited by the
  // transfer section, which shows the failure instead of leaving a stale
  // 取り込みました when the re-read rejects (PBI-117 review).
  onImported: async () => { await reloadState(); },
});
mountNav(document.getElementById('side')!);
// Side-nav clicks switch tabs via replaceState (no hashchange, no render),
// so sync floating-guide visibility here. Registered after mountNav, so the
// nav handler runs first and getActivePage() is already updated.
document.getElementById('side')!.querySelector('nav')!.addEventListener('click', () => {
  syncGuide();
});
// Tab switches do not re-render (nav only toggles visibility), so sync the
// floating guide here. Registered after mountNav; both listeners are
// synchronous and read the already-updated hash.
window.addEventListener('hashchange', () => {
  const page = getActivePage();
  const relevant = page === PROFILES_SECTION_ID || page === ADDRESSES_SECTION_ID;
  const empty = !hasValidProfile(state.profiles.map(normalizeProfile));
  if (!isGuideDismissed() && relevant && empty) {
    render();
  } else {
    hideFloatGuide();
  }
});
