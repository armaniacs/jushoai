import { GENDERS } from '../../core/genders';
import { PREFECTURES } from '../../core/prefectures';
import {
  normalizeAddress, normalizeProfile, validateAddress, validateProfile,
} from '../../core/profile';
import { EMPTY_ADDRESS, EMPTY_PROFILE } from '../../core/types';
import type { Address, Profile, StoredData } from '../../core/types';
import { loadData, saveData } from '../../storage';
import { labeled, textInput, kanaHiraganaHint } from './dom';
import { mountAiSection } from './ai-section';
import { mountNav, applyActivePage, PROFILES_SECTION_ID, ADDRESSES_SECTION_ID } from './nav';

const PROFILE_FIELDS: { key: keyof Profile; label: string; placeholder: string; type?: string }[] = [
  { key: 'lastName', label: '姓', placeholder: '山田' },
  { key: 'firstName', label: '名', placeholder: '太郎' },
  { key: 'lastNameKana', label: 'セイ（フリガナ・ふりがな入力可）', placeholder: 'ヤマダ' },
  { key: 'firstNameKana', label: 'メイ（フリガナ・ふりがな入力可）', placeholder: 'タロウ' },
  { key: 'lastNameRomaji', label: '姓（ローマ字・半角英字・任意）', placeholder: 'Yamada' },
  { key: 'firstNameRomaji', label: '名（ローマ字・半角英字・任意）', placeholder: 'Taro' },
  { key: 'birthday', label: '生年月日', placeholder: '1990-05-07' },
  { key: 'school', label: '学校名', placeholder: '都立日比谷高校' },
  { key: 'department', label: '学部・学科', placeholder: '普通科' },
  { key: 'email', label: 'メールアドレス', placeholder: 'yamada@example.com', type: 'email' },
  { key: 'tel', label: '電話番号', placeholder: '09012345678', type: 'tel' },
];

const ADDRESS_FIELDS: { key: Exclude<keyof Address, 'id' | 'prefecture'>; label: string; placeholder: string }[] = [
  { key: 'label', label: '名前（自宅・勤務先など）', placeholder: '自宅' },
  { key: 'zip', label: '郵便番号', placeholder: '1000001' },
  { key: 'city', label: '市区町村', placeholder: '千代田区' },
  { key: 'street', label: '番地', placeholder: '千代田1-1' },
  { key: 'building', label: '建物名・部屋番号（任意）', placeholder: '千代田ビル101' },
];

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

interface SelectEntry {
  value: string;
  text: string;
  selected: boolean;
}

function buildSelect(onChange: (v: string) => void, entries: SelectEntry[]) {
  const select = document.createElement('select');
  for (const e of entries) {
    const o = document.createElement('option');
    o.value = e.value;
    o.textContent = e.text;
    o.selected = e.selected;
    select.append(o);
  }
  select.addEventListener('change', () => onChange(select.value));
  return select;
}

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

export function ownerSelect(value: string, onChange: (v: string) => void) {
  return buildSelect(onChange, [
    { value: '', text: '共通（どのプロファイルでも使う）', selected: value === '' },
    ...state.profiles.map((p, i) => ({
      value: p.id,
      text: p.label || `プロファイル ${i + 1}`,
      selected: p.id !== '' && p.id === value,
    })),
  ]);
}

// Shared card assembly for the profile/address loops below. These move the
// existing construction code verbatim: same elements, text, placeholders,
// order, and attributes. Only the select builders above keep their own logic.
function cardFieldset(legendText?: string): HTMLFieldSetElement {
  const set = document.createElement('fieldset');
  if (legendText !== undefined) {
    const legend = document.createElement('legend');
    legend.textContent = legendText;
    set.append(legend);
  }
  return set;
}

function actionButton(label: string, disabled: boolean, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener('click', onClick);
  return button;
}

