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
// Explicit presence: the dialog name and the initial focus target travel as
// arguments, never scraped from markup. A scraped heading couples the
// accessible name to render text (and could mirror caller-controlled PII into
// a page-readable attribute); a scanned `.primary` class couples focus to DOM
// order. Both are caller intent and belong in the call.
export interface PanelPresence {
  accessibleName?: string;
  // 'first' (default): the first enabled button, regardless of marking.
  // 'primary': prefer the `.primary`-marked action, falling back to first.
  // The default stays dumb on purpose: future panels get predictable focus
  // unless they opt into the primary convention explicitly at the call site.
  focus?: 'primary' | 'first';
}

export function mountPanel(
  render: (host: HTMLElement, root: ShadowRoot) => void,
  onClose: () => void = () => {},
  presence: PanelPresence = {},
): PanelHandle {
  const { host, root } = createOverlayHost();
  // Focus restore target: the element that had focus before the panel opens.
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
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
      // Return focus to the opener when it is still in the document.
      if (opener && opener.isConnected) opener.focus();
      onClose();
    },
  };
  // A throwing render must not strand the Escape listener or an unreturned
  // handle: tear down and let the caller see the exception. onClose does not
  // run because the panel never opened.
  try {
    render(host, root);
  } catch (e) {
    detachEscape();
    host.remove();
    throw e;
  }
  // Dialog semantics (a11y-only): the host is the dialog, named explicitly by
  // the caller. Never scrape the shadow heading here: the host attribute is
  // page-readable, so only caller-vetted static strings may land on it.
  host.setAttribute('role', 'dialog');
  const name = (presence.accessibleName ?? '').trim();
  if (name) host.setAttribute('aria-label', name);
  else host.removeAttribute('aria-label');
  document.body.append(host);
  // Initial focus follows the explicit target: 'first' (default) takes the
  // first enabled button; 'primary' prefers the marked action. Callers opt in
  // at the call site instead of relying on markup order or class scanning.
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('button')];
  const enabled = buttons.filter((b) => !b.disabled);
  const primary = enabled.find((b) => b.classList.contains('primary'));
  const target = (presence.focus === 'primary' ? (primary ?? enabled[0]) : enabled[0]) ?? buttons[0];
  target?.focus();
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
