import { ACCEPT_THRESHOLD, classifyField } from '../core/classify-rules';
import { scanFields, type ScannedField } from './scan-fields';

export interface FormCandidate {
  container: Element;
  fields: ScannedField[];
}

const MIN_CONTROLS = 3;
const MIN_CLASSIFIED = 2;

export function detectForms(doc: Document): FormCandidate[] {
  const groups = new Map<Element, ScannedField[]>();
  for (const field of scanFields(doc)) {
    const container = field.el.closest('form') ?? doc.body;
    const list = groups.get(container) ?? [];
    list.push(field);
    groups.set(container, list);
  }

  const forms: FormCandidate[] = [];
  for (const [container, fields] of groups) {
    const classified = fields.filter((f) => {
      const c = classifyField(f.meta);
      return c !== null && c.confidence >= ACCEPT_THRESHOLD;
    });
    if (fields.length >= MIN_CONTROLS && classified.length >= MIN_CLASSIFIED) {
      forms.push({ container, fields });
    }
  }
  return forms;
}
