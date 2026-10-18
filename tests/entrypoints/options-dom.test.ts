import { describe, it, expect } from 'vitest';
import { kanaHiraganaHint, cardFieldset, actionButton, buildSelect } from '../../src/entrypoints/options/dom';

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
