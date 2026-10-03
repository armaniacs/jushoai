import type { FieldMeta } from '../src/core/types';

export function makeMeta(p: Partial<FieldMeta> = {}): FieldMeta {
  return {
    id: 'f', tag: 'input', type: 'text', name: '', htmlId: '', autocomplete: '',
    label: '', placeholder: '', nearby: '', maxLength: null, pattern: '',
    options: [], readOnly: false, disabled: false, value: '',
    ...p,
  };
}
