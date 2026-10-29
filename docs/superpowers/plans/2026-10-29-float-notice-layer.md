# Float Notice Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move profile/address save notices into a top-fixed floating layer with auto-dismissing success toasts and manually-closed error banners.

**Architecture:** New DOM-only module `src/entrypoints/options/float-layer.ts` (guide slot + notice slot, timer-owned toasts, truncate reuse via `dom.notice()`), styles in `index.html`, and `main.ts` rewired so every profile/address notice goes through it. Other sections keep inline `notice()`.

**Tech Stack:** TypeScript, WXT options page, Vitest (jsdom, fake timers), Selenium E2E.

---

## File structure

- Create: `src/entrypoints/options/float-layer.ts` — floating slots, toast timer, close/dismiss, test reset.
- Test: `tests/options/float-notice.test.ts` — slot behavior, replacement, timers, truncate, actions.
- Modify: `src/entrypoints/options/index.html` — `#float-root` styles only.
- Modify: `src/entrypoints/options/main.ts` — route profile/address notices through the layer.
- Modify: `tests/e2e/chrome.e2e.ts`, `tests/e2e/firefox.e2e.ts` — selector migration plus toast/error assertions.

---

### Task 1: Float layer module with failing tests

**Files:**
- Create: `src/entrypoints/options/float-layer.ts`
- Test: `tests/options/float-notice.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TOAST_MS, dismissGuideForSession, hideFloatGuide, isGuideDismissed,
  resetFloatState, showFloatError, showFloatGuide, showFloatToast,
} from '../../src/entrypoints/options/float-layer';
import { el } from '../../src/entrypoints/options/dom';

beforeEach(() => {
  vi.useRealTimers();
  resetFloatState();
  document.body.innerHTML = '';
});

describe('float notice layer', () => {
  it('auto-dismisses a success toast after TOAST_MS', () => {
    expect(TOAST_MS).toBe(4000);
    vi.useFakeTimers();
    showFloatToast(['保存しました']);
    expect(document.querySelectorAll('#float-root .float-toast')).toHaveLength(1);
    vi.advanceTimersByTime(TOAST_MS);
    expect(document.querySelectorAll('#float-root .float-toast')).toHaveLength(0);
  });

  it('replaces the notice and restarts the timer', () => {
    vi.useFakeTimers();
    showFloatToast(['first']);
    vi.advanceTimersByTime(3000);
    showFloatToast(['second']);
    vi.advanceTimersByTime(3000);
    expect(document.querySelectorAll('#float-root .float-toast')).toHaveLength(1);
    expect(document.querySelector('#float-root .float-toast')!.textContent).toContain('second');
    vi.advanceTimersByTime(1000);
    expect(document.querySelectorAll('#float-root .float-toast')).toHaveLength(0);
  });

  it('keeps an error until closed and truncates at 5', () => {
    vi.useFakeTimers();
    showFloatError(['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7']);
    vi.advanceTimersByTime(TOAST_MS * 3);
    const box = document.querySelector('#float-root .float-error')!;
    expect(box.textContent).toContain('他 2 件のエラーがあります');
    (box.querySelector('.float-close') as HTMLButtonElement).click();
    expect(document.querySelectorAll('#float-root .float-error')).toHaveLength(0);
  });

  it('fires the action and stays while the action lives', () => {
    vi.useFakeTimers();
    let fired = 0;
    showFloatToast(['次は住所を入力してください'], { label: '住所を入力する', onClick: () => { fired += 1; } });
    (document.querySelector('#float-root .float-toast .float-row button') as HTMLButtonElement).click();
    expect(fired).toBe(1);
    vi.advanceTimersByTime(TOAST_MS * 3);
    expect(document.querySelectorAll('#float-root .float-toast')).toHaveLength(1);
  });

  it('shows and session-dismisses the guide', () => {
    expect(isGuideDismissed()).toBe(false);
    const node = el('div', 'guide');
    showFloatGuide(node);
    expect(document.querySelectorAll('#float-root .float-guide')).toHaveLength(1);
    dismissGuideForSession();
    expect(isGuideDismissed()).toBe(true);
    expect(document.querySelectorAll('#float-root .float-guide')).toHaveLength(0);
    hideFloatGuide();
    resetFloatState();
    expect(isGuideDismissed()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/options/float-notice.test.ts`
Expected: FAIL with "Failed to resolve import" (module does not exist yet).

