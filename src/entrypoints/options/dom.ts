// Shared DOM helpers for the options page sections (#app and #ai-app live in one document),
// so input behavior edits cannot drift between the profile and AI sections.
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
