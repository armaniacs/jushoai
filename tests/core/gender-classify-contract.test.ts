import { describe, it, expect } from 'vitest';
import { classifyField } from '../../src/core/classify-rules';
import { makeMeta } from '../helpers';

// Ethics & Bias (Low): gender radio groups are classified as `gender` from the
// field label only — option values are never normalized into a binary choice.
// This regression test pins that contract: whatever the option set (including
// non-binary choices), classification stays at the category level and the
// field's own option values pass through untouched.

const radio = (label: string, options: { value: string; text: string }[]) =>
  makeMeta({ tag: 'radio', type: 'radio', name: 'sex', label, options });

describe('gender classification stays label-level (Ethics Low)', () => {
  it.each([
    [[{ value: '0', text: '男性' }, { value: '1', text: '女性' }]],
    [[{ value: 'm', text: '男' }, { value: 'f', text: '女' }, { value: 'x', text: 'その他' }]],
    [[{ value: '1', text: '男性' }, { value: '2', text: '女性' }, { value: '3', text: 'その他' }, { value: '9', text: '回答しない' }]],
  ])('classifies 性別 group as gender for options %j', (options) => {
    expect(classifyField(radio('性別', options))?.category).toBe('gender');
  });

  it('exposes no normalized gender value on the classification', () => {
    const cls = classifyField(radio('性別', [{ value: '0', text: '男性' }, { value: '1', text: '女性' }]));
    expect(cls?.category).toBe('gender');
    expect(cls ? Object.keys(cls).sort() : []).not.toContain('value');
    expect(JSON.stringify(cls)).not.toContain('男性');
  });
});
