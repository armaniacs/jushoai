import { describe, it, expect, afterEach } from 'vitest';
import { createShadowHost } from '../../src/ui/host';
import { createOverlayHost } from '../../src/ui/overlay';

afterEach(() => { document.body.innerHTML = ''; });

describe('createShadowHost', () => {
  it('marks critical declarations important so page stylesheets cannot override them', () => {
    const { host } = createShadowHost();
    expect(host.getAttribute('data-jushoai')).toBe('');
    for (const prop of ['all', 'position', 'z-index']) {
      expect(host.style.getPropertyPriority(prop)).toBe('important');
    }
    expect(host.style.getPropertyValue('all')).toBe('initial');
    expect(host.style.getPropertyValue('position')).toBe('absolute');
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
