import { describe, it, expect, vi } from 'vitest';
import { mountPanel } from '../../src/ui/panel';

describe('mountPanel', () => {
  it('appends the host and renders into the shadow root', () => {
    const render = vi.fn();
    const panel = mountPanel(render);
    expect(document.body.contains(panel.host)).toBe(true);
    // Closed roots stay hidden behind host.shadowRoot by design; the handle
    // carries the root the renderer was given.
    expect(panel.root).toBeDefined();
    expect(render).toHaveBeenCalledOnce();
    expect(render.mock.calls[0]![0]).toBe(panel.host);
    expect(render.mock.calls[0]![1]).toBe(panel.root);
    panel.close();
  });

  it('closes idempotently and notifies once', () => {
    const onClose = vi.fn();
    const panel = mountPanel(() => {}, onClose);
    panel.close();
    panel.close();
    expect(document.body.contains(panel.host)).toBe(false);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    const panel = mountPanel(() => {}, onClose);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.body.contains(panel.host)).toBe(false);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('ignores other keys', () => {
    const onClose = vi.fn();
    const panel = mountPanel(() => {}, onClose);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(document.body.contains(panel.host)).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    panel.close();
  });
});
