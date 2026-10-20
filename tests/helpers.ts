import { vi } from 'vitest';
import type { FieldMeta } from '../src/core/types';
import type { PreviewRow } from '../src/ui/preview';

// The metadata allow-list the wire carries. Tests pin the encoded key set
// against this literal instead of importing a key-list export from the
// implementation, so the expectation lives on the test side.
export const WIRE_META_KEYS = ['id', 'type', 'name', 'htmlId', 'label', 'placeholder', 'nearby', 'maxLength'] as const;

// Captured once at import time: vi.spyOn reuses the same spy object, so a
// re-captured property (a second call reading the spied method) would point at
// the spy itself and recurse forever.
const attach = HTMLElement.prototype.attachShadow;

// Opens the shadow root in open mode so tests can inspect the mounted panel.
// root only exists after the component mounts, so it is read through a getter.
export function attachOpenShadow(): { readonly root: ShadowRoot; restore(): void } {
  let shadow!: ShadowRoot;
  const spy = vi.spyOn(HTMLElement.prototype, 'attachShadow').mockImplementation(function (this: HTMLElement) {
    shadow = attach.call(this, { mode: 'open' });
    return shadow;
  });
  return { get root() { return shadow; }, restore: () => spy.mockRestore() };
}

// Shared PreviewRow factory: same label and source for every preview test.
// The display text defaults to the panel's initial value; preview-bind pins a
// distinct default through the argument.
export function makeRow(status: PreviewRow['status'], display = '山田'): PreviewRow {
  return { label: '姓', display, status, source: 'rule' };
}

export function buttonIn(root: ShadowRoot, text: string) {
  return [...root.querySelectorAll('button')].find((b) => b.textContent === text);
}

export function makeMeta(p: Partial<FieldMeta> = {}): FieldMeta {
  return {
    id: 'f', tag: 'input', type: 'text', name: '', htmlId: '', autocomplete: '',
    label: '', placeholder: '', nearby: '', maxLength: null, pattern: '',
    options: [], readOnly: false, disabled: false, value: '',
    ...p,
  };
}
