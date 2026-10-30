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

  it('declares the theme tokens on :host with the light defaults and a dark override (PBI-209)', () => {
    // Light defaults keep the pre-PBI hexes: light OS appearance is unchanged.
    expect(OVERLAY_CSS).toMatch(/:host \{[^}]*--jushoai-panel-bg: #fff;/);
    expect(OVERLAY_CSS).toMatch(/:host \{[^}]*--jushoai-panel-fg: #1a1a1a;/);
    // The dark override lives in the same <style> block: the host's
    // all: initial !important keeps page-side :root variables from reaching
    // the shadow tree, so the tokens cannot come from the page.
    expect(OVERLAY_CSS).toContain('@media (prefers-color-scheme: dark)');
    const dark = OVERLAY_CSS.slice(OVERLAY_CSS.indexOf('@media (prefers-color-scheme: dark)'));
    expect(dark).toMatch(/--jushoai-panel-bg: #212530;/);
    expect(dark).toMatch(/--jushoai-panel-fg: #e8eaf0;/);
  });
});
