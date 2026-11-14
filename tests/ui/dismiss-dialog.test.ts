import { describe, it, expect, vi, afterEach } from 'vitest';
import { showDismissDialog, type DismissDialogActions } from '../../src/ui/dismiss-dialog';

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

// showDismissDialog は closed な Shadow DOM に描くため、検証用にだけ open
// で開き直して root を覗く。製品コードの動きは変えない。
function showWithOpenRoot(actions: DismissDialogActions) {
  const attach = HTMLElement.prototype.attachShadow;
  let root!: ShadowRoot;
  const spy = vi.spyOn(HTMLElement.prototype, 'attachShadow').mockImplementation(function (
    this: HTMLElement,
    init: ShadowRootInit,
  ) {
    root = attach.call(this, { ...init, mode: 'open' });
    return root;
  });
  try {
    const dialog = showDismissDialog(actions);
    return { dialog, root };
  } finally {
    spy.mockRestore();
  }
}

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

  it('失敗文を出すとダイアログが残り理由文が見える', () => {
    const { dialog, root } = showWithOpenRoot({
      onClose: vi.fn(),
      onUndo: vi.fn(),
      register: {
        exactLabel: 'https://example.com/form',
        prefixLabel: 'https://example.com/',
        onRegister: vi.fn(),
      },
    });
    dialog.showRegisterError('すでに登録されています');
    expect(document.body.contains(dialog.host)).toBe(true);
    const alert = root.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('すでに登録されています');
  });

  it('exact と prefix が同じときは1行表示で prefix として登録する', () => {
    const onRegister = vi.fn();
    const { dialog, root } = showWithOpenRoot({
      onClose: vi.fn(),
      onUndo: vi.fn(),
      register: {
        exactLabel: 'https://example.com/',
        prefixLabel: 'https://example.com/',
        onRegister: onRegister as (choice: 'exact' | 'prefix') => void,
      },
    });
    expect(root.querySelectorAll('input[type="radio"]').length).toBe(0);
    dialog.submitRegister();
    expect(onRegister).toHaveBeenCalledWith('prefix');
  });

  it('登録中は送信ボタンが無効になり終わると戻る', () => {
    const { dialog, root } = showWithOpenRoot({
      onClose: vi.fn(),
      onUndo: vi.fn(),
      register: {
        exactLabel: 'https://example.com/form',
        prefixLabel: 'https://example.com/',
        onRegister: vi.fn(),
      },
    });
    const submit = [...root.querySelectorAll('button')].find(
      (b) => b.textContent === '起動しないURLに登録する',
    );
    expect(submit).toBeDefined();
    dialog.setRegisterBusy(true);
    expect(submit?.disabled).toBe(true);
    dialog.setRegisterBusy(false);
    expect(submit?.disabled).toBe(false);
  });
});

describe('showDismissDialog a11y', () => {
  it('ダイアログに role と aria-label がある', () => {
    const { root } = showWithOpenRoot({ onClose: vi.fn(), onUndo: vi.fn() });
    const box = root.querySelector('[role="dialog"]');
    expect(box?.getAttribute('aria-label')).toBe('JushoAI の非表示ダイアログ');
  });
});
