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
  if (parts.length === 0) {
    // for無し label.control-label の兄弟見出し(Bootstrap form-horizontal の行構造)。
    // 既存経路が1つでも届いていれば開かない: 欄自身の宣言が兄弟見出しに勝る。
    const heading = siblingHeadingOf(el);
    if (heading) {
      parts.push(clip(textWithoutControls(heading)));
      parts.push(...staticMarkersBefore(el).map(clip));
    }
  }
  return clean(parts.join(' '));
}

// 兄弟見出しの登昇は欄自身とその親(入力欄ラッパー)まで: 実ページでは
// label.control-label がラッパーの前兄弟に置かれる。それより上は別行になり得るため辿らない。
const SIBLING_LABEL_CLIMB = 2;
// 1レベルあたりの前兄弟の遡り上限。実ページの行は欄ごとに desktop/mobile の
// マーカーdivと兄弟欄のラッパーを挟み、2欄目の氏名欄では見出し label が6兄弟
// 先にある(markers2 + 兄弟ラッパー1 + そのmarkers2 + label)。行内のどこにも
// 見出しが無ければ上限で打ち切る: 行をまたぐ登昇はしない。
const SIBLING_WALK_LIMIT = 8;
const isHeadingLabel = (el: Element | null | undefined): el is HTMLLabelElement =>
  el !== null && el !== undefined && el.tagName === 'LABEL' && el.classList.contains('control-label');

function siblingHeadingOf(el: Control): Element | null {
  let node: Element | null = el;
  for (let n = 0; node && n < SIBLING_LABEL_CLIMB; n++) {
    let sib = node.previousElementSibling;
    for (let w = 0; sib && w < SIBLING_WALK_LIMIT; w++, sib = sib.previousElementSibling) {
      if (isHeadingLabel(sib)) return sib;
    }
    node = node.parentElement;
  }
  return null;
}

// 行内の div.form-control-static は欄名マーカー(実ページの姓：/名：/セイ：/メイ：)と
// 区切り(電話行の「－」)の両方に使われる。文字を1つも持たないテキストは区切りなので
// 欄名に加えない: 加えると欄ごとのラベルが行内で揃わなくなり、兄弟欄の分割
// (同ラベルtel群など)の前提が崩れる。
const MARKER_CLASS = 'form-control-static';
const MARKER_HAS_NAME = /[\p{L}\p{N}]/u;
// マーカー遡及は2兄弟まで(実ページは欄の直前に desktop/mobile の2個)。前の欄で
// 打ち止め: それより手前のマーカーは別欄のもの(姓：は前欄、名：は次欄に置かれる)。
const MAX_MARKER_SIBLINGS = 2;

// 欄の直前のマーカーdivを連続で拾う。欄自身の前兄弟を使い切ったときだけ親
// (入力欄ラッパー)の前兄弟へ続く: 実ページは入力欄ごとのラッパーの直前に
// マーカー群(desktop/mobile 重複)が置かれる。マーカー以外の要素で打ち止める
// のは欄ごとの帰属を保つため: 兄弟ラッパーの手前で止まり、前の欄のマーカーを
// 取らない。同一文言の重複(desktop/mobile)は1回だけ足す。
function staticMarkersBefore(el: Control): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  let node: Element | null = el;
  for (let level = 0; node && level < SIBLING_LABEL_CLIMB; level++) {
    let sib = node.previousElementSibling;
    for (let n = 0; sib && n < MAX_MARKER_SIBLINGS; n++, sib = sib.previousElementSibling) {
      if (!sib.classList.contains(MARKER_CLASS)) return out;
      const text = clean(sib.textContent);
      if (text && MARKER_HAS_NAME.test(text) && !seen.has(text)) {
        seen.add(text);
        out.unshift(text);
      }
    }
    // このレベルをマーカー以外に当たらず使い切ったときだけ親へ(欄がラッパーの最初の子)。
    if (sib) break;
    node = node.parentElement;
  }
  return out;
}

function nearbyOf(el: Control): string {
  const th = el.closest('tr')?.querySelector('th');
  if (th) return textWithoutControls(th).slice(0, 60);
  let sib = el.closest('dd')?.previousElementSibling ?? null;
  while (sib && sib.tagName !== 'DT') sib = sib.previousElementSibling;
  if (sib) return textWithoutControls(sib).slice(0, 60);
  const fieldset = el.closest('fieldset');
  const legend = fieldset?.querySelector('legend');
  if (legend) return textWithoutControls(legend).slice(0, 60);
  // legend 無しの fieldset は前兄弟の見出し(h1-h6)で区画を読む(実ページ: h3+fieldset)。
  // fieldset が無い欄には開かない: 見出しと欄の区画関係が保証されないため。
  const HEADING = /^H[1-6]$/;
  let head = fieldset?.previousElementSibling ?? null;
  for (let n = 0; head && n < SIBLING_LABEL_CLIMB; n++, head = head.previousElementSibling) {
    if (HEADING.test(head.tagName)) return textWithoutControls(head).slice(0, 60);
  }
  return '';
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
