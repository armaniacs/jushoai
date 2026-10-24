import { confirmDialog } from './confirm-dialog';
import type { GuestValues } from '../core/guest';
import type { Address, Profile } from '../core/types';

// Guest entry (PBI-144): the one-shot values for a fill the user does not
// save. The form lives in a closed Shadow DOM; typed strings render as input
// values only and never reach storage, the audit log or the export/import.

export type GuestDecision = GuestValues | null;

const TITLE = 'ゲストで入力（保存しません）';
const USE_BUTTON = 'この内容で使う';
const CANCEL_BUTTON = '使わない';

const FIELDS: { key: keyof Profile; label: string; placeholder: string }[] = [
  { key: 'lastName', label: '姓', placeholder: '山田' },
  { key: 'firstName', label: '名', placeholder: '太郎' },
  { key: 'lastNameKana', label: 'セイ', placeholder: 'ヤマダ' },
  { key: 'firstNameKana', label: 'メイ', placeholder: 'タロウ' },
  { key: 'email', label: 'メールアドレス', placeholder: 'yamada@example.com' },
  { key: 'tel', label: '電話番号', placeholder: '09012345678' },
];

const ADDRESS_FIELDS: { key: keyof Address; label: string; placeholder: string }[] = [
  { key: 'zip', label: '郵便番号', placeholder: '1000001' },
  { key: 'prefecture', label: '都道府県', placeholder: '東京都' },
  { key: 'city', label: '市区町村', placeholder: '千代田区' },
  { key: 'street', label: '番地', placeholder: '千代田1-1' },
  { key: 'building', label: '建物名・部屋番号', placeholder: '千代田ビル101' },
];

// Close without a choice (Escape included) resolves null: closing without a
// choice never activates the guest. Settle-once and the safe default live in
// confirmDialog.
export function confirmGuest(): Promise<GuestDecision> {
  const boxes: { key: string; box: HTMLInputElement }[] = [];
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
        fields: { key: string; label: string; placeholder: string }[],
      ): void => {
        for (const f of fields) {
          const wrap = document.createElement('label');
          wrap.className = /zip|street|building/.test(f.key) ? 'gfield wide' : 'gfield';
          const text = document.createElement('span');
          text.textContent = f.label;
          const box = document.createElement('input');
          box.type = f.key === 'email' ? 'email' : (f.key === 'tel' ? 'tel' : 'text');
          box.placeholder = f.placeholder;
          box.addEventListener('input', () => syncUse());
          wrap.append(text, box);
          boxes.push({ key: f.key, box });
          form.append(wrap);
        }
      };
      appendFields(FIELDS);
      appendFields(ADDRESS_FIELDS);

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
            if (FIELDS.some((f) => f.key === b.key)) {
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
