import { describe, it, expect } from 'vitest';
import { classifyAll } from '../../src/core/analyze';
import { applyEnglishPage, isEnglishPageText } from '../../src/core/page-language';
import { makeMeta } from '../helpers';

const EN = 'Register for the conference. Please enter your personal information below. '.repeat(3);

describe('isEnglishPageText', () => {
  it('accepts an English page with a small Japanese language switcher', () => {
    expect(isEnglishPageText(`${EN} 日本語`)).toBe(true);
  });
  it('rejects a Japanese page', () => {
    expect(isEnglishPageText('お名前を入力してください。住所と電話番号も必要です。 Name'.repeat(5))).toBe(false);
  });
  it('rejects pages with too little text to judge', () => {
    expect(isEnglishPageText('Name')).toBe(false);
  });
});

describe('classifyAll on an English page', () => {
  const metas = [
    makeMeta({ id: 'a', label: 'First name (this will print on your badge)' }),
    makeMeta({ id: 'b', label: 'Last name (this will print on your badge)' }),
    makeMeta({ id: 'c', label: 'Work city' }),
    makeMeta({ id: 'd', label: 'Work postal code' }),
  ];
  it('maps names and address to latin categories', async () => {
    const items = await classifyAll(metas, null, { englishPage: true });
    expect(items.map((i) => i.cls.category)).toEqual(
      ['firstNameRomaji', 'lastNameRomaji', 'address3', 'postalCode'],
    );
  });
  it('keeps Japanese categories otherwise', async () => {
    const items = await classifyAll(metas, null);
    expect(items.map((i) => i.cls.category).slice(0, 2)).toEqual(['firstName', 'lastName']);
  });
  it('leaves other categories alone', () => {
    const items = [{ meta: makeMeta(), cls: { category: 'email' as const, confidence: 0.9, source: 'rule' as const } }];
    expect(applyEnglishPage(items)).toEqual(items);
  });
});
