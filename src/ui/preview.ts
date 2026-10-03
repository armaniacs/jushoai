import type { PlanStatus } from '../core/planner';
import type { Address } from '../core/types';
import { createShadowHost } from './host';

export interface PreviewRow {
  label: string;
  display: string;
  status: PlanStatus;
  source: 'rule' | 'llm';
}

export interface PreviewOptions {
  rows: PreviewRow[];
  addresses: Address[];
  selectedAddressId: string;
  onAddressChange(id: string): void;
  onApply(): void;
  onCancel(): void;
}

export interface PreviewHandle {
  setRows(rows: PreviewRow[]): void;
  close(): void;
}

const STATUS_NOTE: Record<PlanStatus, string> = {
  ok: '',
  filled: '入力済みのため上書きしません',
  'warn-maxlength': '文字数を超えるため入力しません',
  'warn-no-option': '一致する選択肢がないため入力しません',
};

const CSS = `
  .panel { all: initial; display: block; box-sizing: border-box; width: 360px; max-height: 80vh;
    overflow: auto; font: 13px/1.5 system-ui, sans-serif; color: #1a1a1a; background: #fff;
    border: 1px solid #c8ccd4; border-radius: 8px; padding: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.25); }
  h2 { margin: 0 0 8px; font-size: 14px; }
  select { width: 100%; margin-bottom: 8px; padding: 4px; font: inherit; }
  ul { list-style: none; margin: 0 0 12px; padding: 0; }
  li { display: grid; grid-template-columns: 110px 1fr; gap: 2px 8px; padding: 6px 0;
    border-bottom: 1px solid #eceef2; }
  .label { color: #5a6270; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .value { word-break: break-all; }
  .note { grid-column: 2; font-size: 11px; color: #b3261e; }
  .note.muted { color: #5a6270; }
  .ai { display: inline-block; margin-left: 6px; padding: 0 5px; font-size: 10px; color: #fff;
    background: #8a4fd6; border-radius: 3px; }
  .empty { color: #5a6270; margin: 0 0 12px; }
  .actions { display: flex; justify-content: flex-end; gap: 8px; }
  button { font: inherit; padding: 6px 14px; border-radius: 6px; border: 1px solid #c8ccd4;
    background: #f4f5f8; cursor: pointer; }
  button.primary { background: #2457d6; border-color: #2457d6; color: #fff; }
  button:disabled { opacity: .5; cursor: default; }
`;

export function showPreview(opts: PreviewOptions): PreviewHandle {
  const { host, root } = createShadowHost();
  host.style.position = 'fixed';
  host.style.top = '16px';
  host.style.right = '16px';

  const style = document.createElement('style');
  style.textContent = CSS;
  const panel = document.createElement('div');
  panel.className = 'panel';

  const title = document.createElement('h2');
  title.textContent = '入力内容の確認';
  panel.append(title);

  if (opts.addresses.length > 1) {
    const select = document.createElement('select');
    for (const a of opts.addresses) {
      const o = document.createElement('option');
      o.value = a.id;
      o.textContent = a.label;
      o.selected = a.id === opts.selectedAddressId;
      select.append(o);
    }
    select.addEventListener('change', () => opts.onAddressChange(select.value));
    panel.append(select);
  }

  const list = document.createElement('ul');
  const empty = document.createElement('p');
  empty.className = 'empty';
  empty.textContent = '入力できる欄が見つかりませんでした';
  const apply = document.createElement('button');
  apply.className = 'primary';
  apply.type = 'button';
  apply.textContent = '入力する';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'キャンセル';
  const actions = document.createElement('div');
  actions.className = 'actions';
  actions.append(cancel, apply);
  panel.append(list, empty, actions);

  const setRows = (rows: PreviewRow[]) => {
    list.replaceChildren(
      ...rows.map((r) => {
        const li = document.createElement('li');
        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = r.label;
        const value = document.createElement('span');
        value.className = 'value';
        value.textContent = r.display;
        if (r.source === 'llm') {
          const ai = document.createElement('span');
          ai.className = 'ai';
          ai.textContent = 'AI判定';
          value.append(ai);
        }
        li.append(label, value);
        if (STATUS_NOTE[r.status]) {
          const note = document.createElement('span');
          note.className = r.status === 'filled' ? 'note muted' : 'note';
          note.textContent = STATUS_NOTE[r.status];
          li.append(note);
        }
        return li;
      }),
    );
    empty.hidden = rows.length > 0;
    apply.disabled = !rows.some((r) => r.status === 'ok');
  };

  const close = () => {
    document.removeEventListener('keydown', onKey, true);
    host.remove();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') opts.onCancel();
  };
  document.addEventListener('keydown', onKey, true);
  apply.addEventListener('click', () => opts.onApply());
  cancel.addEventListener('click', () => opts.onCancel());

  setRows(opts.rows);
  root.append(style, panel);
  document.body.append(host);
  return { setRows, close };
}
