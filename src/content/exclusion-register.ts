// PBI-227/228: Xダイアログからの除外登録の非同期連鎖
// (load → add → save → close/error) を content.ts から切り出した純寄りの
// 手続き。DOM を直接触らず、副作用はすべて deps 経由にする。
// load の throw は投げられた文言のまま、add 失敗は reason のまま、save の
// throw は固定文言でダイアログに残し、成功時だけ閉じる。
import { addExclusionEntry } from '../core/exclusions';

export interface ExclusionRegisterDeps {
  loadExcluded: () => Promise<readonly string[]>;
  saveExcluded: (entries: readonly string[]) => Promise<void>;
  candidates: { exact: string; prefix: string };
  showError: (reason: string) => void;
  close: () => void;
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
    deps.close();
  } finally {
    deps.setBusy(false);
  }
}
