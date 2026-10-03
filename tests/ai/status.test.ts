import { describe, it, expect } from 'vitest';
import { computeCloudStatus } from '../../src/ai/status';
import { DEFAULT_AI_SETTINGS, type AiSettings } from '../../src/ai/types';

const openai: AiSettings = {
  ...DEFAULT_AI_SETTINGS,
  provider: 'openai',
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'm' },
};
const input = (over: Partial<Parameters<typeof computeCloudStatus>[0]> = {}) => ({
  settings: openai,
  hasKey: { openai: true, gemini: false },
  permitted: true,
  authFailed: false,
  ...over,
});

describe('computeCloudStatus', () => {
  it('is disabled for none and built-in handled elsewhere', () => {
    expect(computeCloudStatus(input({ settings: { ...openai, provider: 'none' } }))).toBe('disabled');
  });

  it('walks through not-configured, permission-missing, auth-error, available', () => {
    expect(computeCloudStatus(input({ hasKey: { openai: false, gemini: false } }))).toBe('not-configured');
    expect(computeCloudStatus(input({ permitted: false }))).toBe('permission-missing');
    expect(computeCloudStatus(input({ authFailed: true }))).toBe('auth-error');
    expect(computeCloudStatus(input())).toBe('available');
  });

  it('prefers not-configured over permission-missing and permission-missing over auth-error', () => {
    expect(computeCloudStatus(input({ hasKey: { openai: false, gemini: false }, permitted: false }))).toBe('not-configured');
    expect(computeCloudStatus(input({ permitted: false, authFailed: true }))).toBe('permission-missing');
  });

  it('works for Gemini and for keyless loopback endpoints', () => {
    const gemini: AiSettings = { ...openai, provider: 'gemini', gemini: { model: 'g', apiVersion: 'v1beta' } };
    expect(computeCloudStatus(input({ settings: gemini, hasKey: { openai: false, gemini: true } }))).toBe('available');
    const local: AiSettings = { ...openai, openai: { baseUrl: 'http://localhost:11434/v1', model: 'm' } };
    expect(computeCloudStatus(input({ settings: local, hasKey: { openai: false, gemini: false } }))).toBe('available');
  });
});
