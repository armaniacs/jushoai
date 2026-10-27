import type { AiStatusInfo } from '../ai/types';
import { isMeasurable } from '../dom/geometry';
import { createShadowHost } from './host';
import { computePlacement, MARGIN, type Rect } from './position';
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
  /**
   * Recompute the position. The blocker rects in document coordinates
   * (PBI-161) may be passed with the call; they are kept for the follow-up
   * repositions that viewport tracking triggers. Passing them here keeps the
   * avoid update and the recompute on one call, so no caller can update one
   * and forget the other.
   */
  reposition(avoid?: Rect[]): void;
  destroy(): void;
}

const INITIAL: AiStatusInfo = { status: 'unavailable', provider: 'none' };

// PBI-163: a pointer gesture below this distance is a click, not a drag —
// tiny jitter must not swallow the button press.
const DRAG_THRESHOLD = 4;
const KEY_STEP = 16;
const KEY_STEP_LARGE = 64;

// The placement falls back to this size while the banner is not yet laid out
// (moveHostTo's clamp and reposition's candidate sizing share it).
const BANNER_FALLBACK = { width: 220, height: 32 };

const CSS = `
  .wrap { all: initial; display: inline-flex; gap: 8px; align-items: center;
    font: 600 13px/1 system-ui, sans-serif; color: #fff;
    /* PBI-162: the banner background stays translucent so a field it still
       covers remains readable (the placement, PBI-161, cannot always find a
       collision-free spot). 0.9 keeps the page visible through the banner
       while the blended background over a white form measures 5.0:1 against
       the white text - WCAG AA (4.5:1). Text and badge keep full opacity;
       hover, focus and active restore the opaque banner for reading and
       clicking. */
    background: rgba(36, 87, 214, 0.9);
    padding: 8px 12px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,.25);
    /* PBI-163: the banner is draggable — the grab cursor and touch-action
       keep the gesture from scrolling the page or reading as a dead zone. */
    touch-action: none; cursor: grab; }
  .wrap:hover, .wrap:focus-within, .wrap:active { background: #1c46b3; }
  .wrap:active { cursor: grabbing; }
  button { all: initial; cursor: inherit; font: inherit; color: inherit; }
  .badge { font-weight: 400; font-size: 11px; padding: 2px 6px; border-radius: 4px;
    background: rgba(255,255,255,.22); }
  .badge[data-status="error"], .badge[data-status="not-configured"],
  .badge[data-status="permission-missing"], .badge[data-status="auth-error"] { background: #b3261e; }
  .badge[data-status="unavailable"], .badge[data-status="unsupported"],
  .badge[data-status="disabled"] { background: rgba(0,0,0,.3); }
  .hint { position: absolute; width: 1px; height: 1px; overflow: hidden;
    clip-path: inset(50%); white-space: nowrap; }
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
  // PBI-163: the drag affordance must reach assistive technology — the title
  // tooltip is hover-only. A visually-hidden hint, referenced through
  // aria-describedby from both buttons, announces the drag and the keyboard
  // path.
  const hint = document.createElement('span');
  hint.className = 'hint';
  hint.id = 'jushoai-drag-hint';
  hint.textContent = 'ドラッグ、または矢印キーで移動できます';
  button.setAttribute('aria-describedby', hint.id);
  badge.setAttribute('aria-describedby', hint.id);
  wrap.append(button, badge, hint);
  wrap.title = 'ドラッグで移動できます';
  // PBI-163: a drag that ends on the banner consumes the click that follows,
  // so moving the banner never starts the fill flow.
  button.addEventListener('click', (e) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    if (!e.isTrusted) return;
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });
  badge.addEventListener('click', (e) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    if (!e.isTrusted) return;
    e.preventDefault();
    e.stopPropagation();
    if (statusKnown) onBadgeClick(lastInfo);
  });
  // The same viewport width the placement uses: a zero clientWidth means no
  // layout yet (detached documents), so fall back to innerWidth instead of
  // clamping everything against a zero-width viewport.
  const viewportWidth = (): number => {
    const clientWidth = document.documentElement.clientWidth;
    return clientWidth > 0 ? Math.min(window.innerWidth, clientWidth) : window.innerWidth;
  };
  // Keep the banner inside the viewport: the fixed host must never be
  // dragged partially off-screen or out of reach.
  const moveHostTo = (top: number, left: number) => {
    const box = host.getBoundingClientRect();
    const width = box.width || BANNER_FALLBACK.width;
    const height = box.height || BANNER_FALLBACK.height;
    const maxLeft = Math.max(MARGIN, viewportWidth() - width - MARGIN);
    const maxTop = Math.max(MARGIN, window.innerHeight - height - MARGIN);
    host.style.setProperty('top', `${Math.min(Math.max(top, MARGIN), maxTop)}px`, 'important');
    host.style.setProperty('left', `${Math.min(Math.max(left, MARGIN), maxLeft)}px`, 'important');
  };
  const onDragMove = (e: PointerEvent) => {
    if (!dragOrigin) return;
    // A missed pointerup (released over an iframe or outside the viewport)
    // must not leave the banner chasing the cursor: the primary button is no
    // longer held, so the gesture is over.
    if (!(e.buttons & 1)) {
      endDrag(e);
      return;
    }
    const dx = e.clientX - dragOrigin.x;
    const dy = e.clientY - dragOrigin.y;
    if (!dragging && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
    dragging = true;
    manual = true;
    moveHostTo(dragOrigin.top + dy, dragOrigin.left + dx);
  };
  const endDrag = (e: PointerEvent) => {
    if (!dragOrigin) return;
    if (dragging) suppressClick = true;
    dragging = false;
    dragOrigin = null;
    // The window-level listeners are per-gesture: without this, a stale
    // listener keeps dragging after the release.
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
  };
  wrap.addEventListener('pointerdown', (e) => {
    // A new gesture clears a leftover flag: a drag that ended outside the
    // banner (released over the page) never delivers its click to the
    // banner's listeners, and without the reset the next legitimate press
    // would be silently swallowed.
    suppressClick = false;
    if (e.button !== 0) return;
    const box = host.getBoundingClientRect();
    dragOrigin = { x: e.clientX, y: e.clientY, top: box.top, left: box.left };
    // The move/up listeners live on the window instead of the banner plus
    // pointer capture: the pointer leaves the banner during a drag, and
    // capturing would retarget the release so the click that follows lands
    // on the wrap instead of the button — the fill flow never starts
    // (caught by tests/e2e/chrome.e2e.ts).
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  });
  wrap.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    // delta = [top, left]; moveHostTo takes them in that order.
    const delta: [number, number] | null =
      e.key === 'ArrowUp' ? [-step, 0] :
      e.key === 'ArrowDown' ? [step, 0] :
      e.key === 'ArrowLeft' ? [0, -step] :
      e.key === 'ArrowRight' ? [0, step] : null;
    if (!delta) return;
    // The keyboard path is part of the feature (マウス等): arrow keys move
    // the banner without touching the page scroll.
    e.preventDefault();
    e.stopPropagation();
    const box = host.getBoundingClientRect();
    manual = true;
    moveHostTo(box.top + delta[0], box.left + delta[1]);
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
  // PBI-163: the manual position wins once the user places the banner. Reset
  // only on destroy — a mounted banner has no re-show path.
  let manual = false;
  let dragging = false;
  let suppressClick = false;
  let dragOrigin: { x: number; y: number; top: number; left: number } | null = null;
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
    reposition(avoid?: Rect[]) {
      if (avoid) avoidRects = avoid;
      // PBI-163: a user-placed position wins — the anchor-based recompute
      // must not overwrite it (scroll, resize and status changes included).
      // A resized or DevTools-docked viewport can still leave the written
      // position outside reach, so the manual position is kept but clamped
      // back into the viewport: a banner stranded off-screen would be
      // unreachable until a reload.
      if (manual) {
        const box = host.getBoundingClientRect();
        if (box.width > 0 || box.height > 0) moveHostTo(box.top, box.left);
        return;
      }
      // A detached or not-yet-laid-out anchor reports a zero rect; writing a
      // position from it would fling the button to a viewport corner, so keep
      // the last good position until the anchor is measurable again.
      if (!anchor.isConnected) return;
      const anchorRect = anchor.getBoundingClientRect();
      if (!isMeasurable(anchorRect)) return;
      const hostRect = host.getBoundingClientRect();
      // The avoid rects are document-relative; the host is fixed, so convert
      // them to viewport space with the current scroll offset. Empty scroll
      // keeps computePlacement's "is there room above" test honest — the
      // anchor rect is already viewport-relative.
      const sx = window.scrollX || 0;
      const sy = window.scrollY || 0;
      const blockers = avoidRects.map((r) => ({
        top: r.top - sy,
        left: r.left - sx,
        right: r.right - sx,
        bottom: r.bottom - sy,
      }));
      const pos = computePlacement({
        anchor: anchorRect,
        size: { width: hostRect.width || BANNER_FALLBACK.width, height: hostRect.height || BANNER_FALLBACK.height },
        viewport: { width: viewportWidth() },
        scroll: { x: 0, y: 0 },
        avoid: blockers,
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
      // moveHostTo clamps the write into the viewport, so a form whose bottom
      // edge sits at the viewport end cannot fling the banner below the fold
      // (PBI-161 scenario 3: the banner stays on screen).
      moveHostTo(pos.top, pos.left);
      hasPosition = true;
    },
    destroy() {
      // Drop a pending error-restore timer: without this, a destroyed badge
      // would still flip text and reposition after the timeout, extending the
      // handle's closure past teardown.
      window.clearTimeout(errorTimer);
      // Drop an in-flight drag's window listeners: without this, a destroyed
      // banner keeps dragging the (removed) host after the release.
      window.removeEventListener('pointermove', onDragMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      manual = false;
      dragging = false;
      suppressClick = false;
      dragOrigin = null;
      host.remove();
    },
  };
  handle.setStatus(INITIAL);
  statusKnown = false;
  handle.reposition();
  return handle;
}
