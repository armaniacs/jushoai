// content.ts sync() の除外フィルタと同じ1行述語
// (.filter((f) => !dismissed.has(f.container))) を、detectForms 形の入力で
// 検証する。content script 本体は取り込みにくい層なので、述語の意味だけを
// ここで固定する。
import { describe, it, expect } from 'vitest';
import { createDismissMemory } from '../../src/content/dismiss-memory';

interface FakeForm {
  container: Element;
}

function visibleForms(forms: FakeForm[], dismissed: { has: (c: Element) => boolean }): FakeForm[] {
  // content.ts sync() と同じ1行述語
  return forms.filter((f) => !dismissed.has(f.container));
}

const form = (): FakeForm => ({ container: document.createElement('div') });

describe('dismiss filter (content.ts sync predicate)', () => {
  it('隠した分だけ外し残りは残す', () => {
    const dismissed = createDismissMemory();
    const a = form();
    const b = form();
    const c = form();
    dismissed.add(b.container);
    expect(visibleForms([a, b, c], dismissed)).toEqual([a, c]);
  });

  it('何も隠さなければ全件残る', () => {
    const dismissed = createDismissMemory();
    const forms = [form(), form()];
    expect(visibleForms(forms, dismissed)).toEqual(forms);
  });

  it('元に戻すと再表示対象に戻る', () => {
    const dismissed = createDismissMemory();
    const a = form();
    const b = form();
    dismissed.add(a.container);
    expect(visibleForms([a, b], dismissed)).toEqual([b]);
    dismissed.remove(a.container);
    expect(visibleForms([a, b], dismissed)).toEqual([a, b]);
  });

  it('破棄後の再走査では除外が残らず全件戻る', () => {
    const dismissed = createDismissMemory();
    const a = form();
    const b = form();
    dismissed.add(a.container);
    dismissed.add(b.container);
    expect(visibleForms([a, b], dismissed)).toEqual([]);
    dismissed.clear();
    expect(visibleForms([a, b], dismissed)).toEqual([a, b]);
  });
});
