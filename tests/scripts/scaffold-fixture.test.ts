import { describe, it, expect } from 'vitest';
import {
  extractControls, renderFixture, renderTestStub,
} from '../../scripts/scaffold-fixture.mjs';
import raijo from '../../samples/formmailer-raijo-age.html?raw';

const html = (body: string) => `<form>${body}</form>`;

describe('scaffold-fixture', () => {
  it('keeps in-scope controls with label and legend context', () => {
    const { controls, skipped } = extractControls(html(`
      <fieldset><legend>郵便番号</legend>
        <label for="zip1">郵便番号の上3桁</label>
        <input id="zip1" name="zip1" type="text" maxlength="3" placeholder="000">
        <select id="pref" name="pref"><option>東京</option></select>
      </fieldset>`));
    expect(controls).toHaveLength(2);
    expect(controls[0]).toMatchObject({ name: 'zip1', label: '郵便番号の上3桁', legend: '郵便番号', maxLength: '3' });
    expect(controls[1]).toMatchObject({ name: 'pref', type: 'select' });
    expect(skipped).toEqual([]);
  });

  it('marks radio, hidden, and submit as skipped with fixed handling', () => {
    const { controls, skipped } = extractControls(html(`
      <input id="g1" name="g" type="radio" value="0">
      <input name="g_empty" type="hidden" value="">
      <input type="submit" value="送る">
      <label for="t">電話番号の市外局番</label>
      <input id="t" name="t" type="tel" value="090">`));
    expect(controls.map((c) => c.name)).toEqual(['t']);
    expect(skipped.map((s) => `${s.key}:${s.type}`)).toEqual(
      ['g:radio', 'g_empty:hidden', '(no name/id):submit'],
    );
    expect(skipped[0]!.reason).toMatch(/grouped as one field/);
    for (const s of skipped.slice(1)) expect(s.reason).toMatch(/skip fixed|exclude/);
  });

  it('renders a fixture and planFor stub that mention skipped elements', () => {
    const extracted = extractControls(html('<input id="a" name="a" type="text"><input name="h" type="hidden">'));
    const fixture = renderFixture('https://example.com/form', extracted);
    expect(fixture).toContain('name="a"');
    expect(fixture).toContain('skip: h (hidden)');
    const stub = renderTestStub('example.html', extracted);
    expect(stub).toContain(`planFor('example.html')`);
    expect(stub).toContain(`'a': '<expected>'`);
  });

  it('dogfoods the raijo form: split parts kept, age radios skipped', () => {
    const extracted = extractControls(raijo);
    const names = extracted.controls.map((c) => c.name);
    for (const n of ['field_4609048_zip1', 'field_4609048_zip2', 'field_4609049_1', 'field_4609049_2', 'field_4609049_3']) {
      expect(names).toContain(n);
    }
    expect(extracted.skipped.some((s) => s.type === 'radio')).toBe(true);
  });
});
