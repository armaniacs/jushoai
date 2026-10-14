import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_AI_SETTINGS } from '../../src/ai/types';
import type { LanguageModelStatic } from '../../src/llm/availability';
import { handleMessage, type HandlerDeps } from '../../src/llm/handle-message';
import { ProviderRegistry } from '../../src/llm/provider-registry';

// API Contract (fixed): `runTest` keeps built-in 'unavailable' distinct from
// 'network', matching ai-classify (handle-message.ts runTest vs selectClassifier).
// "Model not downloaded yet" and "real network failure" are distinguishable
// on the ai-test path, and the settings screen shows a dedicated message.

const builtInLm = (availability: string): LanguageModelStatic => ({
  availability: async () => availability as never,
  create: async () => ({ prompt: async () => '{"t":"lastName"}', destroy: () => {} }),
});

function depsFor(lm: LanguageModelStatic | null): HandlerDeps {
  const registry = new ProviderRegistry({
    getLanguageModel: () => lm,
    hasPermission: async () => true,
    fetch: vi.fn() as unknown as typeof fetch,
    audit: { record: async () => {} },
  });
  return {
    registry,
    loadSettings: async () => ({ ...DEFAULT_AI_SETTINGS, provider: 'built-in' as const, hasKey: { openai: false, gemini: false } }),
    loadSecrets: async () => ({}),
  };
}

describe('ai-test unavailable mapping (API Contract Medium)', () => {
  it('reports unavailable (not network) when built-in AI is present but unusable', async () => {
    expect(await handleMessage({ type: 'ai-test' }, depsFor(builtInLm('unavailable'))))
      .toEqual({ ok: false, reason: 'unavailable' });
  });

  it('reports unavailable when no LanguageModel implementation exists', async () => {
    expect(await handleMessage({ type: 'ai-test' }, depsFor(null)))
      .toEqual({ ok: false, reason: 'unavailable' });
  });

  it('ai-classify keeps unavailable distinct on the same deps', async () => {
    expect(await handleMessage({ type: 'ai-classify', fields: [] }, depsFor(builtInLm('unavailable'))))
      .toEqual({ ok: false, reason: 'unavailable' });
  });
});
