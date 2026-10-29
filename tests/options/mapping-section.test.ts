import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountMappingSection, type MappingSectionDeps } from '../../src/entrypoints/options/mapping-section';
import type { MappingEntry } from '../../src/core/domain-mapping';

const ENTRY: MappingEntry = { domain: 'example.com', fieldKey: 'email', category: 'email' };

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML =
    '<div id="app"></div><main id="ai-app"></main><main id="exclusion-app"></main><main id="mapping-app"></main><main id="audit-app"></main>';
  root = document.getElementById('mapping-app')!;
});

const setup = async (
  initial: MappingEntry[],
  save: MappingSectionDeps['save'] = async () => {},
) => {
  const saveMock = vi.fn(save);
  const deps: MappingSectionDeps = {
    load: async () => initial.map((e) => ({ ...e })),
    save: saveMock,
  };
  mountMappingSection(root, deps);
  // The section renders once the load resolves.
  await vi.waitFor(() => { if (!root.querySelector('h2')) throw new Error('not rendered'); });
  return { save: saveMock };
};

const items = () => [...root.querySelectorAll('.exclusion-list li')].map((li) => li.textContent ?? '');
const removeButton = (): HTMLButtonElement => {
  const found = [...root.querySelectorAll('button')].find((b) => b.textContent === '削除');
  if (!found) throw new Error('remove button not found');
  return found as HTMLButtonElement;
};
const click = (el: HTMLElement) => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));

describe('mountMappingSection', () => {
  it('renders the loaded entries', async () => {
    await setup([ENTRY]);
    expect(root.querySelector('.exclusion-list code')?.textContent).toBe('example.com · email · email');
  });

  it('removes an entry and persists the rest', async () => {
    const { save } = await setup([ENTRY]);
    click(removeButton());
    expect(items()).toEqual(['まだ覚えていません']);
    await vi.waitFor(() => { expect(save).toHaveBeenCalledWith([]); });
  });

  it('renders the empty skeleton with a notice when the load fails', async () => {
    // A rejected load must settle through the same boot path: the skeleton and
    // the notice appear, and vitest fails the test on an unhandled rejection.
    const save = vi.fn(async () => {});
    mountMappingSection(root, {
      load: async () => { throw new Error('storage unavailable'); },
      save,
    });
    await vi.waitFor(() => { if (!root.querySelector('h2')) throw new Error('not rendered'); });
    expect(root.querySelector('.errors')?.textContent).toContain('読み込めませんでした');
    expect(items()).toEqual(['まだ覚えていません']);
    expect(save).not.toHaveBeenCalled();
    expect(root.querySelector('button')).toBeNull();
  });

  it('keeps the removal and reports it when persisting fails', async () => {
    await setup([ENTRY], async () => { throw new Error('quota'); });
    click(removeButton());
    await vi.waitFor(() => { if (!root.querySelector('.errors')) throw new Error('no error'); });
    expect(root.querySelector('.errors')?.textContent).toContain('保存に失敗');
    // The removal stays applied in memory even though persisting failed.
    expect(items()).toEqual(['まだ覚えていません']);
  });
});
