import { describe, it, expect, beforeEach } from 'vitest';
import { detectForms, scanContainer } from '../../src/dom/detect-forms';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('detectForms', () => {
  it('detects a form with enough classified fields', () => {
    document.body.innerHTML = `
      <form id="f">
        <input name="last_name"><input name="first_name"><input name="email" type="email">
      </form>`;
    const forms = detectForms(document);
    expect(forms).toHaveLength(1);
    expect(forms[0]!.container.id).toBe('f');
    expect(forms[0]!.fields).toHaveLength(3);
  });

  it('ignores a search box and forms with too few classified fields', () => {
    document.body.innerHTML = `
      <form><input name="q" placeholder="検索"></form>
      <form><input name="memo"><input name="note"><input name="last_name"></form>`;
    expect(detectForms(document)).toHaveLength(0);
  });

  it('treats fields outside any form as one body-level form', () => {
    document.body.innerHTML =
      '<input name="last_name"><input name="first_name"><input name="tel_no" type="tel">';
    const forms = detectForms(document);
    expect(forms).toHaveLength(1);
    expect(forms[0]!.container).toBe(document.body);
  });

  it('detects several forms separately', () => {
    document.body.innerHTML = `
      <form><input name="last_name"><input name="first_name"><input name="email" type="email"></form>
      <form><input name="zip"><input name="prefecture"><input name="address1"></form>`;
    expect(detectForms(document)).toHaveLength(2);
  });
});

describe('scanContainer', () => {
  it('limits a body-level scan to loose fields and excludes separate forms', () => {
    document.body.innerHTML = `
      <input name="last_name"><input name="first_name"><input name="email" type="email">
      <form id="search"><input name="q"><input name="login"><input name="pw" type="text"></form>`;
    const body = detectForms(document).find((f) => f.container === document.body)!;
    const scanned = scanContainer(document.body, document);
    expect(scanned.map((f) => f.meta.name)).toEqual(['last_name', 'first_name', 'email']);
    expect(scanned).toHaveLength(body.fields.length);
  });

  it('uses the form attribute owner as the container', () => {
    document.body.innerHTML = `
      <form id="f"></form><input name="a" form="f"><input name="b">`;
    const f = document.getElementById('f')!;
    expect(scanContainer(f, document)).toHaveLength(0);
    expect(scanContainer(document.body, document).map((x) => x.meta.name)).toEqual(['b']);
  });
});

describe('detectForms anchor', () => {
  it('anchors on the first text input or classified field, not a leading select', () => {
    document.body.innerHTML = `
<form id="f">
<select name="qty"><option>1</option></select>
<input name="last_name"><input name="first_name"><input name="email" type="email">
</form>`;
    const [form] = detectForms(document);
    expect(form!.fields[0]!.el.getAttribute('name')).toBe('qty');
    expect(form!.anchor.el.getAttribute('name')).toBe('last_name');
  });

  it('anchors on a leading text input even when the rules cannot classify it', () => {
    document.body.innerHTML = `
<form id="f">
<input name="q1" placeholder="山田"><input name="q2" placeholder="太郎">
<input name="tel" type="tel"><input name="mail" type="email">
</form>`;
    const [form] = detectForms(document);
    expect(form!.anchor.el.getAttribute('name')).toBe('q1');
  });

  it('prefers a later text input over a leading confident select', () => {
    document.body.innerHTML = `
<form id="f">
<select name="pref"><option>東京都</option></select>
<input name="last_name"><input name="first_name">
</form>`;
    const [form] = detectForms(document);
    expect(form!.anchor.el.getAttribute('name')).toBe('last_name');
  });

  it('skips hidden fields when picking the anchor', () => {
    document.body.innerHTML = `
<form id="f">
<input name="honey" type="text" hidden><input name="last_name"><input name="first_name"><input name="email" type="email">
</form>`;
    const [form] = detectForms(document);
    expect(form!.anchor.el.getAttribute('name')).toBe('last_name');
  });

  it('skips zero-area boxes when picking the anchor', () => {
    document.body.innerHTML = `
<form id="f">
<input name="honey" type="text"><input name="last_name"><input name="first_name"><input name="email" type="email">
</form>`;
    const zero = { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} } as DOMRect;
    const real = { top: 100, left: 50, right: 250, bottom: 124, width: 200, height: 24, x: 50, y: 100, toJSON() {} } as DOMRect;
    for (const el of Array.from(document.querySelectorAll('input'))) {
      el.getBoundingClientRect = () => (el.name === 'honey' ? zero : real);
    }
    const [form] = detectForms(document);
    expect(form!.anchor.el.getAttribute('name')).toBe('last_name');
  });

  it('reads each field\'s box exactly once when picking the anchor under jsdom', () => {
    document.body.innerHTML = `
<form id="f">
<input name="last_name"><input name="first_name"><input name="email" type="email">
<input name="zip"><input name="prefecture"><input name="address1">
<input name="tel" type="tel"><input name="memo"><input name="note">
</form>`;
    const reads = new Map<Element, number>();
    for (const el of Array.from(document.querySelectorAll('input'))) {
      const real = el.getBoundingClientRect.bind(el);
      el.getBoundingClientRect = () => {
        reads.set(el, (reads.get(el) ?? 0) + 1);
        return real();
      };
    }
    const [form] = detectForms(document);
    expect(form!.fields.length).toBeGreaterThanOrEqual(8);
    // The box test and the sort key read the same box: one rect read per field,
    // not one per sort comparison.
    expect(form!.fields.map((f) => reads.get(f.el) ?? 0)).toEqual(form!.fields.map(() => 1));
  });

  it('shares one box read between the hidden check and the sort under real-browser conditions', () => {
    document.body.innerHTML = `
<form id="f">
<input name="honey" type="text"><input name="flat" type="text">
<input name="last_name"><input name="first_name"><input name="email" type="email">
<input name="zip"><input name="prefecture"><input name="address1">
<input name="tel" type="tel"><input name="memo"><input name="note">
</form>`;
    const zero = { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} } as DOMRect;
    const reads = new Map<Element, number>();
    let top = 100;
    for (const el of Array.from(document.querySelectorAll('input'))) {
      // Real-browser stand-in: checkVisibility exists, so isHidden takes the
      // rect-reading path that jsdom never reaches. Visual order matches
      // document order so the anchor must stay the first text input.
      el.checkVisibility = () => el.getAttribute('name') !== 'honey';
      const box = el.getAttribute('name') === 'flat'
        ? zero
        : { top, left: 50, right: 250, bottom: top + 24, width: 200, height: 24, x: 50, y: top, toJSON() {} } as DOMRect;
      top += 30;
      el.getBoundingClientRect = () => {
        reads.set(el, (reads.get(el) ?? 0) + 1);
        return box;
      };
    }
    const [form] = detectForms(document);
    // The honeypot (checkVisibility false) and the unlaid-out box (zero
    // area) stay out of the fields and never win the anchor.
    expect(form!.fields.map((f) => f.meta.name)).not.toContain('honey');
    expect(form!.fields.map((f) => f.meta.name)).not.toContain('flat');
    expect(form!.anchor.el.getAttribute('name')).toBe('last_name');
    // Budget: 1 read from scanFields/isHidden plus 1 memoized read from
    // pickAnchor shared by its hidden check, box test, and visual sort.
    // Without the sharing pickAnchor alone costs 2 (isHidden DOMRect read +
    // rectOf read), i.e. 3 total, so this bound pins the fix.
    expect(Math.max(...Array.from(document.querySelectorAll('input')).map((el) => reads.get(el) ?? 0))).toBeLessThanOrEqual(2);
  });
});
