# Options Save Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the options page save into profile-only and address-only saves with cross-guide messages.

**Architecture:** Add a pure helper module `save-guide.ts` (validation scoping plus first-time/guide predicates) covered by vitest, then rewire `main.ts` so each page owns its save button and success notice carries the opposite-side guide. Storage semantics stay additive via the existing id-unit merge.

**Tech Stack:** TypeScript, WXT options entrypoint, Vitest.

---

## File structure

- Create: `src/entrypoints/options/save-guide.ts` — pure predicates over normalized profiles/addresses (no DOM, no chrome APIs).
- Test: `tests/options/save-guide.test.ts` — unit tests for the predicates and per-side error scoping.
- Modify: `src/entrypoints/options/main.ts` — remove the shared footer, add per-page footers, split `onSave` into `onSaveProfiles`/`onSaveAddresses`, render an optional guide button next to the notice.

---

### Task 1: Save-guide helpers with failing tests

**Files:**
- Create: `src/entrypoints/options/save-guide.ts`
- Test: `tests/options/save-guide.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { normalizeAddress, normalizeProfile } from '../../src/core/profile';
import { EMPTY_ADDRESS, EMPTY_PROFILE } from '../../src/core/types';
import {
  addressErrorsFor, hasValidAddress, hasValidProfile, profileErrorsFor,
} from '../../src/entrypoints/options/save-guide';

const validProfile = normalizeProfile({
  ...EMPTY_PROFILE, id: 'p1', label: '個人用', lastName: '山田', firstName: '太郎',
  lastNameKana: 'ヤマダ', firstNameKana: 'タロウ', email: 'yamada@example.com', tel: '09012345678',
});

const blankAddress = normalizeAddress({ ...EMPTY_ADDRESS, id: 'a1', label: '自宅' });

describe('save-guide', () => {
  it('sees a valid profile even when the address is blank', () => {
    expect(hasValidProfile([validProfile])).toBe(true);
    expect(hasValidAddress([blankAddress])).toBe(false);
  });

  it('scopes profile errors to profiles only', () => {
    const bad = normalizeProfile({ ...EMPTY_PROFILE, id: 'p2', label: '' });
    const errors = profileErrorsFor([bad]);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.every((e) => e.startsWith('プロファイル1:'))).toBe(true);
  });

  it('scopes address errors to addresses only', () => {
    const errors = addressErrorsFor([blankAddress]);
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('自宅:')]));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/options/save-guide.test.ts`
Expected: FAIL with "Failed to resolve import" (module does not exist yet).

- [ ] **Step 3: Write minimal implementation**

```ts
import { validateAddress, validateProfile } from '../../core/profile';
import type { Address, Profile } from '../../core/types';

export function hasValidProfile(profiles: readonly Profile[]): boolean {
  return profiles.some((p) => validateProfile(p).length === 0);
}

export function hasValidAddress(addresses: readonly Address[]): boolean {
  return addresses.some((a) => validateAddress(a).length === 0);
}

export function profileErrorsFor(profiles: readonly Profile[]): string[] {
  return profiles.flatMap((p, i) =>
    validateProfile(p).map((e) => `${p.label || `プロファイル${i + 1}`}: ${e}`));
}

export function addressErrorsFor(addresses: readonly Address[]): string[] {
  return addresses.flatMap((a) =>
    validateAddress(a).map((e) => `${a.label || '住所'}: ${e}`));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/options/save-guide.test.ts`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add src/entrypoints/options/save-guide.ts tests/options/save-guide.test.ts
