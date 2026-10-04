// Shared DOM helpers for the options page sections (#app and #ai-app live in one document),
// so input behavior edits cannot drift between the profile and AI sections.
import { formatKana } from '../../core/formatters';
import { normalizeProfile } from '../../core/profile';
import { EMPTY_PROFILE } from '../../core/types';

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

// Mirrors save-time normalization then the fill-time hiragana conversion, so the
// hint under the kana inputs can never drift from what gets stored and injected.
export function kanaHiraganaHint(rawKana: string): string {
  const stored = normalizeProfile({ ...EMPTY_PROFILE, lastNameKana: rawKana }).lastNameKana;
  return stored ? formatKana(stored, 'hiragana') : '';
}
