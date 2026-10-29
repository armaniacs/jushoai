// NoticeCenter: the single owner of the options-page notice policy.
// Lifetime (TTL table), replacement (noticeToken), auto-dismiss ownership
// (toastTimer) and slot allocation all live here. Notices enter only via
// post(); the guide helpers below serve the float-layer wrapper so slot
// allocation is not split across modules. DOM only: no chrome APIs, no
// storage access.
import { actionButton, el, notice } from './dom';

export const TOAST_MS = 4000;

export type NoticeKind = 'saved' | 'errors';

// Per-kind lifetime. `null` means "stays until closed or replaced".
const TTL_MS: Record<NoticeKind, number | null> = {
  saved: TOAST_MS,
  errors: null,
};

export interface NoticeAction { label: string; onClick: () => void }

export interface NoticePost {
  kind: NoticeKind;
  lines: readonly string[];
  action?: NoticeAction;
}

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

function noticeSlot(): HTMLElement {
  return slot('float-notice');
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

function actionRow(action: NoticeAction, onClose: () => void): HTMLElement {
  const row = el('div');
  row.className = 'float-row';
  row.append(actionButton(action.label, false, action.onClick), closeButton(onClose));
  return row;
}

export function post(req: NoticePost): void {
  clearTimer();
  const my = ++noticeToken;
  if (req.kind === 'errors') {
    const box = el('div');
    box.className = 'float-error';
    box.setAttribute('role', 'alert');
    box.append(notice('errors', req.lines));
    const row = el('div');
    row.className = 'float-row';
    if (req.action) row.append(actionButton(req.action.label, false, req.action.onClick));
    row.append(closeButton(() => noticeSlot().replaceChildren()));
    box.append(row);
    noticeSlot().replaceChildren(box);
    return;
  }
  const box = el('div');
  box.className = 'float-toast';
  box.append(notice('saved', req.lines));
  if (req.action) {
    // A toast carrying a next step stays until closed: dismissing the guide
    // action along with the message would strand the user.
    box.append(actionRow(req.action, () => { clearTimer(); noticeSlot().replaceChildren(); }));
  } else if (TTL_MS.saved !== null) {
    const ttl = TTL_MS.saved;
    toastTimer = setTimeout(() => {
      if (my === noticeToken) noticeSlot().replaceChildren();
      toastTimer = null;
    }, ttl);
  }
  noticeSlot().replaceChildren(box);
}

export function showGuide(node: HTMLElement): void {
  // The wrapper keeps its own class: the guide node itself carries
  // .float-guide (the card styled in index.html), so the selector
  // '#float-root .float-guide' matches exactly one element while shown
  // and none after hide.
  const s = slot('float-guide-slot');
  s.replaceChildren(node);
  node.classList.add('float-guide');
}

export function hideGuide(): void {
  slot('float-guide-slot').replaceChildren();
}

export function dismissGuideForSession(): void {
  guideSessionDismissed = true;
  hideGuide();
}

export function isGuideDismissed(): boolean {
  return guideSessionDismissed;
}

// Test-only reset: jsdom module state persists per test file.
export function resetNoticeCenter(): void {
  clearTimer();
  ++noticeToken;
  guideSessionDismissed = false;
  document.getElementById('float-root')?.remove();
}
