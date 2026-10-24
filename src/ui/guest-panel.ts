import { confirmDialog } from './confirm-dialog';
import { GUEST_ADDRESS_FIELDS, GUEST_PROFILE_FIELDS } from '../core/field-catalog';
import type { GuestValues } from '../core/guest';
import type { Address, Profile } from '../core/types';

// Guest entry (PBI-144): the one-shot values for a fill the user does not
// save. The form lives in a closed Shadow DOM; typed strings render as input
// values only and never reach storage, the audit log or the export/import.
// The field vocabulary (PBI-158) comes from the core field catalog: the panel
// renders exactly the catalog's guest subset, so a new row reaches the guest
// only when the catalog marks it guest and the wording never drifts.

export type GuestDecision = GuestValues | null;

const TITLE = 'ゲストで入力（保存しません）';
const USE_BUTTON = 'この内容で使う';
const CANCEL_BUTTON = '使わない';

// Close without a choice (Escape included) resolves null: closing without a
// choice never activates the guest. Settle-once and the safe default live in
// confirmDialog.
export function confirmGuest(): Promise<GuestDecision> {
  const boxes: { key: string; box: HTMLInputElement; owner: 'profile' | 'address' }[] = [];
  let useBtn: HTMLButtonElement | undefined;
  const syncUse = (): void => {
    if (!useBtn) return;
    useBtn.disabled = !boxes.some((b) => b.box.value.trim() !== '');
  };
  return confirmDialog<GuestDecision>({
    title: TITLE,
    body: (panel) => {
      const note = document.createElement('p');
      note.className = 'empty';
      note.textContent = '入力した内容は端末のメモリにだけ置かれ、保存・履歴・同期には残りません。';

      const form = document.createElement('div');
      form.className = 'gform';
      const appendFields = (
        fields: readonly { key: string; label: string; placeholder: string; type?: string }[],
        owner: 'profile' | 'address',
      ): void => {
        for (const f of fields) {
          const wrap = document.createElement('label');
          wrap.className = /zip|street|building/.test(f.key) ? 'gfield wide' : 'gfield';
          const text = document.createElement('span');
          text.textContent = f.label;
          const box = document.createElement('input');
          box.type = f.type ?? 'text';
          box.placeholder = f.placeholder;
          box.addEventListener('input', () => syncUse());
          wrap.append(text, box);
          boxes.push({ key: f.key, box, owner });
          form.append(wrap);
        }
      };
      appendFields(GUEST_PROFILE_FIELDS, 'profile');
      appendFields(GUEST_ADDRESS_FIELDS, 'address');

      panel.append(note, form);
      return '.gform { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0 0 12px; }\n.gfield { display: grid; gap: 2px; font-size: 12px; color: #5a6270; }\n.gfield.wide { grid-column: 1 / -1; }\n.gfield input { font-size: 13px; padding: 6px 8px; border: 1px solid #cfd6e0; border-radius: 6px; }';
    },
    actions: [
      { label: CANCEL_BUTTON, pick: () => null },
      {
        label: USE_BUTTON,
        primary: true,
        setup: (btn) => {
          useBtn = btn;
          btn.disabled = true;
        },
        pick: () => {
          const profile: GuestValues['profile'] = {};
          const address: GuestValues['address'] = {};
          for (const b of boxes) {
            const value = b.box.value.trim();
            if (!value) continue;
            if (b.owner === 'profile') {
              profile[b.key as keyof Profile] = value;
            } else {
              address[b.key as keyof Address] = value;
            }
          }
          return { profile, address };
        },
      },
    ],
    defaultOnClose: null,
  });
}
