// PBI-22 parity: pins profile/address card assembly (counts, order, labels,
// placeholders, button disabled states, limit notes) before extracting the
// common card builders. Order-dependent on purpose: the module-level `state`
// in main.ts persists across `it`s, so the steps walk 2 -> 3 -> 2 -> 1 ...
// like a user would. No mutation of src; DOM assertions only.
import { describe, it, expect, vi } from 'vitest';

if (!globalThis.crypto?.randomUUID) {
  const g = globalThis as unknown as { crypto: Crypto };
  const c = g.crypto ?? ({} as Crypto);
  (c as unknown as Record<string, unknown>).randomUUID ??= (() =>
    `00000000-0000-4000-8000-${Math.floor(Math.random() * 0xffffffffffff)
      .toString(16)
      .padStart(12, '0')}`) as unknown as Crypto['randomUUID'];
  g.crypto = c;
}

function makeProfile(id: string, label: string) {
  return {
    id, label,
    lastName: '', firstName: '', lastNameKana: '', firstNameKana: '',
    lastNameRomaji: '', firstNameRomaji: '', gender: '',
    birthday: '', school: '', department: '', email: '', tel: '',
  };
}

function makeAddress(id: string) {
  return {
    id, label: '自宅', profileId: '', zip: '', prefecture: '',
    city: '', street: '', building: '',
    country: '', address1: '', address2: '', address3: '',
    address4: '', postalCode: '',
  };
}

vi.mock('../../src/storage', () => ({
  newId: () => 'test-id',
  loadData: async () => ({
    profiles: [makeProfile('p1', 'A'), makeProfile('p2', 'B')],
    addresses: [makeAddress('a1')],
  }),
  saveData: async () => {},
}));

vi.mock('../../src/entrypoints/options/ai-section', () => ({
  mountAiSection: vi.fn(),
}));

document.body.innerHTML = '<div id="side"></div><main id="app"></main><main id="ai-app"></main><main id="audit-app"></main>';

await import('../../src/entrypoints/options/main');

// Lets the module-level `void loadData().then(...)` settle so `state` is set.
await new Promise((r) => setTimeout(r, 0));

const PROFILE_LABELS = [
  '名前（個人用・家族用など）',
  '姓', '名',
  'セイ（フリガナ・ふりがな入力可）', 'メイ（フリガナ・ふりがな入力可）',
  '姓（ローマ字・半角英字・任意）', '名（ローマ字・半角英字・任意）',
  '生年月日', '学校名', '学部・学科',
  'メールアドレス', '電話番号',
  '性別（任意）',
];

const ADDRESS_LABELS = [
  '使うプロファイル',
  '名前（自宅・勤務先など）', '郵便番号',
  '都道府県',
  '市区町村', '番地', '建物名・部屋番号（任意）',
  '国名（半角英数・任意）', '建物名（半角英数・任意）',
  '番地（半角英数・任意）', '市（半角英数・任意）',
  '州・地域（半角英数・任意）', '英語の郵便番号（半角英数・任意）',
];

const profileSection = () => document.getElementById('profiles')!;
const addressSection = () => document.getElementById('addresses')!;
const profileCards = () => [...profileSection().querySelectorAll('fieldset')];
const addressCards = () => [...addressSection().querySelectorAll('fieldset')];

function buttonsIn(root: ParentNode, text: string): HTMLButtonElement[] {
  return [...root.querySelectorAll('button')].filter(
    (b) => b.textContent === text,
  ) as HTMLButtonElement[];
}

function limitNote(section: HTMLElement): string {
  const p = [...section.querySelectorAll(':scope > p')].find((el) =>
    (el.textContent ?? '').includes('10件まで'),
  );
  return p?.textContent ?? '';
}

function labelTexts(card: HTMLFieldSetElement): string[] {
  return [...card.querySelectorAll('label')].map(
    (l) => l.querySelector('span')?.textContent ?? '',
  );
}

