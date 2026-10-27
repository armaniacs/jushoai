import type { AiStatusInfo } from '../ai/types';
import { isMeasurable } from '../dom/geometry';
import { createShadowHost } from './host';
import { computePlacement, type Rect } from './position';
import { badgeLabel } from './status-label';

// Banner kinds (PBI-152): the timer behavior rides the kind, never the
// wording. 'partial' banners persist until the next setStatus (PBI-08:
// 部分適用は畳まず残す), 'transient' ones restore the last status after 4s.
// The text is free wording — no caller may sniff it.
export type BannerKind = 'partial' | 'transient';

export interface BannerNotice {
  kind: BannerKind;
  text: string;
}

export interface ButtonHandle {
  setStatus(info: AiStatusInfo): void;
  showError(notice: BannerNotice): void;
  /** Blocker rects in document coordinates, cached at scan time (PBI-161). */
  setAvoids(rects: Rect[]): void;
  reposition(): void;
  destroy(): void;
}

const INITIAL: AiStatusInfo = { status: 'unavailable', provider: 'none' };

const CSS = `
  .wrap { all: initial; display: inline-flex; gap: 8px; align-items: center;
    font: 600 13px/1 system-ui, sans-serif; color: #fff;
    /* PBI-162: the banner background stays translucent so a field it still
       covers remains readable (the placement, PBI-161, cannot always find a
       collision-free spot). Text and badge keep full opacity; hover, focus
       and active restore the opaque banner for reading and clicking. */
    background: rgba(36, 87, 214, 0.8);
    padding: 8px 12px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,.25); }
  .wrap:hover, .wrap:focus-within, .wrap:active { background: #1c46b3; }
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
  const { host, root } = createShadowHost({ position: 'fixed' });
  // Viewport-anchored (fixed): the written top/left must always equal the
  // rendered rect, so a stale or mismatched document position can never
  // strand the button. Anchor tracking is preserved by re-resolving on scroll,
  // resize and geometry changes (wired in content.ts).
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
    if (!e.isTrusted) return;
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });
  badge.addEventListener('click', (e) => {
    if (!e.isTrusted) return;
    e.preventDefault();
    e.stopPropagation();
    if (statusKnown) onBadgeClick(lastInfo);
  });
  root.append(style, wrap);
  document.body.append(host);

  let lastInfo: AiStatusInfo = INITIAL;
  let statusKnown = false;
  let errorTimer: number | undefined;
  // Blockers cached in document coordinates at scan time (PBI-161); converted
  // to viewport space at reposition time, so a scroll never needs a fresh
  // sweep. hasPosition tracks whether a position has been written: the first
  // render must place the button somewhere even if nothing is clear.
  let avoidRects: Rect[] = [];
  let hasPosition = false;
  const handle: ButtonHandle = {
    setStatus(info) {
      lastInfo = info;
      statusKnown = true;
      window.clearTimeout(errorTimer);
      // The error announcement is scoped to the error display: ordinary
      // status changes must not trigger unsolicited live-region speech.
      badge.removeAttribute('aria-live');
      badge.removeAttribute('aria-atomic');
      badge.textContent = badgeLabel(info);
      badge.dataset.status = info.status;
      handle.reposition();
    },
    showError(notice) {
      window.clearTimeout(errorTimer);
      // Expose the error reason to assistive technology: the badge keeps its
      // button semantics (no role override) and its text/style untouched, so
      // only the announcement behavior is added, politely (no interruption).
      badge.setAttribute('aria-live', 'polite');
      badge.setAttribute('aria-atomic', 'true');
      badge.textContent = notice.text;
      badge.dataset.status = 'error';
      if (notice.kind === 'transient') {
        errorTimer = window.setTimeout(() => handle.setStatus(lastInfo), 4000);
      }
      // kind='partial' sets no timer: the banner stays as displayed until the
      // next setStatus (PBI-08), with the badge click reapply path
      // (onBadgeClick) untouched. Transient errors restore after 4s. The kind
      // arrives as a type, so the wording is never sniffed here (PBI-152).
      handle.reposition();
    },
    setAvoids(rects) {
      avoidRects = rects;
    },
    reposition() {
      // A detached or not-yet-laid-out anchor reports a zero rect; writing a
      // position from it would fling the button to a viewport corner, so keep
      // the last good position until the anchor is measurable again.
      if (!anchor.isConnected) return;
      const anchorRect = anchor.getBoundingClientRect();
      if (!isMeasurable(anchorRect)) return;
      const hostRect = host.getBoundingClientRect();
      const clientWidth = document.documentElement.clientWidth;
      // The avoid rects are document-relative; the host is fixed, so convert
      // them to viewport space with the current scroll offset. Empty scroll
      // keeps computePlacement's "is there room above" test honest — the
      // anchor rect is already viewport-relative.
      const sx = window.scrollX || 0;
      const sy = window.scrollY || 0;
      const avoid = avoidRects.map((r) => ({
        top: r.top - sy,
        left: r.left - sx,
        right: r.right - sx,
        bottom: r.bottom - sy,
      }));
      const pos = computePlacement({
        anchor: anchorRect,
        size: { width: hostRect.width || 220, height: hostRect.height || 32 },
        viewport: { width: clientWidth > 0 ? Math.min(window.innerWidth, clientWidth) : window.innerWidth },
        scroll: { x: 0, y: 0 },
        avoid,
      });
      // No collision-free candidate: keep the last good position instead of
      // writing an overlapping one (PBI-161). The first render has no last
      // position, so it writes the best-effort placement and the translucent
      // banner (PBI-162) mitigates the residual overlap.
      if (!pos.clear && hasPosition) return;
      // The host reset uses `all: initial !important`, which expands to
      // `top: initial !important` / `left: initial !important`. Plain inline
      // writes lose to it, so the coordinates must be written important too
      // (same-priority important declarations resolve by source order).
      host.style.setProperty('top', `${pos.top}px`, 'important');
      host.style.setProperty('left', `${pos.left}px`, 'important');
      hasPosition = true;
    },
    destroy() {
      // Drop a pending error-restore timer: without this, a destroyed badge
      // would still flip text and reposition after the timeout, extending the
      // handle's closure past teardown.
      window.clearTimeout(errorTimer);
      host.remove();
    },
  };
  handle.setStatus(INITIAL);
  statusKnown = false;
  handle.reposition();
  return handle;
}
