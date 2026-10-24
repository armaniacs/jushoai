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

function mount() {
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
  const origAdd = EventTarget.prototype.addEventListener;
  vi.spyOn(EventTarget.prototype, 'addEventListener').mockImplementation(function (
    this: EventTarget,
    ...args: [string, EventListenerOrEventListenerObject | null, ...unknown[]]
  ) {
    const [type, listener] = args;
    if (type === 'click' && typeof listener === 'function' && this instanceof HTMLButtonElement) {
      clickHandlers.push(listener as (e: FakeClick) => void);
    }
    return Reflect.apply(origAdd as (...a: unknown[]) => void, this, args);
  });
  const anchor = document.body.appendChild(document.createElement('input'));
  const onClick = vi.fn();
  const onBadgeClick = vi.fn();
  const handle = mountButton(anchor, onClick, onBadgeClick);
  return {
    handle,
    onClick,
    onBadgeClick,
    badge: () => root.querySelector('.badge')!,
    button: () => root.querySelector('button:not(.badge)') as HTMLButtonElement,
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
  });
});
