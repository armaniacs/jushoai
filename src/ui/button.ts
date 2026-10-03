import type { AiStatus } from '../llm/availability';
import { createShadowHost } from './host';

export interface ButtonHandle {
  setStatus(status: AiStatus): void;
  showError(text: string): void;
  reposition(): void;
  destroy(): void;
}

const STATUS_LABEL: Record<AiStatus, string> = {
  available: 'AI 有効',
  downloadable: 'AI 未準備',
  downloading: 'AI 準備中',
  unavailable: 'AI 無効',
};

const CSS = `
  button { all: initial; display: inline-flex; gap: 8px; align-items: center; cursor: pointer;
    font: 600 13px/1 system-ui, sans-serif; color: #fff; background: #2457d6;
    padding: 8px 12px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,.25); }
  button:hover { background: #1c46b3; }
  .badge { font-weight: 400; font-size: 11px; padding: 2px 6px; border-radius: 4px;
    background: rgba(255,255,255,.22); }
  .badge[data-status="error"] { background: #b3261e; }
  .badge[data-status="unavailable"] { background: rgba(0,0,0,.3); }
`;

export function mountButton(anchor: Element, onClick: () => void): ButtonHandle {
  const { host, root } = createShadowHost();
  const style = document.createElement('style');
  style.textContent = CSS;
  const button = document.createElement('button');
  button.type = 'button';
  const label = document.createElement('span');
  label.textContent = 'JushoAI で入力';
  const badge = document.createElement('span');
  badge.className = 'badge';
  button.append(label, badge);
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });
  root.append(style, button);
  document.body.append(host);

  let lastStatus: AiStatus = 'unavailable';
  let errorTimer: number | undefined;
  const handle: ButtonHandle = {
    setStatus(status) {
      lastStatus = status;
      window.clearTimeout(errorTimer);
      badge.textContent = STATUS_LABEL[status];
      badge.dataset.status = status;
    },
    showError(text) {
      window.clearTimeout(errorTimer);
      badge.textContent = text;
      badge.dataset.status = 'error';
      errorTimer = window.setTimeout(() => handle.setStatus(lastStatus), 4000);
    },
    reposition() {
      const r = anchor.getBoundingClientRect();
      host.style.top = `${Math.max(0, r.top + window.scrollY - 36)}px`;
      host.style.left = `${r.left + window.scrollX}px`;
    },
    destroy() {
      host.remove();
    },
  };
  handle.setStatus('unavailable');
  handle.reposition();
  return handle;
}
