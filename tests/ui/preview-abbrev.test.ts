import { describe, it, expect, vi, afterEach } from 'vitest';
import { showPreview } from '../../src/ui/preview';
import type { PreviewRow } from '../../src/ui/preview';
import { attachOpenShadow, buttonIn, makeRow } from '../helpers';

// PBI-122: the abbreviation candidate renders as an opt-in checkbox (default
// unchecked = not injected). Checking it is the explicit approval the fill
// needs; the approved field ids travel to the apply callback.

const abbrevRow: PreviewRow = {
  label: '建物',
  display: 'サンプルパークマンション203号室 → サンプルパーク邸203号室',
  status: 'warn-maxlength', source: 'rule',
  fieldId: 'f1', candidates: [{ kind: 'abbrev', text: 'サンプルパーク邸203号室' }],
};

afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

function open(rows: PreviewRow[], onApply = vi.fn()) {
  const sh = attachOpenShadow();
  const handle = showPreview({
    rows, addresses: [], selectedAddressId: '', onAddressChange: () => {},
    profiles: [], selectedProfileId: '', onProfileChange: () => {},
    onApply, onCancel: () => {},
  });
  return { handle, root: sh.root, onApply };
}

describe('preview abbreviation choice (PBI-122)', () => {
  it('renders the opt-in checkbox only for abbreviation rows', () => {
    const { root } = open([makeRow('ok'), abbrevRow]);
    const boxes = root.querySelectorAll('li input[type="checkbox"]');
    expect(boxes).toHaveLength(1);
    expect((boxes[0] as HTMLInputElement).checked).toBe(false);
    expect(root.textContent).toContain('略記して入れる');
  });

  it('shows the before and after values side by side', () => {
    const { root } = open([abbrevRow]);
    expect(root.textContent).toContain('サンプルパークマンション203号室 → サンプルパーク邸203号室');
  });

  it('keeps apply locked while the abbreviation is not approved', () => {
    const { root } = open([abbrevRow]);
    expect(buttonIn(root, '入力する')!.disabled).toBe(true);
  });

  it('enables apply and passes the approved field id once checked', () => {
    const onApply = vi.fn();
    const { root } = open([abbrevRow], onApply);
    const box = root.querySelector('li input[type="checkbox"]') as HTMLInputElement;
    box.click();
    expect(box.checked).toBe(true);
    expect(buttonIn(root, '入力する')!.disabled).toBe(false);
    buttonIn(root, '入力する')!.click();
    expect(onApply).toHaveBeenCalledWith(false, new Set(['f1']));
  });

  it('passes an empty set when no candidate row exists', () => {
    const onApply = vi.fn();
    const { root } = open([makeRow('ok')], onApply);
    buttonIn(root, '入力する')!.click();
    expect(onApply).toHaveBeenCalledWith(false, new Set());
  });

  // レビュー指摘: 赤字の「文字数を超えるため入力しません」の直下に checkbox が
  // 出て、チェック後も note が赤字のまま矛盾する。チェック時に muted へ切替える。
  it('mutes the overflow note while the abbreviation is checked and restores it on uncheck', () => {
    const { root } = open([abbrevRow]);
    const note = root.querySelector('li span.note') as HTMLElement;
    expect(note.className).toBe('note');
    const box = root.querySelector('li input[type="checkbox"]') as HTMLInputElement;
    box.click();
    expect(note.className).toBe('note muted');
    box.click();
    expect(note.className).toBe('note');
  });
});

// PBI-157: the opt-in candidates ride PreviewRow.candidates as one structure,
// and the row renders them through a single block — the twin abbrev/assist
// blocks are gone (deletion test: dropping renderRow would bring them back).
describe('opt-in candidates in one structure (PBI-157)', () => {
  it('renders both candidate kinds through the single block', () => {
    const { root } = open([{
      ...makeRow('warn-no-value', '候補: 東京都'),
      fieldId: 'f1',
      candidates: [
        { kind: 'abbrev', text: 'サンプルパーク邸' },
        { kind: 'assist', text: '東京都' },
      ],
    }]);
    const boxes = root.querySelectorAll('li input[type="checkbox"]');
    expect(boxes).toHaveLength(2);
    expect((boxes[0] as HTMLInputElement).checked).toBe(false);
    expect(root.textContent).toContain('略記して入れる');
    expect(root.textContent).toContain('補助候補を入れる');
  });

  it('collects the approved field id for either candidate kind', () => {
    const onApply = vi.fn();
    const { root } = open([{
      ...makeRow('warn-no-value', '候補: 東京都'),
      fieldId: 'f1',
      candidates: [{ kind: 'assist', text: '東京都' }],
    }], onApply);
    const box = root.querySelector('li input[type="checkbox"]') as HTMLInputElement;
    box.click();
    expect(buttonIn(root, '入力する')!.disabled).toBe(false);
    buttonIn(root, '入力する')!.click();
    expect(onApply).toHaveBeenCalledWith(false, new Set(['f1']));
  });
});
