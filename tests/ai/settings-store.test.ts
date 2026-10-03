// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryKeyStore } from '../../src/ai/secret-store';
import {
  AI_SETTINGS_KEY, loadAiSecrets, loadPublicAiSettings, saveAiSettings,
} from '../../src/ai/settings-store';
import { DEFAULT_AI_SETTINGS, type AiSettings } from '../../src/ai/types';

let store: Record<string, unknown>;

beforeEach(() => {
  store = {};
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: async (k: string) => (k in store ? { [k]: store[k] } : {}),
        set: async (o: Record<string, unknown>) => { Object.assign(store, o); },
      },
    },
  });
});

const settings: AiSettings = {
  provider: 'openai',
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'm' },
  gemini: { model: 'g', apiVersion: 'v1beta' },
};

describe('ai settings store', () => {
  it('returns defaults without keys when nothing is stored', async () => {
    expect(await loadPublicAiSettings()).toEqual({ ...DEFAULT_AI_SETTINGS, hasKey: { openai: false, gemini: false } });
    expect(await loadAiSecrets(new MemoryKeyStore())).toEqual({});
  });

  it('stores keys only as envelopes and exposes presence, never the key', async () => {
    const ks = new MemoryKeyStore();
    await saveAiSettings(settings, { openai: 'sk-secret-1' }, ks);
    expect(JSON.stringify(store[AI_SETTINGS_KEY])).not.toContain('sk-secret-1');
    const pub = await loadPublicAiSettings();
    expect(pub.hasKey).toEqual({ openai: true, gemini: false });
    expect(JSON.stringify(pub)).not.toContain('sk-secret-1');
    expect(await loadAiSecrets(ks)).toEqual({ openai: 'sk-secret-1' });
  });

  it('keeps an existing key when the update is undefined, replaces and deletes on request', async () => {
    const ks = new MemoryKeyStore();
    await saveAiSettings(settings, { openai: 'sk-one', gemini: 'g-one' }, ks);
    await saveAiSettings({ ...settings, provider: 'gemini' }, {}, ks);
    expect(await loadAiSecrets(ks)).toEqual({ openai: 'sk-one', gemini: 'g-one' });
    await saveAiSettings(settings, { openai: 'sk-two', gemini: '' }, ks);
    expect(await loadAiSecrets(ks)).toEqual({ openai: 'sk-two' });
    expect((await loadPublicAiSettings()).hasKey).toEqual({ openai: true, gemini: false });
  });

  it('normalizes settings on save', async () => {
    await saveAiSettings(
      { ...settings, openai: { baseUrl: ' https://api.openai.com/v1/ ', model: ' m ' } },
      {},
      new MemoryKeyStore(),
    );
    expect((await loadPublicAiSettings()).openai).toEqual({ baseUrl: 'https://api.openai.com/v1', model: 'm' });
  });

  it('treats an unreadable key as unset instead of throwing', async () => {
    await saveAiSettings(settings, { openai: 'sk-secret-1' }, new MemoryKeyStore());
    expect(await loadAiSecrets(new MemoryKeyStore())).toEqual({});
  });
});
