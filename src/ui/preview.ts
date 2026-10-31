import type { PlanStatus } from '../core/planner';
import type { Address, Profile } from '../core/types';
import { fillResultLabel, type FillSummary } from '../dom/fill-plan';
import { isMeasurable } from '../dom/geometry';
import { OVERLAY_CSS } from './overlay';
import { mountPanel, type PanelHandle } from './panel';

// PBI-157: one opt-in candidate on a row (PBI-122 abbreviation, PBI-125
// zip/kana dictionary assist). Rendered as an opt-in checkbox (unchecked =
// not injected); the checked field ids travel to the apply callback, which
// promotes them into the fill plan through the single approval seam.
export interface PreviewRowCandidate {
  // The kind picks the checkbox wording: 'abbrev' renders 略記して入れる,
  // 'assist' renders 補助候補を入れる.
  kind: 'abbrev' | 'assist';
  // The candidate value itself. Owned by the plan; the display already shows
  // it (raw → abbreviated, 候補: assist).
  text: string;
}

export interface PreviewRow {
  label: string;
  display: string;
  status: PlanStatus;
  source: 'rule' | 'llm';
  // The field this row fills. Rides the row only when opt-in candidates do,
  // so the fix entry and the approval set share the same presence check.
  fieldId?: string;
  // PBI-157: the row's opt-in candidates (PBI-122 abbrev, PBI-125 assist) —
  // one checkbox each through a single block, instead of the twin blocks.
  candidates?: PreviewRowCandidate[];
  // PBI-128: marks the collapsed-summary row (前回と同じ) as synthetic — not a
  // field, but an entry that states the hidden rows will fill as approved. It
  // counts toward the apply button's state on purpose: those rows will fill,
  // so the shortened preview stays usable when the visible rows are warnings.
  synthetic?: true;
}

export interface PreviewOptions {
  rows: PreviewRow[];
  addresses: Address[];
  selectedAddressId: string;
  onAddressChange(id: string): void;
  profiles: Profile[];
  selectedProfileId: string;
  onProfileChange(id: string): void;
  // PBI-122: the second argument carries the abbreviation approvals — the
  // field ids whose candidate the user explicitly checked in the preview.
  onApply(sendFeedback: boolean, approvedAbbrevs: ReadonlySet<string>): void;
  onCancel(): void;
  onReanalyze?(): void | Promise<void>;
  // PBI-138: the preview's 分類を直す entry. The first argument is the field id,
  // the second the row label the chooser shows.
  onFix?(fieldId: string, label: string): void | Promise<void>;
  // PBI-128: the shortened preview's expand entry. Renders the 前回と同じ rows
  // that the diff collapsed.
  onExpandAll?(): void;
}

export interface PreviewHandle {
  setRows(rows: PreviewRow[]): void;
  setAddressId(id: string): void;
  // Post-apply result mode (PBI-55): replaces the panel content with the
  // countable breakdown and a one-click report button. Used instead of
  // close() when the apply was partial or when the undo history exists
  // (PBI-132); the undo option renders the 元に戻す button.
  showResult(summary: FillSummary, onReport: () => void, undo?: { count: number; onUndo(): void }): void;
  // Post-undo confirmation (PBI-132): replaces the result content with the
  // restored/skipped counts and the close button only.
  showUndoResult(restored: number, skipped: number): void;
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
  // PBI-210: maxlength 超過（文字数）と混ざらない文言。同じ warn 行の調子に寄せる。
  'warn-pattern': '欄のパターンと合わないため入力しません',
  'warn-no-option': '一致する選択肢がないため入力しません',
  'warn-no-value': 'プロファイルに値がないため入力しません',
};

