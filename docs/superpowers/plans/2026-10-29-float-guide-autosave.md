# Float Guide and Autosave Trial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline trial banner with a floating first-time guide whose trial button generates and saves immediately with a personalized toast.

**Architecture:** Pure `trialToastText` in `save-guide.ts` plus a `main.ts` rework (floating guide node, tab-scoped visibility synced on render and hash change, autosaving trial handler). Requires the PBI-165 float layer merged first; E2E trial tests convert to the no-manual-save flow.

**Tech Stack:** TypeScript, WXT options page, Vitest (jsdom), Selenium E2E.

---

## File structure

- Modify: `src/entrypoints/options/save-guide.ts` — add pure `trialToastText`.
- Test: `tests/options/save-guide.test.ts` — toast text cases (append).
- Modify: `src/entrypoints/options/main.ts` — remove inline banner, add guide node, sync, autosave trial.
- Modify: `tests/e2e/chrome.e2e.ts`, `tests/e2e/firefox.e2e.ts` — convert trial tests, add guide tests.

---

### Task 1: trialToastText with failing tests

**Files:**
- Modify: `src/entrypoints/options/save-guide.ts`
- Test: `tests/options/save-guide.test.ts`

- [ ] **Step 1: Append the failing test**

Append to `tests/options/save-guide.test.ts`:

```ts
import { normalizeAddress, normalizeProfile } from '../../src/core/profile';
import { EMPTY_ADDRESS, EMPTY_PROFILE } from '../../src/core/types';
import { trialToastText } from '../../src/entrypoints/options/save-guide';

describe('trialToastText', () => {
  it('names the generated person and residence', () => {
    const p = normalizeProfile({
      ...EMPTY_PROFILE, id: 'p1', label: 'お試し', lastName: '山田', firstName: '太郎',
      lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
    });
    const a = normalizeAddress({
      ...EMPTY_ADDRESS, id: 'a1', label: '自宅', zip: '1000001', prefecture: '東京都',
      city: '千代田区', street: '千代田1-1',
    });
    expect(trialToastText(p, a)).toBe(
      '架空の名前として山田 太郎さん（東京都千代田区在住）を作りました',
    );
  });
});
```

If the existing import block already imports from those modules, extend it instead of duplicating lines.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/options/save-guide.test.ts`
Expected: FAIL with "trialToastText is not a function" (or import error).

- [ ] **Step 3: Add minimal implementation**

Append to `src/entrypoints/options/save-guide.ts`:

```ts
export function trialToastText(p: Profile, a: Address): string {
  return `架空の名前として${p.lastName} ${p.firstName}さん（${a.prefecture}${a.city}在住）を作りました`;
}
```

Callers insert the result via textContent only (it carries profile values).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/options/save-guide.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/entrypoints/options/save-guide.ts tests/options/save-guide.test.ts
git commit -m "feat(options): add trial toast text builder"
```

### Task 2: Guide rework in main.ts

**Files:**
- Modify: `src/entrypoints/options/main.ts`

Context: `render()` currently prepends an inline `.trial-banner` with the old お試し入力 button to both pages, and `fillBlanksWithSample` fills without saving. This task deletes both and routes everything through the PBI-165 float layer. `setActivePage` is already imported; add `getActivePage` to that import. `makeSampleProfile`, `makeSampleAddress`, `EMPTY_PROFILE`, `EMPTY_ADDRESS`, `newId`, `normalizeProfile`, `normalizeAddress`, `loadData`, `saveData` stay imported and used.

- [ ] **Step 1: Extend the nav import and float-layer import**

Replace:

```ts
import { mountNav, applyActivePage, setActivePage, PROFILES_SECTION_ID, ADDRESSES_SECTION_ID, AUDIT_SECTION_ID } from './nav';
```

with:

```ts
import { mountNav, applyActivePage, getActivePage, setActivePage, PROFILES_SECTION_ID, ADDRESSES_SECTION_ID, AUDIT_SECTION_ID } from './nav';
```

