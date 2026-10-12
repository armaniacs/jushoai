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

  it('treats a set-but-empty CI as set', () => {
    expect(chromeLaunchArgs({ CI: '' })).toContain('--no-sandbox');
  });

  it('adds --headless=new only when HEADLESS is exactly 1', () => {
    expect(chromeLaunchArgs({ HEADLESS: '1' })).toEqual([
      '--headless=new', '--disable-dev-shm-usage', '--disable-gpu',
    ]);
    expect(chromeLaunchArgs({ HEADLESS: '0' })).not.toContain('--headless=new');
  });

  it('keeps the expected set and order for combined envs', () => {
    expect(chromeLaunchArgs({ HEADLESS: '1', CI: '1' })).toEqual([
      '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
    ]);
    expect(chromeLaunchArgs({ HEADLESS: '1', E2E_NO_SANDBOX: '1' })).toEqual([
      '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
    ]);
    expect(chromeLaunchArgs({ CI: '1' })).toEqual([
      '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
    ]);
  });
});
