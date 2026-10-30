import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  dismissGuideForSession, hideGuide, isGuideDismissed, post,
  resetNoticeCenter, showGuide, TOAST_MS,
} from '../../src/entrypoints/options/notice-center';
import { el } from '../../src/entrypoints/options/dom';

beforeEach(() => {
  vi.useRealTimers();
  resetNoticeCenter();
  document.body.innerHTML = '';
});

describe('notice center', () => {
  it('auto-dismisses a success toast after TOAST_MS', () => {
    expect(TOAST_MS).toBe(4000);
    vi.useFakeTimers();
    post({ kind: 'saved', lines: ['保存しました'] });
    expect(document.querySelectorAll('#float-root .float-toast')).toHaveLength(1);
    vi.advanceTimersByTime(TOAST_MS);
    expect(document.querySelectorAll('#float-root .float-toast')).toHaveLength(0);
  });

  it('replaces the notice and restarts the timer', () => {
    vi.useFakeTimers();
    post({ kind: 'saved', lines: ['first'] });
    vi.advanceTimersByTime(3000);
    post({ kind: 'saved', lines: ['second'] });
    vi.advanceTimersByTime(3000);
    expect(document.querySelectorAll('#float-root .float-toast')).toHaveLength(1);
    expect(document.querySelector('#float-root .float-toast')!.textContent).toContain('second');
    vi.advanceTimersByTime(1000);
    expect(document.querySelectorAll('#float-root .float-toast')).toHaveLength(0);
  });

  it('keeps an error until closed and truncates at 5', () => {
    vi.useFakeTimers();
    post({ kind: 'errors', lines: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'] });
    vi.advanceTimersByTime(TOAST_MS * 3);
    const box = document.querySelector('#float-root .float-error')!;
    expect(box.textContent).toContain('他 2 件のエラーがあります');
    (box.querySelector('.float-close') as HTMLButtonElement).click();
    expect(document.querySelectorAll('#float-root .float-error')).toHaveLength(0);
  });

  it('fires the action and stays while the action lives', () => {
    vi.useFakeTimers();
    let fired = 0;
    post({
      kind: 'saved',
      lines: ['次は住所を入力してください'],
      action: { label: '住所を入力する', onClick: () => { fired += 1; } },
    });
    (document.querySelector('#float-root .float-toast .float-row button') as HTMLButtonElement).click();
    expect(fired).toBe(1);
    vi.advanceTimersByTime(TOAST_MS * 3);
    expect(document.querySelectorAll('#float-root .float-toast')).toHaveLength(1);
  });

  it('shows and session-dismisses the guide', () => {
    expect(isGuideDismissed()).toBe(false);
    const node = el('div', 'guide');
    showGuide(node);
    expect(document.querySelectorAll('#float-root .float-guide')).toHaveLength(1);
    dismissGuideForSession();
    expect(isGuideDismissed()).toBe(true);
    expect(document.querySelectorAll('#float-root .float-guide')).toHaveLength(0);
    hideGuide();
    resetNoticeCenter();
    expect(isGuideDismissed()).toBe(false);
  });
});

describe('notice replacement', () => {
  it('keeps an error when the earlier toast timer deadline passes', () => {
    vi.useFakeTimers();
    post({ kind: 'saved', lines: ['保存しました'] });
    expect(document.querySelectorAll('#float-root .float-toast')).toHaveLength(1);
    vi.advanceTimersByTime(TOAST_MS - 1000);
    post({ kind: 'errors', lines: ['e1'] });
    expect(document.querySelectorAll('#float-root .float-error')).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(document.querySelectorAll('#float-root .float-error')).toHaveLength(1);
    expect(document.querySelectorAll('#float-root .float-toast')).toHaveLength(0);
    vi.advanceTimersByTime(TOAST_MS * 3);
    expect(document.querySelectorAll('#float-root .float-error')).toHaveLength(1);
  });

  it('lets a stale timer clear nothing after a replacement chain', () => {
    vi.useFakeTimers();
    post({ kind: 'saved', lines: ['first'] });
    vi.advanceTimersByTime(TOAST_MS - 1000);
    post({ kind: 'errors', lines: ['e1'] });
    post({ kind: 'saved', lines: ['second'] });
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
    post({
      kind: 'saved',
      lines: ['次は住所を入力してください'],
      action: { label: '住所を入力する', onClick: () => { fired += 1; } },
    });
    vi.advanceTimersByTime(TOAST_MS * 2);
    expect(document.querySelectorAll('#float-root .float-toast')).toHaveLength(1);
    post({ kind: 'saved', lines: ['保存しました'] });
    expect(document.querySelector('#float-root .float-toast')!.textContent).toContain('保存しました');
    vi.advanceTimersByTime(TOAST_MS - 1);
    expect(document.querySelectorAll('#float-root .float-toast')).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(document.querySelectorAll('#float-root .float-toast')).toHaveLength(0);
    expect(fired).toBe(0);
  });
});
