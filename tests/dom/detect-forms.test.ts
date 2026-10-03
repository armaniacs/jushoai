import { describe, it, expect, beforeEach } from 'vitest';
import { detectForms } from '../../src/dom/detect-forms';

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
