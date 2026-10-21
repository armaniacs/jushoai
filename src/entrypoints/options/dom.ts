// Shared DOM helpers for the options page sections (#app and #ai-app live in one document),
// so input behavior edits cannot drift between the profile and AI sections.
import { formatKana } from '../../core/formatters';
import { normalizeProfile } from '../../core/profile';
import { EMPTY_PROFILE } from '../../core/types';

// Single source of the collection cap: profiles and addresses share the
// limit, only the notice wording differs per collection. The constant lives in
// core/collection so the transfer import path (src/transfer.ts) checks the
// same value instead of a drifting copy.
export { MAX_ITEMS, isAtLimit } from '../../core/collection';

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

export function labeled(text: string, control: HTMLElement): HTMLLabelElement {
  const label = el('label');
  label.append(el('span', text), control);
  return label;
}

export function textInput(value: string, placeholder: string, onInput: (v: string) => void, type = 'text') {
  const input = el('input');
  input.type = type;
  input.value = value;
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.addEventListener('input', () => onInput(input.value));
  return input;
}

// Generic select assembly: the single option-building path for the options
// page (profile/address selects in main.ts, the provider select in
// ai-section.ts). Entries carry their own selected flag so thin wrappers only
// map domain options to { value, text, selected }.
export interface SelectEntry {
  value: string;
  text: string;
  selected: boolean;
}

export function buildSelect(onChange: (v: string) => void, entries: SelectEntry[]): HTMLSelectElement {
  const select = el('select');
  for (const e of entries) {
    const o = el('option', e.text);
    o.value = e.value;
    o.selected = e.selected;
    select.append(o);
  }
  select.addEventListener('change', () => onChange(select.value));
  return select;
}

// Shared card assembly for the profile/address loops in main.ts. Same
// elements, text, order, and attributes as the former local version — only the
// construction goes through el so attribute changes cannot drift.
export function cardFieldset(legendText?: string): HTMLFieldSetElement {
  const set = el('fieldset');
  if (legendText !== undefined) {
    set.append(el('legend', legendText));
  }
  return set;
}

export function actionButton(label: string, disabled: boolean, onClick: () => void): HTMLButtonElement {
  const button = el('button', label);
  button.type = 'button';
  button.disabled = disabled;
  button.addEventListener('click', onClick);
  return button;
}

// Mirrors save-time normalization then the fill-time hiragana conversion, so the
// hint under the kana inputs can never drift from what gets stored and injected.
export function kanaHiraganaHint(rawKana: string): string {
  const stored = normalizeProfile({ ...EMPTY_PROFILE, lastNameKana: rawKana }).lastNameKana;
  return stored ? formatKana(stored, 'hiragana') : '';
}
