import { loadMappings, saveMappings } from '../../mapping-store';
import type { MappingEntry } from '../../core/domain-mapping';
import { el, notice } from './dom';
import { applyActivePage, MAPPING_SECTION_ID, setSectionCount } from './nav';
import { bootListSection } from './list-boot';

export interface MappingSectionDeps {
  load(): Promise<MappingEntry[]>;
  save(entries: readonly MappingEntry[]): Promise<void>;
}

// Saving is all this section does: content scripts load the layer per run, so
// open tabs pick the change up on the next 分類.
const defaultDeps = (): MappingSectionDeps => ({
  load: loadMappings,
  save: saveMappings,
});

// PBI-138: the per-domain correction layer's 解除 means. Each row removes one
// taught pair; the save persists the rest. Values shown here are the field
// signature and the category only — never a profile value.
export function mountMappingSection(root: HTMLElement, deps: MappingSectionDeps = defaultDeps()): void {
  let entries: MappingEntry[] = [];
  let feedback: HTMLElement | null = null;

  // The nav badge mirrors the in-memory list (PBI-168): set after a successful
  // load and after every removal. The failed-load boot path skips it — a count
  // that could not be read must not render as (0).
  const syncNavCount = (): void => {
    setSectionCount(MAPPING_SECTION_ID, entries.length);
  };

  const onRemove = (index: number): void => {
    entries = entries.filter((_, i) => i !== index);
    // The removal persists immediately (no save button here). A failed save
    // keeps the removal in the list and reports it through the same
    // save-failure notice as the exclusion section, instead of surfacing as an
    // unhandled rejection.
    void deps.save(entries).then(
      () => {
        feedback = null;
        render();
      },
      () => {
        feedback = notice('errors', ['保存に失敗しました']);
        render();
      },
    );
    // The in-memory count changed with the removal in both save outcomes, so
    // the badge updates here rather than per save branch.
    syncNavCount();
    render();
  };

  function render(): void {
    const title = el('h2', '覚えた対応付け');
    const lead = el('p', 'プレビューの「直す」で教えた、ドメイン別の欄の意味の一覧です。削除すると次の分類から元の判定に戻ります。');

    const list = el('ul');
    list.className = 'exclusion-list';
    if (entries.length === 0) {
      const empty = el('li', 'まだ覚えていません');
      empty.className = 'exclusion-empty';
      list.append(empty);
    }
    entries.forEach((e, i) => {
      const item = el('li');
      const code = el('code', `${e.domain} · ${e.fieldKey} · ${e.category}`);
      const remove = el('button', '削除');
      remove.type = 'button';
      remove.addEventListener('click', () => onRemove(i));
      item.append(code, remove);
      list.append(item);
    });

    const count = el('p', `登録 ${entries.length} 件`);
    count.className = 'exclusion-count';

    // The load/remove failure notice rides after the count, like the exclusion
    // section's feedback slot.
    const children: HTMLElement[] = [title, lead, list, count];
    if (feedback) children.push(feedback);
    root.replaceChildren(...children);
  }

  // Boot goes through the shared skeleton (list-boot.ts): render runs only
  // after the load resolves, and a failed load renders the empty skeleton with
  // the notice instead of surfacing as an unhandled rejection.
  bootListSection(
    deps.load,
    (loaded) => {
      entries = loaded;
      render();
      syncNavCount();
      applyActivePage();
    },
    (failure) => {
      feedback = failure;
      render();
      applyActivePage();
    },
  );
}
