import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  showDismissDialog,
  type DismissDialogActions,
  type DismissDialogHandle,
} from '../../src/ui/dismiss-dialog';
import {
  registerExclusionChoice,
  undoRegisteredExclusion,
} from '../../src/content/exclusion-register';
import { loadExcludedUrls, saveExcludedUrls } from '../../src/exclusions-store';

// PBI-244: the quick-register undo loop against one fake storage, wired like
// content.ts: real dialog, real register/undo chains, real store adapter. The
// banner restore is content-side (mounted banner), so the wiring reports it as
// an onRestore callback the way content.ts would restore the banner.
const EXISTING = 'https://example.com/legacy/';
const QUICK = 'https://docs.google.com/spreadsheets/';

let store: Record<string, unknown>;
let setError: Error | null;

beforeEach(() => {
  store = {};
  setError = null;
  document.body.innerHTML = '';
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: async (key: string) => {
          return key in store ? { [key]: store[key] } : {};
        },
        set: async (obj: Record<string, unknown>) => {
          if (setError) throw setError;
          Object.assign(store, obj);
        },
      },
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

// showDismissDialog は closed な Shadow DOM に描くため、検証用にだけ open
// で開き直して root を覗く。製品コードの動きは変えない。
function openWithOpenRoot(actions: DismissDialogActions) {
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

// content.ts の X 押下ハンドラと同じ配線: 登録チェーンと undo チェーンを
// 実ストアに接続し、undo の成立でバナー復帰を表す onRestore を呼ぶ。
function openWiredDialog(
  onRestore: () => void,
  quick: string = QUICK,
): { dialog: DismissDialogHandle; root: ShadowRoot } {
  const candidates = { exact: quick, prefix: quick };
  let dialog: DismissDialogHandle | null = null;
  const wired = openWithOpenRoot({
    onClose: vi.fn(),
    onUndo: vi.fn(),
    register: {
      exactLabel: candidates.exact,
      prefixLabel: candidates.prefix,
      onRegister: (choice) => {
        void registerExclusionChoice(choice, {
          loadExcluded: loadExcludedUrls,
          saveExcluded: saveExcludedUrls,
          candidates,
          showError: (reason) => { dialog?.showRegisterError(reason); },
          showSuccess: (registered) => {
            dialog?.showRegisterSuccess(() => {
              void undoRegisteredExclusion(registered, {
                loadExcluded: loadExcludedUrls,
                saveExcluded: saveExcludedUrls,
                onRemoved: () => {
                  onRestore();
                  dialog?.close();
                },
                showError: (reason) => { dialog?.showRegisterError(reason); },
                setBusy: (busy) => { dialog?.setRegisterBusy(busy); },
              });
            });
          },
          setBusy: (busy) => { dialog?.setRegisterBusy(busy); },
        });
      },
    },
  });
  dialog = wired.dialog;
  return wired;
}

const buttonByText = (root: ShadowRoot, text: string): HTMLButtonElement => {
  const found = [...root.querySelectorAll('button')].find((b) => b.textContent === text);
  if (!found) throw new Error(`button not found: ${text}`);
  return found as HTMLButtonElement;
};

describe('quick-register undo (PBI-244)', () => {
  it('Scenario 1: 登録成功の表示に解除先の文言が出る', async () => {
    await saveExcludedUrls([EXISTING]);
    const { dialog, root } = openWiredDialog(vi.fn());
    dialog.submitRegister();
    await vi.waitFor(() => {
      if (!root.textContent?.includes('起動しないURLに登録しました')) throw new Error('no success view');
    });
    expect(root.textContent).toContain('解除は設定ページの『起動しないURL』から');
    expect(document.body.contains(dialog.host)).toBe(true);
    expect(await loadExcludedUrls()).toEqual([EXISTING, QUICK]);
  });

  it('Scenario 2: 登録直後の undo で該当 1 件だけが削除され、バナー復帰の合図が出る', async () => {
    await saveExcludedUrls([EXISTING]);
    const onRestore = vi.fn();
    const { dialog, root } = openWiredDialog(onRestore);
    dialog.submitRegister();
    await vi.waitFor(() => {
      if (!root.textContent?.includes('起動しないURLに登録しました')) throw new Error('no success view');
    });

    buttonByText(root, '登録を取り消す').click();
    await vi.waitFor(() => { if (onRestore.mock.calls.length === 0) throw new Error('not restored'); });

    expect(await loadExcludedUrls()).toEqual([EXISTING]);
    expect(document.body.contains(dialog.host)).toBe(false);
  });

  it('fragment 付きページの登録でも undo で該当 1 件が消える（正形は 1 つ）', async () => {
    await saveExcludedUrls([EXISTING]);
    const onRestore = vi.fn();
    const { dialog, root } = openWiredDialog(
      onRestore,
      'https://docs.google.com/spreadsheets/d/abc#gid=0',
    );
    dialog.submitRegister();
    await vi.waitFor(() => {
      if (!root.textContent?.includes('起動しないURLに登録しました')) throw new Error('no success view');
    });

    buttonByText(root, '登録を取り消す').click();
    await vi.waitFor(() => { if (onRestore.mock.calls.length === 0) throw new Error('not restored'); });

    expect(await loadExcludedUrls()).toEqual([EXISTING]);
    expect(document.body.contains(dialog.host)).toBe(false);
  });

  it('undo の保存に失敗したら role="alert" に理由を出し、登録とバナー非表示を維持する', async () => {
    await saveExcludedUrls([EXISTING]);
    const onRestore = vi.fn();
    const { dialog, root } = openWiredDialog(onRestore);
    dialog.submitRegister();
    await vi.waitFor(() => {
      if (!root.textContent?.includes('起動しないURLに登録しました')) throw new Error('no success view');
    });

    setError = new Error('quota exceeded');
    buttonByText(root, '登録を取り消す').click();
    await vi.waitFor(() => {
      if (!root.querySelector('[role="alert"]')?.textContent) throw new Error('no alert');
    });

    expect(root.querySelector('[role="alert"]')?.textContent).toBe('取り消しに失敗しました');
    expect(await loadExcludedUrls()).toEqual([EXISTING, QUICK]);
    expect(onRestore).not.toHaveBeenCalled();
    expect(document.body.contains(dialog.host)).toBe(true);
  });
});
