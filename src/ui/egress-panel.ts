import { confirmDialog } from './confirm-dialog';
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

// Close without a choice (Escape included) resolves as rule-only: closing
// the gate without a choice must not send anything. Settle-once and the
// safe default live in confirmDialog.
export function confirmEgress(rows: EgressRow[]): Promise<EgressDecision> {
  const handles = new Map<EgressRow, HTMLInputElement>();
  return confirmDialog<EgressDecision>({
    title: TITLE,
    body: (panel) => {
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

      panel.append(intro, list);
      if (rows.some((r) => r.suspect)) {
        const note = document.createElement('p');
        note.textContent = `${SUSPECT_MARK}の欄は個人情報らしき文言を含みます。既定では送りません。`;
        panel.append(note);
      }
      return '.panel { width: min(520px, 92vw); }\n.egress-list { max-height: 40vh; overflow: auto; margin: 8px 0; }\n.egress-row { display: flex; gap: 8px; align-items: baseline; padding: 4px 0; font-size: 12px; }\n.egress-row.suspect { color: var(--jushoai-warn); }\n.egress-mark { flex: none; font-weight: bold; }\n.egress-summary { word-break: break-all; }\n.egress-exclude { flex: none; display: flex; gap: 4px; align-items: baseline; }';
    },
    actions: [
      { label: RULE_BUTTON, pick: () => ({ mode: 'rule-only' }) },
      {
        label: AI_BUTTON,
        primary: true,
        pick: () => {
          const send = new Set<string>();
          for (const r of rows) {
            const box = handles.get(r);
            if (box?.checked) continue;
            send.add(r.id);
          }
          return { mode: 'ai', send };
        },
      },
    ],
    defaultOnClose: { mode: 'rule-only' },
  });
}
