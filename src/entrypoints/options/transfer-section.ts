// Export/import section (PBI-117). Mounted once like the audit and exclusion
// sections: main.ts creates the holder and render() re-appends it, so the
// section keeps its element and its feedback across the profile/address
// re-renders.
import { MAX_ITEMS } from '../../core/collection';
import {
  exportTransferFile, importTransferFile, TRANSFER_FILE_NAME, TRANSFER_MAX_FILE_BYTES,
  type TransferImportResult,
} from '../../transfer';
import type { BackupMeta, FormatInfo } from '../../storage';
import { loadBackupMeta, loadData, loadFormatInfo, saveBackupMeta } from '../../storage';
import { formatLastExportLine, shouldShowBackupNudge } from '../../core/backup-nudge';
import { saveTextFile } from './audit-section';
import { actionButton, el, notice } from './dom';

export interface TransferSectionDeps {
  exportFile(): Promise<string>;
  importFile(json: string): Promise<TransferImportResult>;
  save(fileName: string, content: string): void;
  confirm(message: string): boolean;
  pickFile(): Promise<File | null>;
  readFile(file: File): Promise<string>;
  // Returns a promise so a failed re-render can be awaited and shown instead
  // of leaving a stale 取り込みました on screen (PBI-117 review).
  onImported(): Promise<void>;
  // Reports the persisted format version (WHY injected): tests pin the skew
  // notice without touching chrome.storage.
  formatInfo(): Promise<FormatInfo>;
  // Backup reminder state (WHY injected): the section shows the last-export
  // line and a modest nudge from stored timestamps only, so tests pin the
  // policy without touching chrome.storage.
  backupMeta(): Promise<BackupMeta>;
  // Records a successful export or a nudge dismissal (WHY separate writes):
  // each merges into the stored meta so the untouched timestamp survives.
  recordExportAt(at: number): Promise<void>;
  recordNudgeDismissedAt(at: number): Promise<void>;
  // Saved profile count (WHY a reader, not a number): the section mounts once
  // and stays alive across re-renders, so the count is read when the nudge is
  // evaluated instead of frozen at mount.
  profileCount(): Promise<number>;
}

const EXPORT_WARNING =
  'エクスポートするファイルには、登録済みのプロファイルと住所が平文の個人情報として含まれます。ファイルの取り扱いには注意してください。書き出しますか？';
const importConfirm = (name: string): string =>
  `「${name}」を取り込みます。同じ ID のプロファイル・住所は上書きされ、新しい ID は追加されます（それぞれ ${MAX_ITEMS} 件まで）。未保存の入力は破棄されます。よろしいですか？`;
const TRANSFER_MAX_FILE_MB = TRANSFER_MAX_FILE_BYTES / (1024 * 1024);

const importSummary = (r: Extract<TransferImportResult, { ok: true }>): string => {
  const parts: string[] = [];
  if (r.profilesAdded + r.profilesUpdated > 0) {
    parts.push(`プロファイル 新規 ${r.profilesAdded} 件・更新 ${r.profilesUpdated} 件`);
  }
  if (r.addressesAdded + r.addressesUpdated > 0) {
    parts.push(`住所 新規 ${r.addressesAdded} 件・更新 ${r.addressesUpdated} 件`);
  }
  return parts.length > 0 ? `${parts.join('、')}を取り込みました。` : '取り込むデータがありませんでした。';
};

// New file-input path (no precedent under src/): the picker and the read are
// injected as deps so tests never touch a real dialog. A fresh input per pick
// keeps listeners from accumulating. The cancel event (widely available since
// May 2023; the Firefox build requires 128) settles with null. There used to
// be a focus-based fallback for browsers without cancel: it settled with null
// at the next task, and Firefox fires the window focus before the input
// change, so the fallback beat the picked file (PBI-117 field check).
const pickFile = (): Promise<File | null> => new Promise((resolve) => {
  const input = el('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  let settled = false;
  const done = (file: File | null) => {
    if (settled) return;
    settled = true;
    input.remove();
    resolve(file);
  };
  input.addEventListener('change', () => done(input.files?.[0] ?? null));
  input.addEventListener('cancel' as keyof HTMLElementEventMap, () => done(null));
  document.body.append(input);
  input.click();
});

const readFile = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.addEventListener('load', () => resolve(String(reader.result ?? '')));
  reader.addEventListener('error', () => reject(new Error('read failed')));
  // An aborted read must settle too: a pending promise would leave the import
  // button disabled forever.
  reader.addEventListener('abort', () => reject(new Error('read aborted')));
  reader.readAsText(file);
});

