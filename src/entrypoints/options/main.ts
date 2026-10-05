import { PREFECTURES } from '../../core/prefectures';
import {
  normalizeAddress, normalizeProfile, validateAddress, validateProfile,
} from '../../core/profile';
import { EMPTY_PROFILE } from '../../core/types';
import type { Address, Profile, StoredData } from '../../core/types';
import { loadData, saveData } from '../../storage';
import { labeled, textInput, kanaHiraganaHint } from './dom';
import { mountAiSection } from './ai-section';

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

  const profileCards = state.profiles.map((p, i) => {
    const set = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = `プロファイル ${i + 1}`;
    set.append(legend);
    set.append(labeled('名前（個人用・テスト用など）', textInput(p.label, '個人用', (v) => { p.label = v; })));
    for (const f of PROFILE_FIELDS) {
      const isKana = f.key === 'lastNameKana' || f.key === 'firstNameKana';
      const hint = isKana ? document.createElement('p') : null;
      if (hint) hint.className = 'kana-preview';
      const syncHint = (v: string) => {
        if (hint) hint.textContent = v.trim() ? `ひらがな表示: ${kanaHiraganaHint(v)}` : '';
      };
      const input = textInput(p[f.key], f.placeholder, (v) => {
        p[f.key] = v;
        syncHint(v);
      }, f.type);
      syncHint(p[f.key]);
      set.append(labeled(f.label, input));
      if (hint) set.append(hint);
    }
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'このプロファイルを複製';
    copy.disabled = state.profiles.length >= 10;
    copy.addEventListener('click', () => {
      state.profiles.push({ ...p, id: crypto.randomUUID(), label: `${p.label} のコピー` });
      render();
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'このプロファイルを削除';
    remove.disabled = state.profiles.length <= 1;
    remove.addEventListener('click', () => {
      state.profiles.splice(i, 1);
      render();
    });
    set.append(copy, remove);
    return set;
  });

  const addProfile = document.createElement('button');
  addProfile.type = 'button';
  addProfile.textContent = 'プロファイルを新規追加';
  addProfile.disabled = state.profiles.length >= 10;
  addProfile.addEventListener('click', () => {
    state.profiles.push({ ...EMPTY_PROFILE, id: crypto.randomUUID() });
    render();
  });
  const limitNote = document.createElement('p');
  limitNote.textContent = state.profiles.length >= 10 ? 'プロファイルは10件まで登録できます' : '';

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
  actions.append(addProfile, add, save);

  app.replaceChildren(
    title, ...profileCards, addProfile,
    ...(limitNote.textContent ? [limitNote] : []),
    addressHeading, ...addressCards, actions, ...(notice ? [notice] : []),
  );
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
    state.addresses.push({
      id: crypto.randomUUID(), label: '自宅', zip: '', prefecture: '', city: '', street: '', building: '',
    });
  }
  render();
});

mountAiSection(document.getElementById('ai-app')!);
