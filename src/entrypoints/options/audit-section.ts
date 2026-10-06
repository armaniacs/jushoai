import { AuditStore, auditFileName, toTsv, type AuditEntry } from '../../ai/audit-log';
import { el } from './dom';

export interface AuditSectionDeps {
  store: Pick<AuditStore, 'list' | 'clear'>;
  save(fileName: string, content: string): void;
  confirm(message: string): boolean;
  now(): Date;
}

export function saveTextFile(fileName: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/tab-separated-values;charset=utf-8' }));
  const a = el('a');
  a.href = url;
  a.download = fileName;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const defaultDeps = (): AuditSectionDeps => ({
  store: new AuditStore(),
  save: saveTextFile,
  confirm: (m) => window.confirm(m),
  now: () => new Date(),
});

export function mountAuditSection(root: HTMLElement, deps: AuditSectionDeps = defaultDeps()): void {
  const fieldset = el('fieldset');
  fieldset.append(el('legend', '通信の監査ログ'));
  for (const line of [
    'AI を呼び出すたびに、日時・プロバイダ・宛先・モデル・ページの URL（アドレスとパスのみ）・送った欄の数・結果を、この端末に記録します。欄の内容や API キー、応答の内容は記録しません。',
    '記録は 7 日間だけ保存され、期限を過ぎたものは自動で削除されます。',
    'ダウンロードしたファイルにはページの URL が含まれます。ファイルの扱いは利用者の責任で行ってください。',
  ]) fieldset.append(el('p', line));

  const status = el('p');
  status.setAttribute('aria-live', 'polite');
  const download = el('button', 'TSV でダウンロード');
  download.type = 'button';
  const clear = el('button', 'ログを削除');
  clear.type = 'button';
  const row = el('div');
  row.className = 'row';
  row.append(download, clear);
  fieldset.append(status, row);
  root.replaceChildren(fieldset);

  let entries: AuditEntry[] = [];
  const show = (list: AuditEntry[]) => {
    entries = list;
    status.textContent = list.length === 0 ? 'ログはありません。' : `ログは ${list.length} 件あります。`;
    download.disabled = list.length === 0;
    clear.disabled = list.length === 0;
  };
  const refresh = async () => {
    try {
      show(await deps.store.list());
    } catch {
      show([]);
      status.textContent = 'ログを読み込めませんでした。';
    }
  };

  download.addEventListener('click', () => {
    if (entries.length > 0) deps.save(auditFileName(deps.now()), toTsv(entries));
  });
  clear.addEventListener('click', () => {
    if (!deps.confirm('監査ログをすべて削除します。よろしいですか？')) return;
    void deps.store.clear().then(refresh, () => { status.textContent = 'ログを削除できませんでした。'; });
  });

  show([]);
  void refresh();
}
