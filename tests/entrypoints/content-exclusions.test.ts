import { describe, it, expect, vi } from 'vitest';

// Same stub-then-import seam the other content tests use: the module only
// registers the content script factory, main() never runs.
vi.stubGlobal('defineContentScript', (opts: unknown) => opts);
const { createExclusionGate } = await import('../../src/entrypoints/content');

const entry = 'https://docs.google.com/spreadsheets/';

const setup = (initial: string[], href = entry) => {
  const start = vi.fn();
  const stop = vi.fn();
  let list = [...initial];
  let url = href;
  const gate = createExclusionGate({
    loadExcluded: async () => [...list],
    href: () => url,
    start,
    stop,
  });
  return { gate, start, stop, setList: (next: string[]) => { list = [...next]; }, setUrl: (next: string) => { url = next; } };
};

describe('createExclusionGate', () => {
  it('stops before starting when the page is already excluded', async () => {
    const { gate, start, stop } = setup([entry]);
    await gate.init();
    expect(gate.isExcluded()).toBe(true);
    expect(stop).toHaveBeenCalledOnce();
    expect(start).not.toHaveBeenCalled();
  });

  it('starts when the page is not excluded', async () => {
    const { gate, start, stop } = setup([entry], 'https://example.com/form');
    await gate.init();
    expect(gate.isExcluded()).toBe(false);
    expect(start).toHaveBeenCalledOnce();
    expect(stop).not.toHaveBeenCalled();
  });

  it('starts even with an empty list', async () => {
    const { gate, start } = setup([], 'https://example.com/form');
    await gate.init();
    expect(start).toHaveBeenCalledOnce();
  });

  it('applies once: a recheck that changes nothing does not restart', async () => {
    const { gate, start, stop } = setup([entry], 'https://example.com/form');
    await gate.init();
    gate.recheck();
    expect(start).toHaveBeenCalledOnce();
    expect(stop).not.toHaveBeenCalled();
  });

  it('stops when the URL moves into an excluded path', async () => {
    const { gate, start, stop, setUrl } = setup([entry], 'https://example.com/form');
    await gate.init();
    setUrl('https://docs.google.com/spreadsheets/d/1');
    gate.recheck();
    expect(gate.isExcluded()).toBe(true);
    expect(stop).toHaveBeenCalledOnce();
    expect(start).toHaveBeenCalledOnce();
  });

  it('restarts when the URL leaves an excluded path', async () => {
    const { gate, start, stop, setUrl } = setup([entry]);
    await gate.init();
    setUrl('https://example.com/form');
    gate.recheck();
    expect(gate.isExcluded()).toBe(false);
    expect(start).toHaveBeenCalledOnce();
    expect(stop).toHaveBeenCalledOnce();
  });

  it('reacts to a settings change without a reload', async () => {
    const { gate, start, stop, setList } = setup([], 'https://docs.google.com/spreadsheets/');
    await gate.init();
    expect(start).toHaveBeenCalledOnce();
    setList([entry]);
    await gate.refresh();
    expect(gate.isExcluded()).toBe(true);
    expect(stop).toHaveBeenCalledOnce();
    setList([]);
    await gate.refresh();
    expect(gate.isExcluded()).toBe(false);
    expect(start).toHaveBeenCalledTimes(2);
  });

  it('fails open when the stored list cannot be read', async () => {
    const start = vi.fn();
    const stop = vi.fn();
    const gate = createExclusionGate({
      loadExcluded: async () => { throw new Error('storage unavailable'); },
      href: () => entry,
      start,
      stop,
    });
    await gate.init();
    expect(gate.isExcluded()).toBe(false);
    expect(start).toHaveBeenCalledOnce();
  });
});
