import { matchAs } from './dispatch-kit';
import type { DispatchCtx, MatcherEntry } from './dispatch-kit';
import { norm } from './literals';
import type { FieldMeta } from './types';

// Applied only to the person-name step so e.g. a user_email field stays an email.
export const NAME_EXCLUDE =
  /件名|題名|商品|品名|店名|国名|ユーザー|ログイン|届け先名|担当者|名義|user|subject|title|holder|card|if different|different (from|than)|(^|[^a-z])cc([^a-z]|$)/;
export const LAST = /last.?name|family.?name|surname|(^|[^a-z])l_?name|(^|[^a-z])sei([^a-z]|$)|姓|苗字|名字|セイ|せい/;
export const FIRST = /first.?name|given.?name|(^|[^a-z])f_?name|(^|[^a-z])mei([^a-z]|$)|(^|[\s（(［[「【])名($|[\s）)］\]」】*＊:：（(])|メイ|めい/;
// PBI-203: 参加者名 is the WPForms participant-name label and does not fit the
// 氏名/名前 vocabulary. (02)参加者名フリガナ also contains the word, but kana
// attribution is resolveKana's job, so it stays fullNameKana (PBI-203
// regression in tests/core/classify-rules.test.ts).
export const FULL_NAME = /氏名|お名前|名前|参加者名|full.?name|your.?name|(^|[^a-z])name([^a-z]|$)/;
export const ROMAJI_CTX = /半角英数|半角|英字|英文|英語|ローマ字|romaji|alphabet|english/i;
export const KANA_NOTE = /カナ|フリガナ|かな|kana/i;

// PBI-229: the email gate for fields whose name contains mail (beside the
// PBI-225 company gate). 'email' contains 'mail' as a substring, so one
// includes('mail') catches both (item_mail_1, mail2, mailconf, email_confirm,
// companyEmail, etc.). Only text/tel/email inputs with empty label and nearby
// are targeted: checkboxes (newsletter subscriptions etc.), search, select and
// radio never open. placeholder stays out of the empty condition, same as
// PBI-225. Returning before EXCLUDE (company|corp|...) settles bare names like
// mail_company as email too.
// Misread guards: form-container names (nichirin's mailform2[0], the tel
// 3-split mailform6[0..2], the address-split mailform7 etc. — 'mail' there
// means the container, not a field) and the send-target mailto (ena; filling
// the user's address could misdeliver) are not picked. The decision folds
// separators, so mail-form and mail_form are excluded the same way.
// PBI-233: postal-derived names (mailingaddress / mailbox) read 'mail' as the
// postal sense (a mailing address, a mail drop), not the user's address
// column, so their stems join the flat denylist. The PBI-229 rescue targets
// stay alive because none of them embeds these stems (mailaddress / mailconf
// / item_mail_1 / email_confirm …).
export const isEmailByName = (m: FieldMeta): boolean =>
  m.tag === 'input' && (m.type === 'text' || m.type === 'tel' || m.type === 'email')
  && m.label.trim() === '' && m.nearby.trim() === ''
  && isBareMailName(m.name);
export const isBareMailName = (name: string): boolean => {
  const key = norm(name.trim());
  if (!key.includes('mail')) return false;
  const flat = key.replace(/[\W_]+/g, '');
  return (
    !flat.includes('mailform')
    && !flat.includes('mailto')
    && !flat.includes('mailing')
    && !flat.includes('mailbox')
  );
};

// A half-width note plus a name signal means the field wants a latin name,
// even when name/id alone would read as a plain Japanese name (name_last).
// NAME_EXCLUDE (user/card/company/section words) never qualifies as a person name.
export const romajiBase = (ctx: DispatchCtx): boolean =>
  ROMAJI_CTX.test(ctx.ownText) && !NAME_EXCLUDE.test(ctx.ownText);

// Entry order inside this array is match priority; the DISPATCH composition in
// classify-rules.ts owns the overall order.
export const nameEntries: readonly MatcherEntry[] = [
  {
    name: 'romaji-full-name',
    match: (ctx) =>
      romajiBase(ctx) && FULL_NAME.test(ctx.ownText) ? matchAs('fullNameRomaji', 0.7) : null,
  },
  {
    name: 'romaji-last-name',
    match: (ctx) =>
      romajiBase(ctx) && LAST.test(ctx.ownText) && !FIRST.test(ctx.ownText)
        ? matchAs('lastNameRomaji', 0.7)
        : null,
  },
  {
    name: 'romaji-first-name',
    match: (ctx) =>
      romajiBase(ctx) && FIRST.test(ctx.ownText) && !LAST.test(ctx.ownText)
        ? matchAs('firstNameRomaji', 0.7)
        : null,
  },
  {
    name: 'romaji-either-name',
    match: (ctx) =>
      romajiBase(ctx) && (LAST.test(ctx.ownText) || FIRST.test(ctx.ownText))
        ? matchAs('fullNameRomaji', 0.7)
        : null,
  },
];
