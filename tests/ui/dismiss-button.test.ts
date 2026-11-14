import { describe, it, expect, vi, afterEach } from 'vitest';
import { createDismissButton } from '../../src/ui/button';

afterEach(() => {
  vi.restoreAllMocks();
});

interface TrustedClick {
  isTrusted: boolean;
  preventDefault(): void;
  stopPropagation(): void;
}

// jsdom の click() は常に isTrusted=false のため、実クリック相当は登録
// ハンドラへの信頼イベントの直接呼び出しで再現する(button.ts の主ボタンと
// 同じ筋)。捕捉順は登録順そのまま。
function captureClicks() {
  const handlers: Array<(e: TrustedClick) => void> = [];
  const origAdd = EventTarget.prototype.addEventListener;
  const spy = vi.spyOn(EventTarget.prototype, 'addEventListener').mockImplementation(function (
    this: EventTarget,
    ...args: [string, EventListenerOrEventListenerObject | null, ...unknown[]]
  ) {
    const [type, listener] = args;
    if (type === 'click' && typeof listener === 'function' && this instanceof HTMLButtonElement) {
      handlers.push(listener as (e: TrustedClick) => void);
    }
    return Reflect.apply(origAdd as (...a: unknown[]) => void, this, args);
  });
  return { handlers, restore: () => spy.mockRestore() };
}

function trustedClick(): TrustedClick {
  return { isTrusted: true, preventDefault() {}, stopPropagation() {} };
}

describe('createDismissButton', () => {
  it('押すと onDismiss が1回走る', () => {
    const onDismiss = vi.fn();
    const { handlers, restore } = captureClicks();
    try {
      const button = createDismissButton(onDismiss);
      expect(button.getAttribute('aria-label')).toBe('このボタンを隠す');
      expect(handlers.length).toBe(1);
      handlers[0]!(trustedClick());
      expect(onDismiss).toHaveBeenCalledTimes(1);
    } finally {
      restore();
    }
  });

  it('信頼できないクリックでは onDismiss が走らない', () => {
    const onDismiss = vi.fn();
    const { handlers, restore } = captureClicks();
    try {
      createDismissButton(onDismiss);
      handlers[0]!({ isTrusted: false, preventDefault() {}, stopPropagation() {} });
      expect(onDismiss).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it('button 要素で type が button である', () => {
    const button = createDismissButton(() => {});
    expect(button.tagName).toBe('BUTTON');
    expect(button.type).toBe('button');
  });
});
