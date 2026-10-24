import { describe, it, expect } from 'vitest';
import { kanaHiraganaHint, cardFieldset, actionButton, buildSelect, notice } from '../../src/entrypoints/options/dom';

describe('kanaHiraganaHint', () => {
  it('converts stored katakana to hiragana like the fill path', () => {
    expect(kanaHiraganaHint('ヤマダ')).toBe('やまだ');
    expect(kanaHiraganaHint('タロウ')).toBe('たろう');
  });

  it('accepts hiragana and half-width input the same way saving does', () => {
    expect(kanaHiraganaHint('やまだ')).toBe('やまだ');
    expect(kanaHiraganaHint('ﾀﾛｳ')).toBe('たろう');
  });

  it('stays empty for blank input', () => {
    expect(kanaHiraganaHint('')).toBe('');
    expect(kanaHiraganaHint('   ')).toBe('');
  });
});

describe('cardFieldset', () => {
  it('builds an empty fieldset without legend', () => {
    const set = cardFieldset();
    expect(set.tagName).toBe('FIELDSET');
    expect(set.querySelector('legend')).toBeNull();
  });

  it('prepends the legend with the given text', () => {
    const set = cardFieldset('プロファイル 1');
    expect(set.tagName).toBe('FIELDSET');
    const legend = set.querySelector('legend');
    expect(legend?.textContent).toBe('プロファイル 1');
    expect(set.firstElementChild).toBe(legend);
  });
});

describe('actionButton', () => {
  it('builds a button with type, label, and disabled state', () => {
    const button = actionButton('この住所を削除', true, () => {});
    expect(button.tagName).toBe('BUTTON');
    expect(button.type).toBe('button');
    expect(button.textContent).toBe('この住所を削除');
    expect(button.disabled).toBe(true);
  });

  it('wires the click handler', () => {
    let clicked = 0;
    const button = actionButton('保存', false, () => { clicked += 1; });
    expect(button.disabled).toBe(false);
    button.click();
    expect(clicked).toBe(1);
  });
});

describe('buildSelect', () => {
  it('builds options in order with value, text, and selected flags', () => {
    const select = buildSelect(() => {}, [
      { value: '', text: '選択してください', selected: true },
      { value: '東京都', text: '東京都', selected: false },
    ]);
    expect(select.tagName).toBe('SELECT');
    const options = [...select.querySelectorAll('option')];
    expect(options.map((o) => [o.value, o.textContent])).toEqual([
      ['', '選択してください'],
      ['東京都', '東京都'],
    ]);
    expect(options).toHaveLength(2);
    expect(options[0]!.selected).toBe(true);
    expect(options[1]!.selected).toBe(false);
    expect(select.value).toBe('');
  });

  it('notifies the selected value on change', () => {
    const seen: string[] = [];
    const select = buildSelect((v) => { seen.push(v); }, [
      { value: '', text: 'a', selected: true },
      { value: 'x', text: 'x', selected: false },
    ]);
    select.value = 'x';
    select.dispatchEvent(new Event('change'));
    expect(seen).toEqual(['x']);
  });
});

// PBI-151: the saved/errors notice vocabulary for all four options sections.
// The truncate rule lives in the module default, so no section can grow its own.
describe('notice', () => {
  it('renders saved as a single p.saved line', () => {
    const p = notice('saved', ['保存しました']);
    expect(p.tagName).toBe('P');
    expect(p.className).toBe('saved');
    expect(p.textContent).toBe('保存しました');
  });

  it('falls back to an empty saved line without input', () => {
    const p = notice('saved', []);
    expect(p.tagName).toBe('P');
    expect(p.className).toBe('saved');
    expect(p.textContent).toBe('');
  });

  it('renders errors as ul.errors with one li per line', () => {
    const ul = notice('errors', ['P1: 姓を入力してください', '住所: 郵便番号が短い']);
    expect(ul.tagName).toBe('UL');
    expect(ul.className).toBe('errors');
    expect([...ul.querySelectorAll('li')].map((li) => li.textContent)).toEqual([
      'P1: 姓を入力してください',
      '住所: 郵便番号が短い',
    ]);
  });

  it('collapses errors past five lines into a head plus a rest count', () => {
    const lines = Array.from({ length: 8 }, (_, i) => `エラー${i + 1}`);
    const ul = notice('errors', lines);
    const items = [...ul.querySelectorAll('li')].map((li) => li.textContent);
    expect(items).toHaveLength(6);
    expect(items[4]).toBe('エラー5');
    expect(items[5]).toBe('他 3 件のエラーがあります');
  });

  it('accepts a smaller max for the shown head', () => {
    const ul = notice('errors', ['1', '2', '3'], { max: 2 });
    const items = [...ul.querySelectorAll('li')].map((li) => li.textContent);
    expect(items).toEqual(['1', '2', '他 1 件のエラーがあります']);
  });
});
