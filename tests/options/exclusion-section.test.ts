import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountExclusionSection, type ExclusionSectionDeps } from '../../src/entrypoints/options/exclusion-section';
import { EXCLUDED_URLS_MAX } from '../../src/core/exclusions';

const ENTRY = 'https://docs.google.com/spreadsheets/';

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div><main id="ai-app"></main><main id="exclusion-app"></main><main id="audit-app"></main>';
  root = document.getElementById('exclusion-app')!;
});

const setup = async (initial: string[] = []) => {
  const save = vi.fn(async (_entries: readonly string[]) => {});
  let stored = [...initial];
  const deps: ExclusionSectionDeps = {
    load: async () => [...stored],
    save: async (entries) => { save(entries); stored = [...entries]; },
  };
  mountExclusionSection(root, deps);
  // The section renders once the load resolves.
  await vi.waitFor(() => { if (!root.querySelector('h2')) throw new Error('not rendered'); });
  return { save, stored: () => stored };
};

const input = (): HTMLInputElement => root.querySelector('input')!;
const buttonByText = (text: string): HTMLButtonElement => {
  const found = [...root.querySelectorAll('button')].find((b) => b.textContent === text);
  if (!found) throw new Error(`button not found: ${text}`);
  return found as HTMLButtonElement;
};
const click = (el: HTMLElement) => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const type = (value: string) => {
  const field = input();
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
};
const items = () => [...root.querySelectorAll('.exclusion-list li')].map((li) => li.textContent ?? '');

describe('mountExclusionSection', () => {
  it('shows an empty list with a hint', async () => {
    await setup();
    expect(items()).toEqual(['まだ登録されていません']);
    expect(root.textContent).toContain(`登録 0 / ${EXCLUDED_URLS_MAX} 件`);
  });

  it('adds a normalized entry to the list without saving it yet', async () => {
    const { save } = await setup();
    type(`  ${ENTRY}  `);
    click(buttonByText('追加'));
    expect(items().join('')).toContain(ENTRY);
    expect(save).not.toHaveBeenCalled();
    expect(input().value).toBe('');
  });

  it('reports why an invalid entry was rejected and keeps the draft', async () => {
    await setup();
    type('docs.google.com');
    click(buttonByText('追加'));
    expect(root.querySelector('.errors')?.textContent).toContain('http://');
    expect(input().value).toBe('docs.google.com');
    expect(items()).toEqual(['まだ登録されていません']);
  });

  it('reports a duplicate instead of adding it twice', async () => {
    await setup([ENTRY]);
    type(ENTRY);
    click(buttonByText('追加'));
    expect(root.querySelector('.errors')?.textContent).toContain('すでに登録');
    expect(items()).toHaveLength(1);
  });

  it('saves the list so the open tabs can re-evaluate through storage', async () => {
    const { save, stored } = await setup();
    type(ENTRY);
    click(buttonByText('追加'));
    click(buttonByText('保存'));
    await vi.waitFor(() => { if (!root.querySelector('.saved')) throw new Error('not saved'); });
    expect(save).toHaveBeenCalledWith([ENTRY]);
    expect(stored()).toEqual([ENTRY]);
  });

  it('removes an entry and persists the removal', async () => {
    const { stored } = await setup([ENTRY, 'https://example.com/']);
    click(buttonByText('削除'));
    click(buttonByText('保存'));
    await vi.waitFor(() => { if (!root.querySelector('.saved')) throw new Error('not saved'); });
    expect(stored()).toEqual(['https://example.com/']);
    expect(items()).toHaveLength(1);
  });

  it('keeps the edited list when saving fails', async () => {
    let stored = [ENTRY];
    const save = vi.fn(async () => { throw new Error('quota'); });
    mountExclusionSection(root, {
      load: async () => [...stored],
      save,
    });
    await vi.waitFor(() => { if (!root.querySelector('h2')) throw new Error('not rendered'); });
    click(buttonByText('保存'));
    await vi.waitFor(() => { if (!root.querySelector('.errors')) throw new Error('no error'); });
    expect(root.querySelector('.errors')?.textContent).toContain('保存に失敗');
    expect(stored).toEqual([ENTRY]);
  });
});
