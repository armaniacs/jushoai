import { loadMappings, saveMappings } from '../../mapping-store';
import type { MappingEntry } from '../../core/domain-mapping';
import { el } from './dom';
import { applyActivePage, AUDIT_SECTION_ID } from './nav';

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

  const onRemove = (index: number): void => {
    entries = entries.filter((_, i) => i !== index);
    void deps.save(entries);
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

    root.replaceChildren(title, lead, list, count);
  }

  void deps.load().then((loaded) => {
    entries = loaded;
    render();
    applyActivePage();
  });
}
