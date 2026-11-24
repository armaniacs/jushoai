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
// 年/月/日の割付は option 文言で決める (並び順は使わない)。実ページの
// bare 3 select (label 空・見出しが生年月日のみ) は欄自身に年月日の語が無く、
// option だけが年/月/日を持つ (年/2014年・月/5月・日/7日)。並び順はフォーム依存で
// 脆く、欄単独で確定しないため不採用。option 側は数字に続く接尾 (5月・2014年) が
// 本来の合図のため own 側の [^\d年月日] 除外は掛けず、素朴な一字判定にする。
// 排他条件 (他の二字を含まない) で結合欄を除外し、単独 birthday (option 空の input
// / type=date) とは混ざらない。BIRTH_CTX の gate は不変のため非誕生の年月日
// select (season_year 等) には波及しない。
const optionText = (ctx: { m: { options: readonly { value: string; text: string }[] } }): string =>
  ctx.m.options.map((o) => `${o.value} ${o.text}`).join(' ');
const hasOnly = (t: string, keep: string, others: string[]): boolean =>
  t.includes(keep) && others.every((c) => !t.includes(c));
export const birthEntries: readonly MatcherEntry[] = [
  // birth: 年/月/日 share 年月日, so month and day come first: 生年月日の月 must
  // not read as a year, and 生年月日の日 must not read as a month.
  {
    name: 'birth-month',
    match: (ctx) =>
      (BIRTH_CTX.test(ctx.ownText) || BIRTH_CTX.test(ctx.legendText)) &&
      (/bday-month|(^|[^a-z])month|(^|[^\d年月日])月/.test(ctx.ownText) ||
        hasOnly(optionText(ctx), '月', ['年', '日']))
        ? matchAs('birthMonth', 0.7)
        : null,
  },
  {
    name: 'birth-day',
    match: (ctx) =>
      (BIRTH_CTX.test(ctx.ownText) || BIRTH_CTX.test(ctx.legendText)) &&
      (/bday-day|(^|[^a-z])day|(^|[^\d年月日])日/.test(ctx.ownText) ||
        hasOnly(optionText(ctx), '日', ['年', '月']))
        ? matchAs('birthDay', 0.7)
        : null,
  },
  {
    name: 'birth-year',
    match: (ctx) =>
      (BIRTH_CTX.test(ctx.ownText) || BIRTH_CTX.test(ctx.legendText)) &&
      (/bday-year|(^|[^a-z])year|(^|[^\d年月日])年/.test(ctx.ownText) ||
        hasOnly(optionText(ctx), '年', ['月', '日']))
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
