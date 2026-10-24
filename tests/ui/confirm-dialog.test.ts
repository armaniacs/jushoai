import { describe, it, expect, vi, afterEach } from 'vitest';
import { confirmDialog } from '../../src/ui/confirm-dialog';
import { attachOpenShadow, buttonIn } from '../helpers';

afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe('confirmDialog (PBI-155)', () => {
  // The safe-side invariant collected here from the four panels: closing the
  // dialog without a choice (Escape included) settles the call site's
  // defaultOnClose exactly once, and nothing can re-decide afterwards.
  it('settles exactly once with the default when closed without a choice', async () => {
    const sh = attachOpenShadow();
    const resolutions: string[] = [];
    const pending = confirmDialog<string>({
      title: '確認',
      body: (panel) => {
        const note = document.createElement('p');
        note.textContent = '本文';
        panel.append(note);
        return '.note { font-size: 12px; }';
      },
      actions: [{ label: '選ぶ', pick: () => 'picked' }],
      defaultOnClose: 'default',
    });
    pending.then((d) => resolutions.push(d));

    expect(sh.root.querySelector('h2')?.textContent).toBe('確認');
    expect(sh.root.textContent).toContain('本文');
    expect(buttonIn(sh.root, '選ぶ')).toBeTruthy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(await pending).toBe('default');

    // The panel is closed and the decision is final: a second Escape and a
    // late click on the action button cannot re-resolve it.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    buttonIn(sh.root, '選ぶ')!.click();
    expect(resolutions).toEqual(['default']);
  });

  // A throwing body must not reject: mountPanel tears down and rethrows, and
  // confirmDialog converts that into the safe default ("closed without a
  // choice"), so no call site needs its own rejection handler.
  it('settles the default instead of rejecting when the body throws', async () => {
    attachOpenShadow();
    const pending = confirmDialog<string>({
      title: '見出し',
      body: () => { throw new Error('boom'); },
      actions: [{ label: '選ぶ', pick: () => 'picked' }],
      defaultOnClose: 'default',
    });
    await expect(pending).resolves.toBe('default');
  });

  // The DOM order is the visual order (.panel is display:block): the heading
  // comes first, the body renders between the heading and the actions row.
  // Pinned because the heading used to land after the body when the body
  // rendered into the panel before the heading was appended.
  it('renders the heading first and the actions row last', () => {
    const sh = attachOpenShadow();
    confirmDialog<string>({
      title: '見出し',
      body: (panel) => {
        const note = document.createElement('p');
        note.textContent = '本文';
        panel.append(note);
      },
      actions: [{ label: '選ぶ', pick: () => 'picked' }],
      defaultOnClose: 'default',
    });

    const panel = sh.root.querySelector('.panel')!;
    const order = Array.from(panel.children).map((el) =>
      el.classList.length ? `${el.tagName.toLowerCase()}.${el.className}` : el.tagName.toLowerCase(),
    );
    expect(order[0]).toBe('h2');
    expect(order[order.length - 1]).toBe('div.actions');
    expect(order.indexOf('h2')).toBeLessThan(order.indexOf('p'));
    expect(order.indexOf('p')).toBeLessThan(order.indexOf('div.actions'));
  });
});