function placeholderTexts(card: HTMLFieldSetElement): (string | null)[] {
  return [...card.querySelectorAll('input')].map((i) => i.getAttribute('placeholder'));
}

describe('profile cards parity', () => {
  it('renders 2 cards with legends, label order, placeholders, and enabled buttons', () => {
    expect(profileCards()).toHaveLength(2);
    expect(profileCards().map((c) => c.querySelector('legend')?.textContent)).toEqual([
      'プロファイル 1',
      'プロファイル 2',
    ]);
    expect(labelTexts(profileCards()[0]!)).toEqual(PROFILE_LABELS);
    // First rows pin the input assembly (value/placeholder/type/autocomplete).
    const first = profileCards()[0]!.querySelectorAll('input');
    expect(first[0]!.value).toBe('A');
    expect(first[0]!.placeholder).toBe('個人用');
    expect(first[0]!.type).toBe('text');
    expect(first[0]!.autocomplete).toBe('off');
    expect(placeholderTexts(profileCards()[0]!)).toContain('yamada@example.com');
    expect(profileCards()[0]!.querySelector('input[type="email"]')).not.toBeNull();
    expect(profileCards()[0]!.querySelector('input[type="tel"]')).not.toBeNull();
    // Kana preview hints exist right after their rows, empty for empty input.
    const hints = profileCards()[0]!.querySelectorAll('p.kana-preview');
    expect(hints).toHaveLength(2);
    expect(hints[0]!.textContent).toBe('');
    for (const b of buttonsIn(profileSection(), 'このプロファイルを複製')) {
      expect(b.type).toBe('button');
      expect(b.disabled).toBe(false);
    }
    for (const b of buttonsIn(profileSection(), 'このプロファイルを削除')) {
      expect(b.disabled).toBe(false);
    }
    expect(buttonsIn(profileSection(), 'プロファイルを新規追加')).toHaveLength(1);
    expect(buttonsIn(profileSection(), 'プロファイルを新規追加')[0]!.disabled).toBe(false);
    expect(limitNote(profileSection())).toBe('');
  });

  it('duplicates the first profile (2 -> 3)', () => {
    buttonsIn(profileCards()[0]!, 'このプロファイルを複製')[0]!.click();
    expect(profileCards()).toHaveLength(3);
    expect(profileCards().map((c) => c.querySelector('legend')?.textContent)).toEqual([
      'プロファイル 1',
      'プロファイル 2',
      'プロファイル 3',
    ]);
    const inputs = profileCards()[2]!.querySelectorAll('input');
    expect(inputs[0]!.value).toBe('A のコピー');
  });

  it('deletes the first profile (3 -> 2)', () => {
    buttonsIn(profileCards()[0]!, 'このプロファイルを削除')[0]!.click();
    expect(profileCards()).toHaveLength(2);
    expect(profileCards().map((c) => c.querySelector('legend')?.textContent)).toEqual([
      'プロファイル 1',
      'プロファイル 2',
    ]);
    expect(limitNote(profileSection())).toBe('');
  });

  it('disables delete at a single profile', () => {
    buttonsIn(profileCards()[0]!, 'このプロファイルを削除')[0]!.click();
    expect(profileCards()).toHaveLength(1);
    expect(buttonsIn(profileSection(), 'このプロファイルを削除')[0]!.disabled).toBe(true);
  });

  it('adds a profile back (1 -> 2)', () => {
    buttonsIn(profileSection(), 'プロファイルを新規追加')[0]!.click();
    expect(profileCards()).toHaveLength(2);
    expect(buttonsIn(profileSection(), 'このプロファイルを削除')[0]!.disabled).toBe(false);
  });

  it('disables add/duplicate and shows the note at 10 profiles', () => {
    while (profileCards().length < 10) {
      buttonsIn(profileSection(), 'プロファイルを新規追加')[0]!.click();
    }
    expect(profileCards()).toHaveLength(10);
    expect(buttonsIn(profileSection(), 'プロファイルを新規追加')[0]!.disabled).toBe(true);
    for (const b of buttonsIn(profileSection(), 'このプロファイルを複製')) {
      expect(b.disabled).toBe(true);
    }
    expect(limitNote(profileSection())).toBe('プロファイルは10件まで登録できます');
  });

  it('re-enables add and hides the note after deleting one (10 -> 9), then trims to 2', () => {
    buttonsIn(profileCards()[0]!, 'このプロファイルを削除')[0]!.click();
    expect(profileCards()).toHaveLength(9);
    expect(buttonsIn(profileSection(), 'プロファイルを新規追加')[0]!.disabled).toBe(false);
    for (const b of buttonsIn(profileSection(), 'このプロファイルを複製')) {
      expect(b.disabled).toBe(false);
    }
    expect(limitNote(profileSection())).toBe('');
    while (profileCards().length > 2) {
      buttonsIn(profileCards()[0]!, 'このプロファイルを削除')[0]!.click();
    }
    expect(profileCards()).toHaveLength(2);
  });
});

