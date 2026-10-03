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
});
