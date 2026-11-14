import { describe, it, expect, vi } from 'vitest';
import { showDismissDialog } from '../../src/ui/dismiss-dialog';

describe('showDismissDialog', () => {
  it('今回だけ閉じるで閉じて onClose が走る', () => {
    const onClose = vi.fn();
    const dialog = showDismissDialog({ onClose, onUndo: vi.fn() });
    dialog.closeOnly();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.body.contains(dialog.host)).toBe(false);
  });

  it('元に戻すで onUndo が走る', () => {
    const onUndo = vi.fn();
    const dialog = showDismissDialog({ onClose: vi.fn(), onUndo });
    dialog.undo();
    expect(onUndo).toHaveBeenCalledTimes(1);
  });
});