Use the exact current line (it was extended in Plan A; verify with grep first and keep every other name).

Replace:

```ts
import { showFloatError, showFloatToast } from './float-layer';
```

with:

```ts
import {
  dismissGuideForSession, hideFloatGuide, isGuideDismissed, showFloatError, showFloatGuide, showFloatToast,
} from './float-layer';
```

Also extend the save-guide import with `trialToastText`:

```ts
import {
  addressErrorsFor, hasValidAddress, hasValidProfile, profileErrorsFor, trialToastText,
} from './save-guide';
```

Verify the current save-guide import line with grep first and keep every other name.

- [ ] **Step 2: Replace fillBlanksWithSample with onTrialSave**

Replace the whole `fillBlanksWithSample` closure (from `const fillBlanksWithSample = (): void => {` through its closing `};` before the first-time `if`) with:

```ts
  const onTrialSave = async (): Promise<void> => {
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
  };
```

- [ ] **Step 3: Replace the inline banner block with floating guide sync**

Delete the whole first-time `if` block (from `if (!hasValidProfile(state.profiles.map(normalizeProfile))) {` through the `profilePage.prepend(banner); addressPage.prepend(banner2); }` closing brace). Replace it with:

```ts
  const buildGuideNode = (): HTMLElement => {
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
  };
  const syncGuide = (): void => {
    const page = getActivePage();
    const relevant = page === PROFILES_SECTION_ID || page === ADDRESSES_SECTION_ID;
    if (!isGuideDismissed() && relevant && !hasValidProfile(state.profiles.map(normalizeProfile))) {
      showFloatGuide(buildGuideNode());
    } else {
      hideFloatGuide();
    }
  };
  syncGuide();
```

`el` and `actionButton` are already imported from `./dom`. Place this block where the deleted banner block was (before the title creation), so `syncGuide()` runs on every render.

- [ ] **Step 4: Sync on tab switches**

After the `mountNav(document.getElementById('side')!);` line at the module bottom, add:

```ts
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
```

Calling `render()` re-runs `syncGuide()` and keeps one code path for showing. Verify the exact `mountNav(...)` line with grep first.

- [ ] **Step 5: Typecheck and scoped tests**

