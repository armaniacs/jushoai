import { describe, it, expect, vi, afterEach } from 'vitest';
import { mountButton } from '../../src/ui/button';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

function mount() {
  let root!: ShadowRoot;
  const attach = HTMLElement.prototype.attachShadow;
  vi.spyOn(HTMLElement.prototype, 'attachShadow').mockImplementation(function (this: HTMLElement) {
    root = attach.call(this, { mode: 'open' });
    return root;
  });
  const anchor = document.body.appendChild(document.createElement('input'));
  const onClick = vi.fn();
  const onBadgeClick = vi.fn();
  const handle = mountButton(anchor, onClick, onBadgeClick);
  return { handle, onClick, onBadgeClick, badge: () => root.querySelector('.badge')! };
}

describe('mountButton', () => {
  it('shows an error as text and then restores the AI status', () => {
    vi.useFakeTimers();
    const { handle, badge } = mount();
    handle.setStatus({ status: 'available', provider: 'built-in' });
    handle.showError('<b>x</b>');
    expect(badge().textContent).toBe('<b>x</b>');
    expect(badge().children).toHaveLength(0);
    vi.advanceTimersByTime(4000);
    expect(badge().textContent).toBe('AI 有効');
  });

  it('renders the badge as its own button and opens the guide with the current status', () => {
    const { handle, badge, onClick, onBadgeClick } = mount();
    expect(badge().tagName).toBe('BUTTON');
    expect(badge().closest('button:not(.badge)')).toBeNull();
    handle.setStatus({ status: 'unsupported', provider: 'built-in' });
    expect(badge().textContent).toBe('AI 無効');
    (badge() as HTMLButtonElement).click();
    expect(onBadgeClick).toHaveBeenCalledWith({ status: 'unsupported', provider: 'built-in' });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('ignores badge clicks until a status has been set', () => {
    const { handle, badge, onBadgeClick } = mount();
    (badge() as HTMLButtonElement).click();
    expect(onBadgeClick).not.toHaveBeenCalled();
    handle.setStatus({ status: 'downloadable', provider: 'built-in' });
    (badge() as HTMLButtonElement).click();
    expect(onBadgeClick).toHaveBeenCalledWith({ status: 'downloadable', provider: 'built-in' });
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
  });
});
