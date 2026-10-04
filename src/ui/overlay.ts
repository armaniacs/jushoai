import { createShadowHost } from './host';

// Overlay chrome shared by the preview and AI guide panels. These pieces change
// for the same reason (overlay look and Escape behavior), so they are defined
// only here; module-specific styles stay in each panel module.
export function createOverlayHost(): { host: HTMLElement; root: ShadowRoot } {
  const { host, root } = createShadowHost();
  host.style.position = 'fixed';
  host.style.top = '16px';
  host.style.right = '16px';
  return { host, root };
}

export const OVERLAY_CSS = `
  .panel { all: initial; display: block; box-sizing: border-box; width: 360px; max-height: 80vh;
    overflow: auto; font: 13px/1.5 system-ui, sans-serif; color: #1a1a1a; background: #fff;
    border: 1px solid #c8ccd4; border-radius: 8px; padding: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.25); }
  h2 { margin: 0 0 8px; font-size: 14px; }
  .actions { display: flex; justify-content: flex-end; gap: 8px; }
  button { font: inherit; padding: 6px 14px; border-radius: 6px; border: 1px solid #c8ccd4;
    background: #f4f5f8; cursor: pointer; }
  button.primary { background: #2457d6; border-color: #2457d6; color: #fff; }
`;

// Capture phase so the panel still sees Escape when the page stops the event.
export function attachEscapeClose(onEscape: () => void): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onEscape();
  };
  document.addEventListener('keydown', onKey, true);
  return () => document.removeEventListener('keydown', onKey, true);
}
