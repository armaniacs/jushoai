import { describe, expect, it, vi } from 'vitest';
import type { ProviderKind } from '../../src/ai/types';
import { ProviderRegistry } from '../../src/llm/provider-registry';
import type { PublicAiSettings } from '../../src/ai/types';
import { makeMeta } from '../helpers';

const openaiSettings = {
  provider: 'openai',
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'm' },
  gemini: { model: '', apiVersion: 'v1beta' },
  hasKey: { openai: true, gemini: false },
} as PublicAiSettings;
const secrets = { openai: 'sk-test' };

function registryWith(fetchMock: ReturnType<typeof vi.fn>, memory?: { authFailed: Set<ProviderKind>; compat: Set<ProviderKind> }) {
  const registry = new ProviderRegistry(
    {
      getLanguageModel: () => null,
      hasPermission: async () => true,
      fetch: fetchMock as unknown as typeof fetch,
      audit: { record: async () => {} },
    },
    memory,
  );
  return registry;
}

const statusJson = (status: number) => ({ ok: false, status, json: async () => ({}) }) as Response;

describe('provider registry: memory lifetime', () => {
  it('gives a failed provider a fresh start on invalidate()', async () => {
    const memory = { authFailed: new Set<ProviderKind>(), compat: new Set<ProviderKind>() };
    const fetchMock = vi.fn().mockResolvedValue(statusJson(401));
    const registry = registryWith(fetchMock, memory);
    const fields = [makeMeta({ id: 'a', label: '姓' })];
    expect(await registry.classify(openaiSettings, secrets, fields, { purpose: 'classify' }))
      .toEqual({ ok: false, reason: 'auth' });
    expect(memory.authFailed.has('openai')).toBe(true);
    expect((await registry.status(openaiSettings, secrets)).status).toBe('auth-error');
    registry.invalidate();
    expect(memory.authFailed.size).toBe(0);
    expect((await registry.status(openaiSettings, secrets)).status).toBe('available');
  });

  it('clears the compat memory on invalidate() so the strict request goes first again', async () => {
    const memory = { authFailed: new Set<ProviderKind>(), compat: new Set<ProviderKind>(['openai']) };
    const fetchMock = vi.fn().mockResolvedValue(statusJson(401));
    const registry = registryWith(fetchMock, memory);
    registry.invalidate();
    expect(memory.compat.size).toBe(0);
  });

  it('owns its memory when none is injected', async () => {
    const fetchMock = vi.fn().mockResolvedValue(statusJson(401));
    const registry = registryWith(fetchMock);
    expect(await registry.classify(openaiSettings, secrets, [makeMeta({ id: 'a', label: '姓' })], { purpose: 'classify' }))
      .toEqual({ ok: false, reason: 'auth' });
    registry.invalidate();
    expect((await registry.status(openaiSettings, secrets)).status).toBe('available');
  });
});
