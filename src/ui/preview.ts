import type { PlanStatus } from '../core/planner';
import type { Address, Profile } from '../core/types';
import { FILL_RESULT_LABELS, type FillResult, type FillSummary } from '../dom/fill-plan';
import { isMeasurable } from '../dom/geometry';
import { OVERLAY_CSS } from './overlay';
import { mountPanel, type PanelHandle } from './panel';

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
  profiles: Profile[];
  selectedProfileId: string;
  onProfileChange(id: string): void;
  onApply(sendFeedback: boolean): void;
  onCancel(): void;
  onReanalyze?(): void | Promise<void>;
}

export interface PreviewHandle {
  setRows(rows: PreviewRow[]): void;
  setReanalyzing(busy: boolean): void;
  setAddressId(id: string): void;
  // Post-apply result mode (PBI-55): replaces the panel content with the
  // countable breakdown and a one-click report button. Used instead of
  // close() when the apply was partial; a clean apply still closes.
  showResult(summary: FillSummary, onReport: () => void): void;
  close(): void;
  // Center of the apply button in viewport coordinates, or null when it has
  // no box (hidden). The consent gate reads this through the handle because
  // the button lives inside the closed shadow root.
  getApplyPoint(): { x: number; y: number } | null;
  // The host element carrying this panel. The page holds several JushoAI
  // hosts (form button, panel), so the gate must aim at this one rather than
  // the first [data-jushoai] node in the document.
  getHost(): Element;
}

const STATUS_NOTE: Record<PlanStatus, string> = {
  ok: '',
  filled: '入力済みのため上書きしません',
  'warn-maxlength': '文字数を超えるため入力しません',
  'warn-no-option': '一致する選択肢がないため入力しません',
  'warn-no-value': 'プロファイルに値がないため入力しません',
};

const CSS = `
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
  .actions .reanalyze { margin-right: auto; }
  .feedback { display: inline-flex; align-items: center; gap: 4px; font-size: 12px;
    color: #5a6270; cursor: pointer; }
  .feedback input { margin: 0; }
  button:disabled { opacity: .5; cursor: default; }
`;

