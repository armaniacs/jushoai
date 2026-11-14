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

describe('showDismissDialog with register', () => {
  it('選んだ候補で onRegister が走る', () => {
    const onRegister = vi.fn();
    const dialog = showDismissDialog({
      onClose: vi.fn(),
      onUndo: vi.fn(),
      register: {
        exactLabel: 'https://example.com/form',
        prefixLabel: 'https://example.com/',
        onRegister: onRegister as (choice: 'exact' | 'prefix') => void,
      },
    });
    dialog.choose('prefix');
    dialog.submitRegister();
    expect(onRegister).toHaveBeenCalledWith('prefix');
  });

  it('失敗文を出すとダイアログが残る', () => {
    const dialog = showDismissDialog({ onClose: vi.fn(), onUndo: vi.fn() });
    dialog.showRegisterError('すでに登録されています');
    expect(document.body.contains(dialog.host)).toBe(true);
  });
});