export function defaultTransferDeps(): TransferSectionDeps {
  return {
    exportFile: exportTransferFile,
    importFile: importTransferFile,
    save: (fileName, content) => saveTextFile(fileName, content, 'application/json;charset=utf-8'),
    confirm: (m) => window.confirm(m),
    pickFile,
    readFile,
    onImported: async () => {},
    formatInfo: loadFormatInfo,
    backupMeta: loadBackupMeta,
    // Storage is the source of truth (WHY a fresh read): only saved
    // registrations count toward the nudge, never unsaved card edits, and the
    // section needs no boot-order coupling with the profile/address state.
    recordExportAt: async (at) => {
      const meta = await loadBackupMeta().catch(() => ({}));
      await saveBackupMeta({ ...meta, lastExportAt: at });
    },
    recordNudgeDismissedAt: async (at) => {
      const meta = await loadBackupMeta().catch(() => ({}));
      await saveBackupMeta({ ...meta, dismissedAt: at });
    },
    profileCount: async () => {
      const data = await loadData().catch(() => null);
      return data?.profiles.length ?? 0;
    },
  };
}

export function mountTransferSection(root: HTMLElement, deps: TransferSectionDeps = defaultTransferDeps()): void {
  const fieldset = el('fieldset');
  fieldset.append(el('legend', 'プロファイルのエクスポート/インポート'));
  for (const line of [
    'プロファイルと住所を 1 つの JSON ファイルに書き出し/読み込みします。Firefox の一時的なアドオンは終了とともにデータが消えるため、使い終わる前に書き出してください。',
    '拡張機能をアンインストールすると、登録したプロファイルと住所は消えます。消える前に JSON で書き出してください。',
    '書き出したファイルには平文の個人情報が含まれます。取り扱いには注意してください。',
    `取り込みは ID 単位でマージします。同じ ID は上書きされ、新しい ID は追加されます。上限はプロファイル・住所それぞれ ${MAX_ITEMS} 件です。検証に通らないデータは保存されません。`,
  ]) fieldset.append(el('p', line));

  // Last-export line and nudge live in the section (WHY here, not a banner):
  // the BDD pairs the notice with the export button, and the button already
  // sits here, so no new notice slot or badge is needed.
  const lastExportLine = el('p', '');
  lastExportLine.className = 'backup-last-export';
  fieldset.append(lastExportLine);
  let nudge: HTMLElement | null = null;

  const feedback = el('div');
  // A store written by a newer build keeps working here, but the user should
  // know an update exists (WHY a plain paragraph in this section): the
  // transfer section is where stored data is managed, so the skew notice
  // lives with it instead of adding a new banner or badge. A version that
  // cannot be read shows nothing.
  void deps.formatInfo().then(
    (info) => {
      if (info.needsUpdate) {
        fieldset.insertBefore(
          el('p', `保存データの形式が新しい版（${info.version}）で保存されています。拡張を更新してください。`),
          feedback,
        );
      }
    },
    () => { /* A version that cannot be read shows no notice. */ },
  );
  // Live region moved into the shared notice: notice() itself marks its elements aria-live="polite".
  // Saved/errors rendering goes through the shared notice module (PBI-151):
  // the truncate rule (5 shown lines plus a rest count) lives in dom.ts, so a
  // 20-entry file of validation errors cannot grow an unbounded list here.
  const showSaved = (text: string): void => {
    feedback.replaceChildren(notice('saved', [text]));
  };
  const showErrors = (lines: string[]): void => {
    feedback.replaceChildren(notice('errors', lines));
  };

  // Re-reads the backup state and redraws the line and the nudge (WHY a
  // re-read, not cached meta): the profile count and the meta change behind
  // this section (saves, imports, other tabs). A state that cannot be read
  // leaves the section as-is, like the format-info path above.
  const refreshBackup = async (): Promise<void> => {
    let meta: BackupMeta;
    try {
      meta = await deps.backupMeta();
    } catch {
      return;
    }
    lastExportLine.textContent = formatLastExportLine(meta.lastExportAt ?? null);
    const count = await deps.profileCount().catch(() => 0);
    const show = shouldShowBackupNudge({
      profileCount: count,
      lastExportAt: meta.lastExportAt ?? null,
      dismissedAt: meta.dismissedAt ?? null,
    });
    if (show && nudge === null) {
      const box = el('div');
      box.className = 'backup-nudge';
      box.append(el('p', 'プロファイルを 2 件以上登録しています。削除や再インストールに備えて、JSON ファイルでバックアップをお勧めします。書き出しは下のボタンからできます。'));
      // Dismissal hides at once (WHY no await): the write is best-effort and
      // must not block the click feedback; a failed write simply re-shows the
      // nudge on the next visit.
      const close = actionButton('閉じる', false, () => {
        nudge = null;
        box.remove();
        void deps.recordNudgeDismissedAt(Date.now()).catch(() => {});
      });
      box.append(close);
      fieldset.insertBefore(box, feedback);
      nudge = box;
    } else if (!show && nudge !== null) {
      nudge.remove();
      nudge = null;
    }
  };
  void refreshBackup();

  const onExport = (): void => {
    if (!deps.confirm(EXPORT_WARNING)) return;
    void deps.exportFile().then(
      (content) => {
        deps.save(TRANSFER_FILE_NAME, content);
        showSaved(`${TRANSFER_FILE_NAME} を書き出しました。`);
        // An export ends the never-exported state, so the nudge must go even
        // if the timestamp write fails (the re-read then hides it or not).
        void deps.recordExportAt(Date.now()).catch(() => {}).then(() => refreshBackup());
      },
      () => showErrors(['データを読み込めませんでした。']),
    );
  };

  const onImport = async (): Promise<void> => {
    importButton.disabled = true;
    try {
      const file = await deps.pickFile();
      if (!file) return;
      if (file.size > TRANSFER_MAX_FILE_BYTES) {
        showErrors([`ファイルが大きすぎます（${TRANSFER_MAX_FILE_MB}MB まで）。JushoAI のエクスポートファイルを選んでください`]);
        return;
      }
      if (!deps.confirm(importConfirm(file.name))) return;
      let json: string;
      try {
        json = await deps.readFile(file);
      } catch {
        showErrors(['ファイルを読み込めませんでした。']);
        return;
      }
      let result: TransferImportResult;
      try {
        result = await deps.importFile(json);
      } catch {
        showErrors(['取り込みに失敗しました。']);
        return;
      }
      if (!result.ok) {
        showErrors(result.errors);
        return;
      }
      showSaved(importSummary(result));
      try {
        await deps.onImported();
      } catch {
        showErrors(['取り込みは完了しましたが、画面の更新に失敗しました。ページを再読み込みしてください。']);
      }
      // An import can push the saved profile count over the nudge threshold.
      void refreshBackup();
    } finally {
      importButton.disabled = false;
    }
  };

  // The reference is kept so onImport can disable it while a run is in
  // flight: double-clicks must not start parallel imports. onImport runs only
  // on click, after this const is initialized.
  const importButton = actionButton('JSON をインポート', false, () => { void onImport(); });
  const row = el('div');
  row.className = 'row';
  row.append(actionButton('JSON でエクスポート', false, onExport), importButton);
  fieldset.append(feedback, row);
  root.replaceChildren(fieldset);
}
