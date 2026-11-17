import { addExclusionEntry, EXCLUDED_URLS_MAX, mergeExcludedEntries, removeExclusionEntry } from '../../core/exclusions';
import { loadExcludedUrls, saveExcludedUrls } from '../../exclusions-store';
import { el, notice, textInput } from './dom';
import { bootListSection } from './list-boot';
import { applyActivePage, EXCLUSION_SECTION_ID, setSectionCount } from './nav';

export interface ExclusionSectionDeps {
  load(): Promise<string[]>;
  save(entries: readonly string[]): Promise<void>;
}

// Saving is all this section does: content scripts watch storage.onChanged, so
// open tabs re-evaluate without a message from here.
const defaultDeps = (): ExclusionSectionDeps => ({
  load: loadExcludedUrls,
  save: saveExcludedUrls,
});

// Add and remove edit the in-memory list; 保存 persists it and tells the open
// tabs to re-evaluate. Same shape as the AI section, so the page keeps one
// mental model: edit, then save.
export function mountExclusionSection(root: HTMLElement, deps: ExclusionSectionDeps = defaultDeps()): void {
  let entries: string[] = [];
  // PBI-241: 保存 merges a diff against this boot snapshot into the store's
  // current content, so it cannot revert a quick registration made while the
  // page is open. A failed boot leaves it empty, which reads as "the draft
  // gained everything the user adds" at save time.
  let boot: readonly string[] = [];
  let draft = '';
  let feedback: HTMLElement | null = null;

  // The nav badge mirrors the in-memory list (PBI-168): set after a successful
  // load and after every edit. The failed-load boot path skips it — a count
  // that could not be read must not render as (0).
  const syncNavCount = (): void => {
    setSectionCount(EXCLUSION_SECTION_ID, entries.length);
  };

  const onAdd = (): void => {
    const result = addExclusionEntry(entries, draft);
    if (!result.ok) {
      feedback = notice('errors', [result.reason]);
    } else {
      entries = result.entries;
      draft = '';
      feedback = null;
      syncNavCount();
    }
    render();
  };

  const onRemove = (value: string): void => {
    entries = removeExclusionEntry(entries, value);
    feedback = null;
    syncNavCount();
    render();
  };

  // Save = re-read the store, merge the boot→draft diff into it (PBI-241),
  // write once. A failed re-read or write means the merge could not be
  // consistent, so the success notice is withheld and the failure is shown
  // with the draft left untouched for a retry.
  const onSave = (): void => {
    void (async () => {
      let merged: string[];
      try {
        merged = mergeExcludedEntries({ boot, draft: entries, current: await deps.load() });
        await deps.save(merged);
      } catch {
        feedback = notice('errors', ['保存に失敗しました']);
        render();
        return;
      }
      entries = [...merged];
      boot = merged;
      feedback = notice('saved', ['保存しました']);
      syncNavCount();
      render();
    })();
  };

  function render(): void {
    const title = el('h2', '起動しない URL');
    const lead = el('p', 'ここに登録した文字列で始まる URL では、JushoAI のボタンを出しません。登録した URL を開いたままでも、保存すると反映されます。');
    const example = el('p', '例: https://docs.google.com/spreadsheets/ を登録すると、その配下のスプレッドシートでは起動しません。');
    example.className = 'exclusion-example';

    const input = textInput(draft, 'https://docs.google.com/spreadsheets/', (v) => { draft = v; });
    const add = el('button', '追加');
    add.type = 'button';
    add.addEventListener('click', onAdd);
    const addRow = el('div');
    addRow.className = 'row';
    addRow.append(input, add);

    const list = el('ul');
    list.className = 'exclusion-list';
    if (entries.length === 0) {
      const empty = el('li', 'まだ登録されていません');
      empty.className = 'exclusion-empty';
      list.append(empty);
    }
    for (const value of entries) {
      const item = el('li');
      const code = el('code', value);
      const remove = el('button', '削除');
      remove.type = 'button';
      remove.addEventListener('click', () => onRemove(value));
      item.append(code, remove);
      list.append(item);
    }

    const count = el('p', `登録 ${entries.length} / ${EXCLUDED_URLS_MAX} 件`);
    count.className = 'exclusion-count';

    const save = el('button', '保存');
    save.type = 'button';
    save.className = 'primary';
    save.addEventListener('click', onSave);
    const saveRow = el('div');
    saveRow.className = 'row';
    saveRow.append(save);

    const page = el('div');
    page.id = EXCLUSION_SECTION_ID;
    page.append(title, lead, example, addRow, list, count, saveRow);
    if (feedback) page.append(feedback);
    root.replaceChildren(page);
    applyActivePage();
  }

  // Boot goes through the shared skeleton (list-boot.ts): render runs only
  // after the load resolves, and a failed load renders the empty skeleton with
  // the notice instead of surfacing as an unhandled rejection.
  bootListSection(
    deps.load,
    (list) => {
      entries = list;
      boot = list;
      render();
      syncNavCount();
    },
    (failure) => {
      feedback = failure;
      render();
    },
  );
}
