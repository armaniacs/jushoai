# First-time Sample Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let first-time users fill blank cards with random fictitious Japanese data and save it through the normal per-page flow.

**Architecture:** Add a zero-dependency pure generator `src/core/sample-data.ts` (paired name/kana/romaji tables plus validation-safe address parts) covered by `tests/core/sample-data.test.ts`, then show a first-time banner on both options pages that fills only blank fields and never autosaves. Faker is intentionally not used: same shaping code would be needed anyway plus about 1MB of bundle.

**Tech Stack:** TypeScript, WXT options entrypoint, Vitest.

---

## File structure

- Create: `src/core/sample-data.ts` — pure `makeSampleProfile`/`makeSampleAddress` plus tables (no DOM, no chrome APIs, no imports except types, `PREFECTURES`, `GENDERS`).
- Test: `tests/core/sample-data.test.ts` — validation-pass, format, membership, and variety tests.
- Modify: `src/entrypoints/options/main.ts` — first-time banner on both pages plus a fill-blanks-only handler (reuses `hasValidProfile` from Plan A when present).

Prerequisite: Plan A (`2026-10-28-options-save-split.md`) merged is preferred because the banner reuses its `hasValidProfile`. If it is not merged yet, replace that import with the inline one-liner shown in Task 2 Step 1.

---

### Task 1: Generator with failing tests

**Files:**
- Create: `src/core/sample-data.ts`
- Test: `tests/core/sample-data.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { PREFECTURES } from '../../src/core/prefectures';
import { normalizeAddress, normalizeProfile, validateAddress, validateProfile } from '../../src/core/profile';
import type { Address, Profile } from '../../src/core/types';
import { makeSampleAddress, makeSampleProfile } from '../../src/core/sample-data';

const asProfile = (s: Omit<Profile, 'id'>): Profile => ({ ...s, id: 'test' });
const asAddress = (s: Omit<Address, 'id' | 'profileId'>): Address => ({ ...s, id: 'test', profileId: '' });

describe('sample-data', () => {
  it('always passes save validation', () => {
    for (let i = 0; i < 50; i++) {
      const p = normalizeProfile(asProfile(makeSampleProfile()));
      const a = normalizeAddress(asAddress(makeSampleAddress()));
      expect(validateProfile(p)).toEqual([]);
      expect(validateAddress(a)).toEqual([]);
    }
  });

  it('uses katakana kana, a formal prefecture name, and safe formats', () => {
    const p = makeSampleProfile();
    const a = makeSampleAddress();
    expect(p.lastNameKana).toMatch(/^[ァ-ヶー]+$/);
    expect(p.firstNameKana).toMatch(/^[ァ-ヶー]+$/);
    expect((PREFECTURES as readonly string[])).toContain(a.prefecture);
    expect(a.zip).toMatch(/^\d{7}$/);
    expect(p.tel).toMatch(/^\d{10,11}$/);
    expect(p.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(p.birthday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('produces different people on repeat', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const p = makeSampleProfile();
      seen.add(`${p.lastName}-${p.firstName}-${p.birthday}-${p.tel}`);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/sample-data.test.ts`
Expected: FAIL with "Failed to resolve import" (module does not exist yet).

- [ ] **Step 3: Write minimal implementation**

