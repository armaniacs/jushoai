import { describe, it, expect, vi } from 'vitest';
import { createTabDispatcher } from '../../src/content/tab-dispatch';

// PBI-156: one guarded dispatcher for the tab-bound chrome.runtime messages.
// The type guard, the exclusion gate, and the response plumbing live in the
// module, so these tests assert the guards in one place instead of re-copying
// them per listener.

type Listener = (
  msg: unknown,
  sender: unknown,
  sendResponse: (res: unknown) => void,
) => boolean;

const dispatch = (listener: Listener, msg: unknown) => {
  let responded: unknown;
  const ret = listener(msg, {}, (res) => { responded = res; });
  return { ret, responded };
};

const setup = (excluded: boolean) => {
  const listeners: Listener[] = [];
  const register = createTabDispatcher({
    isExcluded: () => excluded,
    addListener: (fn: Listener) => { listeners.push(fn); },
  });
  return { register, listeners };
};

describe('registerTabMessage', () => {
  it('ignores messages whose type does not match: no gate, no handler', () => {
    const { register, listeners } = setup(false);
    const handler = vi.fn(() => false);
    register('type-a', { gate: true, handler });
    const { ret } = dispatch(listeners[0]!, { type: 'type-b' });
    expect(ret).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores a non-object message like the old type guard did', () => {
    const { register, listeners } = setup(false);
    const handler = vi.fn(() => false);
    register('type-a', { gate: true, handler });
    expect(dispatch(listeners[0]!, null).ret).toBe(false);
    expect(dispatch(listeners[0]!, 'type-a').ret).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('rejects every gated type on an excluded page through one gate check', () => {
    const { register, listeners } = setup(true);
    const handler = vi.fn(() => false);
    register('analyze', {
      gate: true,
      excludedResponse: { ok: false, reason: 'no-form' },
      handler,
    });
    register('import-draft', { gate: true, handler });
    register('guest-fill', { gate: true, handler });
    const analyze = dispatch(listeners[0]!, { type: 'analyze' });
    expect(analyze.ret).toBe(false);
    expect(analyze.responded).toEqual({ ok: false, reason: 'no-form' });
    const draft = dispatch(listeners[1]!, { type: 'import-draft' });
    expect(draft.ret).toBe(false);
    expect(draft.responded).toEqual({ ok: false });
    const guest = dispatch(listeners[2]!, { type: 'guest-fill' });
    expect(guest.ret).toBe(false);
    expect(guest.responded).toEqual({ ok: false });
    // The gate runs after the type guard and before the handler body, so an
    // excluded page never reaches any handler.
    expect(handler).not.toHaveBeenCalled();
  });

  it('runs the handler on a non-excluded page and returns its listener flag', () => {
    const { register, listeners } = setup(false);
    const handler = vi.fn((_msg: object, sendResponse: (res: unknown) => void) => {
      sendResponse({ ok: true, draft: {} });
      return false;
    });
    register('analyze', { gate: true, handler });
    const { ret, responded } = dispatch(listeners[0]!, { type: 'analyze' });
    expect(ret).toBe(false);
    expect(responded).toEqual({ ok: true, draft: {} });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('keeps the response channel open when the handler answers asynchronously', () => {
    const { register, listeners } = setup(false);
    register('analyze', {
      gate: true,
      handler: (_msg, sendResponse) => {
        Promise.resolve().then(() => sendResponse({ ok: true }));
        return true;
      },
    });
    const { ret } = dispatch(listeners[0]!, { type: 'analyze' });
    expect(ret).toBe(true);
  });
});
