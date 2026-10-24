import { describe, it, expect, vi, afterEach } from 'vitest';
import { confirmGuest } from '../../src/ui/guest-panel';
import { GUEST_ADDRESS_FIELDS, GUEST_PROFILE_FIELDS } from '../../src/core/field-catalog';
import { attachOpenShadow, buttonIn } from '../helpers';

afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

const type = (root: ShadowRoot, index: number, value: string): void => {
  const boxes = root.querySelectorAll<HTMLInputElement>('input');
  boxes[index]!.value = value;
  boxes[index]!.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('confirmGuest (PBI-144)', () => {
  it('keeps the use button disabled while every field is empty', () => {
    const sh = attachOpenShadow();
    const pending = confirmGuest();
    const use = buttonIn(sh.root, 'この内容で使う')!;
    expect(use.disabled).toBe(true);
    use.click();
    type(sh.root, 0, '山田');
    expect(use.disabled).toBe(false);
    use.click();
    expect(sh.root.textContent).toContain('保存・履歴・同期には残りません');
    return pending.then((d) => expect(d).toMatchObject({ profile: { lastName: '山田' } }));
  });

  // Escape → null is verified once in confirm-dialog.test.ts (PBI-155).
  it('resolves null on 使わない', async () => {
    const first = attachOpenShadow();
    const cancelPending = confirmGuest();
    buttonIn(first.root, '使わない')!.click();
    expect(await cancelPending).toBeNull();
  });

  it('splits typed values between the profile and the address', async () => {
    const sh = attachOpenShadow();
    const pending = confirmGuest();
    type(sh.root, 0, '山田');
    type(sh.root, 1, '太郎');
    type(sh.root, 6, '1000001');
    buttonIn(sh.root, 'この内容で使う')!.click();
    const decision = await pending;
    expect(decision).toEqual({
      profile: { lastName: '山田', firstName: '太郎' },
      address: { zip: '1000001' },
    });
  });

  it('trims whitespace-only values out of the decision', async () => {
    const sh = attachOpenShadow();
    const pending = confirmGuest();
    type(sh.root, 0, '山田');
    type(sh.root, 1, '   ');
    buttonIn(sh.root, 'この内容で使う')!.click();
    expect(await pending).toEqual({ profile: { lastName: '山田' }, address: {} });
  });
});

// PBI-158: the guest panel is the field catalog's guest subset and nothing
// else. Keys are not rendered, so the pin walks the label/placeholder/type
// sequence: membership, order, and the base (non-options-note) wording all
// come from the catalog, so a one-sided edit in the panel fails here.
describe('confirmGuest vs the field catalog (PBI-158)', () => {
  it('renders exactly the catalog guest subset in order', async () => {
    const sh = attachOpenShadow();
    const pending = confirmGuest();
    const expected = [...GUEST_PROFILE_FIELDS, ...GUEST_ADDRESS_FIELDS].map((f) => ({
      label: f.label,
      placeholder: f.placeholder,
      type: f.type ?? 'text',
    }));
    const rendered = [...sh.root.querySelectorAll('label')].map((wrap) => {
      const box = wrap.querySelector<HTMLInputElement>('input')!;
      return {
        label: wrap.querySelector('span')!.textContent ?? '',
        placeholder: box.placeholder,
        type: box.type,
      };
    });
    expect(rendered).toEqual(expected);
    expect(rendered).toHaveLength(11);
    buttonIn(sh.root, '使わない')!.click();
    await pending;
  });
});
