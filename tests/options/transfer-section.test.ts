import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  defaultTransferDeps, mountTransferSection, type TransferSectionDeps,
} from '../../src/entrypoints/options/transfer-section';
import { TRANSFER_MAX_FILE_BYTES, type TransferImportResult } from '../../src/transfer';

const OK: TransferImportResult = {
  ok: true, profilesAdded: 2, profilesUpdated: 1, addressesAdded: 1, addressesUpdated: 0,
};

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById('app')!;
});

const mount = (over: Partial<TransferSectionDeps> = {}) => {
  const deps: TransferSectionDeps = {
    exportFile: vi.fn(async () => '{"profiles":[],"addresses":[]}'),
    importFile: vi.fn(async () => OK),
    save: vi.fn(),
    confirm: vi.fn(() => true),
    pickFile: vi.fn(async () => new File(['{}'], 'jushoai-profiles.json', { type: 'application/json' })),
    readFile: vi.fn(async () => '{"profiles":[],"addresses":[]}'),
    onImported: vi.fn(async () => {}),
    formatInfo: vi.fn(async () => ({ version: 1, needsUpdate: false })),
    backupMeta: vi.fn(async () => ({})),
    recordExportAt: vi.fn(async () => {}),
    recordNudgeDismissedAt: vi.fn(async () => {}),
    profileCount: vi.fn(async () => 0),
    ...over,
  };
  mountTransferSection(root, deps);
  return deps;
};

const buttonByText = (text: string): HTMLButtonElement => {
  const found = [...root.querySelectorAll('button')].find((b) => b.textContent === text);
  if (!found) throw new Error(`button not found: ${text}`);
  return found as HTMLButtonElement;
};
const click = (button: HTMLButtonElement) => button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const flush = () => new Promise((r) => setTimeout(r, 0));
const confirmText = (deps: TransferSectionDeps, call: number): string =>
  String((deps.confirm as ReturnType<typeof vi.fn>).mock.calls[call]?.[0] ?? '');

