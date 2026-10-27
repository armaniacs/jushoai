import type { FieldMeta } from '../core/types';
import { MAX_TEXT_LENGTH } from '../scan-limits';
import { isHidden } from './geometry';

export type Control = HTMLInputElement | HTMLSelectElement;

export interface ScannedField {
  meta: FieldMeta;
  el: Control;
  radioInputs?: HTMLInputElement[];
}

// PBI-118: type=date joins the scan. The HTML standard pins its value to
// YYYY-MM-DD, so the birthday category's single ISO injection covers it.
// Exported for the avoid-rect collector (PBI-161): the fields the button must
// not cover are exactly the scanned fields — one set, one contract.
export const TEXT_TYPES = new Set(['text', 'email', 'tel', 'search', 'date']);
const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
// One clean+clip pass for every page-controlled string (name, htmlId, label,
// legend, option text): the matchers in core/classify-rules join these into regex inputs,
// so an unbounded el.name/el.id reopens the quadratic amplification that label clipping
// closed through another path.
const clip = (s: string | null | undefined) => clean(s).slice(0, MAX_TEXT_LENGTH);
// The placeholder keeps its raw whitespace (length-clipped only): detectNameSeparator
// reads U+3000 vs half-width space from it as the user's intended name separator.
const clipRaw = (s: string | null | undefined) => (s ?? '').slice(0, MAX_TEXT_LENGTH);

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
  // Each label source is clipped before joining, not the joined string: a decisive
  // keyword after the 200th character of the join would otherwise lose its signal.
  const parts = Array.from(el.labels ?? []).map((l) => clip(textWithoutControls(l)));
  const aria = el.getAttribute('aria-label');
  if (aria) parts.push(clip(aria));
  for (const id of (el.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean)) {
    const node = el.ownerDocument.getElementById(id);
    if (node) parts.push(clip(textWithoutControls(node)));
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

export const containerOf = (el: Control, doc: Document): Element =>
  el.form ?? el.closest('form') ?? doc.body;

// One logical field per radio name: the same-name hidden shim (an empty-submit
// workaround) is never an option, and option text comes from the wrapping label.
function scanRadioGroups(root: ParentNode, nextId: () => string): ScannedField[] {
  const boxes = Array.from(root.querySelectorAll('fieldset, div[role="group"], form'));
  const seen = new Map<string, HTMLInputElement[]>();
  const singles: HTMLInputElement[] = [];
  for (const el of Array.from(root.querySelectorAll('input'))) {
    if (el.type !== 'radio' || isHidden(el)) continue;
    if (!el.name) {
      singles.push(el);
      continue;
    }
    const box = el.closest('fieldset') ?? el.closest('div[role="group"]') ?? el.form;
    const key = `${el.name} ${box ? boxes.indexOf(box) : -1}`;
    const list = seen.get(key) ?? [];
    list.push(el);
    seen.set(key, list);
  }
  const groups: HTMLInputElement[][] = [...seen.values(), ...singles.map((el) => [el])];
  return groups.map((inputs) => {
    const first = inputs[0]!;
    const box = first.closest('fieldset') ?? first.closest('div[role="group"]');
    const legend = box?.querySelector(':scope > legend') ?? box?.querySelector('legend');
    const label = (legend ? clip(textWithoutControls(legend)) : '') ||
      clip(box?.getAttribute('data-fieldset-label')) ||
      labelOf(first);
    const checked = inputs.find((r) => r.checked);
    return {
      el: first,
      radioInputs: inputs,
      meta: {
        id: nextId(),
        tag: 'radio',
        type: 'radio',
        name: clip(first.name),
        htmlId: clip(first.id),
        autocomplete: '',
        label,
        placeholder: '',
        nearby: '',
        maxLength: null,
        pattern: '',
        options: inputs.map((r) => ({
          value: r.value,
          text: clip(labelOf(r)),
          ...(r.disabled ? { disabled: true as const } : {}),
        })),
        readOnly: false,
        disabled: inputs.every((r) => r.disabled),
        // fill 判定専用の既存値スナップショット。LLM 送信時は encodeFieldMeta（messages.ts）で
        // wire 型に落とすため混入しない。fill 適用時の真値は fill-plan が live DOM から読む。
        value: checked?.value ?? '',
      },
    };
  });
}

export function scanFields(root: ParentNode): ScannedField[] {
  const out: ScannedField[] = [];
  let n = 0;
  const nextId = () => `jai-${n++}`;
  for (const el of Array.from(root.querySelectorAll<Control>('input, select'))) {
    const isSelect = el.tagName === 'SELECT';
    if (!isSelect && !TEXT_TYPES.has((el as HTMLInputElement).type)) continue;
    if (isHidden(el)) continue;
    const input = isSelect ? null : (el as HTMLInputElement);
    const select = isSelect ? (el as HTMLSelectElement) : null;
    out.push({
      el,
      meta: {
        id: nextId(),
        tag: isSelect ? 'select' : 'input',
        type: isSelect ? 'select' : input!.type,
        name: clip(el.name),
        htmlId: clip(el.id),
        autocomplete: el.getAttribute('autocomplete') ?? '',
        label: labelOf(el),
        placeholder: clipRaw(input?.placeholder),
        nearby: nearbyOf(el),
        maxLength: input && input.maxLength > 0 ? input.maxLength : null,
        pattern: clipRaw(input?.pattern),
        options: select
          ? Array.from(select.options).map((o) => ({ value: o.value, text: clip(o.text) }))
          : [],
        readOnly: input?.readOnly ?? false,
        disabled: el.disabled,
        // fill 判定専用の既存値スナップショット。LLM 送信時は encodeFieldMeta（messages.ts）で
        // wire 型に落とすため混入しない。fill 適用時の真値は fill-plan が live DOM から読む。
        value: el.value,
      },
    });
  }
  out.push(...scanRadioGroups(root, nextId));
  return out;
}
