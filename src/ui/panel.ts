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
  // Modal focus trap: while this panel is open, Tab / Shift+Tab cycles among
  // the focusable controls inside the shadow root and never escapes to the
  // page behind. This panel is intentionally modal (aria-modal="true" below):
  // a future non-modal panel must not reuse this trap without removing it and
  // documenting the non-modal intent at the call site.
  const detachTrap = attachFocusTrap(root, () => closed);
  const handle: PanelHandle = {
    host,
    root,
    close: () => {
      if (closed) return;
      closed = true;
      detachEscape();
      detachTrap();
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
    detachTrap();
    host.remove();
    throw e;
  }
  // Dialog semantics (a11y-only): the host is the dialog, named explicitly by
  // the caller. Never scrape the shadow heading here: the host attribute is
  // page-readable, so only caller-vetted static strings may land on it.
  // The dialog is modal: focus is trapped inside (see attachFocusTrap) so
  // aria-modal="true" tells SR users the page behind is inert.
  host.setAttribute('role', 'dialog');
  host.setAttribute('aria-modal', 'true');
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
  const preferred = presence.focus === 'primary' ? primary : undefined;
  const target = preferred ?? enabled[0] ?? buttons[0];
  target?.focus();
  return handle;
}

// Cycles Tab / Shift+Tab among the shadow's focusable controls. Buttons are
// the only controls rendered today, but links/inputs are included so a future
// render adding one cannot silently punch a hole in the trap.
function collectTrapTargets(root: ShadowRoot): HTMLElement[] {
  const nodes = [...root.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]')];
  return nodes.filter((el) => {
    if (el.hasAttribute('disabled')) return false;
    if (el.getAttribute('aria-disabled') === 'true') return false;
    if (el.getAttribute('tabindex') === '-1') return false;
    return true;
  });
}

function attachFocusTrap(root: ShadowRoot, isClosed: () => boolean): () => void {
  const onKey = (e: KeyboardEvent): void => {
    if (isClosed() || e.key !== 'Tab') return;
    const targets = collectTrapTargets(root);
    if (targets.length === 0) {
      // No tabbable control: keep the Tab keystroke from reaching the page.
      // Focus has nowhere to go inside, so the keyboard exit stays Escape
      // (attachEscapeClose); a button-less panel must keep that Esc path.
      e.preventDefault();
      return;
    }
    const first = targets[0]!;
    const last = targets[targets.length - 1]!;
    const active = root.activeElement as HTMLElement | null;
    const inside = active !== null && targets.includes(active);
    if (!inside) {
      // Focus somehow left the shadow (programmatic move, click on the page):
      // a modal dialog pulls it back instead of letting Tab walk the page.
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
      return;
    }
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };
  // Capture phase so a page-level keydown stopPropagation cannot break the trap.
  document.addEventListener('keydown', onKey, true);
  return () => document.removeEventListener('keydown', onKey, true);
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