export function showPreview(opts: PreviewOptions): PreviewHandle {
  const style = document.createElement('style');
  style.textContent = OVERLAY_CSS + CSS;
  const panel = document.createElement('div');
  panel.className = 'panel';

  const title = document.createElement('h2');
  title.textContent = '入力内容の確認';
  panel.append(title);

  if (opts.profiles.length > 1) {
    const select = document.createElement('select');
    for (const p of opts.profiles) {
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = p.label;
      o.selected = p.id === opts.selectedProfileId;
      select.append(o);
    }
    select.addEventListener('change', () => opts.onProfileChange(select.value));
    // Same shape as options labeled(): a wrapping label with a span caption,
    // so the visible text doubles as the accessible name (textContent only).
    const label = document.createElement('label');
    const caption = document.createElement('span');
    caption.textContent = 'プロファイル';
    label.append(caption, select);
    panel.append(label);
  }

  let addressSelect: HTMLSelectElement | null = null;
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
    // Same shape as options labeled(): a wrapping label with a span caption,
    // so the visible text doubles as the accessible name (textContent only).
    const label = document.createElement('label');
    const caption = document.createElement('span');
    caption.textContent = '住所';
    label.append(caption, select);
    panel.append(label);
    addressSelect = select;
  }

  const list = document.createElement('ul');
  list.setAttribute('aria-busy', 'false');
  const status = document.createElement('div');
  status.setAttribute('role', 'status');
  // Visually hidden live region: no visual/copy change, announces politely once.
  status.setAttribute('style', 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;');
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
  const onReanalyze = opts.onReanalyze;
  const reanalyze = onReanalyze
    ? Object.assign(document.createElement('button'), {
        type: 'button', className: 'reanalyze', textContent: 'AI で分析',
      })
    : null;
  let hasOk = false;
  let busy = false;
  let reanalyzed = false;
  let announcedBusy = false;
  const feedback = document.createElement('label');
  feedback.className = 'feedback';
  feedback.hidden = true;
  const feedbackBox = document.createElement('input');
  feedbackBox.type = 'checkbox';
  const feedbackText = document.createElement('span');
  feedbackText.textContent = '開発に報告する';
  feedback.title = '公開 issue が開きます。プロファイルの値は送りませんが、ページの見出し文言と URL の一部が含まれます';
  feedback.append(feedbackBox, feedbackText);
  const syncButtons = () => {
    if (reanalyze) {
      reanalyze.disabled = busy;
      reanalyze.textContent = busy ? '分析中…' : 'AI で分析';
    }
    cancel.disabled = busy;
    apply.disabled = busy || !hasOk;
    feedbackBox.disabled = busy;
    feedback.hidden = !(reanalyze && reanalyzed);
    list.setAttribute('aria-busy', busy ? 'true' : 'false');
    // Announce only on busy transitions: setRows() also calls syncButtons,
    // so rewriting the live region every time would re-announce mid-analysis.
    if (busy !== announcedBusy) {
      announcedBusy = busy;
      status.textContent = busy ? '分析中…' : '';
    }
  };
  const actions = document.createElement('div');
  actions.className = 'actions';
  actions.append(...(reanalyze ? [reanalyze, cancel, apply, feedback] : [cancel, apply]));
  panel.append(list, empty, actions, status);

  let resultMode = false;
  const setRows = (rows: PreviewRow[]) => {
    // PBI-59: result mode replaced the panel content, so re-rendering rows
    // would only touch a detached list. Ignore silently: reanalyze (the sole
    // setRows caller after open) has no button in result mode and cannot fire.
    if (resultMode) return;
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
    hasOk = rows.some((r) => r.status === 'ok');
    syncButtons();
  };

  const setReanalyzing = (v: boolean) => {
    busy = v;
    syncButtons();
  };
  if (onReanalyze) {
    reanalyze!.addEventListener('click', () => {
      if (busy) return;
      setReanalyzing(true);
      // Defer the call into the chain so a synchronously throwing handler
      // becomes a rejection instead of escaping the listener uncaught.
      void Promise.resolve()
        .then(onReanalyze)
        .then(() => {
          reanalyzed = true;
          syncButtons();
        })
        .catch((e) => console.error('JushoAI: reanalysis failed', e))
        .finally(() => setReanalyzing(false));
    });
  }

  apply.addEventListener('click', () => opts.onApply(feedbackBox.checked && !feedback.hidden));
  cancel.addEventListener('click', () => opts.onCancel());

  setRows(opts.rows);
  // Host creation, Escape handling, and idempotent close live in the panel
  // module; the rendering above is unchanged.
  let mounted!: PanelHandle;
  mounted = mountPanel(
    (_host, root) => { root.append(style, panel); },
    () => opts.onCancel(),
    { accessibleName: '入力内容の確認', focus: 'primary' },
  );
  const setAddressId = (id: string): void => {
    if (addressSelect) addressSelect.value = id;
  };
  // PBI-55 result mode. Keeps the same mounted panel (focus trap and Escape
  // handling stay intact); only the content is swapped. Breakdown rows reuse
  // the .label/.value grid; the report button carries the one-click issue
  // action supplied by the caller. Labels come from the fill-plan-owned table
  // (PBI-58), shared with the issue-report body.
  const showResult = (summary: FillSummary, onReport: () => void): void => {
    title.textContent = '入力結果';
    const head = document.createElement('p');
    head.className = 'empty';
    head.textContent = `適用済み ${summary.filled} / ${summary.total}件（未適用 ${summary.unapplied}件）`;
    const breakdown = document.createElement('ul');
    breakdown.replaceChildren(
      ...Object.entries(summary.byResult)
        .filter(([, n]) => n > 0)
        // Stable order: applied first, then the rest alphabetically, so the
        // same summary always renders the same list.
        .sort(([a], [b]) => (a === 'filled' ? -1 : b === 'filled' ? 1 : a < b ? -1 : 1))
        .map(([result, n]) => {
          const li = document.createElement('li');
          const label = document.createElement('span');
          label.className = 'label';
          label.textContent = FILL_RESULT_LABELS[result as FillResult] ?? result;
          const value = document.createElement('span');
          value.className = 'value';
          value.textContent = `${n}件`;
          li.append(label, value);
          return li;
        }),
    );
    const report = document.createElement('button');
    report.type = 'button';
    report.className = 'report';
    report.textContent = '内訳をissueで報告';
    report.title = '件数内訳入りのGitHub issue下書きを開きます（プロファイル値は含みません）';
    report.addEventListener('click', () => onReport());
    const done = document.createElement('button');
    done.type = 'button';
    done.textContent = '閉じる';
    // Same teardown as cancel: the panel closes idempotently and the caller
    // drops its handle, so a later open starts from a clean state.
    done.addEventListener('click', () => opts.onCancel());
    const resultActions = document.createElement('div');
    resultActions.className = 'actions';
    resultActions.append(report, done);
    panel.replaceChildren(title, head, breakdown, resultActions);
    resultMode = true;
    // PBI-56: the removed apply button keeps DOM focus otherwise, stranding
    // keyboard users on <body>. Move it to the primary action of this view.
    report.focus();
  };
  const getApplyPoint = (): { x: number; y: number } | null => {
    const rect = apply.getBoundingClientRect();
    if (!isMeasurable(rect)) return null;
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  };
  return { setRows, setReanalyzing, setAddressId, showResult, close: () => mounted.close(), getApplyPoint, getHost: () => mounted.host };
}
