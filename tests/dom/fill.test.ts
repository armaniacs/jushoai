import { describe, it, expect } from 'vitest';
import { fillField } from '../../src/dom/fill';

describe('fillField', () => {
  it('sets the value and fires input, change, blur in order', () => {
    const input = document.createElement('input');
    const events: string[] = [];
    for (const type of ['input', 'change', 'blur']) {
      input.addEventListener(type, () => events.push(type));
    }
    fillField(input, '山田');
    expect(input.value).toBe('山田');
    expect(events).toEqual(['input', 'change', 'blur']);
  });

  it('uses the native setter so instance-level value trackers are bypassed', () => {
    const input = document.createElement('input');
    let tracked = false;
    Object.defineProperty(input, 'value', {
      configurable: true,
      get: () => '',
      set: () => {
        tracked = true;
      },
    });
    fillField(input, 'x');
    expect(tracked).toBe(false);
    const get = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.get!;
    expect(get.call(input)).toBe('x');
  });

  it('selects an option by value', () => {
    const select = document.createElement('select');
    select.innerHTML = '<option value="">-</option><option value="13">東京都</option>';
    fillField(select, '13');
    expect(select.value).toBe('13');
  });
});

describe('fillField radio', () => {
  it('checks the radio and fires input, change, blur without touching value', () => {
    document.body.innerHTML = '<input name="g" type="radio" value="0"><input name="g" type="radio" value="1">';
    const target = document.querySelectorAll('input')[1]!;
    const events: string[] = [];
    for (const type of ['input', 'change', 'blur']) {
      target.addEventListener(type, () => events.push(type));
    }
    fillField(target, '1');
    expect(target.checked).toBe(true);
    expect(events).toEqual(['input', 'change', 'blur']);
  });
});
