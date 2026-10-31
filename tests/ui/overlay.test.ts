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

  it('overrides every dark token in the dark palette (PBI-209)', () => {
    const dark = OVERLAY_CSS.slice(OVERLAY_CSS.indexOf('@media (prefers-color-scheme: dark)'));
    // The full dark palette is pinned token by token: a silent hex drift in
    // one entry must fail instead of shipping a half-updated panel.
    const palette: Array<[string, string]> = [
      ['--jushoai-panel-bg', '#212530'],
      ['--jushoai-panel-fg', '#e8eaf0'],
      ['--jushoai-border', '#3a4152'],
      ['--jushoai-button-bg', '#2b303c'],
      ['--jushoai-muted', '#a3abbd'],
      ['--jushoai-divider', '#2f3441'],
      ['--jushoai-danger', '#ff8a80'],
      ['--jushoai-chip-bg', '#262b36'],
      ['--jushoai-chip-border', '#3a4152'],
      ['--jushoai-warn', '#ffb74d'],
      ['--jushoai-input-border', '#565e70'],
    ];
    for (const [token, value] of palette) {
      expect(dark).toContain(`${token}: ${value};`);
    }
  });

  it('puts the dark color-scheme override after the light .panel rule (PBI-209)', () => {
    // Cascade order: both .panel rules have specificity (0,1,0) and the same
    // origin, so the later one wins in BOTH modes. A dark override placed
    // before the main rule would pin color-scheme to light even on dark OS,
    // leaving native selects/inputs/checkboxes light on the dark panel.
    const darkScheme = OVERLAY_CSS.indexOf('.panel { color-scheme: dark');
    const lightScheme = OVERLAY_CSS.lastIndexOf('color-scheme: light');
    expect(darkScheme).toBeGreaterThan(-1);
    expect(lightScheme).toBeGreaterThan(-1);
    expect(darkScheme).toBeGreaterThan(lightScheme);
  });
});
