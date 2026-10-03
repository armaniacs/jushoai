import { getFlagGuidance, type BrowserKind } from '../llm/browser-support';
import type { AiStatus } from '../llm/availability';
import { createShadowHost } from './host';

export interface Guide {
  title: string;
  lines: string[];
}

const RULE_LINE = 'ルールによる入力は AI なしでも使えます。';

function flagLines(browser: BrowserKind): string[] {
  const g = getFlagGuidance(browser);
  if (!g) {
    return [
      'Chrome または Edge のフラグ設定で、内蔵 AI（Prompt API）を有効にしてください。',
      '設定を変えたあとはブラウザを再起動してください。',
    ];
  }
  return [
    `フラグ名: ${g.flagName}`,
    `アドレスバーに貼り付けて開く: ${g.flagUrl}`,
    '有効にしたあとはブラウザを再起動してください。',
  ];
}

export function buildGuide(status: AiStatus, browser: BrowserKind): Guide {
  switch (status) {
    case 'unsupported':
      return {
        title: 'このブラウザでは内蔵 AI を使えません',
        lines: [
          'この環境には内蔵 AI の API がありません。最近の Chrome（Gemini Nano）または Edge（Phi-mini）が必要です。',
          ...flagLines(browser),
          RULE_LINE,
        ],
      };
    case 'unavailable':
      return {
        title: '内蔵 AI を利用できません',
        lines: [
          'フラグが無効になっているか、この端末ではモデルを実行できない可能性があります。ディスクの空き容量不足も原因の一つとして考えられます。',
          ...flagLines(browser),
          RULE_LINE,
        ],
      };
    case 'downloadable':
      return {
        title: 'AI モデルが未ダウンロードです',
        lines: [
          '「入力」を押すとモデルのダウンロードを試みます。ブラウザによっては自動で始まらないことがあります。',
          RULE_LINE,
        ],
      };
    case 'downloading':
      return {
        title: 'AI モデルを準備中です',
        lines: ['モデルをダウンロードしています。完了後に AI 判定が使われます。', RULE_LINE],
      };
    case 'available':
      return { title: 'AI 判定を利用できます', lines: ['AI の準備ができています。', RULE_LINE] };
  }
}

export interface GuideHandle {
  close(): void;
}

const CSS = `
  .panel { all: initial; display: block; box-sizing: border-box; width: 360px; max-height: 80vh;
    overflow: auto; font: 13px/1.5 system-ui, sans-serif; color: #1a1a1a; background: #fff;
    border: 1px solid #c8ccd4; border-radius: 8px; padding: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.25); }
  h2 { margin: 0 0 8px; font-size: 14px; }
  p { margin: 0 0 8px; word-break: break-all; user-select: text; }
  .actions { display: flex; justify-content: flex-end; }
  button { font: inherit; padding: 6px 14px; border-radius: 6px; border: 1px solid #c8ccd4;
    background: #f4f5f8; cursor: pointer; }
`;

export function showAiGuide(guide: Guide, onClose: () => void = () => {}): GuideHandle {
  const { host, root } = createShadowHost();
  host.style.position = 'fixed';
  host.style.top = '16px';
  host.style.right = '16px';

  const style = document.createElement('style');
  style.textContent = CSS;
  const panel = document.createElement('div');
  panel.className = 'panel';
  const title = document.createElement('h2');
  title.textContent = guide.title;
  panel.append(title);
  for (const line of guide.lines) {
    const p = document.createElement('p');
    p.textContent = line;
    panel.append(p);
  }
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = '閉じる';
  const actions = document.createElement('div');
  actions.className = 'actions';
  actions.append(closeButton);
  panel.append(actions);

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    host.remove();
    onClose();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKey, true);
  closeButton.addEventListener('click', close);

  root.append(style, panel);
  document.body.append(host);
  return { close };
}
