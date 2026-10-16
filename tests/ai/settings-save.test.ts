// Direct unit tests for the settings-save pipeline: stage order, branch
// messages, and result shaping without a settings page. The resolved-address
// gate itself stays covered by tests/options/ai-section-egress-gate.test.ts.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const storeMocks = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }));
vi.mock('../../src/ai/settings-store', () => ({
  loadPublicAiSettings: storeMocks.load,
  saveAiSettings: storeMocks.save,
}));

const permMocks = vi.hoisted(() => ({ request: vi.fn(), remove: vi.fn(), contains: vi.fn() }));
vi.mock('../../src/ai/permissions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/ai/permissions')>();
  return { ...actual, requestHostPermission: permMocks.request, removeHostPermission: permMocks.remove, hasHostPermission: permMocks.contains };
});

const gateMocks = vi.hoisted(() => ({ validate: vi.fn() }));
vi.mock('../../src/ai/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/ai/settings')>();
  return { ...actual, validateAiSettingsResolved: gateMocks.validate };
});

vi.mock('../../src/ai/secret-store', () => ({
  IdbKeyStore: class {},
}));

import { completeSave, planSave, requestSavePermission, saveSettings, type SaveDraft } from '../../src/ai/settings-save';
import type { IdbKeyStore } from '../../src/ai/secret-store';

const deps = { keyStore: {} as IdbKeyStore, fetch: vi.fn() as unknown as typeof fetch };

function draft(over: Partial<SaveDraft> = {}): SaveDraft {
  return {
    settings: {
      provider: 'openai',
      openai: { baseUrl: 'https://api.openai.com/v1', model: 'm' },
      gemini: { model: '', apiVersion: 'v1beta' },
    },
    hasKey: { openai: false, gemini: false },
    keyInput: { openai: 'sk-new', gemini: '' },
    removeKey: { openai: false, gemini: false },
    savedOpenAi: { baseUrl: 'https://api.openai.com/v1', model: 'm' },
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  permMocks.request.mockResolvedValue(true);
  permMocks.remove.mockResolvedValue(false);
  permMocks.contains.mockResolvedValue(false);
  storeMocks.save.mockResolvedValue(undefined);
  storeMocks.load.mockResolvedValue({ hasKey: { openai: true, gemini: false } });
  gateMocks.validate.mockResolvedValue({ errors: [] });
});

describe('saveSettings: stage order', () => {
  it('asks permission first, then runs the resolved gate, then persists', async () => {
    const order: string[] = [];
    permMocks.request.mockImplementation(async () => { order.push('permission'); return true; });
    gateMocks.validate.mockImplementation(async () => { order.push('gate'); return { errors: [] }; });
    storeMocks.save.mockImplementation(async () => { order.push('save'); });
    const result = await saveSettings(draft(), deps);
    expect(order).toEqual(['permission', 'gate', 'save']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.permissionGranted).toBe(true);
      expect(result.settings.openai.baseUrl).toBe('https://api.openai.com/v1');
      expect(result.hasKey).toEqual({ openai: true, gemini: false });
    }
  });

  it('persists without a permission prompt when no origins are required', async () => {
    const d = draft({ settings: { provider: 'none', openai: { baseUrl: '', model: '' }, gemini: { model: '', apiVersion: 'v1beta' } } });
    const result = await saveSettings(d, deps);
    expect(result.ok).toBe(true);
    expect(permMocks.request).not.toHaveBeenCalled();
    expect(storeMocks.save).toHaveBeenCalledOnce();
  });

  it('still persists when permission is denied, flagging the grant', async () => {
    permMocks.request.mockResolvedValue(false);
    const result = await saveSettings(draft(), deps);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.permissionGranted).toBe(false);
    expect(storeMocks.save).toHaveBeenCalledOnce();
  });
});