function buildLimitNote(message: string, atLimit: boolean): HTMLParagraphElement {
  const note = document.createElement('p');
  note.textContent = atLimit ? message : '';
  return note;
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
  const hint = isKana ? document.createElement('p') : null;
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

function message(kind: 'errors' | 'saved', lines: string[]): HTMLElement {
  if (kind === 'saved') {
    const p = document.createElement('p');
    p.className = 'saved';
    p.textContent = lines[0] ?? null;
    return p;
  }
  const ul = document.createElement('ul');
  ul.className = 'errors';
  ul.append(...lines.map((t) => Object.assign(document.createElement('li'), { textContent: t })));
  return ul;
}

function render(notice?: HTMLElement) {
  const title = document.createElement('h1');
  title.textContent = 'JushoAI 設定';

  const profileHeading = document.createElement('h2');
  profileHeading.textContent = 'プロファイル';

  const profileCards = state.profiles.map((p, i) => {
    const set = cardFieldset(`プロファイル ${i + 1}`);
    appendPlainField(set, '名前（個人用・家族用など）', '個人用', p.label, (v) => { p.label = v; });
    for (const f of PROFILE_FIELDS) {
      appendProfileField(set, f, p[f.key], (v) => { p[f.key] = v; });
    }
    set.append(labeled('性別（任意）', genderSelect(p.gender, (v) => { p.gender = v; })));
    const copy = actionButton('このプロファイルを複製', state.profiles.length >= 10, () => {
      state.profiles.push({ ...p, id: crypto.randomUUID(), label: `${p.label} のコピー` });
      render();
    });
    const remove = actionButton('このプロファイルを削除', state.profiles.length <= 1, () => {
      state.profiles.splice(i, 1);
      render();
    });
    set.append(copy, remove);
    return set;
  });

  const addProfile = actionButton('プロファイルを新規追加', state.profiles.length >= 10, () => {
    state.profiles.push({ ...EMPTY_PROFILE, id: crypto.randomUUID() });
    render();
  });
  const limitNote = buildLimitNote('プロファイルは10件まで登録できます', state.profiles.length >= 10);

  const addressHeading = document.createElement('h2');
  addressHeading.textContent = '住所';
  const addressCards = state.addresses.map((a, i) => {
    const set = cardFieldset();
    set.append(labeled('使うプロファイル', ownerSelect(a.profileId, (v) => { a.profileId = v; })));
    for (const f of ADDRESS_FIELDS.slice(0, 2)) {
      appendPlainField(set, f.label, f.placeholder, a[f.key], (v) => { a[f.key] = v; });
    }
    set.append(labeled('都道府県', prefectureSelect(a.prefecture, (v) => { a.prefecture = v; })));
    for (const f of ADDRESS_FIELDS.slice(2)) {
      appendPlainField(set, f.label, f.placeholder, a[f.key], (v) => { a[f.key] = v; });
    }
    const overseasTitle = document.createElement('h3');
    overseasTitle.textContent = '英語住所（任意）';
    set.append(overseasTitle);
    for (const f of OVERSEAS_FIELDS) {
      appendPlainField(set, f.label, f.placeholder, a[f.key] ?? '', (v) => { a[f.key] = v; });
    }
    const remove = actionButton('この住所を削除', false, () => {
      state.addresses.splice(i, 1);
      render();
    });
    set.append(remove);
    return set;
  });

  const add = actionButton('住所を追加', state.addresses.length >= 10, () => {
    state.addresses.push({ ...EMPTY_ADDRESS, id: crypto.randomUUID() });
    render();
  });
  const addressLimitNote = buildLimitNote('住所は10件まで登録できます', state.addresses.length >= 10);

  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'primary';
  save.textContent = '保存';
  save.addEventListener('click', onSave);

  const footer = document.createElement('div');
  footer.className = 'row';
  footer.append(save);

  const profilePage = document.createElement('div');
  profilePage.id = PROFILES_SECTION_ID;
  profilePage.append(
    profileHeading, ...profileCards, addProfile,
    ...(limitNote.textContent ? [limitNote] : []),
  );
  const addressPage = document.createElement('div');
  addressPage.id = ADDRESSES_SECTION_ID;
  addressPage.append(
    addressHeading, ...addressCards, add,
    ...(addressLimitNote.textContent ? [addressLimitNote] : []),
  );

  app.replaceChildren(
    title, profilePage, addressPage, footer, ...(notice ? [notice] : []),
  );
  applyActivePage();
}

async function onSave() {
  const profiles = state.profiles.map(normalizeProfile);
  const addresses = state.addresses.map(normalizeAddress);
  const errors = [
    ...profiles.flatMap((p, i) => validateProfile(p).map((e) => `${p.label || `プロファイル${i + 1}`}: ${e}`)),
    ...addresses.flatMap((a) => validateAddress(a).map((e) => `${a.label || '住所'}: ${e}`)),
  ];
  if (profiles.length === 0) errors.push('プロファイルを1件以上登録してください');
  if (addresses.length === 0) errors.push('住所を1件以上登録してください');
  if (errors.length > 0) {
    render(message('errors', errors));
    return;
  }
  state = { profiles, addresses };
  await saveData(state);
  render(message('saved', ['保存しました']));
}

void loadData().then((data) => {
  state = data;
  if (state.profiles.length === 0) {
    state.profiles.push({ ...EMPTY_PROFILE, id: crypto.randomUUID() });
  }
  if (state.addresses.length === 0) {
    state.addresses.push({ ...EMPTY_ADDRESS, id: crypto.randomUUID(), label: '自宅' });
  }
  render();
});

mountAiSection(document.getElementById('ai-app')!);
mountNav(document.getElementById('side')!);