- [ ] **Step 3: Write minimal implementation**

```ts
// Floating notice layer for the options page: inline #app notices are easy
// to miss at the page bottom. Guide and notice are independent slots that
// coexist; success toasts auto-dismiss, errors stay until closed or
// replaced. DOM only: no chrome APIs, no storage access.
import { actionButton, el, notice } from './dom';

export const TOAST_MS = 4000;

let toastTimer: ReturnType<typeof setTimeout> | null = null;
let noticeToken = 0;
let guideSessionDismissed = false;

function root(): HTMLElement {
  let r = document.getElementById('float-root');
  if (!r) {
    r = el('div');
    r.id = 'float-root';
    document.body.prepend(r);
  }
  return r;
}

function slot(name: 'float-notice' | 'float-guide'): HTMLElement {
  const r = root();
  let s = r.querySelector<HTMLElement>(`:scope > .${name}`);
  if (!s) {
    s = el('div');
    s.className = name;
    r.append(s);
  }
  return s;
}

function clearTimer(): void {
  if (toastTimer !== null) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
}

function closeButton(onClose: () => void): HTMLButtonElement {
  const x = actionButton('×', false, onClose);
  x.classList.add('float-close');
  return x;
}

export interface FloatAction { label: string; onClick: () => void }

function actionRow(action: FloatAction, onClose: () => void): HTMLElement {
  const row = el('div');
  row.className = 'float-row';
  row.append(actionButton(action.label, false, action.onClick), closeButton(onClose));
  return row;
}

export function showFloatToast(lines: readonly string[], action?: FloatAction): void {
  clearTimer();
  const my = ++noticeToken;
  const box = el('div');
  box.className = 'float-toast';
  box.append(notice('saved', lines));
  if (action) {
    // A toast carrying a next step stays until closed: dismissing the guide
    // action along with the message would strand the user.
    box.append(actionRow(action, () => { clearTimer(); slot('float-notice').replaceChildren(); }));
  } else {
    toastTimer = setTimeout(() => {
      if (my === noticeToken) slot('float-notice').replaceChildren();
      toastTimer = null;
    }, TOAST_MS);
  }
  slot('float-notice').replaceChildren(box);
}

export function showFloatError(lines: readonly string[], action?: FloatAction): void {
  clearTimer();
  ++noticeToken;
  const box = el('div');
  box.className = 'float-error';
  box.setAttribute('role', 'alert');
  box.append(notice('errors', lines));
  const row = el('div');
  row.className = 'float-row';
  if (action) row.append(actionButton(action.label, false, action.onClick));
  row.append(closeButton(() => slot('float-notice').replaceChildren()));
  box.append(row);
  slot('float-notice').replaceChildren(box);
}

export function showFloatGuide(node: HTMLElement): void {
  const s = slot('float-guide');
  s.replaceChildren(node);
  node.classList.add('float-guide');
}

export function hideFloatGuide(): void {
  slot('float-guide').replaceChildren();
}

export function dismissGuideForSession(): void {
  guideSessionDismissed = true;
  hideFloatGuide();
}

export function isGuideDismissed(): boolean {
  return guideSessionDismissed;
}

// Test-only reset: jsdom module state persists per test file.
export function resetFloatState(): void {
  clearTimer();
  ++noticeToken;
  guideSessionDismissed = false;
  document.getElementById('float-root')?.remove();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/options/float-notice.test.ts`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```bash
git add src/entrypoints/options/float-layer.ts tests/options/float-notice.test.ts
git commit -m "feat(options): add floating notice layer"
```

### Task 2: Styles and main.ts migration

**Files:**
- Modify: `src/entrypoints/options/index.html`
- Modify: `src/entrypoints/options/main.ts`

- [ ] **Step 1: Add float styles to index.html**

Append inside the existing `<style>` block, after the `.saved` rule:

```css
#float-root { position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
  display: grid; gap: 8px; padding: 12px 16px 0; pointer-events: none; }
#float-root > * { display: contents; }
#float-root > * > * { pointer-events: auto; }
.float-toast, .float-error, .float-guide { max-width: 640px; margin: 0 auto; width: 100%;
  box-sizing: border-box; border-radius: 8px; padding: 10px 14px; background: var(--bg);
  border: 1px solid var(--line); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25); }
.float-toast { border-left: 6px solid #1e7e34; }
.float-error { border-left: 6px solid #b3261e; }
.float-guide { border-left: 6px solid var(--accent); }
.float-row { display: flex; gap: 8px; align-items: center; }
.float-close { margin-left: auto; }
.float-toast .saved, .float-error .errors { margin: 4px 0; }
```

