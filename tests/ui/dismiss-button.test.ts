import { describe, it, expect, vi } from 'vitest';
import { createDismissButton } from '../../src/ui/button';

describe('createDismissButton', () => {
  it('押すと onDismiss が1回走る', () => {
    const onDismiss = vi.fn();
    const button = createDismissButton(onDismiss);
    expect(button.getAttribute('aria-label')).toBe('このボタンを隠す');
    button.click();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('button 要素で type が button である', () => {
    const button = createDismissButton(() => {});
    expect(button.tagName).toBe('BUTTON');
    expect(button.type).toBe('button');
  });
});