describe('address cards parity', () => {
  it('renders 1 card with the exact row order and no legend', () => {
    expect(addressCards()).toHaveLength(1);
    const card = addressCards()[0]!;
    expect(card.querySelector('legend')).toBeNull();
    expect(labelTexts(card)).toEqual(ADDRESS_LABELS);
    expect(card.querySelector('h3')?.textContent).toBe('英語住所（任意）');
    // Split-field order: label/zip, then prefecture select, then city/street/building.
    const labels = labelTexts(card);
    expect(labels.indexOf('郵便番号')).toBeLessThan(labels.indexOf('都道府県'));
    expect(labels.indexOf('都道府県')).toBeLessThan(labels.indexOf('市区町村'));
    expect(card.querySelector('select')).not.toBeNull();
    expect(placeholderTexts(card)).toContain('1000001');
    expect(placeholderTexts(card)).toContain('11375');
    const remove = buttonsIn(card, 'この住所を削除');
    expect(remove).toHaveLength(1);
    expect(remove[0]!.type).toBe('button');
    expect(remove[0]!.disabled).toBe(false);
    expect(buttonsIn(addressSection(), '住所を追加')[0]!.disabled).toBe(false);
    expect(limitNote(addressSection())).toBe('');
  });

  it('adds an address (1 -> 2) keeping row order', () => {
    buttonsIn(addressSection(), '住所を追加')[0]!.click();
    expect(addressCards()).toHaveLength(2);
    for (const card of addressCards()) {
      expect(labelTexts(card)).toEqual(ADDRESS_LABELS);
    }
  });

  it('deletes the first address (2 -> 1)', () => {
    buttonsIn(addressCards()[0]!, 'この住所を削除')[0]!.click();
    expect(addressCards()).toHaveLength(1);
    expect(limitNote(addressSection())).toBe('');
  });

  it('disables add and shows the note at 10 addresses, then restores at 9', () => {
    while (addressCards().length < 10) {
      buttonsIn(addressSection(), '住所を追加')[0]!.click();
    }
    expect(addressCards()).toHaveLength(10);
    expect(buttonsIn(addressSection(), '住所を追加')[0]!.disabled).toBe(true);
    expect(limitNote(addressSection())).toBe('住所は10件まで登録できます');
    // Profile side is untouched by address growth.
    expect(profileCards()).toHaveLength(2);
    buttonsIn(addressCards()[0]!, 'この住所を削除')[0]!.click();
    expect(addressCards()).toHaveLength(9);
    expect(buttonsIn(addressSection(), '住所を追加')[0]!.disabled).toBe(false);
    expect(limitNote(addressSection())).toBe('');
    while (addressCards().length > 1) {
      buttonsIn(addressCards()[0]!, 'この住所を削除')[0]!.click();
    }
    expect(addressCards()).toHaveLength(1);
    expect(labelTexts(addressCards()[0]!)).toEqual(ADDRESS_LABELS);
  });
});
