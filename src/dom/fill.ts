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
