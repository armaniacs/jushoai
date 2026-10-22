import { OVERLAY_CSS } from './overlay';
import { mountPanel, type PanelHandle } from './panel';
import type { EgressRow } from '../ai/egress-preview';

// Egress gate (PBI-124): the confirm panel shown before the AI classify when
// the provider is available and pending fields exist. Rows render the exact
// wire fields (built by egressRowsFor from encodeFieldMeta) through
// textContent only — page-controlled strings never go through innerHTML.
export type EgressDecision =
  | { mode: 'ai'; send: ReadonlySet<string> }
  | { mode: 'rule-only' };

const TITLE = 'AI判定で送る内容';
const INTRO =
  'ルールで判定できない欄のメタデータ（name・id・label・placeholder・見出し・type・maxLength）を、選択したプロバイダに送ります。プロファイルの値や欄に入力済みの値は送りません。';
const SUSPECT_MARK = '（要確認）';
const EXCLUDE_LABEL = '送らない';
const AI_BUTTON = 'AI判定する';
const RULE_BUTTON = 'ルールのみで入力する';

// Resolves when the user picks a mode. Escape / outside close resolve as
// rule-only: closing the gate without a choice must not send anything.
export function confirmEgress(rows: EgressRow[]): Promise<EgressDecision> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (d: EgressDecision): void => {
      if (!settled) {
        settled = true;
        resolve(d);
      }
    };

    const suspects = rows.filter((r) => r.suspect);
    const handles = new Map<EgressRow, HTMLInputElement>();
    let handle!: PanelHandle;

    const sendSet = (): ReadonlySet<string> => {
      const send = new Set<string>();
      for (const r of rows) {
        const box = handles.get(r);
        if (box?.checked) continue;
        send.add(r.id);
      }
      return send;
    };

    handle = mountPanel(
      (host, root) => {
        const style = document.createElement('style');
        style.textContent = `${OVERLAY_CSS}
.panel { width: min(520px, 92vw); }
.egress-list { max-height: 40vh; overflow: auto; margin: 8px 0; }
.egress-row { display: flex; gap: 8px; align-items: baseline; padding: 4px 0; font-size: 12px; }
.egress-row.suspect { color: #8a4b00; }
.egress-mark { flex: none; font-weight: bold; }
.egress-summary { word-break: break-all; }
.egress-exclude { flex: none; display: flex; gap: 4px; align-items: baseline; }
.actions { display: flex; gap: 8px; justify-content: flex-end; }`;
        const panel = document.createElement('div');
        panel.className = 'panel';

        const head = document.createElement('h2');
        head.textContent = TITLE;

        const intro = document.createElement('p');
        intro.textContent = INTRO;

        const list = document.createElement('div');
        list.className = 'egress-list';
        for (const row of rows) {
          const line = document.createElement('div');
          line.className = row.suspect ? 'egress-row suspect' : 'egress-row';
          if (row.suspect) {
            const mark = document.createElement('span');
            mark.className = 'egress-mark';
            mark.textContent = SUSPECT_MARK;
            line.append(mark);
            const exclude = document.createElement('label');
            exclude.className = 'egress-exclude';
            const box = document.createElement('input');
            box.type = 'checkbox';
            box.checked = true;
            box.dataset.fieldId = row.id;
            const text = document.createElement('span');
            text.textContent = EXCLUDE_LABEL;
            exclude.append(box, text);
            line.append(exclude);
            handles.set(row, box);
          }
          const summary = document.createElement('span');
          summary.className = 'egress-summary';
          summary.textContent = row.summary;
          line.append(summary);
          list.append(line);
        }

        const note = document.createElement('p');
        note.textContent = suspects.length > 0
          ? `${SUSPECT_MARK}の欄は個人情報らしき文言を含みます。既定では送りません。`
          : '';

        const actions = document.createElement('div');
        actions.className = 'actions';
        const ruleBtn = document.createElement('button');
        ruleBtn.type = 'button';
        ruleBtn.textContent = RULE_BUTTON;
        ruleBtn.addEventListener('click', () => {
          settle({ mode: 'rule-only' });
          handle.close();
        });
        const aiBtn = document.createElement('button');
        aiBtn.type = 'button';
        aiBtn.className = 'primary';
        aiBtn.textContent = AI_BUTTON;
        aiBtn.addEventListener('click', () => {
          settle({ mode: 'ai', send: sendSet() });
          handle.close();
        });
        actions.append(ruleBtn, aiBtn);

        panel.append(head, intro, list, ...(note.textContent ? [note] : []), actions);
        root.append(style, panel);
      },
      () => settle({ mode: 'rule-only' }),
      { accessibleName: TITLE, focus: 'primary' },
    );
  });
}
