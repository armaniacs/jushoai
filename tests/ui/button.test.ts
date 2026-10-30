import { describe, it, expect, vi, afterEach } from 'vitest';
import { mountButton } from '../../src/ui/button';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

interface FakeClick {
  isTrusted: boolean;
  preventDefault(): void;
  stopPropagation(): void;
}

function fakeClick(isTrusted: boolean): FakeClick {
  return { isTrusted, preventDefault() {}, stopPropagation() {} };
}

interface FakePointerEvent {
  button: number;
  buttons: number;
  clientX: number;
  clientY: number;
  pointerId: number;
  key: string;
  shiftKey: boolean;
  preventDefault(): void;
  stopPropagation(): void;
}

function fakePointer(init: Partial<FakePointerEvent> = {}): FakePointerEvent {
  return {
    button: 0, buttons: 1, clientX: 0, clientY: 0, pointerId: 1, key: '', shiftKey: false,
    preventDefault() {}, stopPropagation() {},
    ...init,
  };
}

function mount(anchorRect?: DOMRect) {
  let root!: ShadowRoot;
  const attach = HTMLElement.prototype.attachShadow;
  vi.spyOn(HTMLElement.prototype, 'attachShadow').mockImplementation(function (this: HTMLElement) {
    root = attach.call(this, { mode: 'open' });
    return root;
  });
  // jsdom の Event は isTrusted が own・non-configurable の getter で常に false
  // のため、実クリック相当はハンドラ捕捉＋偽イベントで再現する。
  // 捕捉順: [0]=button, [1]=badge（button.ts の登録順）。
  const clickHandlers: Array<(e: FakeClick) => void> = [];
  const wrapHandlers: Record<string, Array<(e: FakePointerEvent) => void>> = {};
  const origAdd = EventTarget.prototype.addEventListener;
  vi.spyOn(EventTarget.prototype, 'addEventListener').mockImplementation(function (
    this: EventTarget,
    ...args: [string, EventListenerOrEventListenerObject | null, ...unknown[]]
  ) {
    const [type, listener] = args;
    if (type === 'click' && typeof listener === 'function' && this instanceof HTMLButtonElement) {
      clickHandlers.push(listener as (e: FakeClick) => void);
    }
    if (
      ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'keydown'].includes(type) &&
      typeof listener === 'function' &&
      (this instanceof HTMLDivElement || this === window)
    ) {
      (wrapHandlers[type] ??= []).push(listener as unknown as (e: FakePointerEvent) => void);
    }
    return Reflect.apply(origAdd as (...a: unknown[]) => void, this, args);
  });
  // vitest の jsdom 環境では window に addEventListener が own プロパティとし
  // て存在するため、prototype の spy では window 登録を捉えられない。ドラッグ
  // の window リスナー（pointermove/up/cancel）を捉えるための追加スパイ。
  const origWindowAdd = window.addEventListener;
  vi.spyOn(window, 'addEventListener').mockImplementation(function (
    this: unknown,
    ...args: [string, EventListenerOrEventListenerObject | null, ...unknown[]]
  ) {
    const [type, listener] = args;
    if (
      ['pointermove', 'pointerup', 'pointercancel'].includes(type) &&
      typeof listener === 'function'
    ) {
      (wrapHandlers[type] ??= []).push(listener as unknown as (e: FakePointerEvent) => void);
    }
    return Reflect.apply(origWindowAdd as (...a: unknown[]) => unknown, this, args);
  });
  const anchor = document.body.appendChild(document.createElement('input'));
  if (anchorRect) anchor.getBoundingClientRect = () => anchorRect;
  const onClick = vi.fn();
  const onBadgeClick = vi.fn();
  const handle = mountButton(anchor, onClick, onBadgeClick);
  return {
    handle,
    onClick,
    onBadgeClick,
    badge: () => root.querySelector('.badge')!,
    button: () => root.querySelector('button:not(.badge)') as HTMLButtonElement,
    wrap: () => root.querySelector('.wrap') as HTMLElement,
    css: () => root.querySelector('style')?.textContent ?? '',
    fireWrap: (type: string, init: Partial<FakePointerEvent> = {}) =>
      (wrapHandlers[type] ?? []).forEach((h) => h(fakePointer(init))),
    /** trusted=true が実クリック相当、false が el.click() 等の合成イベント相当 */
    fireButton: (trusted = true) => clickHandlers[0]?.(fakeClick(trusted)),
    fireBadge: (trusted = true) => clickHandlers[1]?.(fakeClick(trusted)),
  };
}

