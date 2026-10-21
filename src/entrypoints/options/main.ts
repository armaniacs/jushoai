import { GENDERS } from '../../core/genders';
import { PREFECTURES } from '../../core/prefectures';
import {
  normalizeAddress, normalizeProfile, validateAddress, validateProfile,
} from '../../core/profile';
import { EMPTY_ADDRESS, EMPTY_PROFILE } from '../../core/types';
import type { Address, Profile, StoredData } from '../../core/types';
import { loadData, newId, saveData } from '../../storage';
import { el, labeled, textInput, kanaHiraganaHint, isAtLimit, MAX_ITEMS, buildSelect, cardFieldset, actionButton } from './dom';
import { mountAiSection } from './ai-section';
import { mountAuditSection } from './audit-section';
import { mountExclusionSection } from './exclusion-section';
import { defaultTransferDeps, mountTransferSection } from './transfer-section';
import { mountNav, applyActivePage, PROFILES_SECTION_ID, ADDRESSES_SECTION_ID, AUDIT_SECTION_ID } from './nav';

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
  { key: 'companyName', label: '会社名（任意）', placeholder: '株式会社サンプル' },
  { key: 'companyDepartment', label: '会社の部署（任意）', placeholder: '開発部' },
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

function message(kind: 'errors' | 'saved', lines: string[]): HTMLElement {
  if (kind === 'saved') {
    const p = el('p', lines[0] ?? '');
    p.className = 'saved';
    return p;
  }
  const ul = el('ul');
  ul.className = 'errors';
  ul.append(...lines.map((t) => el('li', t)));
  return ul;
}

function renderProfilePage(profiles: Profile[], rerender: () => void): HTMLElement {
  const page = document.createElement('div');
  page.id = PROFILES_SECTION_ID;
  const heading = document.createElement('h2');
  heading.textContent = 'プロファイル';
  const cards = profiles.map((p, i) => {
    const set = cardFieldset(`プロファイル ${i + 1}`);
    appendPlainField(set, '名前（個人用・家族用など）', '個人用', p.label, (v) => { p.label = v; });
    for (const f of PROFILE_FIELDS) {
      appendProfileField(set, f, p[f.key], (v) => { p[f.key] = v; });
    }
    set.append(labeled('性別（任意）', genderSelect(p.gender, (v) => { p.gender = v; })));
    const copy = actionButton('このプロファイルを複製', isAtLimit(profiles.length), () => {
      profiles.push({ ...p, id: newId(), label: `${p.label} のコピー` });
      rerender();
    });
    const remove = actionButton('このプロファイルを削除', profiles.length <= 1, () => {
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
  page.append(heading, ...cards, addProfile, ...(limitNote.textContent ? [limitNote] : []));
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
  page.append(heading, ...cards, add, ...(limitNote.textContent ? [limitNote] : []));
  return page;
}

function render(notice?: HTMLElement) {
  const title = document.createElement('h1');
  title.textContent = 'JushoAI 設定';

  const rerender = () => render();
  const profilePage = renderProfilePage(state.profiles, rerender);
  const addressPage = renderAddressPage(state.addresses, state.profiles, rerender);

  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'primary';
  save.textContent = '保存';
  save.addEventListener('click', onSave);

  const footer = document.createElement('div');
  footer.className = 'row';
  footer.append(save);

  app.replaceChildren(
    title, profilePage, addressPage, footer, transferHolder, ...(notice ? [notice] : []),
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
  try {
    await saveData(state);
  } catch (e) {
    // PBI-23: storage境界は型付きエラーで失敗を伝える。ここで受けて保存失敗を
    // 表示する（成功誤表示の防止）。詳細はメッセージに出さず件数のみ。
    console.warn('[JushoAI] save failed', e);
    render(message('errors', ['保存に失敗しました。容量不足の可能性があります。']));
    return;
  }
  render(message('saved', ['保存しました']));
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
  render(message('errors', ['保存済みのデータを読み込めませんでした。ページを再読み込みしてください。']));
};

void reloadState().catch(showReadFailure);

mountAiSection(document.getElementById('ai-app')!);
// Where JushoAI must not start is its own page: the list can grow, and the
// save button belongs with the list it saves.
mountExclusionSection(document.getElementById('exclusion-app')!);
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
