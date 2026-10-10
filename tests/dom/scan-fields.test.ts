import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { scanFields } from '../../src/dom/scan-fields';
import { classifyField } from '../../src/core/classify-rules';

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

describe('scanFields: label and placeholder cap', () => {
  it('clips a 300-char label to the first 200 characters', () => {
    document.body.innerHTML = `<label for="a">${'あ'.repeat(300)}</label><input id="a">`;
    expect(metas()[0]!.label).toBe('あ'.repeat(200));
  });

  it('keeps a 200-char label unchanged', () => {
    document.body.innerHTML = `<label for="a">${'い'.repeat(200)}</label><input id="a">`;
    expect(metas()[0]!.label).toBe('い'.repeat(200));
  });

  it('clips a 201-char label to 200 characters', () => {
    document.body.innerHTML = `<label for="a">${'う'.repeat(201)}</label><input id="a">`;
    expect(metas()[0]!.label).toBe('う'.repeat(200));
  });

  it('clips a long placeholder to 200 characters', () => {
    document.body.innerHTML = `<input name="a" placeholder="${'例'.repeat(300)}">`;
    expect(metas()[0]!.placeholder).toBe('例'.repeat(200));
  });

  it('clips radio group labels and option text that fall back to labelOf', () => {
    document.body.innerHTML = `<label><input name="g" type="radio" value="0">${'え'.repeat(300)}</label>`;
    const m = metas()[0]!;
    expect(m.label).toBe('え'.repeat(200));
    expect(m.options).toEqual([{ value: '0', text: 'え'.repeat(200) }]);
  });

  it('keeps the existing 60-char nearby cap', () => {
    document.body.innerHTML = `<table><tr><th>${'お'.repeat(300)}</th><td><input name="a"></td></tr></table>`;
    expect(metas()[0]!.nearby).toBe('お'.repeat(60));
  });

  it('normalizes whitespace before clipping', () => {
    const raw = `${'abcdefghij     '.repeat(14)}abcdefghij姓`;
    document.body.innerHTML = `<label for="a">${raw}</label><input id="a">`;
    const label = metas()[0]!.label;
    expect(label.length).toBe(165);
    expect(label.endsWith('姓')).toBe(true);
  });

  it('bounds the label that reaches classification for a 10,000-char page label', () => {
    const trigger = '市区町村・番地'.repeat(28) + '市区町村';
    document.body.innerHTML = `<label for="a">${trigger}${'x'.repeat(9800)}</label><input id="a">`;
    const m = metas()[0]!;
    expect(m.label).toBe(trigger);
    expect(m.label.length).toBe(200);
  });

  it('keeps a keyword in a second label source beyond the first 200 characters', () => {
    document.body.innerHTML =
      `<label for="a">${'あ'.repeat(300)}</label><label for="a">姓</label><input id="a">`;
    const m = metas()[0]!;
    expect(m.label).toBe(`${'あ'.repeat(200)} 姓`);
    expect(classifyField(m)?.category).toBe('lastName');
  });

  it('clips each aria-labelledby source before joining', () => {
    document.body.innerHTML =
      `<p id="l1">${'い'.repeat(300)}</p><p id="l2">電話番号</p><input name="c" aria-labelledby="l1 l2">`;
    expect(metas()[0]!.label).toBe(`${'い'.repeat(200)} 電話番号`);
  });

  it('clips page-controlled name and id to 200 characters', () => {
    document.body.innerHTML = `<input name="${'n'.repeat(500)}" id="${'i'.repeat(500)}">`;
    const m = metas()[0]!;
    expect(m.name).toBe('n'.repeat(200));
    expect(m.htmlId).toBe('i'.repeat(200));
  });

  it('bounds classification input for a 10,000-char name and id', () => {
    document.body.innerHTML = `<input name="${'x'.repeat(10000)}" id="${'x'.repeat(10000)}">`;
    const m = metas()[0]!;
    expect(m.name.length).toBe(200);
    expect(m.htmlId.length).toBe(200);
  });

  it('clips a fieldset legend used as a radio group label', () => {
    document.body.innerHTML =
      `<fieldset><legend>${'れ'.repeat(300)}</legend><input name="g" type="radio" value="0"></fieldset>`;
    expect(metas()[0]!.label).toBe('れ'.repeat(200));
  });

  it('clips select option text to 200 characters', () => {
    document.body.innerHTML = `<select name="s"><option value="1">${'お'.repeat(300)}</option></select>`;
    expect(metas()[0]!.options[0]!.text).toBe('お'.repeat(200));
  });
});

describe('scanFields: layout visibility', () => {
  const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
  const rectOf = (w: number, h: number) =>
    ({ width: w, height: h, top: 0, left: 0, right: w, bottom: h, x: 0, y: 0 }) as DOMRect;

  afterEach(() => {
    delete proto.checkVisibility;
    vi.restoreAllMocks();
  });

  it('asks for opacity and visibility checks', () => {
    proto.checkVisibility = function (o?: { opacityProperty?: boolean; visibilityProperty?: boolean }) {
      return !!o?.opacityProperty && !!o?.visibilityProperty;
    };
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rectOf(10, 10));
    document.body.innerHTML = '<input name="a">';
    expect(metas()).toHaveLength(1);
  });

  it('skips fields with an empty box when layout is available', () => {
    proto.checkVisibility = () => true;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rectOf(0, 0));
    document.body.innerHTML = '<input name="a">';
    expect(metas()).toHaveLength(0);
  });
});

describe('scanFields radio groups', () => {
  const groupHtml = `
    <div role="group" data-fieldset-label="性別">
      <legend>性別</legend>
      <input name="g" type="hidden" value="">
      <label for="g0">男性<input id="g0" name="g" type="radio" value="0"></label>
      <label for="g1">女性<input id="g1" name="g" type="radio" value="1"></label>
    </div>`;
  it('scans one logical field per radio name with legend label and options', () => {
    document.body.innerHTML = groupHtml;
    const fields = scanFields(document.body);
    expect(fields).toHaveLength(1);
    expect(fields[0]!.meta).toMatchObject({
      tag: 'radio', type: 'radio', name: 'g', label: '性別', value: '',
    });
    expect(fields[0]!.meta.options).toEqual([
      { value: '0', text: '男性' }, { value: '1', text: '女性' },
    ]);
    expect(fields[0]!.el.getAttribute('name')).toBe('g');
  });
  it('ignores the same-name hidden shim and reports the checked value', () => {
    document.body.innerHTML = groupHtml.replace('value="1"', 'value="1" checked');
    const fields = scanFields(document.body);
    expect(fields).toHaveLength(1);
    expect(fields[0]!.meta.value).toBe('1');
  });
  it('keeps separate groups for different names apart', () => {
    document.body.innerHTML = `${groupHtml}
      <div role="group"><legend>年齢</legend>
        <label>20代<input name="a" type="radio" value="0"></label>
      </div>`;
    expect(scanFields(document.body).map((f) => f.meta.name)).toEqual(['g', 'a']);
  });
});
