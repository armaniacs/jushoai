import { stripExample } from './formatters';
import { matchAs } from './dispatch-kit';
import type { MatcherEntry } from './dispatch-kit';

export const BIRTH_CTX = /bday|birth|dob|生年月日|誕生/;
// Anchored exact match for the birth phrase itself (standalone
// label). お joins the allowed prefixes (prevents お誕生日 from misfalling to
// birthDay). English fields accept Birthday / Date of Birth.
const BIRTH_PHRASE = /^(ご|御|お)?(誕生日|生年月日|誕生年月日)$/;
const BIRTH_PHRASE_EN = /^(birthday|date of birth)$/;
export const isBirthPhrase = (view: string): boolean =>
  BIRTH_PHRASE.test(view) || BIRTH_PHRASE_EN.test(view);
const ERA_CTX = /元号|年号|和暦|era|wareki|gengou/;
// 元号/年号/和暦 alone are era evidence, but romaji hits (generation, operate) and
// place names sharing era kanji (昭和区) need the ERA_CTX gate above.
const ERA_NAME = /元号|年号|和暦|令和|平成|昭和|大正|明治/;

// Entry order inside this array is match priority; the DISPATCH composition in
// classify-rules.ts owns the overall order.
export const birthEntries: readonly MatcherEntry[] = [
  // birth: 年/月/日 share 年月日, so month and day come first: 生年月日の月 must
  // not read as a year, and 生年月日の日 must not read as a month.
  {
    name: 'birth-month',
    match: (ctx) =>
      (BIRTH_CTX.test(ctx.ownText) || BIRTH_CTX.test(ctx.legendText)) &&
      /bday-month|(^|[^a-z])month|(^|[^\d年月日])月/.test(ctx.ownText)
        ? matchAs('birthMonth', 0.7)
        : null,
  },
  {
    name: 'birth-day',
    match: (ctx) =>
      (BIRTH_CTX.test(ctx.ownText) || BIRTH_CTX.test(ctx.legendText)) &&
      /bday-day|(^|[^a-z])day|(^|[^\d年月日])日/.test(ctx.ownText)
        ? matchAs('birthDay', 0.7)
        : null,
  },
  {
    name: 'birth-year',
    match: (ctx) =>
      (BIRTH_CTX.test(ctx.ownText) || BIRTH_CTX.test(ctx.legendText)) &&
      /bday-year|(^|[^a-z])year|(^|[^\d年月日])年/.test(ctx.ownText)
        ? matchAs('birthYear', 0.7)
        : null,
  },
  // era: context-gated kanji or an exact era word alone.
  {
    name: 'birth-era',
    match: (ctx) => {
      const eraByContext = ERA_CTX.test(`${ctx.ownText} ${ctx.legendText}`) && ERA_NAME.test(ctx.ownText);
      const eraExact =
        /^(令和|平成|昭和|大正|明治)$/.test(ctx.m.label.trim()) ||
        /^(令和|平成|昭和|大正|明治)$/.test(stripExample(ctx.m.placeholder).trim());
      return eraByContext || eraExact ? matchAs('birthEra', 0.7) : null;
    },
  },
];