describe('saveSettings: branches', () => {
  it('blocks the save when the base URL changed without a fresh key', async () => {
    const d = draft({
      hasKey: { openai: true, gemini: false },
      keyInput: { openai: '', gemini: '' },
      savedOpenAi: { baseUrl: 'https://old.example.com/v1', model: 'm' },
    });
    const result = await saveSettings(d, deps);
    expect(result).toEqual({
      ok: false,
      message: 'ベース URL を変更したため、API キーを入力し直してください（保存済みのキーは別のホストに送られません）。',
      rolledBack: false,
    });
    expect(storeMocks.save).not.toHaveBeenCalled();
  });

  it('returns lexical errors before any prompt, gate, or write', async () => {
    const d = draft({
      settings: {
        provider: 'openai',
        openai: { baseUrl: 'https://api.openai.com/v1', model: '' },
        gemini: { model: '', apiVersion: 'v1beta' },
      },
    });
    const result = await saveSettings(d, deps);
    expect(result.ok).toBe(false);
    expect(permMocks.request).not.toHaveBeenCalled();
    expect(gateMocks.validate).not.toHaveBeenCalled();
    expect(storeMocks.save).not.toHaveBeenCalled();
  });

  it('returns gate errors without writing', async () => {
    gateMocks.validate.mockResolvedValue({ errors: ['接続先のアドレスを解決できなかったため、指定できません'] });
    const result = await saveSettings(draft(), deps);
    expect(result).toEqual({ ok: false, message: '接続先のアドレスを解決できなかったため、指定できません', rolledBack: false });
    expect(storeMocks.save).not.toHaveBeenCalled();
  });

  it('reports rolledBack:true when the granted origins are removed', async () => {
    gateMocks.validate.mockResolvedValue({ errors: ['接続先のアドレスを解決できなかったため、指定できません'] });
    permMocks.remove.mockResolvedValue(true);
    const result = await saveSettings(draft(), deps);
    expect(result).toEqual({ ok: false, message: '接続先のアドレスを解決できなかったため、指定できません', rolledBack: true });
  });

  it('reports a store failure without re-reading presence', async () => {
    storeMocks.save.mockRejectedValue(new Error('disk'));
    const result = await saveSettings(draft(), deps);
    expect(result).toEqual({ ok: false, message: '保存に失敗しました。もう一度お試しください。', rolledBack: false });
    expect(storeMocks.load).not.toHaveBeenCalled();
  });

  it('reports a presence re-read failure after a successful write', async () => {
    storeMocks.load.mockRejectedValue(new Error('gone'));
    const result = await saveSettings(draft(), deps);
    expect(result).toEqual({
      ok: false,
      message: '保存しましたが、保存状態の再読み込みに失敗しました。設定ページを開き直してください。',
      rolledBack: false,
    });
    expect(storeMocks.save).toHaveBeenCalledOnce();
  });

  it('sends key removals as empty updates on a keyless loopback endpoint', async () => {
    const loopback = 'http://localhost:11434/v1';
    const d = draft({
      settings: {
        provider: 'openai',
        openai: { baseUrl: loopback, model: 'm' },
        gemini: { model: '', apiVersion: 'v1beta' },
      },
      hasKey: { openai: true, gemini: false },
      keyInput: { openai: '', gemini: '' },
      removeKey: { openai: true, gemini: false },
      savedOpenAi: { baseUrl: loopback, model: 'm' },
    });
    const result = await saveSettings(d, deps);
    expect(result.ok).toBe(true);
    expect(storeMocks.save).toHaveBeenCalledOnce();
    const [, update] = storeMocks.save.mock.calls[0] as [unknown, Record<string, string>];
    expect(update).toEqual({ openai: '' });
  });
});

describe('saveSettings: staged pipeline', () => {
  it('plans without I/O and completes with a minted grant', async () => {
    const planned = planSave(draft());
    expect('message' in planned).toBe(false);
    if ('message' in planned) return;
    const grant = await requestSavePermission(planned);
    expect(grant.granted).toBe(true);
    const result = await completeSave(planned, grant, deps);
    expect(result.ok).toBe(true);
  });

  it('rejects completion without a minted grant at the type level', async () => {
    const planned = planSave(draft());
    expect('message' in planned).toBe(false);
    if ('message' in planned) return;
    // @ts-expect-error - completing without the gesture stage must not typecheck.
    await expect(completeSave(planned, undefined, deps)).rejects.toThrow();
  });
});

describe('saveSettings: permission rollback', () => {
  it('removes the granted origins when the resolved-address gate rejects the save', async () => {
    gateMocks.validate.mockResolvedValue({ errors: ['接続先のアドレスを解決できなかったため、指定できません'] });
    const result = await saveSettings(draft(), deps);
    expect(result.ok).toBe(false);
    expect(storeMocks.save).not.toHaveBeenCalled();
    expect(permMocks.remove).toHaveBeenCalledOnce();
    expect(permMocks.remove.mock.calls[0]![0]).toEqual(
      expect.arrayContaining(['https://api.openai.com/*']),
    );
  });

  it('removes the granted origins when persisting fails', async () => {
    storeMocks.save.mockRejectedValue(new Error('disk'));
    const result = await saveSettings(draft(), deps);
    expect(result.ok).toBe(false);
    expect(permMocks.remove).toHaveBeenCalledOnce();
  });

  it('keeps the permission when the save succeeds', async () => {
    const result = await saveSettings(draft(), deps);
    expect(result.ok).toBe(true);
    expect(permMocks.remove).not.toHaveBeenCalled();
  });

  it('still rejects the save when the rollback itself fails', async () => {
    gateMocks.validate.mockResolvedValue({ errors: ['接続先のアドレスを解決できなかったため、指定できません'] });
    permMocks.remove.mockRejectedValue(new Error('deny'));
    const result = await saveSettings(draft(), deps);
    expect(result).toEqual({ ok: false, message: '接続先のアドレスを解決できなかったため、指定できません', rolledBack: false });
    expect(storeMocks.save).not.toHaveBeenCalled();
  });

  it('does not strip a pre-existing permission when the save fails', async () => {
    permMocks.contains.mockResolvedValue(true);
    gateMocks.validate.mockResolvedValue({ errors: ['接続先のアドレスを解決できなかったため、指定できません'] });
    const result = await saveSettings(draft(), deps);
    expect(result.ok).toBe(false);
    expect(permMocks.remove).not.toHaveBeenCalled();
  });

  it('warns when the rollback itself fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      gateMocks.validate.mockResolvedValue({ errors: ['接続先のアドレスを解決できなかったため、指定できません'] });
      permMocks.remove.mockResolvedValue(false);
      const result = await saveSettings(draft(), deps);
      expect(result.ok).toBe(false);
      expect(warn).toHaveBeenCalledOnce();
    } finally {
      warn.mockRestore();
    }
  });

  it('does not warn or remove when no origins were ever requested', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const d = draft({ settings: { provider: 'none', openai: { baseUrl: '', model: '' }, gemini: { model: '', apiVersion: 'v1beta' } } });
      storeMocks.save.mockRejectedValueOnce(new Error('disk'));
      const result = await saveSettings(d, deps);
      expect(result.ok).toBe(false);
      expect(permMocks.remove).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
