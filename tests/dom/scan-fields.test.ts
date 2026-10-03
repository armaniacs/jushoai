import { describe, it, expect, beforeEach } from 'vitest';
import { scanFields } from '../../src/dom/scan-fields';

const metas = () => scanFields(document.body).map((f) => f.meta);

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('scanFields', () => {
  it('reads attributes of text inputs', () => {
    document.body.innerHTML =
      '<input name="zip" id="z" autocomplete="postal-code" placeholder="123-4567" maxlength="8" pattern="[0-9-]+">';
    expect(metas()[0]).toMatchObject({
      tag: 'input', name: 'zip', htmlId: 'z', autocomplete: 'postal-code',
      placeholder: '123-4567', maxLength: 8, pattern: '[0-9-]+', readOnly: false, disabled: false,
    });
  });

  it('uses null for a missing maxlength', () => {
    document.body.innerHTML = '<input name="a">';
    expect(metas()[0]!.maxLength).toBeNull();
  });

  it('skips non-text controls and hidden elements', () => {
    document.body.innerHTML =
      '<input type="checkbox"><input type="hidden" name="h"><div hidden><input name="x"></div><input name="ok">';
    expect(metas().map((m) => m.name)).toEqual(['ok']);
  });

  it('collects label[for], wrapping label and aria-label', () => {
    document.body.innerHTML = `
      <label for="a">姓</label><input id="a">
      <label>メール<input name="b"></label>
      <input name="c" aria-label="電話番号">`;
    expect(metas().map((m) => m.label)).toEqual(['姓', 'メール', '電話番号']);
  });

  it('does not include option text from a label wrapping a select', () => {
    document.body.innerHTML =
      '<label>都道府県<select name="p"><option value="">選択</option><option value="13">東京都</option></select></label>';
    const m = metas()[0]!;
    expect(m.label).toBe('都道府県');
    expect(m).toMatchObject({ tag: 'select', value: '' });
    expect(m.options).toEqual([{ value: '', text: '選択' }, { value: '13', text: '東京都' }]);
  });

  it('collects nearby headings from th, dt and legend', () => {
    document.body.innerHTML = `
      <table><tr><th>お名前</th><td><input name="a"></td></tr></table>
      <dl><dt>電話番号</dt><dd><input name="b"></dd></dl>
      <fieldset><legend>ご住所</legend><input name="c"></fieldset>`;
    expect(metas().map((m) => m.nearby)).toEqual(['お名前', '電話番号', 'ご住所']);
  });

  it('assigns unique ids and returns the element', () => {
    document.body.innerHTML = '<input name="a"><input name="b">';
    const fields = scanFields(document.body);
    expect(new Set(fields.map((f) => f.meta.id)).size).toBe(2);
    expect(fields[0]!.el.getAttribute('name')).toBe('a');
  });
});
