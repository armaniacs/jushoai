import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  showDismissDialog,
  type DismissDialogActions,
  type DismissDialogHandle,
} from '../../src/ui/dismiss-dialog';
import { registerExclusionChoice } from '../../src/content/exclusion-register';

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

  it('登録中は送信ボタンが disabled にならず aria-disabled になり終わると戻る', () => {
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
    expect(submit?.disabled).toBe(false);
    dialog.setRegisterBusy(true);
    expect(submit?.disabled).toBe(false);
    expect(submit?.getAttribute('aria-disabled')).toBe('true');
    dialog.setRegisterBusy(false);
    expect(submit?.disabled).toBe(false);
    // After release the attribute is removed entirely: "false" is the ARIA
    // default state and only adds noise.
    expect(submit?.hasAttribute('aria-disabled')).toBe(false);
  });
});

describe('showDismissDialog a11y', () => {
  it('ダイアログに role と aria-label がある', () => {
    const { root } = showWithOpenRoot({ onClose: vi.fn(), onUndo: vi.fn() });
    const box = root.querySelector('[role="dialog"]');
    expect(box?.getAttribute('aria-label')).toBe('JushoAI の非表示ダイアログ');
  });
});

describe('showDismissDialog auto-hide', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('15秒経過で閉じる', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const onUndo = vi.fn();
    const { dialog, root } = showWithOpenRoot({ onClose, onUndo });
    expect(document.body.contains(dialog.host)).toBe(true);
    // PBI-237: open moves focus to the first button. Step out to exercise the
    // no-interaction auto-close path.
    root.querySelector('button')?.blur();
    vi.advanceTimersByTime(15000);
    expect(document.body.contains(dialog.host)).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
    expect(onUndo).not.toHaveBeenCalled();
  });

  it('ホバー中は残りホバー解除で閉じる', () => {
    vi.useFakeTimers();
    const { dialog, root } = showWithOpenRoot({ onClose: vi.fn(), onUndo: vi.fn() });
    const box = root.querySelector('[role="dialog"]')!;
    box.dispatchEvent(new Event('pointerenter', { bubbles: true }));
    vi.advanceTimersByTime(15000);
    expect(document.body.contains(dialog.host)).toBe(true);
    box.dispatchEvent(new Event('pointerleave', { bubbles: true }));
    expect(document.body.contains(dialog.host)).toBe(false);
  });

  it('フォーカス中は残りフォーカス解除で閉じる', () => {
    vi.useFakeTimers();
    const { dialog, root } = showWithOpenRoot({ onClose: vi.fn(), onUndo: vi.fn() });
    const button = root.querySelector('button')!;
    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    vi.advanceTimersByTime(15000);
    expect(document.body.contains(dialog.host)).toBe(true);
    button.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(document.body.contains(dialog.host)).toBe(false);
  });

  it('手動 close 後にタイマーが発火しても何も起きない', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const dialog = showDismissDialog({ onClose, onUndo: vi.fn() });
    dialog.closeOnly();
    expect(onClose).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(15000);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.body.contains(dialog.host)).toBe(false);
  });
});

describe('showDismissDialog register radio wrap', () => {
  function showRegister() {
    return showWithOpenRoot({
      onClose: vi.fn(),
      onUndo: vi.fn(),
      register: {
        exactLabel: 'https://example.com/form',
        prefixLabel: 'https://example.com/',
        onRegister: vi.fn(),
      },
    });
  }

  it('2つの選択肢の label が縦積みになる(display: block 系)', () => {
    const { root } = showRegister();
    const labels = [...root.querySelectorAll('label')];
    expect(labels).toHaveLength(2);
    // jsdom はレイアウトを持たないため、class と style 要素の CSS テキストで検証する。
    const css = root.querySelector('style')?.textContent ?? '';
    for (const label of labels) {
      const display =
        label.className
          .split(/\s+/)
          .map((c) => new RegExp(`\\.${c}\\s*\\{[^}]*display\\s*:\\s*([^;\\s}]+)`, 's').exec(css)?.[1])
          .find(Boolean) ?? getComputedStyle(label).display;
      expect(['block', 'flex']).toContain(display);
    }
  });

  it('ラジオとテキストが同一 label 内にあり分離していない', () => {
    const { root } = showRegister();
    const labels = [...root.querySelectorAll('label')];
    expect(labels).toHaveLength(2);
    for (const label of labels) {
      const radio = label.querySelector('input[type="radio"]');
      expect(radio).not.toBeNull();
      // ラベルテキストは同一 label 内の要素が持ち、radio の兄弟であること。
      const textEl = [...label.children].find((el) => el !== radio);
      expect(textEl?.textContent?.length).toBeGreaterThan(0);
    }
  });
});

