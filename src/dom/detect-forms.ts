import { classifyField, isConfident } from '../core/classify-rules';
import { containerOf, scanFields, type ScannedField } from './scan-fields';

export interface FormCandidate {
  container: Element;
  fields: ScannedField[];
  anchor: ScannedField;
}

const MIN_CONTROLS = 3;
const MIN_CLASSIFIED = 2;
const TEXT_INPUT_TYPES = new Set(['text', 'email', 'tel', 'search']);

// The button sits beside the first text box of the form, because a form full of inputs reads from the top.
// Only the rule-classified count qualifies a form, so labels the rules cannot read (left for the LLM) must
// not push the button down to the first recognised field. Leading selects and radios are skipped: a
// quantity picker or a plan chooser is not where a person starts filling in.
function pickAnchor(fields: ScannedField[]): ScannedField {
  const isTextInput = (f: ScannedField) => f.el instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(f.el.type);
  return fields.find((f) => isConfident(classifyField(f.meta)) || isTextInput(f)) ?? fields[0]!;
}

export function scanContainer(container: Element, doc: Document): ScannedField[] {
  return scanFields(container).filter((f) => containerOf(f.el, doc) === container);
}

export function detectForms(doc: Document): FormCandidate[] {
  const groups = new Map<Element, ScannedField[]>();
  for (const field of scanFields(doc)) {
    const container = containerOf(field.el, doc);
    const list = groups.get(container) ?? [];
    list.push(field);
    groups.set(container, list);
  }

  const forms: FormCandidate[] = [];
  for (const [container, fields] of groups) {
    const classified = fields.filter((f) => isConfident(classifyField(f.meta)));
    if (fields.length >= MIN_CONTROLS && classified.length >= MIN_CLASSIFIED) {
      forms.push({ container, fields, anchor: pickAnchor(fields) });
    }
  }
  return forms;
}
