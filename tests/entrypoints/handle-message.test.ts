import { describe, it, expect, vi } from 'vitest';
import { handleMessage } from '../../src/llm/handle-message';
import type { LanguageModelStatic } from '../../src/llm/availability';

const lmWith = (status: string, output = '{"a":"email"}') => {
  const destroy = vi.fn();
  const prompt = vi.fn().mockResolvedValue(output);
  const create = vi.fn().mockResolvedValue({ prompt, destroy });
  return { lm: { availability: vi.fn().mockResolvedValue(status), create } as unknown as LanguageModelStatic, create, prompt };
};

describe('handleMessage', () => {
  it('ignores unknown messages', async () => {
    expect(await handleMessage({ type: 'open-options' }, { lm: null })).toBeUndefined();
    expect(await handleMessage('x', { lm: null })).toBeUndefined();
  });

  it('answers ai-status', async () => {
    expect(await handleMessage({ type: 'ai-status' }, { lm: null })).toEqual({ status: 'unsupported' });
    expect(await handleMessage({ type: 'ai-status' }, { lm: lmWith('downloadable').lm })).toEqual({ status: 'downloadable' });
  });

  it('classifies only when available and returns serializable entries', async () => {
    const msg = { type: 'ai-classify', fields: [{ id: 'a', name: 'x' }] };
    expect(await handleMessage(msg, { lm: lmWith('downloadable').lm })).toEqual({ ok: false });
    expect(await handleMessage(msg, { lm: null })).toEqual({ ok: false });
    const res = await handleMessage(msg, { lm: lmWith('available').lm });
    expect(res).toEqual({ ok: true, entries: [['a', 'email']] });
    expect(() => JSON.stringify(res)).not.toThrow();
  });

  it('never sends field values to the model', async () => {
    const { lm, prompt } = lmWith('available');
    await handleMessage({ type: 'ai-classify', fields: [{ id: 'a', value: 'TOPSECRET' }] }, { lm });
    expect(String(prompt.mock.calls[0]![0])).not.toContain('TOPSECRET');
  });

  it('returns ok:false when the model throws', async () => {
    const { lm, prompt } = lmWith('available');
    prompt.mockRejectedValue(new Error('boom'));
    expect(await handleMessage({ type: 'ai-classify', fields: [{ id: 'a' }] }, { lm })).toEqual({ ok: false });
  });

  it('attempts download and reports started honestly', async () => {
    const ok = lmWith('downloadable');
    expect(await handleMessage({ type: 'ai-download' }, { lm: ok.lm })).toEqual({ started: true });
    expect(ok.create).toHaveBeenCalledOnce();
    expect(await handleMessage({ type: 'ai-download' }, { lm: null })).toEqual({ started: false });
    const bad = lmWith('downloadable');
    bad.create.mockRejectedValue(new Error('no gesture'));
    expect(await handleMessage({ type: 'ai-download' }, { lm: bad.lm })).toEqual({ started: false });
  });
});