const CSS = `
  select { width: 100%; margin-bottom: 8px; padding: 4px; font: inherit; }
  ul { list-style: none; margin: 0 0 12px; padding: 0; }
  li { display: grid; grid-template-columns: 110px 1fr; gap: 2px 8px; padding: 6px 0;
    border-bottom: 1px solid var(--jushoai-divider); }
  .label { color: var(--jushoai-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .value { word-break: break-all; }
  .note { grid-column: 2; font-size: 11px; color: var(--jushoai-danger); }
  .note.muted { color: var(--jushoai-muted); }
  .abbrev { grid-column: 2; display: inline-flex; align-items: center; gap: 4px;
    font-size: 11px; color: var(--jushoai-muted); cursor: pointer; }
  .abbrev input { margin: 0; }
  .ai { display: inline-block; margin-left: 6px; padding: 0 5px; font-size: 10px; color: var(--jushoai-ai-fg);
    background: var(--jushoai-ai-bg); border-radius: 3px; }
  .empty { color: var(--jushoai-muted); margin: 0 0 12px; }
  .actions .reanalyze { margin-right: auto; }
  .fix { grid-column: 2; justify-self: start; margin-top: 2px; padding: 1px 6px;
    font-size: 10px; color: var(--jushoai-muted); background: var(--jushoai-chip-bg); border: 1px solid var(--jushoai-chip-border);
    border-radius: 4px; cursor: pointer; }
  .feedback { display: inline-flex; align-items: center; gap: 4px; font-size: 12px;
    color: var(--jushoai-muted); cursor: pointer; }
  .feedback input { margin: 0; }
  button:disabled { opacity: .5; cursor: default; }
`;

// PBI-157: the caption-wrapped select seam. The profile and address selects
// share this implementation — a wrapping label with a span caption, so the
// visible text doubles as the accessible name (textContent only).
const renderSelect = (
  caption: string,
  items: ReadonlyArray<{ id: string; label: string }>,
  currentId: string,
  onChange: (id: string) => void,
): { label: HTMLLabelElement; select: HTMLSelectElement } => {
  const select = document.createElement('select');
  for (const item of items) {
    const o = document.createElement('option');
    o.value = item.id;
    o.textContent = item.label;
    o.selected = item.id === currentId;
    select.append(o);
  }
  select.addEventListener('change', () => onChange(select.value));
  const label = document.createElement('label');
  const captionSpan = document.createElement('span');
  captionSpan.textContent = caption;
  label.append(captionSpan, select);
  return { label, select };
};

// The opt-in checkbox copy per candidate kind (PBI-122 略記, PBI-125 補助).
const CANDIDATE_TEXT: Record<PreviewRowCandidate['kind'], string> = {
  abbrev: '略記して入れる',
  assist: '補助候補を入れる',
};

// PBI-157: the caller side of the row seam. Approval bookkeeping (the apply
// callback reads the checked boxes back) and the fix entry live with setRows;
// the DOM assembly lives in renderRow.
interface RenderRowCallbacks {
  // PBI-138: the 分類を直す entry. The chooser (and the remember step) live
  // with the onFix handler in the caller.
  onFix?: (fieldId: string, label: string) => void;
  // Collects an opt-in candidate checkbox into the approval bookkeeping.
  addCandidate(id: string, box: HTMLInputElement): void;
  // Re-syncs the apply button after a toggle: an approved candidate unlocks
  // apply even when no plain ok row does.
  onCandidateToggle(): void;
}

const renderRow = (r: PreviewRow, callbacks: RenderRowCallbacks): HTMLLIElement => {
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
  const { fieldId, candidates } = r;
  // レビュー指摘: the status note and its opt-in candidates agree — checking a
  // candidate flips the red「入力しません」note to muted (the row IS about to
  // be entered), unchecking restores it.
  let note: HTMLSpanElement | null = null;
  if (STATUS_NOTE[r.status]) {
    note = document.createElement('span');
    note.className = r.status === 'filled' ? 'note muted' : 'note';
    note.textContent = STATUS_NOTE[r.status];
    li.append(note);
  }
  // PBI-157: one checkbox per candidate through this single block — the twin
  // abbrev/assist blocks are gone. A candidate rides a row only with its
  // field id, so the approval is always collectible.
  if (fieldId && candidates) {
    for (const c of candidates) {
      const wrap = document.createElement('label');
      wrap.className = 'abbrev';
      const box = document.createElement('input');
      box.type = 'checkbox';
      const text = document.createElement('span');
      text.textContent = CANDIDATE_TEXT[c.kind];
      wrap.append(box, text);
      box.addEventListener('change', () => {
        if (note) note.className = box.checked ? 'note muted' : 'note';
        callbacks.onCandidateToggle();
      });
      callbacks.addCandidate(fieldId, box);
      li.append(wrap);
    }
  }
  // PBI-138: the 分類を直す entry, one per row with a field id.
  if (fieldId && callbacks.onFix) {
    const onFix = callbacks.onFix;
    const fix = document.createElement('button');
    fix.type = 'button';
    fix.className = 'fix';
    fix.textContent = '直す';
    fix.setAttribute('aria-label', `${r.label} の分類を直す`);
    fix.addEventListener('click', () => { void onFix(fieldId, r.label); });
    li.append(fix);
  }
  return li;
};

