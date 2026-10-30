import { createShadowHost } from './host';

// Overlay chrome shared by the preview and AI guide panels. These pieces change
// for the same reason (overlay look and Escape behavior), so they are defined
// only here; module-specific styles stay in each panel module.
export function createOverlayHost(): { host: HTMLElement; root: ShadowRoot } {
  const { host, root } = createShadowHost({ position: 'fixed' });
  // Top-right pin: `left` stays unset on purpose, see createShadowHost.
  host.style.setProperty('top', '16px', 'important');
  host.style.setProperty('right', '16px', 'important');
  return { host, root };
}

export const OVERLAY_CSS = `
  :host {
    /* PBI-209: theme tokens declared inside the shadow root. The host carries
       all: initial !important, so page-side :root variables never reach this
       tree; these tokens are the only theme source. Light defaults keep the
       pre-PBI hexes (light OS appearance is unchanged) and the dark override
       follows below. Tokens without a dark entry (--jushoai-primary,
       --jushoai-ai-*) keep their light value: white on them already clears
       WCAG AA in both themes. */
    --jushoai-panel-bg: #fff;
    --jushoai-panel-fg: #1a1a1a;
    --jushoai-border: #c8ccd4;
    --jushoai-button-bg: #f4f5f8;
    --jushoai-primary: #2457d6;
    --jushoai-primary-fg: #fff;
    --jushoai-muted: #5a6270;
    --jushoai-divider: #eceef2;
    --jushoai-danger: #b3261e;
    --jushoai-chip-bg: #f1f3f7;
    --jushoai-chip-border: #dfe3ea;
    --jushoai-ai-bg: #8a4fd6;
    --jushoai-ai-fg: #fff;
    --jushoai-warn: #8a4b00;
    --jushoai-input-border: #cfd6e0;
  }
  @media (prefers-color-scheme: dark) {
    :host {
      /* PBI-209: dark palette, auto-follow only (no manual switch). Text
         tokens clear WCAG AA (4.5:1) against the dark panel #212530
         (luminance 0.019): panel-fg #e8eaf0 12.7:1, muted #a3abbd 6.7:1,
         danger #ff8a80 6.7:1, warn #ffb74d 8.8:1. */
      --jushoai-panel-bg: #212530;
      --jushoai-panel-fg: #e8eaf0;
      --jushoai-border: #3a4152;
      --jushoai-button-bg: #2b303c;
      --jushoai-muted: #a3abbd;
      --jushoai-divider: #2f3441;
      --jushoai-danger: #ff8a80;
      --jushoai-chip-bg: #262b36;
      --jushoai-chip-border: #3a4152;
      --jushoai-warn: #ffb74d;
      --jushoai-input-border: #565e70;
    }
  }
  .panel { all: initial; display: block; box-sizing: border-box; width: 360px; max-height: 80vh;
    overflow: auto; font: 13px/1.5 system-ui, sans-serif; color: var(--jushoai-panel-fg); background: var(--jushoai-panel-bg);
    border: 1px solid var(--jushoai-border); border-radius: 8px; padding: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.25);
    /* color-scheme cannot ride :host (the host's inline all: initial !important
       beats it for real properties); declared after all: initial in this block
       it wins the light default. The dark override must sit in a media block
       AFTER this rule: equal specificity (0,1,0) resolves by source order, so
       an override placed before this rule would lose in BOTH modes. */
    color-scheme: light; }
  h2 { margin: 0 0 8px; font-size: 14px; }
  .actions { display: flex; justify-content: flex-end; gap: 8px; }
  button { font: inherit; padding: 6px 14px; border-radius: 6px; border: 1px solid var(--jushoai-border);
    background: var(--jushoai-button-bg); cursor: pointer; }
  button.primary { background: var(--jushoai-primary); border-color: var(--jushoai-primary); color: var(--jushoai-primary-fg); }
  /* PBI-209: the dark color-scheme override lives in its own media block at
     the end of OVERLAY_CSS, after the .panel rule above. Equal specificity
     (0,1,0), same origin: the later rule wins, so on dark OS this lands after
     color-scheme: light and native selects/inputs/checkboxes follow the dark
     theme. Declaring it in the media block above would lose in both modes. */
  @media (prefers-color-scheme: dark) {
    .panel { color-scheme: dark; }
  }
`;

// Capture phase so the panel still sees Escape when the page stops the event.
export function attachEscapeClose(onEscape: () => void): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onEscape();
  };
  document.addEventListener('keydown', onKey, true);
  return () => document.removeEventListener('keydown', onKey, true);
}
