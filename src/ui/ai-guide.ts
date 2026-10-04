import type { AiStatusInfo } from '../ai/types';
import { getFlagGuidance, type BrowserKind } from '../llm/browser-support';
import { attachEscapeClose, createOverlayHost, OVERLAY_CSS } from './overlay';
import { PROVIDER_LABEL } from './status-label';

export interface Guide {
  title: string;
  lines: string[];
  openSettings?: boolean;
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

export function buildGuide(info: AiStatusInfo, browser: BrowserKind): Guide {
  const providerName = PROVIDER_LABEL[info.provider];
  switch (info.status) {
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
    case 'disabled':
      return {
        title: 'AI 判定はオフです',
        lines: [
          'ルールで判定できない欄だけ AI で補助できます。設定ページで AI プロバイダを選んでください。',
          RULE_LINE,
        ],
        openSettings: true,
      };
    case 'not-configured': {
      const missing =
        info.provider === 'openai'
          ? '設定（ベース URL とモデル名（localhost 以外は API キー））'
          : info.provider === 'gemini'
            ? '設定（モデル名と API キー）'
            : '設定';
      return {
        title: 'AI の設定が未完了です',
        lines: [
          `${providerName} の${missing}を設定ページで確認してください。`,
          'API キーを保存済みなのにこの表示になる場合は、キーを入力し直してください。',
          RULE_LINE,
        ],
        openSettings: true,
      };
    }
    case 'permission-missing':
      return {
        title: 'AI への通信が許可されていません',
        lines: [
          `${providerName} への通信が許可されていません。設定ページで保存し直し、ブラウザの確認で許可してください。`,
          RULE_LINE,
        ],
        openSettings: true,
      };
    case 'auth-error':
      return {
        title: 'AI の認証に失敗しました',
        lines: [
          `${providerName} が認証を拒否しました。設定ページで API キーを確認してください。`,
          'Ollama などローカルのサーバーの場合は、API キーではなく OLLAMA_ORIGINS の設定（拡張機能のオリジンの許可）を確認してください。',
          RULE_LINE,
        ],
        openSettings: true,
      };
    case 'available':
      return info.provider === 'openai' || info.provider === 'gemini'
        ? {
            title: 'AI 判定を利用できます',
            lines: [
              `ルールで判定できない欄の分類に ${providerName} を使います。送るのは欄のメタデータ（name・label など）だけで、入力する値は送りません。`,
              RULE_LINE,
            ],
          }
        : { title: 'AI 判定を利用できます', lines: ['AI の準備ができています。', RULE_LINE] };
  }
}

export interface GuideHandle {
  close(): void;
}

const CSS = `
  p { margin: 0 0 8px; word-break: break-all; user-select: text; }
`;

export function showAiGuide(
  guide: Guide,
  onClose: () => void = () => {},
  onOpenSettings: () => void = () => {},
): GuideHandle {
  const { host, root } = createOverlayHost();

  const style = document.createElement('style');
  style.textContent = OVERLAY_CSS + CSS;
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
  if (guide.openSettings) {
    const settingsButton = document.createElement('button');
    settingsButton.type = 'button';
    settingsButton.className = 'primary';
    settingsButton.textContent = 'AI 設定を開く';
    settingsButton.addEventListener('click', () => {
      onOpenSettings();
      close();
    });
    actions.append(settingsButton);
  }
  actions.append(closeButton);
  panel.append(actions);

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    detachEscape();
    host.remove();
    onClose();
  };
  const detachEscape = attachEscapeClose(() => close());
  closeButton.addEventListener('click', close);

  root.append(style, panel);
  document.body.append(host);
  return { close };
}