function showRegisterDialog(onRegister: (choice: 'exact' | 'prefix') => void) {
  return showWithOpenRoot({
    onClose: vi.fn(),
    onUndo: vi.fn(),
    register: {
      exactLabel: 'https://example.com/form',
      prefixLabel: 'https://example.com/',
      onRegister,
    },
  });
}

function findSubmit(root: ShadowRoot): HTMLButtonElement {
  const submit = [...root.querySelectorAll('button')].find(
    (b) => b.textContent === '起動しないURLに登録する',
  );
  expect(submit).toBeDefined();
  return submit!;
}

describe('showDismissDialog register busy state', () => {
  it('busy 中の submit クリックは無視され解除後は押せる', () => {
    const onRegister = vi.fn();
    const { dialog, root } = showRegisterDialog(onRegister as (choice: 'exact' | 'prefix') => void);
    const submit = findSubmit(root);
    dialog.setRegisterBusy(true);
    submit.click();
    expect(onRegister).not.toHaveBeenCalled();
    dialog.setRegisterBusy(false);
    submit.click();
    expect(onRegister).toHaveBeenCalledTimes(1);
  });

  it('busy 中も submit のフォーカスが body に落ちない', () => {
    const { dialog, root } = showRegisterDialog(vi.fn());
    const submit = findSubmit(root);
    submit.focus();
    // jsdom は shadow 内のフォーカスを host に retarget するため、
    // root.activeElement で断言する(body 落ちは host 外になる)。
    expect(root.activeElement).toBe(submit);
    expect(document.activeElement).toBe(dialog.host);
    dialog.setRegisterBusy(true);
    expect(submit.disabled).toBe(false);
    expect(root.activeElement).toBe(submit);
    dialog.setRegisterBusy(false);
    expect(root.activeElement).toBe(submit);
  });
});

describe('showDismissDialog register busy vs auto-hide', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('busy 中に15秒経過しても閉じずエラー表示が消えない', () => {
    vi.useFakeTimers();
    const { dialog, root } = showRegisterDialog(vi.fn());
    const alert = root.querySelector('[role="alert"]')!;
    dialog.setRegisterBusy(true);
    dialog.showRegisterError('保存に失敗しました');
    vi.advanceTimersByTime(15000);
    expect(document.body.contains(dialog.host)).toBe(true);
    expect(alert.textContent).toBe('保存に失敗しました');
    // busy 解除でも失敗直後の alert を即時 teardown しない。
    dialog.setRegisterBusy(false);
    expect(document.body.contains(dialog.host)).toBe(true);
    expect(alert.textContent).toBe('保存に失敗しました');
  });

  it('busy 解除後に通常の自動クローズが再開する', () => {
    vi.useFakeTimers();
    const { dialog, root } = showRegisterDialog(vi.fn());
    // PBI-237: open leaves focus inside the dialog. Step out before exercising
    // the busy scenarios, which assume no focus in the dialog.
    root.querySelector('button')?.blur();
    dialog.setRegisterBusy(true);
    vi.advanceTimersByTime(15000);
    expect(document.body.contains(dialog.host)).toBe(true);
    dialog.setRegisterBusy(false);
    expect(document.body.contains(dialog.host)).toBe(true);
    vi.advanceTimersByTime(15000);
    expect(document.body.contains(dialog.host)).toBe(false);
  });

  it('busy が短く終わったときは元のタイマーどおり閉じる', () => {
    vi.useFakeTimers();
    const { dialog, root } = showRegisterDialog(vi.fn());
    root.querySelector('button')?.blur();
    dialog.setRegisterBusy(true);
    vi.advanceTimersByTime(5000);
    dialog.setRegisterBusy(false);
    vi.advanceTimersByTime(10000);
    expect(document.body.contains(dialog.host)).toBe(false);
  });
});

