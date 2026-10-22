import { OVERLAY_CSS } from './overlay';
import { mountPanel, type PanelHandle } from './panel';
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

// Resolves when the user picks a mode. Escape / outside close resolve as
// cancel: closing without a choice must not inject anything.
export function confirmFillOne(fieldLabel: string, value: string): Promise<FillOneDecision> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (d: FillOneDecision): void => {
      if (!settled) {
        settled = true;
        resolve(d);
      }
    };
    let handle!: PanelHandle;
    handle = mountPanel(
      (host, root) => {
        const style = document.createElement('style');
        style.textContent = `${OVERLAY_CSS}
.field { margin: 0 0 8px; font-size: 12px; color: #5a6270; word-break: break-all; }
.value { margin: 0 0 12px; font-size: 14px; word-break: break-all; }`;
        const panel = document.createElement('div');
        panel.className = 'panel';

        const head = document.createElement('h2');
        head.textContent = TITLE;

        const field = document.createElement('p');
        field.className = 'field';
        field.textContent = fieldLabel;

        const valueEl = document.createElement('p');
        valueEl.className = 'value';
        valueEl.textContent = value;

        const actions = document.createElement('div');
        actions.className = 'actions';
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = CANCEL_BUTTON;
        cancelBtn.addEventListener('click', () => {
          settle({ mode: 'cancel' });
          handle.close();
        });
        const fillBtn = document.createElement('button');
        fillBtn.type = 'button';
        fillBtn.className = 'primary';
        fillBtn.textContent = FILL_BUTTON;
        fillBtn.addEventListener('click', () => {
          settle({ mode: 'fill', value });
          handle.close();
        });
        actions.append(cancelBtn, fillBtn);

        panel.append(head, field, valueEl, actions);
        root.append(style, panel);
      },
      () => settle({ mode: 'cancel' }),
      { accessibleName: TITLE, focus: 'primary' },
    );
  });
}

const BLOCKED_TITLE = 'この欄には入力できません';
const BLOCKED_GUIDANCE = '全体プレビューまたはカスタム対応付けをご利用ください。';

// Blocked notice (PBI-137): an unknown or otherwise no-fill field shows the
// reason and the guidance instead of injecting. Resolves on close.
export function showFillOneBlocked(fieldLabel: string, reason: string): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (): void => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    let handle!: PanelHandle;
    handle = mountPanel(
      (host, root) => {
        const style = document.createElement('style');
        style.textContent = OVERLAY_CSS;
        const panel = document.createElement('div');
        panel.className = 'panel';

        const head = document.createElement('h2');
        head.textContent = BLOCKED_TITLE;

        const field = document.createElement('p');
        field.className = 'empty';
        field.textContent = fieldLabel;

        const reasonEl = document.createElement('p');
        reasonEl.textContent = fillOneReasonLabel(reason);

        const guidance = document.createElement('p');
        guidance.textContent = BLOCKED_GUIDANCE;

        const actions = document.createElement('div');
        actions.className = 'actions';
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'primary';
        closeBtn.textContent = '閉じる';
        closeBtn.addEventListener('click', () => {
          settle();
          handle.close();
        });
        actions.append(closeBtn);

        panel.append(head, field, reasonEl, guidance, actions);
        root.append(style, panel);
      },
      () => settle(),
      { accessibleName: BLOCKED_TITLE, focus: 'primary' },
    );
  });
}
