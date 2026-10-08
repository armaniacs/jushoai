import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const read = (dir: string) => JSON.parse(readFileSync(`dist/${dir}/manifest.json`, 'utf8'));

describe('firefox manifest', () => {
  const m = read('firefox-mv3');

  it('is MV3 with a gecko id and a minimum version that supports optional host permissions', () => {
    expect(m.manifest_version).toBe(3);
    expect(m.browser_specific_settings.gecko.id).toBe('jushoai@armaniacs.github.io');
    expect(m.browser_specific_settings.gecko.strict_min_version).toBe('128.0');
  });

  it('runs the background as an event page, not a service worker', () => {
    expect(m.background.scripts).toEqual(['background.js']);
    expect(m.background.service_worker).toBeUndefined();
  });

  it('keeps the permission model identical to Chrome', () => {
    const c = read('chrome-mv3');
    expect(m.permissions).toEqual(c.permissions);
    expect(m.optional_host_permissions).toEqual(c.optional_host_permissions);
  });
});

describe('chrome manifest', () => {
  it('has no gecko settings and keeps the service worker', () => {
    const c = read('chrome-mv3');
    expect(c.browser_specific_settings).toBeUndefined();
    expect(c.background.service_worker).toBe('background.js');
  });
});
