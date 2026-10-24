import { describe, it, expect, vi } from 'vitest';
import { persistWrite } from '../../src/content/persist-write';

// PBI-153: the content script's fire-and-forget store writes used to be
// `void write()` / `void (async () => ...)()` — a failure surfaced as an
// unhandled rejection that nobody identified. persistWrite owns the catch and
// reports through console.warn instead.
describe('persistWrite (PBI-153)', () => {
  it('reports a failed write through console.warn instead of an unhandled rejection', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failure = new Error('quota exceeded');
    persistWrite('最終使用状態', () => Promise.reject(failure));
    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalledWith('[JushoAI] 最終使用状態の保存に失敗しました', failure);
    });
    warn.mockRestore();
  });

  it('stays silent when the write resolves', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let wrote = false;
    persistWrite('サイトごとの割当て', async () => { wrote = true; });
    await vi.waitFor(() => expect(wrote).toBe(true));
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
