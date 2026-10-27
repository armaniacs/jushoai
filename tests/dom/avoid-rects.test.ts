import { describe, it, expect, vi, afterEach } from 'vitest';
import { collectAvoidRects } from '../../src/dom/avoid-rects';

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

function domRect(top: number, left: number, right: number, bottom: number) {
  return { top, left, right, bottom, width: right - left, height: bottom - top, x: left, y: top, toJSON() {} } as DOMRect;
}

describe('collectAvoidRects', () => {
  it('collects visible text-like fields and selects in document coordinates', () => {
    vi.spyOn(window, 'scrollX', 'get').mockReturnValue(5);
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(200);
    const container = document.body.appendChild(document.createElement('div'));
    const text = container.appendChild(document.createElement('input'));
    text.type = 'text';
    const tel = container.appendChild(document.createElement('input'));
    tel.type = 'tel';
    const select = container.appendChild(document.createElement('select'));
    text.getBoundingClientRect = () => domRect(100, 50, 250, 124);
    tel.getBoundingClientRect = () => domRect(200, 50, 250, 224);
    select.getBoundingClientRect = () => domRect(300, 50, 250, 324);
    const rects = collectAvoidRects(document);
    expect(rects).toEqual([
      { top: 100 + 200, left: 50 + 5, right: 250 + 5, bottom: 124 + 200 },
      { top: 200 + 200, left: 50 + 5, right: 250 + 5, bottom: 224 + 200 },
      { top: 300 + 200, left: 50 + 5, right: 250 + 5, bottom: 324 + 200 },
    ]);
  });

  it('collects fields outside the mounted container: a neighbouring form near the anchor is a blocker too', () => {
    const own = document.body.appendChild(document.createElement('div'));
    const other = document.body.appendChild(document.createElement('div'));
    const ownInput = own.appendChild(document.createElement('input'));
    ownInput.type = 'text';
    ownInput.getBoundingClientRect = () => domRect(100, 50, 250, 124);
    const otherInput = other.appendChild(document.createElement('input'));
    otherInput.type = 'email';
    otherInput.getBoundingClientRect = () => domRect(110, 300, 500, 134);
    // The neighbour sits right of the anchor: the placement candidates must
    // see it or the banner would cover it (PBI-161 scenario 1).
    const rects = collectAvoidRects(document);
    expect(rects).toHaveLength(2);
    expect(rects[1]).toEqual({ top: 110, left: 300, right: 500, bottom: 134 });
  });

  it('includes date fields (PBI-118 keeps the scan set and the blocker set one contract)', () => {
    const container = document.body.appendChild(document.createElement('div'));
    const date = container.appendChild(document.createElement('input'));
    date.type = 'date';
    date.getBoundingClientRect = () => domRect(20, 20, 220, 50);
    expect(collectAvoidRects(document)).toEqual([{ top: 20, left: 20, right: 220, bottom: 50 }]);
  });

  it('skips non-scan types, disabled fields and zero rects', () => {
    const container = document.body.appendChild(document.createElement('div'));
    const checkbox = container.appendChild(document.createElement('input'));
    checkbox.type = 'checkbox';
    const disabled = container.appendChild(document.createElement('input'));
    disabled.type = 'text';
    disabled.disabled = true;
    const hidden = container.appendChild(document.createElement('input'));
    hidden.type = 'text';
    hidden.style.display = 'none';
    hidden.getBoundingClientRect = () => domRect(0, 0, 0, 0);
    const visible = container.appendChild(document.createElement('input'));
    visible.type = 'email';
    visible.getBoundingClientRect = () => domRect(10, 10, 210, 40);
    const rects = collectAvoidRects(document);
    expect(rects).toEqual([{ top: 10, left: 10, right: 210, bottom: 40 }]);
  });

  it('skips fields that keep their box but are not visible (visibility:hidden, opacity:0)', () => {
    const container = document.body.appendChild(document.createElement('div'));
    const invisible = container.appendChild(document.createElement('input'));
    invisible.type = 'text';
    invisible.style.visibility = 'hidden';
    invisible.getBoundingClientRect = () => domRect(10, 10, 210, 40);
    const transparent = container.appendChild(document.createElement('input'));
    transparent.type = 'text';
    transparent.style.opacity = '0';
    transparent.getBoundingClientRect = () => domRect(60, 10, 260, 90);
    // jsdom has no layout engine and no checkVisibility on the prototype, so
    // the visibility oracle is stubbed directly on the fields.
    invisible.checkVisibility = () => false;
    transparent.checkVisibility = () => false;
    expect(collectAvoidRects(document)).toEqual([]);
  });

  it('returns an empty list for a document without fields', () => {
    expect(collectAvoidRects(document)).toEqual([]);
  });
});
