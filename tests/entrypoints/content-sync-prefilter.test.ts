import { describe, it, expect, vi } from 'vitest';

// Same stub-then-import seam the other content tests use: the module only
// registers the content script factory, main() never runs.
vi.stubGlobal('defineContentScript', (opts: unknown) => opts);
const { shouldSyncForMutations, isRelevantMutation } = await import('../../src/entrypoints/content');

const el = (tag: string, attrs: Record<string, string> = {}): Element => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};

const childList = (added: Node[] = [], removed: Node[] = []) => ({
  type: 'childList',
  target: document.body,
  addedNodes: added,
  removedNodes: removed,
});

const attr = (target: Element, attributeName: string | null) => ({
  type: 'attributes',
  attributeName,
  target,
});

describe('shouldSyncForMutations (PBI-21 prefilter)', () => {
  it('syncs on an empty batch (initial start)', () => {
    expect(shouldSyncForMutations([])).toBe(true);
  });

  it('skips mutations that touch no control or label source', () => {
    const ad = el('div');
    ad.innerHTML = '<p>promo <span>text</span></p>';
    expect(shouldSyncForMutations([childList([ad])])).toBe(false);
    expect(shouldSyncForMutations([childList([], [el('span')])])).toBe(false);
    expect(shouldSyncForMutations([childList([document.createTextNode('x')])])).toBe(true);
  });

  it('syncs when a control is added, removed, or nested', () => {
    expect(shouldSyncForMutations([childList([el('input')])])).toBe(true);
    expect(shouldSyncForMutations([childList([], [el('select')])])).toBe(true);
    const wrap = el('div');
    wrap.innerHTML = '<section><input name="a"></section>';
    expect(shouldSyncForMutations([childList([wrap])])).toBe(true);
  });

  it('syncs when a label source is added (labels feed classification)', () => {
    expect(shouldSyncForMutations([childList([el('label')])])).toBe(true);
    const wrap = el('div');
    wrap.innerHTML = '<fieldset><legend>住所</legend></fieldset>';
    expect(shouldSyncForMutations([childList([wrap])])).toBe(true);
  });

  it('syncs on classification-relevant attribute changes, skips the rest', () => {
    expect(isRelevantMutation(attr(el('input'), 'name'))).toBe(true);
    expect(isRelevantMutation(attr(el('input'), 'type'))).toBe(true);
    expect(isRelevantMutation(attr(el('input'), 'id'))).toBe(true);
    expect(isRelevantMutation(attr(el('input'), 'class'))).toBe(false);
    expect(isRelevantMutation(attr(el('input'), 'style'))).toBe(false);
    expect(isRelevantMutation(attr(el('div'), 'class'))).toBe(false);
    expect(isRelevantMutation(attr(el('div'), 'data-x'))).toBe(false);
  });

  it('treats text edits and unknown records as relevant (sync dedupes them)', () => {
    expect(isRelevantMutation({ type: 'characterData', target: document.createTextNode('t') })).toBe(true);
    expect(isRelevantMutation({ type: 'weird-future-kind', target: document.body })).toBe(true);
  });

  it('needs only one relevant record in a mixed batch', () => {
    expect(shouldSyncForMutations([
      childList([el('div')]),
      { type: 'attributes', attributeName: 'class', target: el('div') },
      childList([el('input')]),
    ])).toBe(true);
    expect(shouldSyncForMutations([
      childList([el('div')]),
      { type: 'attributes', attributeName: 'class', target: el('div') },
    ])).toBe(false);
  });
});
