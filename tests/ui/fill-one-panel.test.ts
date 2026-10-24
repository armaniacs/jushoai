import { describe, it, expect, vi, afterEach } from 'vitest';
import { confirmFillOne, showFillOneBlocked } from '../../src/ui/fill-one-panel';
import { attachOpenShadow, buttonIn } from '../helpers';

afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('confirmFillOne', () => {
  it('resolves fill with the value on the 注入する button', async () => {
    const sh = attachOpenShadow();
    const pending = confirmFillOne('姓', '山田');
    buttonIn(sh.root, '注入する')!.click();
    expect(await pending).toEqual({ mode: 'fill', value: '山田' });
  });

  // Escape → cancel is verified once in confirm-dialog.test.ts (PBI-155).
  it('resolves cancel on the cancel button', async () => {
    const first = attachOpenShadow();
    const cancelPending = confirmFillOne('姓', '山田');
    buttonIn(first.root, 'キャンセル')!.click();
    expect(await cancelPending).toEqual({ mode: 'cancel' });
  });

  it('renders the label and value through textContent and never via innerHTML', async () => {
    const sh = attachOpenShadow();
    const pending = confirmFillOne('<img src=x onerror=alert(1)>', '山田');
    const field = sh.root.querySelector('.field');
    expect(field?.innerHTML).not.toContain('<img');
    expect(field?.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(sh.root.querySelector('.value')?.textContent).toBe('山田');
    buttonIn(sh.root, 'キャンセル')!.click();
    await pending;
  });
});

describe('showFillOneBlocked', () => {
  it('shows the reason label and the guidance instead of a fill button', async () => {
    const sh = attachOpenShadow();
    const pending = showFillOneBlocked('自由記入欄', 'unknown');
    expect(sh.root.querySelector('h2')?.textContent).toBe('この欄には入力できません');
    expect(sh.root.textContent).toContain('分類できませんでした');
    expect(sh.root.textContent).toContain('全体プレビューまたはカスタム対応付けをご利用ください');
    expect(buttonIn(sh.root, '注入する')).toBeUndefined();
    buttonIn(sh.root, '閉じる')!.click();
    await pending;
  });
});
