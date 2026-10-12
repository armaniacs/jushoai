import { classifyField, isConfident } from '../core/classify-rules';
import { containerOf, isHidden, scanFields, type ScannedField } from './scan-fields';

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
  // One rect read per element for the whole pick: the box test and the sort key
  // read the same box, and the sort comparator re-reads its keys O(n log n)
  // times, so the reads are memoized per call. No write happens inside the
  // pick, so a cached rect cannot go stale within it.
  const rects = new Map<Element, DOMRect>();
  const rectOf = (el: Element): DOMRect => {
    let r = rects.get(el);
    if (!r) {
      r = el.getBoundingClientRect();
      rects.set(el, r);
    }
    return r;
  };
  // Zero-area boxes (not yet laid out, or honeypot-collapsed) sort last: they
  // must never win the anchor over a real visible field. Under jsdom every
  // rect is zero, so the sort stays stable and document order wins there.
  const visualTop = (el: Element): number => {
    const r = rectOf(el);
    if (!Number.isFinite(r.top)) return 0;
    if (r.width === 0 && r.height === 0) return Number.POSITIVE_INFINITY;
    return r.top;
  };
  // Boxless candidates (hidden or not yet laid out) cannot anchor the button:
  // an anchor without a box leaves reposition() nothing to write, stranding
  // the host in normal flow at the bottom of the page. Under jsdom nothing
  // has a box, so fall back to the full list and keep document order there.
  const hasBox = (f: ScannedField): boolean => {
    const r = rectOf(f.el);
    return r.width > 0 || r.height > 0;
  };
  const boxed = fields.filter((f) => !isHidden(f.el) && hasBox(f));
  const pool = boxed.length > 0 ? boxed : fields.filter((f) => !isHidden(f.el));
  const candidates = pool.length > 0 ? pool : fields;
  // Document order and visual order can disagree (checkbox groups first in the
  // DOM on some builders); read from the top so a narrow leading box does not
  // pin the button to the left edge.
  const byVisual = [...candidates].sort((a, b) => visualTop(a.el) - visualTop(b.el));
  return byVisual.find(isTextInput)
    ?? byVisual.find((f) => isConfident(classifyField(f.meta)))
    ?? candidates[0]!;
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