- [ ] **Step 2: Import the layer in main.ts**

Replace the dom import line:

```ts
import { el, labeled, textInput, kanaHiraganaHint, isAtLimit, MAX_ITEMS, buildSelect, cardFieldset, actionButton, notice } from './dom';
```

with the same line plus:

```ts
import { showFloatError, showFloatToast } from './float-layer';
```

Keep every other import unchanged (setActivePage, save-guide helpers, loadData stay).

- [ ] **Step 3: Drop notice/guide params from render()**

Replace:

```ts
function render(noticeElement?: HTMLElement, guideElement?: HTMLElement) {
```

with:

```ts
function render() {
```

and replace:

```ts
  app.replaceChildren(
    title,
    profilePage,
    addressPage,
    transferHolder,
    ...(noticeElement ? [noticeElement] : []),
    ...(guideElement ? [guideElement] : []),
  );
```

with:

```ts
  app.replaceChildren(title, profilePage, addressPage, transferHolder);
```

Keep `applyActivePage();` and the closing brace that follow.

- [ ] **Step 4: Replace the guideButton helper with navigation closures**

Replace:

```ts
function guideButton(label: string, target: 'profiles' | 'addresses'): HTMLButtonElement {
  return actionButton(label, false, () => {
    setActivePage(target === 'profiles' ? PROFILES_SECTION_ID : ADDRESSES_SECTION_ID);
  });
}
```

with:

```ts
const goProfiles = (): void => setActivePage(PROFILES_SECTION_ID);
const goAddresses = (): void => setActivePage(ADDRESSES_SECTION_ID);
```

- [ ] **Step 5: Migrate onSaveProfiles call sites**

Replace the three `render(notice(...), ...)` tails in `onSaveProfiles`:

```ts
  if (errors.length > 0) {
    render(notice('errors', errors));
    return;
  }
```

with:

```ts
  if (errors.length > 0) {
    showFloatError(errors);
    render();
    return;
  }
```

Replace:

```ts
    console.warn('[JushoAI] save failed', e);
    render(notice('errors', ['保存に失敗しました。容量不足の可能性があります。']));
    return;
```

with:

```ts
    console.warn('[JushoAI] save failed', e);
    showFloatError(['保存に失敗しました。容量不足の可能性があります。']);
    render();
    return;
```

Replace:

```ts
  if (hasValidAddress(state.addresses.map(normalizeAddress))) {
    render(notice('saved', ['保存しました']));
    return;
  }
  render(
    notice('saved', ['保存しました。次は住所を入力してください']),
    guideButton('住所を入力する', 'addresses'),
  );
```

with:

```ts
  if (hasValidAddress(state.addresses.map(normalizeAddress))) {
    showFloatToast(['保存しました']);
    render();
    return;
  }
  showFloatToast(['保存しました。次は住所を入力してください'], {
    label: '住所を入力する', onClick: goAddresses,
  });
  render();
```

- [ ] **Step 6: Mirror Step 5 for onSaveAddresses**

Apply the same three replacements with the mirrored texts: the guide toast becomes `['保存しました。次はプロファイルを入力してください']` with `{ label: 'プロファイルを入力する', onClick: goProfiles }`. The error and save-failure replacements are identical strings.

- [ ] **Step 7: Migrate onImportDraft and footer catch sites**

Replace each `render(notice('errors', [...]))` with `showFloatError([...]); render();` keeping the message strings byte-identical. The affected sites are: the two footer `importButton` catch handlers, and the `onImportDraft` early returns for missing tab, missing form, and zero taken items. Replace the success tail `render(notice('saved', lines));` with `showFloatToast(lines); render();` keeping `lines` unchanged. Replace the trial tail `render(notice('saved', ['お試しデータを入力しました。保存ボタンで確定します。']));` with `showFloatToast(['お試しデータを入力しました。保存ボタンで確定します。']); render();` (PBI-166 rewrites this handler; the text stays until then).

- [ ] **Step 8: Typecheck and scoped tests**

Run: `make typecheck`
Expected: clean.

