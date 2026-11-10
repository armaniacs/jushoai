// PBI-220 parity: the profile and address footers share one generator.
// Pins BDD scenario 1 (one change reaches both sides): both pages build their
// footer with renderCardFooter, so their DOM is identical and a wording or
// enabled change inside the generator reaches both sides at once. The oracle
// below is the pre-refactor hand-written footer (verbatim from main.ts before
// PBI-220); equality with it proves the bundling changed no pixels.
import { describe, it, expect, vi } from 'vitest';
import {
  actionButton, el, renderCardFooter,
} from '../../src/entrypoints/options/dom';

// Pre-refactor shape: div.row holding 保存 + フォームから取り込む, built
// inline per page. Both pages used this exact sequence.
function oldHandWrittenFooter(onSave: () => void, onImport: () => void): HTMLDivElement {
  const save = actionButton('保存', false, onSave);
  const importButton = actionButton('フォームから取り込む', false, onImport);
  const footer = el('div');
  footer.className = 'row';
  footer.append(save, importButton);
  return footer;
}

const FOOTER_HTML =
  '<div class="row"><button type="button">保存</button><button type="button">フォームから取り込む</button></div>';

describe('renderCardFooter (PBI-220)', () => {
  it('matches the pre-refactor hand-written footer DOM', () => {
    const footer = renderCardFooter({ onSave: () => {}, onImport: () => {} });
    expect(footer.outerHTML).toBe(oldHandWrittenFooter(() => {}, () => {}).outerHTML);
    expect(footer.outerHTML).toBe(FOOTER_HTML);
  });

  it('builds both sides with identical structure (save, then import, then row)', () => {
    // Mirrors the two main.ts call sites: the save side differs per page,
    // the import wiring is shared.
    const sharedImport = vi.fn();
    const profileFooter = renderCardFooter({ onSave: vi.fn(), onImport: sharedImport });
    const addressFooter = renderCardFooter({ onSave: vi.fn(), onImport: sharedImport });
    expect(profileFooter.outerHTML).toBe(addressFooter.outerHTML);
    const buttons = [...profileFooter.querySelectorAll('button')];
    expect(buttons.map((b) => b.textContent)).toEqual(['保存', 'フォームから取り込む']);
    expect(buttons.map((b) => b.disabled)).toEqual([false, false]);
  });

  it('routes clicks to the injected handlers', () => {
    const onSave = vi.fn();
    const onImport = vi.fn();
    const footer = renderCardFooter({ onSave, onImport });
    const [save, importButton] = [...footer.querySelectorAll('button')];
    save!.click();
    importButton!.click();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onImport).toHaveBeenCalledTimes(1);
  });
});
