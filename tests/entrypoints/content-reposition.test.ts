import { describe, it, expect, vi, afterEach } from 'vitest';

// Same stub-then-import seam the other content tests use.
import { attachRepositionTracking } from '../../src/ui/panel';

const detachers: Array<() => void> = [];

// A synchronous frame scheduler keeps the assertions free of rAF timing while
// still exercising the coalescing branch.
const attach = (reposition: () => void): (() => void) => {
  const detach = attachRepositionTracking({
    doc: document,
    win: window,
    reposition,
    schedule: (cb) => cb(),
  });
  detachers.push(detach);
  return detach;
};

afterEach(() => {
  while (detachers.length > 0) detachers.pop()!();
  document.body.innerHTML = '';
});

describe('attachRepositionTracking', () => {
  it('follows a scroll inside an inner scroll container', () => {
    const reposition = vi.fn();
    attach(reposition);
    const panel = document.createElement('div');
    document.body.append(panel);
    // The event target is a descendant, not the document: scroll does not
    // bubble, so only a capture-phase listener on the document sees this.
    panel.dispatchEvent(new Event('scroll'));
    expect(reposition).toHaveBeenCalledOnce();
  });

  it('follows the page scroll, whose target is the document', () => {
    const reposition = vi.fn();
    attach(reposition);
    document.dispatchEvent(new Event('scroll'));
    expect(reposition).toHaveBeenCalledOnce();
  });

  it('ignores scrolling of our own panel, which moves no anchor', () => {
    const reposition = vi.fn();
    attach(reposition);
    const host = document.createElement('div');
    host.setAttribute('data-jushoai', '');
    document.body.append(host);
    // A closed shadow root retargets inner scrolls to the host element.
    host.dispatchEvent(new Event('scroll'));
    expect(reposition).not.toHaveBeenCalled();
  });

  it('coalesces scroll bursts into one reposition per frame', () => {
    const frames: Array<() => void> = [];
    const reposition = vi.fn();
    const detach = attachRepositionTracking({
      doc: document,
      win: window,
      reposition,
      schedule: (cb) => frames.push(cb),
    });
    detachers.push(detach);
    document.dispatchEvent(new Event('scroll'));
    document.dispatchEvent(new Event('scroll'));
    expect(reposition).not.toHaveBeenCalled();
    expect(frames).toHaveLength(1);
    frames[0]!();
    expect(reposition).toHaveBeenCalledOnce();
    // A later scroll schedules a new frame.
    document.dispatchEvent(new Event('scroll'));
    expect(frames).toHaveLength(2);
  });

  it('stops responding after the returned detacher runs', () => {
    const reposition = vi.fn();
    const detach = attach(reposition);
    detach();
    document.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    expect(reposition).not.toHaveBeenCalled();
  });

  it('repositions immediately on load instead of waiting for a frame', () => {
    const frames: Array<() => void> = [];
    const reposition = vi.fn();
    const detach = attachRepositionTracking({
      doc: document,
      win: window,
      reposition,
      schedule: (cb) => frames.push(cb),
    });
    detachers.push(detach);
    window.dispatchEvent(new Event('load'));
    expect(reposition).toHaveBeenCalledOnce();
    expect(frames).toHaveLength(0);
  });
});
