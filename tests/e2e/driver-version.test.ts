import { describe, expect, it } from 'vitest';
import {
  driverVersionFailureMessage, driverVersionStatus, parseMajorVersion,
} from './driver-version';

// Pure unit tests for the Chrome/ChromeDriver version preflight (PBI-204).
// The environment is never read: callers pass the raw `--version` outputs in,
// so the match / mismatch / unavailable decision is pinned without spawning a
// binary. The real launch stays covered by the Chrome E2E (chrome.e2e.ts).
describe('parseMajorVersion', () => {
  it('parses the major from a Chrome --version output', () => {
    expect(parseMajorVersion('Google Chrome 156.0.8078.76')).toBe('156');
  });

  it('parses the major from a ChromeDriver --version output with a build suffix', () => {
    expect(parseMajorVersion('ChromeDriver 154.0.8037.92 (abcdef)')).toBe('154');
  });

  it('parses a bare dotted version', () => {
    expect(parseMajorVersion('156.0.8078.76')).toBe('156');
  });

  it('returns null when the output carries no version', () => {
    expect(parseMajorVersion('ChromeDriver was started successfully')).toBeNull();
    expect(parseMajorVersion('')).toBeNull();
  });
});

describe('driverVersionStatus', () => {
  it('returns match when both majors are equal, even when the patch differs', () => {
    // The Selenium Manager cache resolved 156.0.8078.80 against an installed
    // Chrome 156.0.8078.76: the comparison is major-only on purpose.
    expect(driverVersionStatus('Google Chrome 156.0.8078.76', 'ChromeDriver 156.0.8078.80')).toBe('match');
  });

  it('returns mismatch when the majors differ (the stale-cache fallback case)', () => {
    expect(driverVersionStatus('Google Chrome 156.0.8078.76', 'ChromeDriver 154.0.8037.92')).toBe('mismatch');
  });

  it('returns unavailable when the Chrome version cannot be read', () => {
    expect(driverVersionStatus(null, 'ChromeDriver 154.0.8037.92')).toBe('unavailable');
  });

  it('returns unavailable when the driver version cannot be read', () => {
    expect(driverVersionStatus('Google Chrome 156.0.8078.76', null)).toBe('unavailable');
  });

  it('returns unavailable when neither version can be read', () => {
    expect(driverVersionStatus(null, null)).toBe('unavailable');
  });
});

describe('driverVersionFailureMessage', () => {
  it('names both majors, the resolved binary and the repair paths on a mismatch', () => {
    const message = driverVersionFailureMessage({
      status: 'mismatch',
      chromeMajor: '156',
      driverMajor: '154',
      driverPath: '/Users/x/.cache/selenium/chromedriver/mac-arm64/154.0.8037.92/chromedriver',
      cachePath: 'tmp/selenium-cache',
    });
    expect(message).toContain('154');
    expect(message).toContain('156');
    expect(message).toContain('/Users/x/.cache/selenium/chromedriver/mac-arm64/154.0.8037.92/chromedriver');
    expect(message).toContain('SE_CACHE_PATH');
    expect(message).toContain('chromedriver@156');
    expect(message).toContain('JUSHOAI_DRIVER_DOWNLOAD');
    expect(message).toContain('CHROMEDRIVER_BIN');
  });

  it('guides to CHROME_BIN when the Chrome version is unreadable', () => {
    const message = driverVersionFailureMessage({
      status: 'unavailable', chromeMajor: null, driverMajor: null, driverPath: null,
      cachePath: 'tmp/selenium-cache',
    });
    expect(message).toContain('CHROME_BIN');
    expect(message).toContain('SE_CACHE_PATH');
  });

  it('guides to the driver repair paths when only the driver is unresolved', () => {
    const message = driverVersionFailureMessage({
      status: 'unavailable', chromeMajor: '156', driverMajor: null, driverPath: null,
      cachePath: 'tmp/selenium-cache',
    });
    expect(message).toContain('156');
    expect(message).toContain('SE_CACHE_PATH');
    expect(message).toContain('JUSHOAI_DRIVER_DOWNLOAD');
    expect(message).toContain('CHROMEDRIVER_BIN');
  });

  it('names an unsupported platform instead of staying silent on the fail-safe fallback', () => {
    // The harness still tries the macOS Selenium Manager dir on an unknown
    // platform (fail safe); the message must say the platform is unsupported.
    const message = driverVersionFailureMessage({
      status: 'unavailable', chromeMajor: '156', driverMajor: null, driverPath: null,
      cachePath: 'tmp/selenium-cache', platform: 'freebsd',
    });
    expect(message).toContain('freebsd');
    expect(message).toContain('not supported by the bundled Selenium Manager');
    expect(message).toContain('CHROMEDRIVER_BIN');
    expect(driverVersionFailureMessage({
      status: 'unavailable', chromeMajor: '156', driverMajor: null, driverPath: null,
      cachePath: 'tmp/selenium-cache', platform: 'darwin',
    })).not.toContain('Platform note');
  });

  it('returns no message for a match', () => {
    expect(driverVersionFailureMessage({
      status: 'match', chromeMajor: '156', driverMajor: '156', driverPath: '/d/chromedriver',
      cachePath: 'tmp/selenium-cache',
    })).toBe('');
  });
});
