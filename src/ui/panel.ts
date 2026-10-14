import { attachEscapeClose, createOverlayHost } from './overlay';

export interface PanelHandle {
  readonly host: HTMLElement;
  readonly root: ShadowRoot;
  close(): void;
}

// Single owner of overlay panel lifecycle: host creation, Escape handling,
// and idempotent close. Positioning stays with the caller (the overlay pins
// top-right; anchor-following buttons position from rects), and app-level
// bookkeeping (openPreview = null etc.) stays with the caller through onClose,
// which runs exactly once per panel.
export function mountPanel(
  render: (host: HTMLElement, root: ShadowRoot) => void,
  onClose: () => void = () => {},
): PanelHandle {
  const { host, root } = createOverlayHost();
  let closed = false;
  const detachEscape = attachEscapeClose(() => handle.close());
  const handle: PanelHandle = {
    host,
    root,
    close: () => {
      if (closed) return;
      closed = true;
      detachEscape();
      host.remove();
      onClose();
    },
  };
  render(host, root);
  document.body.append(host);
  return handle;
}

export interface RepositionTrackingDeps {
  doc: Document;
  win: Window;
  reposition: () => void;
  // Frame scheduler; injectable so tests drive the coalescing branch without
  // waiting on a real animation frame.
  schedule?: (cb: () => void) => void;
}

// Keeps a fixed UI element on its anchor when the layout under it changes:
// fonts and images landing, viewport changes (DevTools docking), and scrolling.
// Two details matter:
// - scroll does not bubble and inner scroll containers (multi-step wizards,
//   modals) move the anchor without a window scroll, so the listener sits in
//   the capture phase on the document and sees every element's scroll as well
//   as the page scroll (whose target is the document).
// - scrolling our own panel moves no anchor, so it is skipped.
// Repositioning is rAF-coalesced; reposition() itself skips zero-area anchors,
// so this converges instead of oscillating.
export function attachRepositionTracking(deps: RepositionTrackingDeps): () => void {
  const { doc, win, reposition } = deps;
  const runFrame = deps.schedule ?? ((cb: () => void) => win.requestAnimationFrame(cb));
  let pending = false;
  const request = (): void => {
    if (pending) return;
    pending = true;
    runFrame(() => {
      pending = false;
      reposition();
    });
  };
  const onScroll = (e: Event): void => {
    if (e.target instanceof Element && e.target.hasAttribute('data-jushoai')) return;
    request();
  };
  doc.addEventListener('scroll', onScroll, { capture: true, passive: true });
  win.addEventListener('resize', request);
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(request) : null;
  observer?.observe(doc.documentElement);
  win.addEventListener('load', reposition);
  return () => {
    doc.removeEventListener('scroll', onScroll, { capture: true });
    win.removeEventListener('resize', request);
    observer?.disconnect();
    win.removeEventListener('load', reposition);
  };
}
