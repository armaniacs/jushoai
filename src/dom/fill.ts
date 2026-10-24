import type { Control } from './scan-fields';

// React and Vue track the value on the element instance; calling the prototype setter
// bypasses that tracker so the following input event is seen as a real change.
export function fillField(el: Control, value: string): void {
  if (el instanceof HTMLInputElement && el.type === 'radio') {
    fillRadio(el);
    return;
  }
  const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  el.focus();
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));
}

// Same prototype-setter discipline for radios: checking one input unchecks its
// same-name siblings, and the manual events expose the change to frameworks.
export function fillRadio(el: HTMLInputElement): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set;
  el.focus();
  if (setter) setter.call(el, true);
  else el.checked = true;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));
}

// Inverse of fillRadio (PBI-132 undo): unchecking through the same prototype
// setter plus the manual events, so React/Vue state trackers see the undo as
// a real change just like the fill.
export function uncheckRadio(el: HTMLInputElement): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set;
  if (setter) setter.call(el, false);
  else el.checked = false;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('blur', { bubbles: true }));
}
