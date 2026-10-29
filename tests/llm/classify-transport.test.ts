import { describe, it, expect, vi, afterEach } from 'vitest';
import { send } from '../../src/llm/classify-transport';
import { buildPrompt } from '../../src/llm/prompt';
import {
  aiClassifyRequest,
  decodeErrorToClassifyFailure,
  decodeFieldMeta,
  decodeRequestResult,
  encodeFieldMeta,
} from '../../src/messages';
import { makeMeta } from '../helpers';

const sendMessage = vi.fn();
vi.stubGlobal('chrome', { runtime: { sendMessage } });
afterEach(() => sendMessage.mockReset());

const metas = (n: number) => Array.from({ length: n }, (_, i) => makeMeta({ id: `f${i}` }));
const echo = async (m: { fields: { id: string }[] }) => ({
  ok: true,
  entries: m.fields.map((f) => [f.id, 'email']),
});

describe('classify transport boundary table (PBI-175)', () => {
  it.each([
    [20, 1, 20, 0, null],
    [30, 2, 30, 0, null],
    [60, 3, 60, 0, null],
    [61, 3, 60, 1, 'truncated'],
  ] as const)('%i fields -> %i sends, map %i, truncated %i, reason %s', async (n, calls, size, truncated, reason) => {
    sendMessage.mockImplementation(echo);
    const res = await send(metas(n));
    expect(sendMessage).toHaveBeenCalledTimes(calls);
    expect(res.map.size).toBe(size);
    expect(res.truncatedCount).toBe(truncated);
    expect(res.failureReason).toBe(reason);
  });

  it('splits 30 fields into 20+10 and 61 into 20+20+20', async () => {
    sendMessage.mockImplementation(echo);
    await send(metas(30));
    expect(sendMessage.mock.calls.map((c) => (c[0] as { fields: unknown[] }).fields.length)).toEqual([20, 10]);
    sendMessage.mockClear();
    await send(metas(61));
    expect(sendMessage.mock.calls.map((c) => (c[0] as { fields: unknown[] }).fields.length)).toEqual([20, 20, 20]);
  });

  it('sends nothing for no fields', async () => {
    const res = await send([]);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(res.map.size).toBe(0);
    expect(res.failureReason).toBeNull();
    expect(res.truncatedCount).toBe(0);
  });
});

describe('classify transport chunk-boundary failures (PBI-175)', () => {
  it('stops at an auth failure on the chunk boundary and keeps earlier chunks', async () => {
    sendMessage
      .mockImplementationOnce(echo)
      .mockResolvedValueOnce({ ok: false, reason: 'auth' });
    const res = await send(metas(40));
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(res.map.size).toBe(20);
    expect(res.failureReason).toBe('auth');
    expect(res.truncatedCount).toBe(0);
  });

  it('reports network on a disconnect at the chunk boundary and keeps earlier chunks', async () => {
    sendMessage
      .mockImplementationOnce(echo)
      .mockRejectedValueOnce(new Error('cut'));
    const res = await send(metas(40));
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(res.map.size).toBe(20);
    expect(res.failureReason).toBe('network');
  });

  it('keeps a chunk failure ahead of the truncation notice at the cap boundary', async () => {
    sendMessage
      .mockImplementationOnce(echo)
      .mockResolvedValueOnce({ ok: false, reason: 'auth' });
    const res = await send(metas(61));
    expect(res.failureReason).toBe('auth');
    expect(res.truncatedCount).toBe(1);
    expect(res.map.size).toBe(20);
  });

  it('records null for a legacy reason-less failure instead of bad-response', async () => {
    sendMessage.mockResolvedValueOnce({ ok: false });
    const res = await send(metas(5));
    expect(res.map.size).toBe(0);
    expect(res.failureReason).toBeNull();
  });
});

describe('wire round-trip encode -> decode -> buildPrompt (PBI-175)', () => {
  const radio = makeMeta({
    id: 'r1', tag: 'radio', type: 'radio', name: 'gender', label: '性別', value: '男',
    options: [{ value: 'm', text: '男性' }, { value: 'f', text: '女性' }],
  });
  const select = makeMeta({
    id: 's1', tag: 'select', type: 'select-one', name: 'pref', label: '都道府県'.repeat(40), value: '東京都',
    options: [{ value: '13', text: '東京都' }, { value: '27', text: '大阪府' }],
  });

  it('keeps tag/options/value out of the prompt for radio/select fields', () => {
    const decoded = [radio, select].map((m) => decodeFieldMeta(encodeFieldMeta(m)));
    expect(decoded.every(Boolean)).toBe(true);
    const prompt = buildPrompt(decoded.filter((f): f is NonNullable<typeof f> => f !== null));
    expect(prompt).not.toContain('男性');
    expect(prompt).not.toContain('大阪府');
    expect(prompt).not.toContain('東京都');
    // tag/options/value のキー自体が wire に載らないこと（type 値の 'radio' は
    // allow-list の正当な内容であり除外対象ではない）。
    expect(prompt).not.toContain('"tag"');
    expect(prompt).not.toContain('"options"');
    expect(prompt).not.toContain('"value"');
  });

  it('is stable across the round-trip: prompt(decoded) equals prompt(original)', () => {
    const originals = [radio, select, makeMeta({ id: 't1', label: '姓', value: 'SECRET' })];
    const decoded = originals.map((m) => decodeFieldMeta(encodeFieldMeta(m)));
    expect(decoded.every(Boolean)).toBe(true);
    const fields = decoded.filter((f): f is NonNullable<typeof f> => f !== null);
    expect(buildPrompt(fields)).toBe(buildPrompt(originals));
    expect(buildPrompt(fields)).not.toContain('SECRET');
  });

  it('rebuilds decoded fields as input-shaped carriers with empty value/options', () => {
    const decoded = decodeFieldMeta(encodeFieldMeta(radio))!;
    expect(decoded.tag).toBe('input');
    expect(decoded.options).toEqual([]);
    expect(decoded.value).toBe('');
    expect(encodeFieldMeta(decoded)).toEqual(encodeFieldMeta(radio));
  });
});

describe('decodeRequest Result reasons map to the transfer failure vocabulary (PBI-175)', () => {
  it('distinguishes oversize / version / malformed', () => {
    const oversize = aiClassifyRequest(Array.from({ length: 31 }, (_, i) => encodeFieldMeta(makeMeta({ id: `f${i}` }))));
    expect(decodeRequestResult(oversize)).toEqual({ ok: false, reason: 'oversize' });
    expect(decodeRequestResult({ ...aiClassifyRequest([]), v: 999 })).toEqual({ ok: false, reason: 'version' });
    expect(decodeRequestResult({ type: 'ai-classify', v: 1, fields: [], bogus: 1 })).toEqual({
      ok: false, reason: 'malformed',
    });
    expect(decodeRequestResult(42)).toEqual({ ok: false, reason: 'malformed' });
    const ok = decodeRequestResult(aiClassifyRequest([encodeFieldMeta(makeMeta({ id: 'a' }))]));
    expect(ok.ok).toBe(true);
  });

  it('maps oversize to truncated and version/malformed to bad-response', () => {
    expect(decodeErrorToClassifyFailure('oversize')).toBe('truncated');
    expect(decodeErrorToClassifyFailure('version')).toBe('bad-response');
    expect(decodeErrorToClassifyFailure('malformed')).toBe('bad-response');
  });
});
