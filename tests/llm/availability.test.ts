import { describe, it, expect, vi } from 'vitest';
import { checkAiStatus, startDownload, LM_OPTIONS, type LanguageModelStatic } from '../../src/llm/availability';

const fake = (availability: () => Promise<string>, create = vi.fn()): LanguageModelStatic =>
  ({ availability, create }) as unknown as LanguageModelStatic;

describe('checkAiStatus', () => {
  it('is unsupported without the API', async () => {
    expect(await checkAiStatus(null)).toBe('unsupported');
  });

  it('uses identical ja output options for availability and create', async () => {
    const availability = vi.fn().mockResolvedValue('available');
    const create = vi.fn().mockResolvedValue({ destroy: vi.fn() });
    const lm = fake(availability, create);
    await checkAiStatus(lm);
    await startDownload(lm);
    const expected = { expectedOutputs: [{ type: 'text', languages: ['ja'] }] };
    expect(LM_OPTIONS).toEqual(expected);
    expect(availability).toHaveBeenCalledWith(expected);
    expect(create).toHaveBeenCalledWith(expected);
  });

  it('passes through the four states', async () => {
    for (const s of ['available', 'downloadable', 'downloading', 'unavailable']) {
      expect(await checkAiStatus(fake(async () => s))).toBe(s);
    }
  });

  it('treats errors as unavailable', async () => {
    expect(await checkAiStatus(fake(async () => { throw new Error('x'); }))).toBe('unavailable');
  });
});

describe('startDownload', () => {
  it('creates a session and destroys it, swallowing failures', async () => {
    const destroy = vi.fn();
    const create = vi.fn().mockResolvedValue({ destroy });
    expect(await startDownload(fake(async () => 'downloadable', create))).toBe(true);
    expect(create).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledOnce();

    await expect(
      startDownload(fake(async () => 'downloadable', vi.fn().mockRejectedValue(new Error('no')))),
    ).resolves.toBe(false);
  });
});
