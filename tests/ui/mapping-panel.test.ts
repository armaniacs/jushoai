import { describe, it, expect, vi, afterEach } from 'vitest';
import { chooseMapping } from '../../src/ui/mapping-panel';
import { attachOpenShadow, buttonIn } from '../helpers';

afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('chooseMapping (PBI-138)', () => {
  it('renders the label, the choices and the remember checkbox', () => {
    const sh = attachOpenShadow();
    const pending = chooseMapping('姓', 'tel');
    expect(sh.root.textContent).toContain('姓');
    expect(sh.root.textContent).toContain('このサイトに覚えさせる');
    const select = sh.root.querySelector<HTMLSelectElement>('select');
    expect(select?.value).toBe('tel');
    expect(Array.from(select?.options ?? []).some((o) => o.value === 'unknown')).toBe(false);
    buttonIn(sh.root, '決める')!.click();
    return pending.then((d) => expect(d).toEqual({ category: 'tel', remember: true }));
  });

  it('resolves the picked category with the remember state', async () => {
    const sh = attachOpenShadow();
    const pending = chooseMapping('姓', 'tel');
    const select = sh.root.querySelector<HTMLSelectElement>('select')!;
    select.value = 'email';
    const remember = sh.root.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    remember.checked = false;
    buttonIn(sh.root, '決める')!.click();
    expect(await pending).toEqual({ category: 'email', remember: false });

    const second = attachOpenShadow();
    const cancelPending = chooseMapping('姓', 'tel');
    buttonIn(second.root, 'やめる')!.click();
    expect(await cancelPending).toBeNull();
  });
  // Escape → null is verified once in confirm-dialog.test.ts (PBI-155).
});
