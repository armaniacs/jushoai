import { AuditStore, auditFileName, toTsv, type AuditEntry } from '../../ai/audit-log';
import { clearAuditViaBackground } from '../../llm/background-gateway';
import { SYSTEM_PROMPT } from '../../llm/classifier';
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

// Rejecting on failure keeps the existing delete-failure notice path intact.
const clearViaBackground = async (): Promise<void> => {
  if (!(await clearAuditViaBackground())) throw new Error('audit-clear failed');
};

const defaultDeps = (): AuditSectionDeps => {
  // list is read-only and cannot interleave with writes; clear is delegated to
  // the background so record and clear share one write queue across contexts.
  const lister = new AuditStore();
  return {
    store: { list: lister.list.bind(lister), clear: clearViaBackground },
    save: saveTextFile,
    confirm: (m) => window.confirm(m),
    now: () => new Date(),
  };
};

// Pure helpers below keep the entry rendering free of store access.
const formatDateTime = (ms: number): string => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const metaRow = (line: string): HTMLElement => {
  const p = el('p', line);
  p.className = 'audit-meta';
  return p;
};

const traceBlock = (summary: string, body: string): HTMLElement => {
  const block = el('details');
  block.append(el('summary', summary));
  block.append(el('pre', body));
  return block;
};

const buildEntryBody = (entry: AuditEntry): HTMLElement[] => {
  const body: HTMLElement[] = [];
  body.push(metaRow(`目的: ${entry.purpose}`));
  if (entry.pageUrl) body.push(metaRow(`ページ URL: ${entry.pageUrl}`));
  body.push(metaRow(`送った欄の数: ${entry.fieldCount}`));
  if (entry.chunkIndex !== null && entry.chunkCount !== null) {
    body.push(metaRow(`分割: ${entry.chunkIndex} / ${entry.chunkCount}`));
  }
  if (entry.httpStatus !== null) body.push(metaRow(`HTTP ステータス: ${entry.httpStatus}`));
  body.push(metaRow(`互換再試行: ${entry.retried ? 'あり' : 'なし'}`));
  if (entry.durationMs !== null) body.push(metaRow(`所要時間: ${entry.durationMs}ms`));
  body.push(traceBlock('モデルに送ったプロンプト', entry.request || '（記録なし）'));
  body.push(traceBlock('モデルの応答', entry.response || '（応答なし）'));
  // The system prompt is identical for every call and code-defined, so it is
  // shown here once instead of being stored in each entry.
  body.push(traceBlock('システムプロンプト（全呼び出し共通）', SYSTEM_PROMPT));
  return body;
};

const auditEntryView = (entry: AuditEntry): HTMLElement => {
  const detail = el('details');
  const destination = entry.model ? `${entry.provider} ${entry.model}` : entry.provider;
  // The page URL stays in the closed summary so the target is visible at a glance.
  const target = entry.pageUrl ? ` ${entry.pageUrl}` : '';
  detail.append(el('summary', `#${entry.id} ${formatDateTime(entry.createdAt)} ${destination} ${entry.result}${target}`));
  // The body is built on first open so a log at the cap does not mount thousands
  // of prompt and response nodes on page load.
  let filled = false;
  detail.addEventListener('toggle', () => {
    if (detail.open && !filled) {
      filled = true;
      detail.append(...buildEntryBody(entry));
    }
  });
  return detail;
};

const renderAuditList = (entries: AuditEntry[]): HTMLElement => {
  const root = el('div');
  root.className = 'audit-list';
  root.append(...[...entries].sort((a, b) => b.id - a.id).map(auditEntryView));
  return root;
};

export function mountAuditSection(root: HTMLElement, deps: AuditSectionDeps = defaultDeps()): void {
  const fieldset = el('fieldset');
  fieldset.append(el('legend', '通信の監査ログ'));
  for (const line of [
    'AI を呼び出すたびに、日時・プロバイダ・宛先・モデル・ページの URL（アドレスとパスのみ）・送った欄の数・結果に加えて、モデルに送ったプロンプトとモデルの応答を、この端末に記録します。プロファイルの値、欄に入力された値、API キー、リクエストヘッダは記録しません。',
    '記録は 7 日間だけ保存され、期限を過ぎたものは自動で削除されます。各記録を開くと、モデルに送った内容と応答を確認できます。',
    'ダウンロードしたファイルにはページの URL に加えて、送った欄の内容と応答が含まれます。ファイルの扱いは利用者の責任で行ってください。',
  ]) fieldset.append(el('p', line));

  const status = el('p');
  status.setAttribute('aria-live', 'polite');
  const download = el('button', 'TSV でダウンロード');
  download.type = 'button';
  const clear = el('button', 'ログを削除');
  clear.type = 'button';
  // Always available: a new AI call can land while this page stays open.
  const reload = el('button', '最新のログを読み込む');
  reload.type = 'button';
  const row = el('div');
  row.className = 'row';
  row.append(download, clear, reload);
  const listRoot = el('div');
  fieldset.append(status, row, listRoot);
  root.replaceChildren(fieldset);

  let entries: AuditEntry[] = [];
  const show = (list: AuditEntry[]) => {
    entries = list;
    status.textContent = list.length === 0 ? 'ログはありません。' : `ログは ${list.length} 件あります。`;
    download.disabled = list.length === 0;
    clear.disabled = list.length === 0;
    listRoot.replaceChildren(renderAuditList(list));
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
  reload.addEventListener('click', () => {
    void refresh();
  });

  show([]);
  void refresh();
}