describe('mountTransferSection', () => {
  it('exports only after the plain-text warning is confirmed', async () => {
    const deps = mount();
    click(buttonByText('JSON でエクスポート'));
    await flush();
    expect(deps.confirm).toHaveBeenCalledOnce();
    expect(confirmText(deps, 0)).toContain('平文');
    expect(deps.save).toHaveBeenCalledWith('jushoai-profiles.json', '{"profiles":[],"addresses":[]}');
    expect(root.querySelector('.saved')?.textContent).toContain('書き出しました');
  });

  it('does not export when the warning is declined', async () => {
    const deps = mount({ confirm: vi.fn(() => false) });
    click(buttonByText('JSON でエクスポート'));
    await flush();
    expect(deps.exportFile).not.toHaveBeenCalled();
    expect(deps.save).not.toHaveBeenCalled();
    expect(root.querySelector('.saved')).toBeNull();
  });

  it('reports a storage read failure on export', async () => {
    const deps = mount({ exportFile: vi.fn(async () => { throw new Error('boom'); }) });
    click(buttonByText('JSON でエクスポート'));
    await flush();
    expect(deps.save).not.toHaveBeenCalled();
    expect(root.querySelector('.errors')?.textContent).toContain('読み込めません');
  });

  it('imports after confirmation, reports the added/updated breakdown, and re-renders via onImported', async () => {
    const deps = mount();
    click(buttonByText('JSON をインポート'));
    await flush();
    expect(deps.pickFile).toHaveBeenCalledOnce();
    expect(confirmText(deps, 0)).toContain('上書き');
    expect(confirmText(deps, 0)).toContain('未保存の入力は破棄されます');
    expect(deps.readFile).toHaveBeenCalledOnce();
    expect(deps.importFile).toHaveBeenCalledWith('{"profiles":[],"addresses":[]}');
    expect(root.querySelector('.saved')?.textContent).toContain('プロファイル 新規 2 件・更新 1 件');
    expect(root.querySelector('.saved')?.textContent).toContain('住所 新規 1 件');
    expect(deps.onImported).toHaveBeenCalledOnce();
  });

  it('does not read the file when the confirmation is declined', async () => {
    const deps = mount({ confirm: vi.fn(() => false) });
    click(buttonByText('JSON をインポート'));
    await flush();
    expect(deps.pickFile).toHaveBeenCalledOnce();
    expect(deps.readFile).not.toHaveBeenCalled();
    expect(deps.importFile).not.toHaveBeenCalled();
    expect(deps.onImported).not.toHaveBeenCalled();
  });

  it('shows the validation errors and skips the re-render', async () => {
    const deps = mount({
      importFile: vi.fn(async (): Promise<TransferImportResult> => ({ ok: false, errors: ['P1: 姓を入力してください'] })),
    });
    click(buttonByText('JSON をインポート'));
    await flush();
    expect(root.querySelector('.errors')?.textContent).toContain('姓');
    expect(root.querySelector('.saved')).toBeNull();
    expect(deps.onImported).not.toHaveBeenCalled();
  });

  it('caps shown errors at five lines plus a count of the rest', async () => {
    const errors = Array.from({ length: 8 }, (_, i) => `エラー${i + 1}`);
    mount({ importFile: vi.fn(async (): Promise<TransferImportResult> => ({ ok: false, errors })) });
    click(buttonByText('JSON をインポート'));
    await flush();
    const items = [...root.querySelectorAll('.errors li')].map((li) => li.textContent);
    expect(items).toHaveLength(6);
    expect(items[4]).toBe('エラー5');
    expect(items[5]).toBe('他 3 件のエラーがあります');
  });

  it('reports a file read failure before importing', async () => {
    const deps = mount({ readFile: vi.fn(async () => { throw new Error('boom'); }) });
    click(buttonByText('JSON をインポート'));
    await flush();
    expect(deps.importFile).not.toHaveBeenCalled();
    expect(deps.onImported).not.toHaveBeenCalled();
    expect(root.querySelector('.errors')?.textContent).toContain('読み込めません');
  });

  it('rejects an oversized file before reading it', async () => {
    const deps = mount({ readFile: vi.fn(async () => '{}') });
    const file = new File(['x'], 'big.json', { type: 'application/json' });
    Object.defineProperty(file, 'size', { value: TRANSFER_MAX_FILE_BYTES + 1 });
    (deps.pickFile as ReturnType<typeof vi.fn>).mockResolvedValue(file);
    click(buttonByText('JSON をインポート'));
    await flush();
    expect(deps.readFile).not.toHaveBeenCalled();
    expect(deps.importFile).not.toHaveBeenCalled();
    expect(root.querySelector('.errors')?.textContent).toContain('大きすぎます');
  });

  it('disables the import button while an import runs and re-enables it afterwards', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const deps = mount({ importFile: vi.fn(async () => { await gate; return OK; }) });
    const button = buttonByText('JSON をインポート');
    click(button);
    await flush();
    expect(button.disabled).toBe(true);
    release();
    await flush();
    expect(button.disabled).toBe(false);
    expect(deps.onImported).toHaveBeenCalledOnce();
  });

  it('does nothing when the file dialog is cancelled', async () => {
    const deps = mount({ pickFile: vi.fn(async () => null) });
    click(buttonByText('JSON をインポート'));
    await flush();
    expect(deps.confirm).not.toHaveBeenCalled();
    expect(deps.readFile).not.toHaveBeenCalled();
    expect(deps.importFile).not.toHaveBeenCalled();
  });

  it('shows an error when the post-import re-render (onImported) rejects', async () => {
    const deps = mount({ onImported: vi.fn(async () => { throw new Error('reload failed'); }) });
    click(buttonByText('JSON をインポート'));
    await flush();
    expect(deps.importFile).toHaveBeenCalledOnce();
    expect(deps.onImported).toHaveBeenCalledOnce();
    expect(root.querySelector('.errors')?.textContent).toContain('更新');
    expect(root.querySelector('.saved')).toBeNull();
  });

  it('keeps its element and listeners when the holder is re-appended by render', async () => {
    const deps = mount();
    // render() re-appends the same holder element; moving the fieldset into a
    // fresh holder mirrors that the section itself is never rebuilt. The
    // holder is a div like main.ts's transfer-app holder.
    const holder = document.createElement('div');
    holder.id = 'transfer-app';
    while (root.firstChild) holder.append(root.firstChild);
    root.replaceChildren(holder);
    click(buttonByText('JSON をインポート'));
    await flush();
    expect(root.querySelector('.saved')?.textContent).toContain('取り込みました');
    expect(deps.onImported).toHaveBeenCalledOnce();
  });

  it('states the caution and the merge rules in the section wording', () => {
    mount();
    expect(root.textContent).toContain('平文');
    expect(root.textContent).toContain('ID 単位');
    expect(root.textContent).toContain('10 件');
  });

  it('shows an update prompt when the stored format is newer', async () => {
    mount({ formatInfo: vi.fn(async () => ({ version: 2, needsUpdate: true })) });
    await flush();
    expect(root.textContent).toContain('新しい版（2）');
    expect(root.textContent).toContain('拡張を更新してください');
  });

  it('shows no update prompt for the current version or a failed version read', async () => {
    mount();
    await flush();
    expect(root.textContent).not.toContain('拡張を更新してください');
    mount({ formatInfo: vi.fn(async () => { throw new Error('read failed'); }) });
    await flush();
    expect(root.textContent).not.toContain('拡張を更新してください');
  });

  it('states that uninstalling deletes the registrations', () => {
    mount();
    expect(root.textContent).toContain('アンインストールすると');
  });
});

