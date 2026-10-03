import { describe, it, expect, vi } from 'vitest';
import { hasHostPermission, originPatternsFor, requestHostPermission } from '../../src/ai/permissions';
import { DEFAULT_AI_SETTINGS, type AiSettings } from '../../src/ai/types';

const openai: AiSettings = {
  ...DEFAULT_AI_SETTINGS,
  provider: 'openai',
  openai: { baseUrl: 'https://api.groq.com/openai/v1', model: 'm' },
};

describe('originPatternsFor', () => {
  it('returns the provider origin only for cloud providers', () => {
    expect(originPatternsFor(openai)).toEqual(['https://api.groq.com/*']);
    expect(originPatternsFor({ ...openai, provider: 'gemini' })).toEqual(['https://generativelanguage.googleapis.com/*']);
    expect(originPatternsFor({ ...openai, provider: 'none' })).toEqual([]);
    expect(originPatternsFor({ ...openai, provider: 'built-in' })).toEqual([]);
  });

  it('returns nothing when the base URL is invalid', () => {
    expect(originPatternsFor({ ...openai, openai: { baseUrl: 'http://example.com', model: 'm' } })).toEqual([]);
  });
});

describe('host permission helpers', () => {
  it('delegates to the permissions API and treats failures as not granted', async () => {
    const api = { contains: vi.fn().mockResolvedValue(true), request: vi.fn().mockResolvedValue(true) };
    expect(await hasHostPermission(['https://a/*'], api)).toBe(true);
    expect(await requestHostPermission(['https://a/*'], api)).toBe(true);
    expect(api.contains).toHaveBeenCalledWith({ origins: ['https://a/*'] });
    const failing = { contains: vi.fn().mockRejectedValue(new Error('x')), request: vi.fn().mockRejectedValue(new Error('x')) };
    expect(await hasHostPermission(['https://a/*'], failing)).toBe(false);
    expect(await requestHostPermission(['https://a/*'], failing)).toBe(false);
  });

  it('never asks the API when there is nothing to request', async () => {
    const api = { contains: vi.fn(), request: vi.fn() };
    expect(await hasHostPermission([], api)).toBe(false);
    expect(await requestHostPermission([], api)).toBe(false);
    expect(api.contains).not.toHaveBeenCalled();
    expect(api.request).not.toHaveBeenCalled();
  });
});
