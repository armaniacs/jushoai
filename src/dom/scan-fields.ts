import type { FieldMeta } from '../core/types';

export type Control = HTMLInputElement | HTMLSelectElement;

export interface ScannedField {
  meta: FieldMeta;
  el: Control;
}

const TEXT_TYPES = new Set(['text', 'email', 'tel', 'search']);
const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

// Option text of a select wrapped by its label would otherwise flood the label.
// Walks text nodes instead of cloning the subtree to keep the per-field cost off the
// allocation-heavy cloneNode + querySelectorAll + remove path.
function textWithoutControls(node: Element): string {
  const walker = node.ownerDocument.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
    acceptNode(textNode) {
      const parent = textNode.parentElement;
      if (!parent || parent.closest('select, input, textarea, script, style')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let text = '';
  while (walker.nextNode()) text += walker.currentNode.nodeValue ?? '';
  return clean(text);
}

function labelOf(el: Control): string {
  const parts = Array.from(el.labels ?? []).map(textWithoutControls);
  const aria = el.getAttribute('aria-label');
  if (aria) parts.push(aria);
  for (const id of (el.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean)) {
    const node = el.ownerDocument.getElementById(id);
    if (node) parts.push(textWithoutControls(node));
  }
  return clean(parts.join(' '));
}

function nearbyOf(el: Control): string {
  const th = el.closest('tr')?.querySelector('th');
  if (th) return textWithoutControls(th).slice(0, 60);
  let sib = el.closest('dd')?.previousElementSibling ?? null;
  while (sib && sib.tagName !== 'DT') sib = sib.previousElementSibling;
  if (sib) return textWithoutControls(sib).slice(0, 60);
  const legend = el.closest('fieldset')?.querySelector('legend');
  return legend ? textWithoutControls(legend).slice(0, 60) : '';
}

// jsdom has no checkVisibility and reports empty rects for everything, so the rect test is
// gated on the same capability check to stay inert there.
function isHidden(el: Control): boolean {
  if (el.closest('[hidden]')) return true;
  if (typeof el.checkVisibility !== 'function') return false;
  if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return true;
  const r = el.getBoundingClientRect();
  return r.width === 0 && r.height === 0;
}

export const containerOf = (el: Control, doc: Document): Element =>
  el.form ?? el.closest('form') ?? doc.body;

export function scanFields(root: ParentNode): ScannedField[] {
  const out: ScannedField[] = [];
  let n = 0;
  for (const el of Array.from(root.querySelectorAll<Control>('input, select'))) {
    const isSelect = el.tagName === 'SELECT';
    if (!isSelect && !TEXT_TYPES.has((el as HTMLInputElement).type)) continue;
    if (isHidden(el)) continue;
    const input = isSelect ? null : (el as HTMLInputElement);
    const select = isSelect ? (el as HTMLSelectElement) : null;
    out.push({
      el,
      meta: {
        id: `jai-${n++}`,
        tag: isSelect ? 'select' : 'input',
        type: isSelect ? 'select' : input!.type,
        name: el.name,
        htmlId: el.id,
        autocomplete: el.getAttribute('autocomplete') ?? '',
        label: labelOf(el),
        placeholder: input?.placeholder ?? '',
        nearby: nearbyOf(el),
        maxLength: input && input.maxLength > 0 ? input.maxLength : null,
        pattern: input?.pattern ?? '',
        options: select
          ? Array.from(select.options).map((o) => ({ value: o.value, text: clean(o.text) }))
          : [],
        readOnly: input?.readOnly ?? false,
        disabled: el.disabled,
        value: el.value,
      },
    });
  }
  return out;
}
