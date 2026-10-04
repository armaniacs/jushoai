import { describe, it, expect, vi, afterEach } from 'vitest';
import { OVERLAY_CSS, attachEscapeClose, createOverlayHost } from '../../src/ui/overlay';

describe('createOverlayHost', () => {
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

  it('attaches a closed shadow root', () => {
    const modes: ShadowRootMode[] = [];
    const attach = HTMLElement.prototype.attachShadow;
    vi.spyOn(HTMLElement.prototype, 'attachShadow').mockImplementation(function (this: HTMLElement, init) {
      modes.push(init.mode);
      return attach.call(this, init);
    });
    const { host, root } = createOverlayHost();
    expect(modes).toEqual(['closed']);
    expect(root.mode).toBe('closed');
    expect(host.shadowRoot).toBeNull();
    expect(host.getAttribute('data-jushoai')).toBe('');
  });

  it('pins the host to the top-right corner with fixed positioning', () => {
    const { host } = createOverlayHost();
    document.body.append(host);
    expect(host.style.position).toBe('fixed');
    expect(host.style.top).toBe('16px');
    expect(host.style.right).toBe('16px');
  });
});

describe('attachEscapeClose', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('calls the callback on Escape only, and stops after detaching', () => {
    const onEscape = vi.fn();
    const detach = attachEscapeClose(onEscape);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onEscape).toHaveBeenCalledOnce();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onEscape).toHaveBeenCalledOnce();
    detach();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onEscape).toHaveBeenCalledOnce();
  });

  it('listens in the capture phase, before a target-phase stopPropagation', () => {
    const onEscape = vi.fn();
    const detach = attachEscapeClose(onEscape);
    const target = document.createElement('div');
    document.body.append(target);
    target.addEventListener('keydown', (e) => e.stopPropagation());
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onEscape).toHaveBeenCalledOnce();
    detach();
  });
});

describe('OVERLAY_CSS', () => {
  it('defines the shared panel, heading, actions, and primary button styles', () => {
    for (const rule of ['.panel {', 'h2 {', '.actions {', 'button {', 'button.primary {']) {
      expect(OVERLAY_CSS).toContain(rule);
    }
  });
});
