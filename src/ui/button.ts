import type { AiStatusInfo } from '../ai/types';
import { createShadowHost } from './host';
import { badgeLabel } from './status-label';

export interface ButtonHandle {
  setStatus(info: AiStatusInfo): void;
  showError(text: string): void;
  reposition(): void;
  destroy(): void;
}

const INITIAL: AiStatusInfo = { status: 'unavailable', provider: 'none' };

const CSS = `
  .wrap { all: initial; display: inline-flex; gap: 8px; align-items: center;
    font: 600 13px/1 system-ui, sans-serif; color: #fff; background: #2457d6;
    padding: 8px 12px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,.25); }
  .wrap:hover { background: #1c46b3; }
  button { all: initial; cursor: pointer; font: inherit; color: inherit; }
  .badge { font-weight: 400; font-size: 11px; padding: 2px 6px; border-radius: 4px;
    background: rgba(255,255,255,.22); }
  .badge[data-status="error"], .badge[data-status="not-configured"],
  .badge[data-status="permission-missing"], .badge[data-status="auth-error"] { background: #b3261e; }
  .badge[data-status="unavailable"], .badge[data-status="unsupported"],
  .badge[data-status="disabled"] { background: rgba(0,0,0,.3); }
`;

export function mountButton(
  anchor: Element,
  onClick: () => void,
  onBadgeClick: (info: AiStatusInfo) => void = () => {},
): ButtonHandle {
  const { host, root } = createShadowHost();
  const style = document.createElement('style');
  style.textContent = CSS;
  const wrap = document.createElement('div');
  wrap.className = 'wrap';
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'JushoAI で入力';
  const badge = document.createElement('button');
  badge.type = 'button';
  badge.className = 'badge';
  wrap.append(button, badge);
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });
  badge.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (statusKnown) onBadgeClick(lastInfo);
  });
  root.append(style, wrap);
  document.body.append(host);

  let lastInfo: AiStatusInfo = INITIAL;
  let statusKnown = false;
  let errorTimer: number | undefined;
  const handle: ButtonHandle = {
    setStatus(info) {
      lastInfo = info;
      statusKnown = true;
      window.clearTimeout(errorTimer);
      badge.textContent = badgeLabel(info);
      badge.dataset.status = info.status;
    },
    showError(text) {
      window.clearTimeout(errorTimer);
      badge.textContent = text;
      badge.dataset.status = 'error';
      errorTimer = window.setTimeout(() => handle.setStatus(lastInfo), 4000);
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
  handle.setStatus(INITIAL);
  statusKnown = false;
  handle.reposition();
  return handle;
}