describe('backup nudge', () => {
  const nudgeMount = (over: Partial<TransferSectionDeps> = {}) => mount({
    profileCount: vi.fn(async () => 2),
    ...over,
  });

  const nudge = (): HTMLElement | null => root.querySelector('.backup-nudge');
  const lastExport = (): string => root.querySelector('.backup-last-export')?.textContent ?? '';
  const clickNudgeClose = () => {
    const button = [...root.querySelectorAll('.backup-nudge button')]
      .find((b) => b.textContent === '閉じる');
    if (!button) throw new Error('nudge close button not found');
    (button as HTMLButtonElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
  };

  it('shows the never-exported line when no export was recorded', async () => {
    nudgeMount();
    await flush();
    expect(lastExport()).toContain('まだエクスポートしていません');
  });

  it('shows the stored last-export date instead of the missing line', async () => {
    nudgeMount({ backupMeta: vi.fn(async () => ({ lastExportAt: Date.UTC(2026, 10, 1) })) });
    await flush();
    expect(lastExport()).toContain('最終エクスポート: 2026-11-01');
  });

  it('shows the nudge with two profiles and no export or dismissal', async () => {
    nudgeMount();
    await flush();
    expect(nudge()?.textContent).toContain('バックアップ');
    expect(root.querySelector('.backup-nudge button')?.textContent).toBe('閉じる');
  });

  it('hides the nudge with one profile', async () => {
    nudgeMount({ profileCount: vi.fn(async () => 1) });
    await flush();
    expect(nudge()).toBeNull();
  });

  it('hides the nudge once an export was recorded', async () => {
    nudgeMount({ backupMeta: vi.fn(async () => ({ lastExportAt: Date.UTC(2026, 9, 1) })) });
    await flush();
    expect(nudge()).toBeNull();
  });

  it('hides the nudge while the dismissal is fresh', async () => {
    nudgeMount({ backupMeta: vi.fn(async () => ({ dismissedAt: Date.now() - 24 * 60 * 60 * 1000 })) });
    await flush();
    expect(nudge()).toBeNull();
  });

  it('dismisses the nudge and records the dismissal', async () => {
    const deps = nudgeMount();
    await flush();
    expect(nudge()).not.toBeNull();
    clickNudgeClose();
    await flush();
    expect(deps.recordNudgeDismissedAt).toHaveBeenCalledOnce();
    expect(nudge()).toBeNull();
    expect(lastExport()).toContain('まだエクスポートしていません');
  });

  it('records the export and hides the nudge', async () => {
    let meta: { lastExportAt?: number } = {};
    const deps = nudgeMount({
      backupMeta: vi.fn(async () => meta),
      recordExportAt: vi.fn(async (at: number) => { meta = { lastExportAt: at }; }),
    });
    await flush();
    expect(nudge()).not.toBeNull();
    click(buttonByText('JSON でエクスポート'));
    await flush();
    expect(deps.recordExportAt).toHaveBeenCalledOnce();
    expect(lastExport()).toContain('最終エクスポート:');
    expect(nudge()).toBeNull();
  });

  it('keeps the section usable when the backup state cannot be read', async () => {
    nudgeMount({ backupMeta: vi.fn(async () => { throw new Error('read failed'); }) });
    await flush();
    click(buttonByText('JSON でエクスポート'));
    await flush();
    expect(root.querySelector('.saved')?.textContent).toContain('書き出しました');
  });
});

describe('defaultTransferDeps().pickFile', () => {
  const picker = () => defaultTransferDeps().pickFile();

  // Firefox order, seen in the PBI-117 field check: the window regains focus
  // before the input change event, so a fallback that settles at the next
  // task must not beat the change.
  it('resolves with the picked file when the change lands after the window focus fired', async () => {
    const promise = picker();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{}'], 'a.json', { type: 'application/json' });
    window.dispatchEvent(new Event('focus'));
    await flush();
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    await expect(promise).resolves.toBe(file);
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it('resolves null on the cancel event', async () => {
    const promise = picker();
    const input = document.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    (input as HTMLInputElement).dispatchEvent(new Event('cancel'));
    await expect(promise).resolves.toBeNull();
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it('resolves with the picked file when the change lands', async () => {
    const promise = picker();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{}'], 'a.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    await expect(promise).resolves.toBe(file);
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it('ignores a change that lands after the cancel settled', async () => {
    const promise = picker();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    input.dispatchEvent(new Event('cancel'));
    await expect(promise).resolves.toBeNull();
    const file = new File(['{}'], 'a.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });
});

describe('defaultTransferDeps().readFile', () => {
  it('settles with a rejection when the read is aborted', async () => {
    class AbortReader {
      listeners: Record<string, (() => void)[]> = {};
      result: string | ArrayBuffer | null = null;
      addEventListener(type: string, fn: () => void) {
        (this.listeners[type] ??= []).push(fn);
      }
      readAsText() {
        this.listeners.abort?.forEach((fn) => fn());
      }
    }
    vi.stubGlobal('FileReader', AbortReader);
    const promise = defaultTransferDeps().readFile(new File(['x'], 'a.json', { type: 'application/json' }));
    await expect(promise).rejects.toThrow('read aborted');
    vi.unstubAllGlobals();
  });
});