describe('mountButton', () => {
  it('shows an error as text and then restores the AI status', () => {
    vi.useFakeTimers();
    const { handle, badge } = mount();
    handle.setStatus({ status: 'available', provider: 'built-in' });
    handle.showError({ kind: 'transient', text: '<b>x</b>' });
    expect(badge().textContent).toBe('<b>x</b>');
    expect(badge().children).toHaveLength(0);
    vi.advanceTimersByTime(4000);
    expect(badge().textContent).toBe('AI 有効');
  });

  it('renders the badge as its own button and opens the guide with the current status', () => {
    const { handle, badge, onClick, onBadgeClick, fireBadge } = mount();
    expect(badge().tagName).toBe('BUTTON');
    expect(badge().closest('button:not(.badge)')).toBeNull();
    handle.setStatus({ status: 'unsupported', provider: 'built-in' });
    expect(badge().textContent).toBe('AI 無効');
    fireBadge();
    expect(onBadgeClick).toHaveBeenCalledWith({ status: 'unsupported', provider: 'built-in' });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('ignores badge clicks until a status has been set', () => {
    const { handle, onBadgeClick, fireBadge } = mount();
    fireBadge();
    expect(onBadgeClick).not.toHaveBeenCalled();
    handle.setStatus({ status: 'downloadable', provider: 'built-in' });
    fireBadge();
    expect(onBadgeClick).toHaveBeenCalledWith({ status: 'downloadable', provider: 'built-in' });
  });

  describe('isTrusted guard (PBI-02)', () => {
    it('starts the analyze flow on a trusted button click', () => {
      const { onClick, fireButton } = mount();
      fireButton(true);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('ignores a synthetic click on the button', () => {
      const { button, onClick, fireButton } = mount();
      fireButton(false);
      expect(onClick).not.toHaveBeenCalled();
      // 合成イベントは preventDefault まで届かず、デフォルト動作も抑止しない
      (button() as HTMLButtonElement).click();
      expect(onClick).not.toHaveBeenCalled();
    });

    it('ignores a synthetic click on the badge', () => {
      const { handle, badge, onBadgeClick, fireBadge } = mount();
      handle.setStatus({ status: 'unsupported', provider: 'built-in' });
      fireBadge(false);
      expect(onBadgeClick).not.toHaveBeenCalled();
      (badge() as HTMLButtonElement).click();
      expect(onBadgeClick).not.toHaveBeenCalled();
    });
  });

  describe('error announcement (PBI-83)', () => {
    it('announces a consent-gate failure reason politely without changing the wording', () => {
      const { handle, badge } = mount();
      handle.setStatus({ status: 'available', provider: 'built-in' });
      handle.showError({ kind: 'transient', text: '同意が確認できなかったため注入しませんでした' });
      expect(badge().textContent).toBe('同意が確認できなかったため注入しませんでした');
      expect(badge().getAttribute('aria-live')).toBe('polite');
      expect(badge().getAttribute('aria-atomic')).toBe('true');
    });

    it('announces an AI failure reason politely', () => {
      const { handle, badge } = mount();
      handle.setStatus({ status: 'available', provider: 'built-in' });
      handle.showError({ kind: 'transient', text: 'AI通信に失敗したためルールのみで表示: 再試行できます' });
      expect(badge().textContent).toBe('AI通信に失敗したためルールのみで表示: 再試行できます');
      expect(badge().getAttribute('aria-live')).toBe('polite');
      expect(badge().getAttribute('aria-atomic')).toBe('true');
    });

    it('does not announce ordinary status changes', () => {
      const { handle, badge } = mount();
      expect(badge().hasAttribute('aria-live')).toBe(false);
      handle.setStatus({ status: 'available', provider: 'built-in' });
      expect(badge().textContent).toBe('AI 有効');
      expect(badge().hasAttribute('aria-live')).toBe(false);
      expect(badge().hasAttribute('aria-atomic')).toBe(false);
    });

    it('stops announcing once the error display restores the ordinary status', () => {
      vi.useFakeTimers();
      const { handle, badge } = mount();
      handle.setStatus({ status: 'available', provider: 'built-in' });
      handle.showError({ kind: 'transient', text: 'エラー: 分類に失敗、再試行してください' });
      expect(badge().getAttribute('aria-live')).toBe('polite');
      vi.advanceTimersByTime(4000);
      expect(badge().textContent).toBe('AI 有効');
      expect(badge().hasAttribute('aria-live')).toBe(false);
      expect(badge().hasAttribute('aria-atomic')).toBe(false);
    });

    it('drops the error-restore timer on destroy', () => {
      vi.useFakeTimers();
      const { handle } = mount();
      handle.showError({ kind: 'transient', text: 'エラー: 分類に失敗、再試行してください' });
      expect(vi.getTimerCount()).toBe(1);
      handle.destroy();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('keeps the badge a button with no role override', () => {
      const { handle, badge } = mount();
      handle.showError({ kind: 'transient', text: 'エラー: 分類に失敗、再試行してください' });
      expect(badge().tagName).toBe('BUTTON');
      expect(badge().getAttribute('role')).toBeNull();
    });
  });

  describe('banner kind (PBI-152)', () => {
    it('keeps a partial banner after 4s without depending on the wording', () => {
      vi.useFakeTimers();
      const { handle, badge } = mount();
      handle.setStatus({ status: 'available', provider: 'built-in' });
      // The old wording sniff (includes('一部のみ適用')) would drop this
      // banner after 4s; the kind alone decides, so any wording persists.
      handle.showError({ kind: 'partial', text: '3/5件だけ入りました' });
      expect(badge().textContent).toBe('3/5件だけ入りました');
      vi.advanceTimersByTime(4000);
      expect(badge().textContent).toBe('3/5件だけ入りました');
      expect(badge().getAttribute('data-status')).toBe('error');
      vi.advanceTimersByTime(10000);
      expect(badge().textContent).toBe('3/5件だけ入りました');
    });

    it('restores the badge on the next status update after a partial banner', () => {
      vi.useFakeTimers();
      const { handle, badge } = mount();
      handle.setStatus({ status: 'available', provider: 'built-in' });
      handle.showError({ kind: 'partial', text: '一部のみ適用（3/5件）' });
      vi.advanceTimersByTime(4000);
      expect(badge().textContent).not.toBe('AI 有効');
      handle.setStatus({ status: 'available', provider: 'built-in' });
      expect(badge().textContent).toBe('AI 有効');
      expect(badge().hasAttribute('aria-live')).toBe(false);
    });

    it('restores a transient error after 4s even when the wording mentions partial application', () => {
      vi.useFakeTimers();
      const { handle, badge } = mount();
      handle.setStatus({ status: 'available', provider: 'built-in' });
      // The old sniff folded any text containing 一部のみ適用 into a residual;
      // the kind alone decides, so this transient restores like any other.
      handle.showError({ kind: 'transient', text: '一部のみ適用（3/5件）' });
      vi.advanceTimersByTime(4000);
      expect(badge().textContent).toBe('AI 有効');
    });

    it('sets no restore timer for a partial banner and drops it on destroy for a transient one', () => {
      vi.useFakeTimers();
      const { handle } = mount();
      handle.showError({ kind: 'partial', text: '一部のみ適用（3/5件）' });
      expect(vi.getTimerCount()).toBe(0);
      handle.showError({ kind: 'transient', text: 'エラー: 分類に失敗、再試行してください' });
      expect(vi.getTimerCount()).toBe(1);
      handle.destroy();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('keeps the badge reapply path on trusted clicks after a partial banner', () => {
      vi.useFakeTimers();
      const { handle, onBadgeClick, fireBadge } = mount();
      handle.setStatus({ status: 'available', provider: 'built-in' });
      handle.showError({ kind: 'partial', text: '一部のみ適用（3/5件）' });
      vi.advanceTimersByTime(4000);
      fireBadge(true);
      expect(onBadgeClick).toHaveBeenCalledWith({ status: 'available', provider: 'built-in' });
      fireBadge(false);
      expect(onBadgeClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('translucent banner (PBI-162)', () => {
    it('keeps the banner background translucent with opaque text and badge', () => {
      const { css } = mount();
      // Background only: the banner lets a still-covered field show through.
      // 0.9 keeps the page visible while the blended background over a white
      // form measures 5.0:1 against the white text (WCAG AA). The color rides
      // the --jushoai-banner-bg token (PBI-209); its light default keeps the
      // PBI-162 value, so the light banner is unchanged.
      expect(css()).toMatch(/\.wrap \{[^}]*background: var\(--jushoai-banner-bg\)/);
      expect(css()).toMatch(/--jushoai-banner-bg: rgba\(36, 87, 214, 0\.9\)/);
      // The badge colors are untouched (they carry the status meaning).
      expect(css()).toMatch(/\.badge\[data-status="error"\][^{]*\{ background: var\(--jushoai-banner-error-bg\); \}/);
      expect(css()).toMatch(/--jushoai-banner-error-bg: #b3261e/);
    });

    it('restores the opaque banner on hover, focus and active', () => {
      const { css } = mount();
      expect(css()).toMatch(/\.wrap:hover, \.wrap:focus-within, \.wrap:active \{ background: var\(--jushoai-banner-bg-active\); \}/);
      expect(css()).toMatch(/--jushoai-banner-bg-active: #1c46b3;/);
    });
  });

  describe('dark banner tokens (PBI-209)', () => {
    it('declares the banner tokens on :host with the light defaults and a dark override', () => {
      const { css } = mount();
      // Light defaults keep the PBI-162 banner colors: light OS is unchanged.
      expect(css()).toMatch(/:host \{[^}]*--jushoai-banner-bg: rgba\(36, 87, 214, 0\.9\)/);
      expect(css()).toMatch(/:host \{[^}]*--jushoai-banner-bg-active: #1c46b3;/);
      // The banner has its own shadow root (no OVERLAY_CSS), so the dark
      // override must ride this <style> block, not the panels'.
      expect(css()).toContain('@media (prefers-color-scheme: dark)');
      const dark = css().slice(css().indexOf('@media (prefers-color-scheme: dark)'));
      expect(dark).toMatch(/--jushoai-banner-bg: rgba\(28, 45, 100, 0\.9\)/);
      expect(dark).toMatch(/--jushoai-banner-bg-active: #1e3a8a;/);
    });
  });

  describe('placement', () => {
    function rect(top: number, left: number, right: number, bottom: number) {
      return { top, left, right, bottom, width: right - left, height: bottom - top, x: left, y: top, toJSON() {} } as DOMRect;
    }

    it('positions the host right of the anchor and recomputes on reposition()', () => {
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1000);
      vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(0);
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 220, 32));
      const anchor = document.body.appendChild(document.createElement('input'));
      let current = rect(100, 50, 250, 124);
      anchor.getBoundingClientRect = () => current;
      const handle = mountButton(anchor, () => {});
      const host = document.querySelector<HTMLElement>('[data-jushoai]')!;
      expect(host.style.left).toBe('258px');
      expect(host.style.top).toBe(`${100 + (24 - 32) / 2}px`);
      current = rect(300, 50, 250, 324);
      handle.reposition();
      expect(host.style.top).toBe(`${300 + (24 - 32) / 2}px`);
    });
  
    it('repositions when the status changes the host size', () => {
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(500);
      vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(0);
      let width = 200;
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => rect(0, 0, width, 32));
      const anchor = document.body.appendChild(document.createElement('input'));
      anchor.getBoundingClientRect = () => rect(100, 50, 250, 124);
      const handle = mountButton(anchor, () => {});
      const host = document.querySelector<HTMLElement>('[data-jushoai]')!;
      expect(host.style.left).toBe('258px');
      width = 300;
      handle.setStatus({ status: 'available', provider: 'built-in' });
      expect(host.style.left).toBe('50px');
    });

    it('keeps the last position when the anchor is detached or has no box yet', () => {
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1000);
      vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(0);
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 220, 32));
      const anchor = document.body.appendChild(document.createElement('input'));
      anchor.getBoundingClientRect = () => rect(100, 50, 250, 124);
      const handle = mountButton(anchor, () => {});
      const host = document.querySelector<HTMLElement>('[data-jushoai]')!;
      expect(host.style.left).toBe('258px');
      anchor.getBoundingClientRect = () => rect(0, 0, 0, 0);
      handle.reposition();
      expect(host.style.left).toBe('258px');
      expect(host.style.top).toBe(`${100 + (24 - 32) / 2}px`);
      anchor.remove();
      handle.reposition();
      expect(host.style.left).toBe('258px');
    });

    it('pins the host fixed and writes viewport coordinates even when scrolled', () => {
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1000);
      vi.spyOn(window, 'scrollX', 'get').mockReturnValue(0);
      vi.spyOn(window, 'scrollY', 'get').mockReturnValue(200);
      vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(0);
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 220, 32));
      const anchor = document.body.appendChild(document.createElement('input'));
      anchor.getBoundingClientRect = () => rect(100, 50, 250, 124);
      mountButton(anchor, () => {});
      const host = document.querySelector<HTMLElement>('[data-jushoai]')!;
      expect(host.style.getPropertyPriority('position')).toBe('important');
      expect(host.style.getPropertyValue('position')).toBe('fixed');
      // The host reset uses `all: initial !important`, so the coordinates must
      // also carry important priority to survive it.
      expect(host.style.getPropertyPriority('top')).toBe('important');
      expect(host.style.getPropertyPriority('left')).toBe('important');
      // Viewport space: the scroll offset is not folded in, so the written
      // value is exactly what the browser renders.
      expect(host.style.left).toBe('258px');
      expect(host.style.top).toBe(`${100 + (24 - 32) / 2}px`);
    });

    it('keeps the button on screen when a narrow viewport leaves no room above', () => {
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(500);
      vi.spyOn(window, 'scrollY', 'get').mockReturnValue(400);
      vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(0);
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 220, 32));
      const anchor = document.body.appendChild(document.createElement('input'));
      // Anchor wide enough that the right side cannot fit (250 + 8 + 220 > 492)
      // and near the top of the viewport, so there is no room above it either.
      anchor.getBoundingClientRect = () => rect(10, 50, 400, 34);
      mountButton(anchor, () => {});
      const host = document.querySelector<HTMLElement>('[data-jushoai]')!;
      // Falls below the anchor (34 + 8) instead of writing a negative top.
      expect(host.style.top).toBe('42px');
    });

    it('keeps the last position when every placement would cover a field (PBI-161)', () => {
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1000);
      vi.spyOn(window, 'scrollX', 'get').mockReturnValue(0);
      vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0);
      vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1000);
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 220, 32));
      const anchor = document.body.appendChild(document.createElement('input'));
      anchor.getBoundingClientRect = () => rect(100, 50, 250, 124);
      const handle = mountButton(anchor, () => {});
      const host = document.querySelector<HTMLElement>('[data-jushoai]')!;
      expect(host.style.left).toBe('258px');
      // One blocker covering the whole right/above/below space: no candidate
      // is collision-free, so the last good position stays.
      handle.reposition([{ top: 0, left: 0, right: 1000, bottom: 200 }]);
      expect(host.style.left).toBe('258px');
      expect(host.style.top).toBe(`${100 + (24 - 32) / 2}px`);
    });

    it('converts cached document rects to viewport space before avoiding (PBI-161)', () => {
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1000);
      vi.spyOn(window, 'scrollX', 'get').mockReturnValue(0);
      vi.spyOn(window, 'scrollY', 'get').mockReturnValue(300);
      vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1000);
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 220, 32));
      const anchor = document.body.appendChild(document.createElement('input'));
      anchor.getBoundingClientRect = () => rect(100, 50, 250, 124);
      const handle = mountButton(anchor, () => {});
      const host = document.querySelector<HTMLElement>('[data-jushoai]')!;
      expect(host.style.left).toBe('258px');
      // Document rect 400..440 minus scrollY 300 covers the viewport 100..140:
      // the right candidate (96..128) collides, above (60..92) stays clear.
      handle.reposition([{ top: 400, left: 252, right: 478, bottom: 440 }]);
      expect(host.style.top).toBe('60px');
      expect(host.style.left).toBe('50px');
    });
  });

  describe('drag (PBI-163)', () => {
    function rect(top: number, left: number, right: number, bottom: number) {
      return { top, left, right, bottom, width: right - left, height: bottom - top, x: left, y: top, toJSON() {} } as DOMRect;
    }
    // The prototype stub stands in for the fixed host box; moveHostTo reads
    // it, so the assertions are relative to the stub box, not the style.
    function measure() {
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1000);
      vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
      vi.spyOn(window, 'scrollX', 'get').mockReturnValue(0);
      vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0);
      vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1000);
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect(100, 100, 320, 132));
    }

    it('moves the host once the pointer passes the threshold and swallows the click', () => {
      measure();
      // The anchor has no box: the initial render places nothing and the
      // drag is the first position ever written.
      const { onClick, fireWrap, fireButton } = mount(rect(0, 0, 0, 0));
      fireWrap('pointerdown', { clientX: 110, clientY: 116 });
      fireWrap('pointermove', { clientX: 200, clientY: 140 });
      const host = document.querySelector<HTMLElement>('[data-jushoai]')!;
      expect(host.style.left).toBe('190px');
      expect(host.style.top).toBe('124px');
      fireWrap('pointerup', { clientX: 200, clientY: 140 });
      // The drag consumed the click that follows the release.
      fireButton(true);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('treats a sub-threshold gesture as a click', () => {
      measure();
      const { handle, onClick, fireWrap, fireButton } = mount(rect(100, 50, 250, 124));
      fireWrap('pointerdown', { clientX: 110, clientY: 116 });
      fireWrap('pointermove', { clientX: 112, clientY: 118 });
      fireWrap('pointerup', { clientX: 112, clientY: 118 });
      fireButton(true);
      expect(onClick).toHaveBeenCalledTimes(1);
      // No drag happened: the anchor-based position is still in effect.
      handle.reposition();
      const host = document.querySelector<HTMLElement>('[data-jushoai]')!;
      expect(host.style.left).toBe('258px');
    });

    it('keeps the manual position when reposition() runs afterwards', () => {
      measure();
      // The anchor rect is irrelevant after a manual move: reposition()
      // re-clamps the manual position instead of recomputing from the anchor.
      // The stub follows the written position, as the real browser's box does
      // for a fixed host.
      const { handle, fireWrap } = mount(rect(100, 50, 250, 124));
      fireWrap('pointerdown', { clientX: 110, clientY: 116 });
      fireWrap('pointermove', { clientX: 300, clientY: 200 });
      fireWrap('pointerup', { clientX: 300, clientY: 200 });
      const host = document.querySelector<HTMLElement>('[data-jushoai]')!;
      expect(host.style.left).toBe('290px');
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => rect(184, 290, 510, 216));
      handle.reposition();
      expect(host.style.left).toBe('290px');
      expect(host.style.top).toBe('184px');
    });

    it('clamps a manual position back into the viewport on resize', () => {
      measure();
      const { handle, fireWrap } = mount(rect(100, 50, 250, 124));
      fireWrap('pointerdown', { clientX: 110, clientY: 116 });
      fireWrap('pointermove', { clientX: 300, clientY: 200 });
      fireWrap('pointerup', { clientX: 300, clientY: 200 });
      const host = document.querySelector<HTMLElement>('[data-jushoai]')!;
      expect(host.style.left).toBe('290px');
      // The window shrank (DevTools docking): the written position is now
      // below the fold. The manual position wins, clamped into reach — the
      // banner must never become unreachable until a reload.
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => rect(1200, 290, 510, 1232));
      handle.reposition();
      expect(host.style.top).toBe(`${800 - 32 - 8}px`);
      expect(host.style.left).toBe('290px');
    });

    it('moves the host with arrow keys and the manual position survives reposition()', () => {
      measure();
      const { handle, fireWrap } = mount(rect(100, 50, 250, 124));
      const host = document.querySelector<HTMLElement>('[data-jushoai]')!;
      // The stub box is constant, so every key press reads the same origin:
      // ArrowLeft writes 100-16, ArrowUp(Shift) writes 100-64.
      fireWrap('keydown', { key: 'ArrowLeft' });
      expect(host.style.left).toBe('84px');
      fireWrap('keydown', { key: 'ArrowUp', shiftKey: true });
      expect(host.style.top).toBe('36px');
      // Manual: the anchor-based recompute must not overwrite either write.
      // The stub follows the written position, as the real browser's box does.
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => rect(36, 84, 304, 68));
      handle.reposition();
      expect(host.style.left).toBe('84px');
      expect(host.style.top).toBe('36px');
    });

    it('keeps the next legit click alive when a drag ends outside the banner', () => {
      measure();
      // Released over the page: the click that follows fires on the body and
      // never reaches the banner's listeners, so nothing consumes the flag.
      // The next gesture must clear it, or the fill flow needs two presses.
      const { onClick, fireWrap, fireButton } = mount(rect(100, 50, 250, 124));
      fireWrap('pointerdown', { clientX: 110, clientY: 116 });
      fireWrap('pointermove', { clientX: 400, clientY: 200 });
      fireWrap('pointerup', { clientX: 800, clientY: 600 });
      // The missed click is simulated by not firing fireButton here.
      fireWrap('pointerdown', { clientX: 110, clientY: 116 });
      fireWrap('pointerup', { clientX: 110, clientY: 116 });
      fireButton(true);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('ends a drag whose pointerup was missed over an iframe', () => {
      measure();
      const { handle, onClick, fireWrap, fireButton } = mount(rect(0, 0, 0, 0));
      fireWrap('pointerdown', { clientX: 110, clientY: 116 });
      // The release happened over an iframe and never reached the window:
      // the next move reports no held buttons, so the gesture is over and
      // the banner must not chase the cursor.
      fireWrap('pointermove', { clientX: 400, clientY: 200, buttons: 0 });
      const host = document.querySelector<HTMLElement>('[data-jushoai]')!;
      expect(host.style.left).toBe('');
      fireWrap('pointermove', { clientX: 500, clientY: 300 });
      expect(host.style.left).toBe('');
      // The release without a drag keeps the click alive.
      fireButton(true);
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(handle).toBeDefined();
    });

    it('leaves the next legit click alive after a pointercancel', () => {
      measure();
      const { onClick, fireWrap, fireButton } = mount(rect(100, 50, 250, 124));
      fireWrap('pointerdown', { clientX: 110, clientY: 116 });
      fireWrap('pointermove', { clientX: 400, clientY: 200 });
      // A canceled gesture fires no click: the flag set here must be cleared
      // by the next gesture, not by a click that never arrives.
      fireWrap('pointercancel', { clientX: 400, clientY: 200 });
      fireWrap('pointerdown', { clientX: 110, clientY: 116 });
      fireWrap('pointerup', { clientX: 110, clientY: 116 });
      fireButton(true);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('marks the banner draggable with a title and grab cursor', () => {
      const { css, wrap } = mount();
      expect(wrap().title).toBe('ドラッグで移動できます');
      expect(css()).toMatch(/\.wrap \{[^}]*touch-action: none; cursor: grab/);
    });

    it('announces the drag affordance through aria-describedby (title is hover-only)', () => {
      const { button, badge, wrap, css } = mount();
      const describedBy = button().getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      expect(badge().getAttribute('aria-describedby')).toBe(describedBy);
      const hint = wrap().querySelector(`#${describedBy}`)!;
      expect(hint.textContent).toBe('ドラッグ、または矢印キーで移動できます');
      expect(css()).toMatch(/\.hint \{[^}]*clip-path: inset\(50%\)/);
    });
  });
});