git commit -m "feat(options): add per-side save validation helpers"
```

### Task 2: Split onSave and per-page footers in main.ts

**Files:**
- Modify: `src/entrypoints/options/main.ts`

Context for the engineer: today `render()` builds one shared `footer` with a single `保存` button wired to `onSave`, which validates profiles and addresses together (lines around 189-216 and 262-286). The nav hides the inactive section, so profile editors see invisible address errors. This task removes the shared footer and gives each page its own footer. The transfer section holder stays shared at the bottom. `notice()` only renders text, so the guide button is a separate element appended after the notice.

- [ ] **Step 1: Update imports to include the helpers and setActivePage**

```ts
import { ADDRESSES_SECTION_ID, applyActivePage, setActivePage, PROFILES_SECTION_ID, AUDIT_SECTION_ID } from './nav';
import {
  addressErrorsFor, hasValidAddress, hasValidProfile, profileErrorsFor,
} from './save-guide';
```

The current import line is:

```ts
import { mountNav, applyActivePage, PROFILES_SECTION_ID, ADDRESSES_SECTION_ID, AUDIT_SECTION_ID } from './nav';
```

Replace it with the line above (adds `setActivePage` and the `save-guide` import; keep all other imports unchanged).

- [ ] **Step 2: Change render() to accept an optional guide button**

Current signature and tail:

```ts
function render(noticeElement?: HTMLElement) {
  // ...
  app.replaceChildren(
    title, profilePage, addressPage, footer, transferHolder, ...(noticeElement ? [noticeElement] : []),
  );
  applyActivePage();
}
```

Replace with:

```ts
function render(noticeElement?: HTMLElement, guideElement?: HTMLElement) {
  const rerender = () => render();
  const profilePage = renderProfilePage(state.profiles, rerender);
  const addressPage = renderAddressPage(state.addresses, state.profiles, rerender);
  const title = document.createElement('h1');
  title.textContent = 'JushoAI 設定';

  app.replaceChildren(
    title,
    profilePage,
    addressPage,
    transferHolder,
    ...(noticeElement ? [noticeElement] : []),
    ...(guideElement ? [guideElement] : []),
  );
  applyActivePage();
}
```

Note: `renderProfilePage` and `renderAddressPage` gain their own footers in Step 3, so the shared `save`/`importButton`/`footer` block is deleted here.

- [ ] **Step 3: Add a footer with save plus import into each page**

In `renderProfilePage`, before `page.append`, add:

```ts
const save = actionButton('保存', false, () => { void onSaveProfiles(); });
const importButton = actionButton('フォームから取り込む', false, () => {
  void onImportDraft().catch(() => {
    render(notice('errors', ['取り込みに失敗しました。フォームを開いているタブで実行してください。']));
  });
});
const footer = document.createElement('div');
footer.className = 'row';
footer.append(save, importButton);
page.append(heading, ...cards, addProfile, ...(limitNote.textContent ? [limitNote] : []), footer);
```

Replace the existing final `page.append(heading, ...cards, addProfile, ...(limitNote.textContent ? [limitNote] : []));` with the version above (footer included).

In `renderAddressPage`, before `page.append`, add the same shape with `onSaveAddresses`:

```ts
const save = actionButton('保存', false, () => { void onSaveAddresses(); });
const importButton = actionButton('フォームから取り込む', false, () => {
  void onImportDraft().catch(() => {
    render(notice('errors', ['取り込みに失敗しました。フォームを開いているタブで実行してください。']));
  });
});
const footer = document.createElement('div');
footer.className = 'row';
footer.append(save, importButton);
page.append(heading, ...cards, add, ...(limitNote.textContent ? [limitNote] : []), footer);
```

Replace the existing final `page.append(heading, ...cards, add, ...(limitNote.textContent ? [limitNote] : []));` with the version above.

- [ ] **Step 4: Replace onSave with onSaveProfiles and onSaveAddresses**

Delete the existing `onSave` function and add:

```ts
function guideButton(label: string, target: 'profiles' | 'addresses'): HTMLButtonElement {
  return actionButton(label, false, () => {
    setActivePage(target === 'profiles' ? PROFILES_SECTION_ID : ADDRESSES_SECTION_ID);
  });
}

async function onSaveProfiles() {
  const profiles = state.profiles.map(normalizeProfile);
  const errors = profileErrorsFor(profiles);
  if (profiles.length === 0) errors.push('プロファイルを1件以上登録してください');
  if (errors.length > 0) {
    render(notice('errors', errors));
    return;
  }
  state = { profiles, addresses: state.addresses };
  try {
    await saveData(state);
  } catch (e) {
    console.warn('[JushoAI] save failed', e);
    render(notice('errors', ['保存に失敗しました。容量不足の可能性があります。']));
    return;
  }
  if (hasValidAddress(state.addresses.map(normalizeAddress))) {
    render(notice('saved', ['保存しました']));
    return;
  }
  render(
    notice('saved', ['保存しました。次は住所を入力してください']),
    guideButton('住所を入力する', 'addresses'),
  );
}

async function onSaveAddresses() {
  const addresses = state.addresses.map(normalizeAddress);
  const errors = addressErrorsFor(addresses);
  if (addresses.length === 0) errors.push('住所を1件以上登録してください');
  if (errors.length > 0) {
    render(notice('errors', errors));
    return;
  }
  state = { profiles: state.profiles, addresses };
  try {
    await saveData(state);
  } catch (e) {
    console.warn('[JushoAI] save failed', e);
    render(notice('errors', ['保存に失敗しました。容量不足の可能性があります。']));
    return;
  }
  if (hasValidProfile(state.profiles.map(normalizeProfile))) {
    render(notice('saved', ['保存しました']));
    return;
  }
  render(
    notice('saved', ['保存しました。次はプロファイルを入力してください']),
    guideButton('プロファイルを入力する', 'profiles'),
  );
}
```

`saveData` keeps its id-unit merge, so saving one side never deletes the other side.

- [ ] **Step 5: Typecheck this task**

Run: `make typecheck`
Expected: clean (no errors).

### Task 3: Verify and commit

**Files:**
- Test: `tests/options/save-guide.test.ts`
- Modify: `src/entrypoints/options/main.ts`

- [ ] **Step 1: Run the scoped tests**

Run: `npx vitest run tests/options/`
Expected: all PASS.

- [ ] **Step 2: Run the full check**

Run: `make check`
Expected: green (typecheck plus test plus both browser builds plus manifest inspection plus web-ext lint).

- [ ] **Step 3: Manual verification**

1. Open the options page with an empty profile and empty address.
2. On the プロファイル page, press 保存 with only the profile filled: saves, no address errors, guide button appears.
3. Press the guide button: the 住所 page opens.
4. On the 住所 page, press 保存 with an empty address: only address errors appear, no profile errors.

- [ ] **Step 4: Commit**

```bash
git add src/entrypoints/options/main.ts src/entrypoints/options/save-guide.ts tests/options/save-guide.test.ts
git commit -m "fix(options): split save per profile and address pages with guide"
```
