import { OVERLAY_CSS } from './overlay';
import { mountPanel, type PanelHandle } from './panel';
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

export function chooseMapping(label: string, current: string): Promise<MappingDecision> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (d: MappingDecision): void => {
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
.mfield { margin: 0 0 10px; font-size: 12px; color: #5a6270; }
.mfield select { width: 100%; padding: 4px; font: inherit; }`;
        const panel = document.createElement('div');
        panel.className = 'panel';

        const head = document.createElement('h2');
        head.textContent = TITLE;

        const field = document.createElement('p');
        field.className = 'mfield';
        field.textContent = label;

        const wrap = document.createElement('label');
        const caption = document.createElement('span');
        caption.textContent = '意味';
        const select = document.createElement('select');
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
        const rememberBox = document.createElement('input');
        rememberBox.type = 'checkbox';
        rememberBox.checked = true;
        const rememberText = document.createElement('span');
        rememberText.textContent = REMEMBER_LABEL;
        rememberWrap.append(rememberBox, rememberText);

        const actions = document.createElement('div');
        actions.className = 'actions';
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = CANCEL_BUTTON;
        cancelBtn.addEventListener('click', () => {
          settle(null);
          handle.close();
        });
        const decideBtn = document.createElement('button');
        decideBtn.type = 'button';
        decideBtn.className = 'primary';
        decideBtn.textContent = DECIDE_BUTTON;
        decideBtn.addEventListener('click', () => {
          settle({ category: select.value as Category, remember: rememberBox.checked });
          handle.close();
        });
        actions.append(cancelBtn, decideBtn);

        panel.append(head, field, wrap, rememberWrap, actions);
        root.append(style, panel);
      },
      () => settle(null),
      { accessibleName: TITLE, focus: 'primary' },
    );
  });
}
