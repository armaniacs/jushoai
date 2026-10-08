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

describe('data collection consent', () => {
  const origins = ['https://a/*'];
  const makeApi = () => ({ contains: vi.fn().mockResolvedValue(true), request: vi.fn().mockResolvedValue(true) });

  it('asks for websiteContent together with the origins on Firefox', async () => {
    const api = makeApi();
    await hasHostPermission(origins, api, true);
    await requestHostPermission(origins, api, true);
    const query = { origins, data_collection: ['websiteContent'] };
    expect(api.contains).toHaveBeenCalledWith(query);
    expect(api.request).toHaveBeenCalledWith(query);
  });

  it('keeps the Chrome query to origins only', async () => {
    const api = makeApi();
    await hasHostPermission(origins, api, false);
    await requestHostPermission(origins, api, false);
    expect(api.contains.mock.calls[0]![0]).toStrictEqual({ origins });
    expect(api.request.mock.calls[0]![0]).toStrictEqual({ origins });
  });

  it('treats a denied or throwing API as not granted on Firefox', async () => {
    const denied = { contains: vi.fn().mockResolvedValue(false), request: vi.fn().mockResolvedValue(false) };
    expect(await hasHostPermission(origins, denied, true)).toBe(false);
    expect(await requestHostPermission(origins, denied, true)).toBe(false);
    const failing = { contains: vi.fn().mockRejectedValue(new Error('x')), request: vi.fn().mockRejectedValue(new Error('x')) };
    expect(await hasHostPermission(origins, failing, true)).toBe(false);
    expect(await requestHostPermission(origins, failing, true)).toBe(false);
  });

  it('never asks the API without origins even on Firefox', async () => {
    const api = makeApi();
    expect(await requestHostPermission([], api, true)).toBe(false);
    expect(api.request).not.toHaveBeenCalled();
  });
});

