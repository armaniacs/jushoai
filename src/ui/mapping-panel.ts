import { confirmDialog } from './confirm-dialog';
import { CATEGORIES } from '../core/types';
import type { Category } from '../core/types';

// Custom mapping chooser (PBI-138): the panel the preview's 直す entry opens.
// The user picks the category and decides whether the site learns it; the
// chosen value stays on-device either way and never reaches the LLM or the
// audit log.

export type MappingDecision = { category: Category; remember: boolean } | null;

const TITLE = 'この欄の意味を直す';
const DECIDE_BUTTON = '決める';
const CANCEL_BUTTON = 'やめる';
const REMEMBER_LABEL = 'このサイトに覚えさせる';

// unknown is never a choice: it is the unclassifiable marker, not a meaning.
const CHOICES = CATEGORIES.filter((c) => c !== 'unknown');

// Close without a choice (Escape included) resolves null: no mapping is
// applied. Settle-once and the safe default live in confirmDialog.
export function chooseMapping(label: string, current: string): Promise<MappingDecision> {
  let select!: HTMLSelectElement;
  let rememberBox!: HTMLInputElement;
  return confirmDialog<MappingDecision>({
    title: TITLE,
    body: (panel) => {
      const field = document.createElement('p');
      field.className = 'mfield';
      field.textContent = label;

      const wrap = document.createElement('label');
      const caption = document.createElement('span');
      caption.textContent = '意味';
      select = document.createElement('select');
      for (const c of CHOICES) {
        const o = document.createElement('option');
        o.value = c;
        o.textContent = c;
        o.selected = c === current;
        select.append(o);
      }
      wrap.append(caption, select);

      const rememberWrap = document.createElement('label');
      rememberWrap.className = 'feedback';
      rememberBox = document.createElement('input');
      rememberBox.type = 'checkbox';
      rememberBox.checked = true;
      const rememberText = document.createElement('span');
      rememberText.textContent = REMEMBER_LABEL;
      rememberWrap.append(rememberBox, rememberText);

      panel.append(field, wrap, rememberWrap);
      return '.mfield { margin: 0 0 10px; font-size: 12px; color: var(--jushoai-muted); }\n.mfield select { width: 100%; padding: 4px; font: inherit; }';
    },
    actions: [
      { label: CANCEL_BUTTON, pick: () => null },
      {
        label: DECIDE_BUTTON,
        primary: true,
        pick: () => ({ category: select.value as Category, remember: rememberBox.checked }),
      },
    ],
    defaultOnClose: null,
  });
}