export function showPreview(opts: PreviewOptions): PreviewHandle {
  const style = document.createElement('style');
  style.textContent = OVERLAY_CSS + CSS;
  const panel = document.createElement('div');
  panel.className = 'panel';

  const title = document.createElement('h2');
  title.textContent = '入力内容の確認';
  panel.append(title);

  if (opts.profiles.length > 1) {
    panel.append(renderSelect('プロファイル', opts.profiles, opts.selectedProfileId, opts.onProfileChange).label);
  }

  let addressSelect: HTMLSelectElement | null = null;
  if (opts.addresses.length > 1) {
    const address = renderSelect('住所', opts.addresses, opts.selectedAddressId, opts.onAddressChange);
    panel.append(address.label);
    addressSelect = address.select;
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
  // PBI-143: the 相性 summary line, hidden until rows exist.
  const coverage = document.createElement('p');
  coverage.className = 'coverage';
  coverage.hidden = true;
  const apply = document.createElement('button');
  apply.className = 'primary';
  apply.type = 'button';
  apply.textContent = '入力する';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'キャンセル';
  const onReanalyze = opts.onReanalyze;
  const onFix = opts.onFix;
  const onExpandAll = opts.onExpandAll;
  const reanalyze = onReanalyze
    ? Object.assign(document.createElement('button'), {
        type: 'button', className: 'reanalyze', textContent: 'AI で分析',
      })
    : null;
  // PBI-128: the expand button replaces the collapsed rows with the full list.
  const expand = onExpandAll
    ? Object.assign(document.createElement('button'), {
        type: 'button', className: 'reanalyze', textContent: '前回と同じ欄を表示',
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
    if (expand) expand.disabled = busy;
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
  if (expand) {
    expand.addEventListener('click', () => {
      // One-shot: the full list replaces the collapsed view.
      expand.hidden = true;
      onExpandAll?.();
    });
    actions.append(expand);
  }
  actions.append(...(reanalyze ? [reanalyze, cancel, apply, feedback] : [cancel, apply]));
  panel.append(list, empty, coverage, actions, status);

  let resultMode = false;
  // PBI-157: the candidates render as opt-in checkboxes. The boxes reset
  // on every setRows (a replan rebuilds the plan), so an approval is always
  // bound to the plan the panel currently shows.
  let currentRows: PreviewRow[] = [];
  let candidateBoxes: { id: string; box: HTMLInputElement }[] = [];
  const approvedCandidates = (): ReadonlySet<string> =>
    new Set(candidateBoxes.filter((b) => b.box.checked).map((b) => b.id));
  const syncHasOk = (): void => {
    // An approved candidate unlocks apply even when no plain ok row does:
    // an overflow-only field would otherwise strand the approval behind a
    // disabled button. The synthetic collapsed-summary row (PBI-128) counts
    // too — its status 'ok' states that the hidden rows will fill as approved,
    // so the shortened preview stays usable when the visible rows warn.
    hasOk = currentRows.some((r) => r.status === 'ok') || candidateBoxes.some((b) => b.box.checked);
    syncButtons();
  };
  // The setRows side of the row seam (PBI-157): approval bookkeeping and the
  // fix entry live here, the DOM assembly lives in renderRow.
  const rowCallbacks: RenderRowCallbacks = {
    onFix,
    addCandidate: (id, box) => { candidateBoxes.push({ id, box }); },
    onCandidateToggle: syncHasOk,
  };
  const setRows = (rows: PreviewRow[]) => {
    // PBI-59: result mode replaced the panel content, so re-rendering rows
    // would only touch a detached list. Ignore silently: reanalyze (the sole
    // setRows caller after open) has no button in result mode and cannot fire.
    if (resultMode) return;
    currentRows = rows;
    candidateBoxes = [];
    list.replaceChildren(...rows.map((r) => renderRow(r, rowCallbacks)));
    empty.hidden = rows.length > 0;
    // PBI-143: the compatibility summary. How many of the scanned fields the
    // preview can fill, next to the per-field reasons. Page-derived strings
    // never enter this line — it counts the plan, it does not quote it.
    const fillable = currentRows.filter((r) => r.status === 'ok').length;
    coverage.hidden = rows.length === 0 || fillable === 0;
    coverage.textContent = fillable > 0
      ? `${fillable} / ${currentRows.length} 欄に入力できます（承認後に注入します）`
      : '';
    syncHasOk();
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

  apply.addEventListener('click', () =>
    opts.onApply(feedbackBox.checked && !feedback.hidden, approvedCandidates()));
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
  // PBI-157: the result-view seam. showResult and showUndoResult share the
  // title/head assembly, the content swap, and the resultMode flip; the
  // breakdown and the undo wording stay with the callers.
  const swapToResult = (headText: string, ...rest: HTMLElement[]): void => {
    title.textContent = '入力結果';
    const head = document.createElement('p');
    head.className = 'empty';
    head.textContent = headText;
    panel.replaceChildren(title, head, ...rest);
    resultMode = true;
  };
  // The result views' close button — same teardown as cancel: the panel
  // closes idempotently and the caller drops its handle, so a later open
  // starts from a clean state.
  const doneButton = (): HTMLButtonElement => {
    const done = document.createElement('button');
    done.type = 'button';
    done.textContent = '閉じる';
    done.addEventListener('click', () => opts.onCancel());
    return done;
  };
  // PBI-55 result mode. Keeps the same mounted panel (focus trap and Escape
  // handling stay intact); only the content is swapped. Breakdown rows reuse
  // the .label/.value grid; the report button carries the one-click issue
  // action supplied by the caller. Labels come from the fill-plan-owned table
  // (PBI-58), shared with the issue-report body.
  const showResult = (summary: FillSummary, onReport: () => void, undo?: { count: number; onUndo(): void }): void => {
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
          label.textContent = fillResultLabel(result);
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
    const resultActions = document.createElement('div');
    resultActions.className = 'actions';
    // PBI-132: the undo button only when the latest apply recorded history.
    // The callback resolves through the caller (session.undoLast), and the
    // view swaps to the undo confirmation from there.
    if (undo && undo.count > 0) {
      const undoBtn = document.createElement('button');
      undoBtn.type = 'button';
      // Its own class, not 'report': both buttons once shared 'report' and an
      // E2E selector for the issue-report button kept landing on this one.
      undoBtn.className = 'undo';
      undoBtn.textContent = '元に戻す';
      undoBtn.title = 'JushoAIが入れた欄だけ注入前の空状態に戻します（追記した欄は触りません）';
      undoBtn.addEventListener('click', () => undo.onUndo());
      resultActions.append(undoBtn);
    }
    resultActions.append(report, doneButton());
    swapToResult(
      `適用済み ${summary.filled} / ${summary.total}件（未適用 ${summary.unapplied}件）`,
      breakdown, resultActions,
    );
    // PBI-56: the removed apply button keeps DOM focus otherwise, stranding
    // keyboard users on <body>. Move it to the primary action of this view.
    report.focus();
  };
  const getApplyPoint = (): { x: number; y: number } | null => {
    const rect = apply.getBoundingClientRect();
    if (!isMeasurable(rect)) return null;
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  };
  // PBI-132: post-undo confirmation — the restored/skipped counts and close
  // only. The breakdown report is gone because the history was consumed.
  const showUndoResult = (restored: number, skipped: number): void => {
    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.append(doneButton());
    swapToResult(
      skipped > 0
        ? `元に戻しました（${restored}件）。追記後の${skipped}件はそのままです`
        : `元に戻しました（${restored}件）`,
      actions,
    );
  };

  return { setRows, setAddressId, showResult, showUndoResult, close: () => mounted.close(), getApplyPoint, getHost: () => mounted.host };
}