Run: `npx vitest run tests/options/`
Expected: all PASS (unused `notice` import must not remain if unreferenced — `notice` is still used by transfer-section and dom tests, but check main.ts no longer references it; if unused there, drop it from the main.ts import to satisfy noUnusedLocals).

- [ ] **Step 9: Commit**

```bash
git add src/entrypoints/options/index.html src/entrypoints/options/main.ts
git commit -m "feat(options): route profile and address notices through float layer"
```

### Task 3: E2E migration and verification

**Files:**
- Modify: `tests/e2e/chrome.e2e.ts`
- Modify: `tests/e2e/firefox.e2e.ts`

- [ ] **Step 1: Migrate selectors in both files**

In `tests/e2e/chrome.e2e.ts`, replace the helpers:

```ts
const waitSavedContaining = async (text: string): Promise<void> => {
  await driver.wait(async () => {
    const els = await driver.findElements(By.css('#app p.saved'));
    if (els.length === 0) return false;
    return ((await els[0]!.getText()) ?? '').includes(text);
  }, 10_000, `no saved notice containing ${text}`);
};
```

with:

```ts
const waitSavedContaining = async (text: string): Promise<void> => {
  await driver.wait(async () => {
    const els = await driver.findElements(By.css('#float-root .float-toast'));
    if (els.length === 0) return false;
    return ((await els[0]!.getText()) ?? '').includes(text);
  }, 10_000, `no saved notice containing ${text}`);
};
```

Replace every `By.css('#app ul.errors')` with `By.css('#float-root .float-error')`. Apply the identical two replacements in `tests/e2e/firefox.e2e.ts`.

- [ ] **Step 2: Add toast and error assertions (chrome)**

Append to `tests/e2e/chrome.e2e.ts`:

```ts
describe('chrome: float notice behavior (PBI-165)', () => {
  it('auto-dismisses the success toast', async () => {
    await setOptionsData({ profiles: PROFILE_DATA.profiles, addresses: [] });
    await openProfilesPage();
    await clickProfilesButton('保存');
    await waitSavedContaining('保存しました');
    await driver.wait(async () =>
      (await driver.findElements(By.css('#float-root .float-toast'))).length === 0,
    10_000, 'success toast did not auto-dismiss');
  });

  it('keeps the error until closed', async () => {
    await setOptionsData({ profiles: [], addresses: [] });
    await openProfilesPage();
    await driver.findElement(By.css('#profiles .trial-banner button')).click();
    await driver.findElement(
      By.xpath("//*[@id='profiles']//button[text()='このプロファイルを削除']"),
    ).click();
    await clickProfilesButton('保存');
    await driver.wait(until.elementLocated(By.css('#float-root .float-error')), 10_000);
    await driver.sleep(4500);
    expect(await driver.findElements(By.css('#float-root .float-error'))).toHaveLength(1);
    await driver.findElement(By.css('#float-root .float-error .float-close')).click();
    await driver.wait(async () =>
      (await driver.findElements(By.css('#float-root .float-error'))).length === 0,
    10_000, 'error banner did not close');
  });
});
```

The error test deletes the trial card (back to 0 profiles, 0 addresses) so the save fails on item count — a deterministic error without typing invalid values. The trial banner from PBI-166 does not exist yet, so `.trial-banner` is still correct here.

- [ ] **Step 3: Mirror Step 2 for firefox**

Append the same two tests to `tests/e2e/firefox.e2e.ts` with `describe('firefox: ...')`, using `setOptionsData` plus `withProfilesPage` instead of `openProfilesPage`, and the identical selectors and waits.

- [ ] **Step 4: Run typecheck and scoped tests**

Run: `make typecheck`
Expected: clean.

Run: `npx vitest run tests/options/ tests/core/sample-data.test.ts`
Expected: all PASS.

- [ ] **Step 5: Run full check and Chrome E2E**

Run: `make check`
Expected: green.

Run: `HEADLESS=1 E2E_NO_SANDBOX=1 make e2e-chrome`
Expected: all PASS including the 2 new tests. If the sandbox flag is unneeded on the runner machine, plain `HEADLESS=1 make e2e-chrome` applies; if chromedriver mismatches the installed Chrome, point `SE_CACHE_PATH` at a fresh writable directory and retry. Firefox E2E cannot run in a restricted agent environment; record it as user-run.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/chrome.e2e.ts tests/e2e/firefox.e2e.ts
git commit -m "test(e2e): cover float toast dismiss and error persistence"
```
