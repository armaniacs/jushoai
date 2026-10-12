import { describe, expect, it } from 'vitest';
import { chromeLaunchArgs } from './chrome-flags';

// The environment is always passed explicitly so this file stays a pure unit test:
// it never reads or mutates the real process.env and never launches a browser.
describe('chromeLaunchArgs', () => {
  it('includes neither --no-sandbox nor --headless=new for an empty env, but the unconditional flags', () => {
    expect(chromeLaunchArgs({})).toEqual(['--disable-dev-shm-usage', '--disable-gpu']);
  });

  it('adds --no-sandbox when CI is set', () => {
    const args = chromeLaunchArgs({ CI: '1' });
    expect(args).toContain('--no-sandbox');
    expect(args).not.toContain('--headless=new');
  });

  it('adds --no-sandbox when E2E_NO_SANDBOX is set', () => {
    const args = chromeLaunchArgs({ E2E_NO_SANDBOX: '1' });
    expect(args).toContain('--no-sandbox');
    expect(args).not.toContain('--headless=new');
  });

  it('treats a set-but-empty CI as unset (no --no-sandbox)', () => {
    expect(chromeLaunchArgs({ CI: '' })).not.toContain('--no-sandbox');
  });

  it('treats a set-but-empty E2E_NO_SANDBOX as unset (no --no-sandbox)', () => {
    expect(chromeLaunchArgs({ E2E_NO_SANDBOX: '' })).not.toContain('--no-sandbox');
  });

  it('adds --headless=new only when HEADLESS is exactly 1', () => {
    expect(chromeLaunchArgs({ HEADLESS: '1' })).toEqual([
      '--headless=new', '--disable-dev-shm-usage', '--disable-gpu',
    ]);
    expect(chromeLaunchArgs({ HEADLESS: '0' })).not.toContain('--headless=new');
  });

  it('keeps the expected set for combined envs regardless of order', () => {
    // Flag order is meaningless to Chrome, so assert as a set: arrayContaining
    // catches a missing flag and the length check catches a surplus one.
    const full = ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'];
    for (const env of [{ HEADLESS: '1', CI: '1' }, { HEADLESS: '1', E2E_NO_SANDBOX: '1' }] as const) {
      const args = chromeLaunchArgs({ ...env });
      expect(args).toEqual(expect.arrayContaining(full));
      expect(args).toHaveLength(full.length);
    }
    const ciOnly = ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'];
    const ciArgs = chromeLaunchArgs({ CI: '1' });
    expect(ciArgs).toEqual(expect.arrayContaining(ciOnly));
    expect(ciArgs).toHaveLength(ciOnly.length);
  });
});
