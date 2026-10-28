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

function slot(cls: 'float-notice' | 'float-guide-slot'): HTMLElement {
  const r = root();
  let s = r.querySelector<HTMLElement>(`:scope > .${cls}`);
  if (!s) {
    s = el('div');
    s.className = cls;
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
  // The wrapper keeps its own class: the guide node itself carries
  // .float-guide (the card styled in index.html), so the selector
  // '#float-root .float-guide' matches exactly one element while shown
  // and none after hide.
  const s = slot('float-guide-slot');
  s.replaceChildren(node);
  node.classList.add('float-guide');
}

export function hideFloatGuide(): void {
  slot('float-guide-slot').replaceChildren();
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
