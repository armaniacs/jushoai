import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TOAST_MS, dismissGuideForSession, hideFloatGuide, isGuideDismissed,
  resetFloatState, showFloatError, showFloatGuide, showFloatToast,
} from '../../src/entrypoints/options/float-layer';
import { el } from '../../src/entrypoints/options/dom';
import {
  post as postNotice,
  TOAST_MS as CENTER_TOAST_MS,
} from '../../src/entrypoints/options/notice-center';

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

describe('notice center seam crossing', () => {
  it('keeps an error when the earlier toast timer deadline passes', () => {
    vi.useFakeTimers();
    expect(CENTER_TOAST_MS).toBe(TOAST_MS);
    postNotice({ kind: 'saved', lines: ['保存しました'] });
    expect(document.querySelectorAll('#float-root .float-toast')).toHaveLength(1);
    vi.advanceTimersByTime(TOAST_MS - 1000);
    postNotice({ kind: 'errors', lines: ['e1'] });
    expect(document.querySelectorAll('#float-root .float-error')).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(document.querySelectorAll('#float-root .float-error')).toHaveLength(1);
    expect(document.querySelectorAll('#float-root .float-toast')).toHaveLength(0);
    vi.advanceTimersByTime(TOAST_MS * 3);
    expect(document.querySelectorAll('#float-root .float-error')).toHaveLength(1);
  });

  it('lets a stale timer clear nothing after a replacement chain', () => {
    vi.useFakeTimers();
    postNotice({ kind: 'saved', lines: ['first'] });
    vi.advanceTimersByTime(TOAST_MS - 1000);
    postNotice({ kind: 'errors', lines: ['e1'] });
    postNotice({ kind: 'saved', lines: ['second'] });
    vi.advanceTimersByTime(1000);
    expect(document.querySelector('#float-root .float-toast')!.textContent).toContain('second');
    vi.advanceTimersByTime(TOAST_MS - 1001);
    expect(document.querySelectorAll('#float-root .float-toast')).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(document.querySelectorAll('#float-root .float-toast')).toHaveLength(0);
  });

  it('hands timer ownership from an action toast to a plain toast', () => {
    vi.useFakeTimers();
    let fired = 0;
    postNotice({
      kind: 'saved',
      lines: ['次は住所を入力してください'],
      action: { label: '住所を入力する', onClick: () => { fired += 1; } },
    });
    vi.advanceTimersByTime(TOAST_MS * 2);
    expect(document.querySelectorAll('#float-root .float-toast')).toHaveLength(1);
    postNotice({ kind: 'saved', lines: ['保存しました'] });
    expect(document.querySelector('#float-root .float-toast')!.textContent).toContain('保存しました');
    vi.advanceTimersByTime(TOAST_MS - 1);
    expect(document.querySelectorAll('#float-root .float-toast')).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(document.querySelectorAll('#float-root .float-toast')).toHaveLength(0);
    expect(fired).toBe(0);
  });
});