describe('showDismissDialog register flow keeps alert', () => {
  it('登録フロー失敗後も role="alert" が表示され続け再試行できる', async () => {
    let flow: Promise<void> | undefined;
    let handle: DismissDialogHandle | undefined;
    const saveExcluded = vi.fn(async () => {
      throw new Error('quota');
    });
    const { dialog, root } = showWithOpenRoot({
      onClose: vi.fn(),
      onUndo: vi.fn(),
      register: {
        exactLabel: 'https://example.com/form',
        prefixLabel: 'https://example.com/',
        onRegister: (choice) => {
          flow = registerExclusionChoice(choice, {
            loadExcluded: async () => [],
            saveExcluded,
            candidates: { exact: 'https://example.com/form', prefix: 'https://example.com/' },
            showError: (reason) => { handle?.showRegisterError(reason); },
            close: () => { handle?.close(); },
            setBusy: (busy) => { handle?.setRegisterBusy(busy); },
          });
        },
      },
    });
    handle = dialog;
    const submit = findSubmit(root);
    submit.click();
    await flow;
    expect(document.body.contains(dialog.host)).toBe(true);
    const alert = root.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe('保存に失敗しました');
    expect(submit.disabled).toBe(false);
    submit.click();
    await flow;
    expect(saveExcluded).toHaveBeenCalledTimes(2);
    expect(document.body.contains(dialog.host)).toBe(true);
  });
});

describe('showDismissDialog a11y focus and announce (PBI-237)', () => {
  it('開いたら最初のボタンへフォーカスが移る', () => {
    const { root } = showWithOpenRoot({ onClose: vi.fn(), onUndo: vi.fn() });
    const first = root.querySelector('button');
    expect(first?.textContent).toBe('今回だけ閉じる');
    expect(root.activeElement).toBe(first);
  });

  it('出現を role="status" の兄弟領域で告知する', () => {
    const { root } = showWithOpenRoot({ onClose: vi.fn(), onUndo: vi.fn() });
    const live = root.querySelector('[role="status"]');
    expect(live).not.toBeNull();
    // role="status" carries implicit aria-live="polite". The announcement
    // summarizes the dialog and includes the auto-close plan.
    expect(live?.textContent).toContain('開きました');
    expect(live?.textContent).toContain('15秒後に自動で閉じます');
  });

  it('自動クローズ予定が本文に明示される', () => {
    const { root } = showWithOpenRoot({ onClose: vi.fn(), onUndo: vi.fn() });
    const box = root.querySelector('[role="dialog"]')!;
    expect(box.textContent).toContain('15秒後に自動で閉じます');
  });
});