```ts
import { GENDERS } from './genders';
import { PREFECTURES } from './prefectures';
import type { Address, Profile } from './types';

type Rand = () => number;

function defaultRand(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] as number) / 0x100000000;
}

const pick = <T>(rand: Rand, list: readonly T[]): T =>
  list[Math.floor(rand() * list.length)] as T;

const SURNAMES = [
  ['山田', 'ヤマダ', 'Yamada'], ['佐藤', 'サトウ', 'Sato'], ['鈴木', 'スズキ', 'Suzuki'],
  ['高橋', 'タカハシ', 'Takahashi'], ['田中', 'タナカ', 'Tanaka'], ['渡辺', 'ワタナベ', 'Watanabe'],
  ['山本', 'ヤマモト', 'Yamamoto'], ['中村', 'ナカムラ', 'Nakamura'], ['小林', 'コバヤシ', 'Kobayashi'],
  ['加藤', 'カトウ', 'Kato'], ['吉田', 'ヨシダ', 'Yoshida'], ['山下', 'ヤマシタ', 'Yamashita'],
  ['松本', 'マツモト', 'Matsumoto'], ['井上', 'イノウエ', 'Inoue'], ['木村', 'キムラ', 'Kimura'],
  ['林', 'ハヤシ', 'Hayashi'], ['斎藤', 'サイトウ', 'Saito'], ['清水', 'シミズ', 'Shimizu'],
  ['森', 'モリ', 'Mori'], ['岡田', 'オカダ', 'Okada'],
] as const;

const GIVEN = [
  ['太郎', 'タロウ', 'Taro'], ['花子', 'ハナコ', 'Hanako'], ['健太', 'ケンタ', 'Kenta'],
  ['美咲', 'ミサキ', 'Misaki'], ['翔太', 'ショウタ', 'Shota'], ['葵', 'アオイ', 'Aoi'],
  ['蓮', 'レン', 'Ren'], ['陽菜', 'ヒナ', 'Hina'], ['大輔', 'ダイスケ', 'Daisuke'],
  ['恵子', 'ケイコ', 'Keiko'], ['拓也', 'タクヤ', 'Takuya'], ['真由美', 'マユミ', 'Mayumi'],
  ['亮', 'リョウ', 'Ryo'], ['楓', 'カエデ', 'Kaede'], ['颯太', 'ソウタ', 'Sota'],
  ['結衣', 'ユイ', 'Yui'], ['和也', 'カズヤ', 'Kazuya'], ['沙織', 'サオリ', 'Saori'],
  ['直樹', 'ナオキ', 'Naoki'], ['千尋', 'チヒロ', 'Chihiro'],
] as const;

const CITIES = [
  '千代田区', '港区', '新宿区', '横浜市港北区', '川崎市中原区', 'さいたま市大宮区',
  '千葉市中央区', '大阪市北区', '神戸市中央区', '京都市中京区', '名古屋市中区',
  '札幌市中央区', '仙台市青葉区', '広島市中区', '福岡市博多区', '那覇市',
] as const;

const STREETS = [
  '千代田1-1', '梅田2-3-4', '本町3-5-6', '中央1-2-3', '駅前4-5-6',
  '旭町2-1-8', '桜木町1-5-2', '錦町3-3-3',
] as const;

const BUILDINGS = ['', 'サンプルビル101', 'グリーンハイツ203', 'サンライズマンション301'] as const;

const digits = (rand: Rand, n: number): string =>
  Array.from({ length: n }, () => Math.floor(rand() * 10)).join('');

export function makeSampleProfile(rand: Rand = defaultRand): Omit<Profile, 'id'> {
  const [lastName, lastNameKana, lastNameRomaji] = pick(rand, SURNAMES);
  const [firstName, firstNameKana, firstNameRomaji] = pick(rand, GIVEN);
  const year = 1960 + Math.floor(rand() * 51);
  const month = 1 + Math.floor(rand() * 12);
  const day = 1 + Math.floor(rand() * 28);
  const telHead = pick(rand, ['090', '080', '070'] as const);
  const serial = 1000 + Math.floor(rand() * 9000);
  return {
    label: 'お試し',
    lastName,
    firstName,
    lastNameKana,
    firstNameKana,
    lastNameRomaji,
    firstNameRomaji,
    gender: pick(rand, GENDERS),
    birthday: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    school: '',
    department: '',
    companyName: '',
    companyDepartment: '',
    companyNameKana: '',
    email: `${lastNameRomaji.toLowerCase()}.${firstNameRomaji.toLowerCase()}${serial}@example.com`,
    tel: `${telHead}${digits(rand, 8)}`,
  };
}

export function makeSampleAddress(rand: Rand = defaultRand): Omit<Address, 'id' | 'profileId'> {
  return {
    label: '自宅',
    zip: digits(rand, 7),
    prefecture: pick(rand, PREFECTURES),
    city: pick(rand, CITIES),
    street: pick(rand, STREETS),
    building: pick(rand, BUILDINGS),
    country: '',
    address1: '',
    address2: '',
    address3: '',
    address4: '',
    postalCode: '',
  };
}
```

Day uses 1-28 so every generated birthday is a real calendar date.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/sample-data.test.ts`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add src/core/sample-data.ts tests/core/sample-data.test.ts
git commit -m "feat(core): add fictitious first-time sample generator"
```

