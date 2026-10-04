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
  it('anchors on the first classified field, not a leading unclassified control', () => {
    document.body.innerHTML = `
<form id="f">
<select name="qty"><option>1</option></select>
<input name="last_name"><input name="first_name"><input name="email" type="email">
</form>`;
    const [form] = detectForms(document);
    expect(form!.fields[0]!.el.getAttribute('name')).toBe('qty');
    expect(form!.anchor.el.getAttribute('name')).toBe('last_name');
  });
});