describe('showDismissDialog Escape close (PBI-237)', () => {
  const pressEscape = (): void => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
  };

  it('Esc で「今回だけ閉じる」と同じ経路で閉じる(登録・undo は起こらない)', () => {
    const onClose = vi.fn();
    const onUndo = vi.fn();
    const onRegister = vi.fn();
    const { dialog, root } = showWithOpenRoot({
      onClose,
      onUndo,
      register: {
        exactLabel: 'https://example.com/form',
        prefixLabel: 'https://example.com/',
        onRegister,
      },
    });
    root.querySelector('button')!.focus();
    pressEscape();
    expect(document.body.contains(dialog.host)).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onUndo).not.toHaveBeenCalled();
    expect(onRegister).not.toHaveBeenCalled();
  });

  it('Esc はダイアログ内にフォーカスがあるときだけ効き、閉じた後は反応しない', () => {
    const onClose = vi.fn();
    const { dialog, root } = showWithOpenRoot({ onClose, onUndo: vi.fn() });
    root.querySelector('button')!.focus();
    // Non-modal dialog: focus having moved elsewhere (another panel) means
    // this dialog must not steal Escape.
    const elsewhere = document.createElement('button');
    elsewhere.textContent = 'page';
    document.body.append(elsewhere);
    elsewhere.focus();
    pressEscape();
    expect(document.body.contains(dialog.host)).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    root.querySelector('button')!.focus();
    pressEscape();
    expect(document.body.contains(dialog.host)).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
    const listenerDetached = (): void => {
      pressEscape();
      expect(onClose).toHaveBeenCalledTimes(1);
    };
    listenerDetached();
  });
});

describe('showDismissDialog focus restore (PBI-237)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // Page-side element the wiring passes as the agreed restore target (the
  // form's first field in production).
  function makeRestoreTarget(): HTMLButtonElement {
    const target = document.createElement('button');
    target.textContent = '合意位置';
    document.body.append(target);
    return target;
  }

  it('今回だけ閉じる(X 経路)で閉じた後、body ではなく合意位置へ戻る', () => {
    const target = makeRestoreTarget();
    const onClose = vi.fn();
    const dialog = showDismissDialog({ onClose, onUndo: vi.fn(), restoreFocus: () => target });
    dialog.closeOnly();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(target);
  });

  it('Esc で閉じた後も合意位置へ戻る', () => {
    const target = makeRestoreTarget();
    const { dialog, root } = showWithOpenRoot({
      onClose: vi.fn(),
      onUndo: vi.fn(),
      restoreFocus: () => target,
    });
    root.querySelector('button')!.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    expect(document.body.contains(dialog.host)).toBe(false);
    expect(document.activeElement).toBe(target);
  });

  it('自動クローズで閉じた後も合意位置へ戻る', () => {
    vi.useFakeTimers();
    const target = makeRestoreTarget();
    const { dialog, root } = showWithOpenRoot({
      onClose: vi.fn(),
      onUndo: vi.fn(),
      restoreFocus: () => target,
    });
    root.querySelector('button')?.blur();
    vi.advanceTimersByTime(15000);
    expect(document.body.contains(dialog.host)).toBe(false);
    expect(document.activeElement).toBe(target);
  });

  it('元に戻すで閉じた後も合意位置へ戻る', () => {
    const target = makeRestoreTarget();
    const onUndo = vi.fn();
    const dialog = showDismissDialog({ onClose: vi.fn(), onUndo, restoreFocus: () => target });
    dialog.undo();
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(target);
  });

  it('開いた時点の位置が実在すれば opener へ戻る(panel.ts と同じ方針)', () => {
    const opener = document.createElement('button');
    opener.textContent = 'opener';
    document.body.append(opener);
    opener.focus();
    const target = makeRestoreTarget();
    const dialog = showDismissDialog({ onClose: vi.fn(), onUndo: vi.fn(), restoreFocus: () => target });
    dialog.closeOnly();
    expect(document.activeElement).toBe(opener);
  });

  it('開いた直後のフォーカスがある間は15秒を超えても閉じず、外した時点で閉じて合意位置へ戻る', () => {
    vi.useFakeTimers();
    const target = makeRestoreTarget();
    const { dialog, root } = showWithOpenRoot({
      onClose: vi.fn(),
      onUndo: vi.fn(),
      restoreFocus: () => target,
    });
    const first = root.querySelector('button')!;
    expect(root.activeElement).toBe(first);
    vi.advanceTimersByTime(15000);
    expect(document.body.contains(dialog.host)).toBe(true);
    first.blur();
    expect(document.body.contains(dialog.host)).toBe(false);
    expect(document.activeElement).toBe(target);
  });
});
