// Floating notice layer for the options page: inline #app notices are easy
// to miss at the page bottom. Guide and notice are independent slots that
// coexist; success toasts auto-dismiss, errors stay until closed or
// replaced. Thin compatibility wrapper over NoticeCenter, which owns the
// lifetime table, replacement token, timer and slot allocation. DOM only:
// no chrome APIs, no storage access.
import {
  dismissGuideForSession as dismissGuide, isGuideDismissed as guideDismissed,
  hideGuide, post, resetNoticeCenter, showGuide, TOAST_MS as CENTER_TOAST_MS,
} from './notice-center';

export const TOAST_MS = CENTER_TOAST_MS;

export interface FloatAction { label: string; onClick: () => void }

export function showFloatToast(lines: readonly string[], action?: FloatAction): void {
  post({ kind: 'saved', lines, ...(action ? { action } : {}) });
}

export function showFloatError(lines: readonly string[], action?: FloatAction): void {
  post({ kind: 'errors', lines, ...(action ? { action } : {}) });
}

export function showFloatGuide(node: HTMLElement): void {
  showGuide(node);
}

export function hideFloatGuide(): void {
  hideGuide();
}

export function dismissGuideForSession(): void {
  dismissGuide();
}

export function isGuideDismissed(): boolean {
  return guideDismissed();
}

// Test-only reset: jsdom module state persists per test file.
export function resetFloatState(): void {
  resetNoticeCenter();
}
