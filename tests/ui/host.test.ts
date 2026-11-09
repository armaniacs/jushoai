import { describe, it, expect, afterEach } from 'vitest';
import { createShadowHost } from '../../src/ui/host';
import { createOverlayHost } from '../../src/ui/overlay';

afterEach(() => { document.body.innerHTML = ''; });

// Compile-time guard: omitting position must be a type error so a new
// consumer cannot silently strand a static host. Checked by tsc --noEmit;
// the branch never runs.
if (false) {
  // @ts-expect-error - position is required to prevent static stranded hosts
  createShadowHost();
}

describe('createShadowHost', () => {
  it('marks critical declarations important so page stylesheets cannot override them', () => {
    const { host } = createShadowHost({ position: 'fixed' });
    expect(host.getAttribute('data-jushoai')).toBe('');
    for (const prop of ['all', 'z-index', 'position']) {
      expect(host.style.getPropertyPriority(prop)).toBe('important');
    }
    // jsdom 31 expands `all` into longhands: after the position/z-index
    // writes above diverge, the `all` shorthand no longer serializes, so
    // its value reads back '' (jsdom 30 kept the 'initial' text verbatim).
    // The reset itself still holds with important priority (asserted above).
    expect(host.style.getPropertyValue('all')).toBe('');
    expect(host.style.getPropertyValue('position')).toBe('fixed');
    expect(host.style.getPropertyValue('z-index')).toBe('2147483647');
  });
});

describe('createOverlayHost', () => {
  it('keeps the pinned corner important', () => {
    const { host } = createOverlayHost();
    for (const prop of ['position', 'top', 'right']) {
      expect(host.style.getPropertyPriority(prop)).toBe('important');
    }
    expect(host.style.position).toBe('fixed');
    expect(host.style.top).toBe('16px');
    expect(host.style.right).toBe('16px');
  });
});
