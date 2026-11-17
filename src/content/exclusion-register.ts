// PBI-227/228: Xダイアログからの除外登録の非同期連鎖
// (load → add → save → success/error) を content.ts から切り出した純寄りの
// 手続き。DOM を直接触らず、副作用はすべて deps 経由にする。
// load の throw は投げられた文言のまま、add 失敗は reason のまま、save の
// throw は固定文言でダイアログに残し、成功時は成功表示へ切り替える
// (PBI-244: 自動クローズに委ね、undo の受け皿を残す)。
import { addExclusionEntry, removeExclusionEntry } from '../core/exclusions';

export interface ExclusionRegisterDeps {
  loadExcluded: () => Promise<readonly string[]>;
  saveExcluded: (entries: readonly string[]) => Promise<void>;
  candidates: { exact: string; prefix: string };
  showError: (reason: string) => void;
  showSuccess: (registered: string) => void;
  setBusy: (busy: boolean) => void;
}

export async function registerExclusionChoice(
  choice: 'exact' | 'prefix',
  deps: ExclusionRegisterDeps,
): Promise<void> {
  deps.setBusy(true);
  try {
    let current: readonly string[];
    try {
      current = await deps.loadExcluded();
    } catch (e) {
      deps.showError(e instanceof Error ? e.message : String(e));
      return;
    }
    const raw = choice === 'exact' ? deps.candidates.exact : deps.candidates.prefix;
    const added = addExclusionEntry(current, raw);
    if (!added.ok) {
      deps.showError(added.reason);
      return;
    }
    try {
      await deps.saveExcluded(added.entries);
    } catch {
      deps.showError('保存に失敗しました');
      return;
    }
    // The undo must delete exactly this entry: the canonical value the store
    // now holds, which is the one current did not have.
    const registered = added.entries.find((value) => !current.includes(value)) ?? '';
    deps.showSuccess(registered);
  } finally {
    deps.setBusy(false);
  }
}

export interface ExclusionUndoDeps {
  loadExcluded: () => Promise<readonly string[]>;
  saveExcluded: (entries: readonly string[]) => Promise<void>;
  onRemoved: () => void;
  showError: (reason: string) => void;
  setBusy: (busy: boolean) => void;
}

// PBI-244: the inverse chain of the quick registration (load → remove the one
// registered entry → save). Removal is by exact value because the entry was
// canonicalized at add time; an entry another writer already removed skips the
// write (nothing to persist) and still counts as undone.
export async function undoRegisteredExclusion(
  entry: string,
  deps: ExclusionUndoDeps,
): Promise<void> {
  deps.setBusy(true);
  try {
    let current: readonly string[];
    try {
      current = await deps.loadExcluded();
    } catch (e) {
      deps.showError(e instanceof Error ? e.message : String(e));
      return;
    }
    const next = removeExclusionEntry(current, entry);
    if (next.length === current.length) {
      deps.onRemoved();
      return;
    }
    try {
      await deps.saveExcluded(next);
    } catch {
      deps.showError('取り消しに失敗しました');
      return;
    }
    deps.onRemoved();
  } finally {
    deps.setBusy(false);
  }
}
