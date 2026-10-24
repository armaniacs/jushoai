import { OVERLAY_CSS } from './overlay';
import { mountPanel, type PanelHandle } from './panel';

// The modal choice protocol above mountPanel (PBI-155): "show a dialog, get
// the user's decision as a Promise". mountPanel owns the lifecycle (host,
// Escape, focus trap, idempotent close); this module owns the choice protocol
// exactly once, so the safe-side invariants no longer live hand-written in
// each panel adapter:
// - settle-once: whatever races (an action click and an Escape in the same
//   task), the first settlement wins and the promise resolves a single time.
// - default on close without a choice: closing the dialog through anything
//   that is not an action button (Escape, outside close) resolves
//   defaultOnClose. "Closed without a choice" must never decide, fill or
//   send; every call site declares its own safe default value.
export interface ConfirmDialogAction<T> {
  readonly label: string;
  // The decision this button settles; runs at click time so it can read the
  // inputs the body rendered (the guest form, the egress exclude boxes).
  readonly pick: () => T;
  // Marks the primary action. mountPanel's focus: 'primary' takes the first
  // enabled .primary button and falls back to the first enabled button, so a
  // dialog without a primary stays predictable.
  readonly primary?: boolean;
  // Runs once when the button is created: a stateful dialog starts an action
  // disabled and syncs it from the body's inputs (the guest use-button).
  // Focus wiring itself stays with mountPanel.
  readonly setup?: (button: HTMLButtonElement) => void;
}

export interface ConfirmDialogSpec<T> {
  // Heading text and the dialog's accessible name. Caller-vetted static
  // strings only: the name lands on a page-readable aria-label attribute.
  readonly title: string;
  // Renders the dialog-specific content between the heading and the actions
  // row; returns the module-specific CSS appended to the overlay chrome.
  // Page-derived strings go through textContent here — never innerHTML.
  readonly body: (panel: HTMLElement) => string | void;
  readonly actions: readonly ConfirmDialogAction<T>[];
  // Resolved when the dialog closes without a choice (Escape included).
  readonly defaultOnClose: T;
}

// Resolves exactly once with the picked decision, or with defaultOnClose when
// the dialog closes without one. A throwing body or mountPanel rejects the
// promise (the panel never opened); call sites treat that as no decision.
export function confirmDialog<T>(spec: ConfirmDialogSpec<T>): Promise<T> {
  return new Promise((resolve) => {
    // The safe-side invariants, owned here and nowhere else. Hand-writing a
    // settled guard or an Escape default back into a call site would re-open
    // the default-value mix-up this module exists to close.
    let settled = false;
    const settle = (d: T): void => {
      if (settled) return;
      settled = true;
      resolve(d);
    };
    let handle!: PanelHandle;
    handle = mountPanel(
      (host, root) => {
        const style = document.createElement('style');
        const panel = document.createElement('div');
        panel.className = 'panel';

        const head = document.createElement('h2');
        head.textContent = spec.title;
        panel.append(head);

        const css = spec.body(panel);

        const actions = document.createElement('div');
        actions.className = 'actions';
        for (const action of spec.actions) {
          const btn = document.createElement('button');
          btn.type = 'button';
          if (action.primary) btn.className = 'primary';
          btn.textContent = action.label;
          action.setup?.(btn);
          btn.addEventListener('click', () => {
            settle(action.pick());
            handle.close();
          });
          actions.append(btn);
        }

        style.textContent = css ? `${OVERLAY_CSS}\n${css}` : OVERLAY_CSS;
        panel.append(actions);
        root.append(style, panel);
      },
      () => settle(spec.defaultOnClose),
      { accessibleName: spec.title, focus: 'primary' },
    );
  });
}