Run: `make typecheck`
Expected: clean (remove any now-unused imports such as the deleted banner's leftovers to satisfy noUnusedLocals).

Run: `npx vitest run tests/options/`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/entrypoints/options/main.ts
git commit -m "feat(options): float the first-time guide with instant trial save"
```

### Task 3: E2E conversion and guide tests

**Files:**
- Modify: `tests/e2e/chrome.e2e.ts`
- Modify: `tests/e2e/firefox.e2e.ts`

- [ ] **Step 1: Convert the chrome trial tests to instant save**

Replace the whole `describe('chrome: options trial input (PBI-162/163)', ...)` block with:

```ts
describe('chrome: options trial input (PBI-162/163/166)', () => {
  it('registers on one trial press without a manual save', async () => {
    await setOptionsData({ profiles: [], addresses: [] });
    await openProfilesPage();
    await driver.findElement(
      By.xpath("//*[@id='float-root']//button[text()='架空の名前と住所を作って試す']"),
    ).click();
    await waitSavedContaining('架空の名前として');
    expect(await profileCardCount()).toBe(1);
    expect(await driver.findElements(By.css('#float-root .float-error'))).toHaveLength(0);
  });

  it('recovers through trial after deleting the last profile', async () => {
    await setOptionsData({ profiles: [], addresses: [] });
    await openProfilesPage();
    const trial = By.xpath("//*[@id='float-root']//button[text()='架空の名前と住所を作って試す']");
    await driver.findElement(trial).click();
    await waitSavedContaining('架空の名前として');
    await driver.findElement(
      By.xpath("//*[@id='profiles']//button[text()='このプロファイルを削除']"),
    ).click();
    await driver.wait(async () => (await profileCardCount()) === 0, 10_000, 'profile card was not deleted');
    await driver.findElement(trial).click();
    await waitSavedContaining('架空の名前として');
    expect(await profileCardCount()).toBe(1);
  });

  it('navigates through the guide buttons', async () => {
    await setOptionsData({ profiles: [], addresses: [] });
    await openProfilesPage();
    await driver.findElement(
      By.xpath("//*[@id='float-root']//button[text()='住所を登録する']"),
    ).click();
    await driver.wait(async () =>
      (await driver.findElement(By.css('#side nav a[data-section="addresses"]'))
        .getAttribute('aria-current')) === 'true',
    10_000, 'did not switch to the addresses tab');
    await driver.findElement(
      By.xpath("//*[@id='float-root']//button[text()='名前を登録する']"),
    ).click();
    await driver.wait(async () =>
      (await driver.findElement(By.css('#side nav a[data-section="profiles"]'))
        .getAttribute('aria-current')) === 'true',
    10_000, 'did not switch back to the profiles tab');
  });

  it('hides the guide for the session and shows it again on reload', async () => {
    await setOptionsData({ profiles: [], addresses: [] });
    await openProfilesPage();
    await driver.findElement(By.css('#float-root .float-guide .float-close')).click();
    await driver.wait(async () =>
      (await driver.findElements(By.css('#float-root .float-guide'))).length === 0,
    10_000, 'guide did not hide');
    await driver.navigate().refresh();
    await driver.wait(until.elementLocated(By.css('#float-root .float-guide')), 10_000);
  });
});
```

Delete the now-unused `clickProfilesButton` helper only if nothing else uses it (the PBI-161 save-split test still uses it — keep the helper).

- [ ] **Step 2: Mirror Step 1 for firefox**

Apply the identical block with `describe('firefox: ...')`, using `setOptionsData` plus `withProfilesPage` instead of `openProfilesPage`. The only structural difference is the × test's reload: stay in the same tab and refresh it instead of reopening:

```ts
  it('hides the guide for the session and shows it again on reload', async () => {
    await setOptionsData({ profiles: [], addresses: [] });
    await withProfilesPage(async () => {
      await driver.findElement(By.css('#float-root .float-guide .float-close')).click();
      await driver.wait(async () =>
        (await driver.findElements(By.css('#float-root .float-guide'))).length === 0,
      10_000, 'guide did not hide');
      await driver.navigate().refresh();
      await driver.wait(until.elementLocated(By.css('#profiles')), 10_000);
      await driver.wait(until.elementLocated(By.css('#float-root .float-guide')), 10_000);
    });
  });
```

- [ ] **Step 3: Run typecheck and scoped tests**

Run: `make typecheck`
Expected: clean.

Run: `npx vitest run tests/options/ tests/core/sample-data.test.ts`
Expected: all PASS.

- [ ] **Step 4: Run full check and Chrome E2E**

Run: `make check`
Expected: green.

Run: `HEADLESS=1 E2E_NO_SANDBOX=1 make e2e-chrome`
Expected: all PASS. If the sandbox flag is unneeded on the runner machine, plain `HEADLESS=1 make e2e-chrome` applies; on chromedriver/browser mismatch, point `SE_CACHE_PATH` at a fresh writable directory and retry. Firefox E2E runs on the user's machine.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/chrome.e2e.ts tests/e2e/firefox.e2e.ts
git commit -m "test(e2e): convert trial tests to instant save and cover guide"
```

## Self-Review

After writing both plans, the author checked: every spec section maps to a task (slots→165T1, styles→165T2, behaviors→165T2/T3, guide content→166T2, autosave→166T2, toast text→166T1, tests→165T1/T3 and 166T1/T3); no TBD/TODO/appropriate-style placeholders; `trialToastText`/`showFloatToast`/`showFloatGuide`/`dismissGuideForSession`/`isGuideDismissed`/`syncGuide`/`onTrialSave` names match across tasks; E2E selectors match the planned CSS classes and button labels.
