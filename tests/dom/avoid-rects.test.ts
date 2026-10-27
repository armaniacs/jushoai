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
    const rects = collectAvoidRects(container, document);
    expect(rects).toEqual([
      { top: 100 + 200, left: 50 + 5, right: 250 + 5, bottom: 124 + 200 },
      { top: 200 + 200, left: 50 + 5, right: 250 + 5, bottom: 224 + 200 },
      { top: 300 + 200, left: 50 + 5, right: 250 + 5, bottom: 324 + 200 },
    ]);
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
    const rects = collectAvoidRects(container, document);
    expect(rects).toEqual([{ top: 10, left: 10, right: 210, bottom: 40 }]);
  });

  it('returns an empty list for a container without fields', () => {
    const container = document.body.appendChild(document.createElement('div'));
    expect(collectAvoidRects(container, document)).toEqual([]);
  });
});