### Task 2: First-time banner plus fill-blanks handler in main.ts

**Files:**
- Modify: `src/entrypoints/options/main.ts`

Context for the engineer: `render()` builds `profilePage` and `addressPage`. When no valid profile exists, both pages get a banner at the top with an お試し入力 button. The handler fills only blank fields of the first profile and first address cards, then shows a notice telling the user to press 保存. It never writes storage directly.

- [ ] **Step 1: Add imports**

```ts
import { makeSampleAddress, makeSampleProfile } from '../../core/sample-data';
import { hasValidProfile } from './save-guide';
```

If Plan A is not merged yet, use this inline fallback instead of the second line:

```ts
const hasValidProfileFallback = (profiles: Profile[]): boolean =>
  profiles.map(normalizeProfile).some((p) => validateProfile(p).length === 0);
```

and call `hasValidProfileFallback` where this plan says `hasValidProfile`. `normalizeProfile`, `validateProfile`, and the `Profile`/`Address` types are already imported in `main.ts`.

- [ ] **Step 2: Add the fill-blanks handler inside render()**

Place this inside `render()`, before `app.replaceChildren`, so it closes over `state` and `render`:

```ts
const fillBlanksWithSample = (): void => {
  const sampleP = makeSampleProfile();
  const first = state.profiles[0];
  if (first) {
    const keys = Object.keys(sampleP) as (keyof typeof sampleP)[];
    for (const k of keys) {
      if ((first[k] ?? '').trim() === '' && sampleP[k] !== '') {
        (first[k] as string) = sampleP[k];
      }
    }
  }
  const sampleA = makeSampleAddress();
  const firstAddress = state.addresses[0];
  if (firstAddress) {
    if (firstAddress.label.trim() === '') firstAddress.label = '自宅';
    const keys = (['zip', 'prefecture', 'city', 'street', 'building'] as const);
    for (const k of keys) {
      if ((firstAddress[k] ?? '').trim() === '' && sampleA[k] !== '') {
        firstAddress[k] = sampleA[k];
      }
    }
  }
  render(notice('saved', ['お試しデータを入力しました。保存ボタンで確定します。']));
};
```

Only domestic fields are filled; overseas fields stay blank so the domestic-required validation path applies.

- [ ] **Step 3: Prepend the banner to both pages on first time only**

After `const addressPage = renderAddressPage(...)` add:

```ts
if (!hasValidProfile(state.profiles.map(normalizeProfile))) {
  const bannerText = document.createElement('p');
  bannerText.textContent = '初めてですか？架空の名前と住所で試せます';
  const trial = actionButton('お試し入力', false, fillBlanksWithSample);
  const banner = document.createElement('div');
  banner.className = 'trial-banner';
  banner.append(bannerText, trial);
  const banner2 = banner.cloneNode(true) as HTMLElement;
  const trial2 = banner2.querySelector('button');
  if (trial2) {
    trial2.addEventListener('click', fillBlanksWithSample);
  }
  profilePage.prepend(banner);
  addressPage.prepend(banner2);
}
```

`cloneNode(true)` does not copy listeners, so the second button is rewired explicitly. `actionButton`, `normalizeProfile`, and `notice` are already imported or defined in `main.ts`.

- [ ] **Step 4: Typecheck this task**

Run: `make typecheck`
Expected: clean (no errors).

### Task 3: Verify and commit

**Files:**
- Test: `tests/core/sample-data.test.ts`
- Modify: `src/entrypoints/options/main.ts`

- [ ] **Step 1: Run the scoped tests**

Run: `npx vitest run tests/core/sample-data.test.ts tests/options/`
Expected: all PASS.

- [ ] **Step 2: Run the full check**

Run: `make check`
Expected: green.

- [ ] **Step 3: Manual verification**

1. Open the options page with no valid profile: both pages show the banner.
2. Type a real first name into the profile card, press お試し入力: the typed name stays, blanks fill in.
3. Press each page's 保存: both succeed without opposite-side errors.
4. Reload with the valid profile saved: the banner is gone.

- [ ] **Step 4: Commit**

```bash
git add src/core/sample-data.ts tests/core/sample-data.test.ts src/entrypoints/options/main.ts
git commit -m "feat(options): add first-time trial banner with sample data"
```
