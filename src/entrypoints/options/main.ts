import { PREFECTURES } from '../../core/prefectures';
import {
  normalizeAddress, normalizeProfile, validateAddress, validateProfile,
} from '../../core/profile';
import type { Address, Profile, StoredData } from '../../core/types';
import { loadData, saveData } from '../../storage';
import { labeled, textInput } from './dom';
import { mountAiSection } from './ai-section';

const PROFILE_FIELDS: { key: keyof Profile; label: string; placeholder: string; type?: string }[] = [
  { key: 'lastName', label: '姓', placeholder: '山田' },
  { key: 'firstName', label: '名', placeholder: '太郎' },
  { key: 'lastNameKana', label: 'セイ（全角カナ）', placeholder: 'ヤマダ' },
  { key: 'firstNameKana', label: 'メイ（全角カナ）', placeholder: 'タロウ' },
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

const app = document.getElementById('app')!;
let state: StoredData;

function prefectureSelect(value: string, onChange: (v: string) => void) {
  const select = document.createElement('select');
  for (const p of ['', ...PREFECTURES]) {
    const o = document.createElement('option');
    o.value = p;
    o.textContent = p || '選択してください';
    o.selected = p === value;
    select.append(o);
  }
  select.addEventListener('change', () => onChange(select.value));
  return select;
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

  const profileSet = document.createElement('fieldset');
  const profileLegend = document.createElement('legend');
  profileLegend.textContent = 'プロファイル';
  profileSet.append(profileLegend);
  for (const f of PROFILE_FIELDS) {
    profileSet.append(
      labeled(f.label, textInput(state.profile[f.key], f.placeholder, (v) => { state.profile[f.key] = v; }, f.type)),
    );
  }

  const addressHeading = document.createElement('h2');
  addressHeading.textContent = '住所';
  const addressCards = state.addresses.map((a, i) => {
    const set = document.createElement('fieldset');
    for (const f of ADDRESS_FIELDS.slice(0, 2)) {
      set.append(labeled(f.label, textInput(a[f.key], f.placeholder, (v) => { a[f.key] = v; })));
    }
    set.append(labeled('都道府県', prefectureSelect(a.prefecture, (v) => { a.prefecture = v; })));
    for (const f of ADDRESS_FIELDS.slice(2)) {
      set.append(labeled(f.label, textInput(a[f.key], f.placeholder, (v) => { a[f.key] = v; })));
    }
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'この住所を削除';
    remove.addEventListener('click', () => {
      state.addresses.splice(i, 1);
      render();
    });
    set.append(remove);
    return set;
  });

  const add = document.createElement('button');
  add.type = 'button';
  add.textContent = '住所を追加';
  add.addEventListener('click', () => {
    state.addresses.push({
      id: crypto.randomUUID(), label: '', zip: '', prefecture: '', city: '', street: '', building: '',
    });
    render();
  });

  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'primary';
  save.textContent = '保存';
  save.addEventListener('click', onSave);

  const actions = document.createElement('div');
  actions.className = 'row';
  actions.append(add, save);

  app.replaceChildren(title, profileSet, addressHeading, ...addressCards, actions, ...(notice ? [notice] : []));
}

async function onSave() {
  const profile = normalizeProfile(state.profile);
  const addresses = state.addresses.map(normalizeAddress);
  const errors = [
    ...validateProfile(profile),
    ...addresses.flatMap((a) => validateAddress(a).map((e) => `${a.label || '住所'}: ${e}`)),
  ];
  if (addresses.length === 0) errors.push('住所を1件以上登録してください');
  if (errors.length > 0) {
    render(message('errors', errors));
    return;
  }
  state = { profile, addresses };
  await saveData(state);
  render(message('saved', ['保存しました']));
}

void loadData().then((data) => {
  state = data;
  if (state.addresses.length === 0) {
    state.addresses.push({
      id: crypto.randomUUID(), label: '自宅', zip: '', prefecture: '', city: '', street: '', building: '',
    });
  }
  render();
});

mountAiSection(document.getElementById('ai-app')!);
