import { confirmDialog } from './confirm-dialog';
import { fillOneReasonLabel } from '../core/fill-one';

// Single-field confirmation (PBI-137): the value preview shown before a
// one-field injection. Page-controlled strings (label) render through
// textContent only — never innerHTML.
export type FillOneDecision =
  | { mode: 'fill'; value: string }
  | { mode: 'cancel' };

const TITLE = 'この欄に入力';
const FILL_BUTTON = '注入する';
const CANCEL_BUTTON = 'キャンセル';

// Close without a choice (Escape included) resolves as cancel: closing
// without a choice must not inject anything. Settle-once and the safe
// default live in confirmDialog.
export function confirmFillOne(fieldLabel: string, value: string): Promise<FillOneDecision> {
  return confirmDialog<FillOneDecision>({
    title: TITLE,
    body: (panel) => {
      const field = document.createElement('p');
      field.className = 'field';
      field.textContent = fieldLabel;

      const valueEl = document.createElement('p');
      valueEl.className = 'value';
      valueEl.textContent = value;

      panel.append(field, valueEl);
      return '.field { margin: 0 0 8px; font-size: 12px; color: var(--jushoai-muted); word-break: break-all; }\n.value { margin: 0 0 12px; font-size: 14px; word-break: break-all; }';
    },
    actions: [
      { label: CANCEL_BUTTON, pick: () => ({ mode: 'cancel' }) },
      { label: FILL_BUTTON, primary: true, pick: () => ({ mode: 'fill', value }) },
    ],
    defaultOnClose: { mode: 'cancel' },
  });
}

const BLOCKED_TITLE = 'この欄には入力できません';
const BLOCKED_GUIDANCE = '全体プレビューまたはカスタム対応付けをご利用ください。';

// Blocked notice (PBI-137): an unknown or otherwise no-fill field shows the
// reason and the guidance instead of injecting. Resolves on close; the
// dialog carries no decision, so the close default is just "done".
export function showFillOneBlocked(fieldLabel: string, reason: string): Promise<void> {
  return confirmDialog<void>({
    title: BLOCKED_TITLE,
    body: (panel) => {
      const field = document.createElement('p');
      field.className = 'empty';
      field.textContent = fieldLabel;

      const reasonEl = document.createElement('p');
      reasonEl.textContent = fillOneReasonLabel(reason);

      const guidance = document.createElement('p');
      guidance.textContent = BLOCKED_GUIDANCE;

      panel.append(field, reasonEl, guidance);
    },
    actions: [{ label: '閉じる', primary: true, pick: () => undefined }],
    defaultOnClose: undefined,
  });
}
