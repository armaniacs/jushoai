import { describe, it, expect } from 'vitest';
import { classifyAll } from '../../src/core/analyze';
import type { FieldClassifier } from '../../src/core/classifier';
import type { Category } from '../../src/core/types';
import { buildPlan } from '../../src/core/planner';
import type { Address, FieldMeta, Profile } from '../../src/core/types';
import { detectForms } from '../../src/dom/detect-forms';
import { scanFields } from '../../src/dom/scan-fields';
import furigana from '../../samples/furigana-fieldset-form.html?raw';
import katakana from '../../samples/katakana-fieldset-form.html?raw';
import profileFields from '../../samples/profile-fields-form.html?raw';
import single from '../../samples/single-field-form.html?raw';
import split from '../../samples/split-form.html?raw';
import demoRegistration from '../../samples/demo-registration.html?raw';
import demoCheckout from '../../samples/demo-shop-checkout.html?raw';
import demoRequest from '../../samples/demo-request-info.html?raw';
import demoAmbiguous from '../../samples/demo-ai-ambiguous.html?raw';
import table from '../../samples/table-form.html?raw';
import roman from '../../samples/roman-name-form.html?raw';
import gender from '../../samples/gender-select-form.html?raw';
import decade from '../../samples/age-decade-select-form.html?raw';
import abroad from '../../samples/overseas-address-form.html?raw';
import joshibi from '../../samples/overseas-webform-joshibi.html?raw';
import anketo from '../../samples/formmailer-anketo-gender.html?raw';
import raijo from '../../samples/formmailer-raijo-age.html?raw';
import reinvent from '../../samples/reinvent-registration-contact.html?raw';
import fmFreeConsult from '../../samples/12fc22bc297429.html?raw';
import fmCompanyBriefing from '../../samples/2dd1c663300469.html?raw';
import registration from '../../samples/registration.html?raw';
import forum from '../../samples/forum.html?raw';
import richellAnketoRating from '../../samples/richell-anketo-rating.html?raw';
import kosodateContact from '../../samples/kosodate-contact.html?raw';
import libraryTheaterApply from '../../samples/library-theater-apply.html?raw';
import nishimachiInquiry from '../../samples/nishimachi-inquiry.html?raw';
import gisIntlAdmission from '../../samples/gis-intl-admission.html?raw';
import { isEnglishPageText } from '../../src/core/page-language';

const SAMPLES: Record<string, string> = {
  'table-form.html': table,
  'split-form.html': split,
  'demo-registration.html': demoRegistration,
  'demo-shop-checkout.html': demoCheckout,
  'demo-request-info.html': demoRequest,
  'demo-ai-ambiguous.html': demoAmbiguous,
  'single-field-form.html': single,
  'roman-name-form.html': roman,
  'gender-select-form.html': gender,
  'age-decade-select-form.html': decade,
  'overseas-address-form.html': abroad,
  'overseas-webform-joshibi.html': joshibi,
  'formmailer-anketo-gender.html': anketo,
  'formmailer-raijo-age.html': raijo,
  'reinvent-registration-contact.html': reinvent,
  'furigana-fieldset-form.html': furigana,
  'katakana-fieldset-form.html': katakana,
  'profile-fields-form.html': profileFields,
  '12fc22bc297429.html': fmFreeConsult,
  '2dd1c663300469.html': fmCompanyBriefing,
  'registration.html': registration,
  'forum.html': forum,
  'richell-anketo-rating.html': richellAnketoRating,
  'kosodate-contact.html': kosodateContact,
  'library-theater-apply.html': libraryTheaterApply,
  'nishimachi-inquiry.html': nishimachiInquiry,
  'gis-intl-admission.html': gisIntlAdmission,
};

const profile: Profile = {
  id: 'p1', label: 'メイン',
  lastName: '山田', firstName: '太郎', lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
  lastNameRomaji: 'Yamada', firstNameRomaji: 'Taro',
  gender: '女性',
  birthday: '1990-05-07', school: '都立日比谷高校', department: '普通科',
  companyName: '株式会社サンプル', companyDepartment: '開発部',
  companyNameKana: 'カブシキガイシャサンプル',
  email: 'yamada@example.com', tel: '09012345678',
};
const address: Address = {
  id: 'a', label: 'home', profileId: '', zip: '1000001', prefecture: '東京都', city: '千代田区',
  street: '千代田1-1', building: '千代田ビル101',
  country: 'United States', address1: '#123 Central Apartment',
  address2: '25-15 M.G.Peterson Ave', address3: 'Long Island City',
  address4: 'NEW YORK', postalCode: '11375',
};

async function planFor(
  file: string, today?: Date, classifier: FieldClassifier | null = null,
): Promise<Record<string, string>> {
  const html = SAMPLES[file]!;
  document.body.innerHTML = new DOMParser().parseFromString(html, 'text/html').body.innerHTML;
  const fields = scanFields(document.body);
  const items = await classifyAll(fields.map((f) => f.meta), classifier, {
    englishPage: isEnglishPageText(document.body.textContent ?? ''),
  });
  const plan = buildPlan(items, { profile, address, today });
  const keyOf = new Map(fields.map((f) => [f.meta.id, f.meta.name || f.meta.htmlId]));
  const out: Record<string, string> = {};
  for (const p of plan) if (p.status === 'ok') out[keyOf.get(p.fieldId)!] = p.value;
  return out;
}

describe('sample forms end to end', () => {
  it('table-form', async () => {
    expect(await planFor('table-form.html')).toEqual({
      n1: '山田', n2: '太郎', k1: 'ヤマダ', k2: 'タロウ', z1: '100', z2: '0001',
      p: '13', a1: '千代田区千代田1-1', a2: '千代田ビル101',
      t1: '090', t2: '1234', t3: '5678', m: 'yamada@example.com',
    });
  });

  it('split-form', async () => {
    expect(await planFor('split-form.html')).toEqual({
      lastName: '山田', firstName: '太郎', lk: 'ヤマダ', fk: 'ﾀﾛｳ', zip: '100-0001',
      pref: '13', address1: '千代田区千代田1-1', address2: '千代田ビル101',
      tel: '09012345678', em: 'yamada@example.com',
    });
  });

  it.each(['demo-registration.html', 'demo-shop-checkout.html', 'demo-request-info.html'])(
    '%s fills the ten address fields',
    async (file) => {
      expect(await planFor(file)).toEqual({
        lastName: '山田', firstName: '太郎', lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
        zip: '100-0001', pref: '13', address1: '千代田区千代田1-1', address2: '千代田ビル101',
        tel: '090-1234-5678', email: 'yamada@example.com',
      });
    },
  );

  // Only the tel and email fields (by input type) are recognised by the rules; the button needs two such
  // fields to appear. The other eight labels carry no vocabulary the rules know, so only an LLM can place them.
  it('demo-ai-ambiguous is mostly left alone by the rules and filled once the LLM classifies it', async () => {
    expect(await planFor('demo-ai-ambiguous.html')).toEqual({ tel: '090-1234-5678', f10: 'yamada@example.com' });
    const byHtmlId: Record<string, Category> = {
      f1: 'lastName', f2: 'firstName', f3: 'lastNameKana', f4: 'firstNameKana', f5: 'zip',
      f6: 'prefecture', f7: 'addressNoPref', f8: 'building', f9: 'tel', f10: 'email',
    };
    const classify = async (metas: FieldMeta[]): Promise<Map<string, Category>> =>
      new Map<string, Category>(
        metas.map((m): [string, Category] => [m.id, byHtmlId[m.htmlId] ?? 'unknown']),
      );
    const llm: FieldClassifier = {
      classify,
      // PBI-42: fakes speak the unified seam too.
      attempt: async (metas) => ({ map: await classify(metas), failureReason: null }),
    };
    expect(await planFor('demo-ai-ambiguous.html', undefined, llm)).toEqual({
      f1: '山田', f2: '太郎', f3: 'ヤマダ', f4: 'タロウ', f5: '100-0001', f6: '13',
      f7: '千代田区千代田1-1', f8: '千代田ビル101', tel: '090-1234-5678', f10: 'yamada@example.com',
    });
  });

  it('single-field-form', async () => {
    expect(await planFor('single-field-form.html')).toEqual({
      fullname: '山田　太郎', furigana: 'ヤマダ　タロウ',
      addr: '東京都千代田区千代田1-1 千代田ビル101', phone: '09012345678',
    });
  });

  it('furigana-fieldset-form', async () => {
    expect(await planFor('furigana-fieldset-form.html')).toEqual({
      field_1_sei: '山田', field_1_mei: '太郎',
      field_2_sei: 'やまだ', field_2_mei: 'たろう',
    });
  });

  it('katakana-fieldset-form', async () => {
    expect(await planFor('katakana-fieldset-form.html')).toEqual({
      field_1_sei: '山田', field_1_mei: '太郎',
      field_2_sei: 'ヤマダ', field_2_mei: 'タロウ',
    });
  });

  it('profile-fields-form', async () => {
    expect(await planFor('profile-fields-form.html')).toEqual({
      by_y: '1990', by_m: '05', by_d: '07', sch: '都立日比谷高校', dep: '普通科',
    });
  });

  it('roman-name-form fills the half-width name in romaji and keeps the Japanese name', async () => {
    expect(await planFor('roman-name-form.html')).toEqual({
      name_last: 'Taro Yamada', fullname: '山田　太郎', mail: 'yamada@example.com',
    });
  });

  it('gender-select-form fills the gender select', async () => {
    expect(await planFor('gender-select-form.html')).toEqual({
      sex: '女性', fullname: '山田　太郎',
    });
  });

  it('age-decade-select-form fills the decade derived from the birthday', async () => {
    expect(await planFor('age-decade-select-form.html', new Date(2026, 9, 5))).toEqual({
      age: '1', fullname: '山田　太郎',
    });
  });

  it('overseas-address-form fills the half-width address in English', async () => {
    expect(await planFor('overseas-address-form.html')).toEqual({
      name_last: 'Taro Yamada', country: 'United States',
      address_1: '#123 Central Apartment', address_2: '25-15 M.G.Peterson Ave',
      address_3: 'Long Island City', address_4: 'NEW YORK',
      postal_code: '11375', fullname: '山田　太郎',
    });
  });

  it('formmailer-anketo-gender resolves the prefecture and the gender radios', async () => {
    expect(await planFor('formmailer-anketo-gender.html')).toEqual({
      field_2760246: '12',
      field_2760244: '1',
    });
  });

  it('formmailer-raijo-age fills names, address and the age radios', async () => {
    expect(await planFor('formmailer-raijo-age.html')).toEqual({
      field_4609044_sei: '山田',
      field_4609044_mei: '太郎',
      field_4609085_sei: 'ヤマダ',
      field_4609085_mei: 'タロウ',
      field_4609045: 'yamada@example.com',
      field_4609045_mcon: 'yamada@example.com',
      field_4609048_zip1: '100',
      field_4609048_zip2: '0001',
      field_4609048_city: '千代田区',
      field_4609048_block: '千代田1-1',
      field_4609048_building: '千代田ビル101',
      field_4609048_pref: '東京都',
      field_4609049_1: '090',
      field_4609049_2: '1234',
      field_4609049_3: '5678',
      field_4609097: '1',
    });
  });

  it('overseas-webform-joshibi fills the real overseas form end to end', async () => {
    expect(await planFor('overseas-webform-joshibi.html')).toEqual({
      'name_kana_last': 'ヤマダ タロウ',
      'mail_confirm[mail_1]': 'yamada@example.com',
      'mail_confirm[mail_2]': 'yamada@example.com',
      'name_last': 'Taro Yamada',
      'country': 'United States',
      'address_1': '#123 Central Apartment',
      'address_2': '25-15 M.G.Peterson Ave',
      'address_3': 'Long Island City',
      'address_4': 'NEW YORK',
      'postal_code': '11375',
      'phone': '090-1234-5678',
    });
  });

  it('reinvent-registration-contact fills latin values and leaves the optional ID names empty', async () => {
    expect(await planFor('reinvent-registration-contact.html')).toEqual({
      'formAttendee-firstname': 'Taro',
      'formAttendee-lastname': 'Yamada',
      'formAttendee-city': 'Long Island City',
      'formAttendee-zip': '11375',
    });
  });

  it('anchors the table-form button on the last name field', () => {
    document.body.innerHTML = new DOMParser().parseFromString(table, 'text/html').body.innerHTML;
    const forms = detectForms(document);
    expect(forms).toHaveLength(1);
    expect(forms[0]!.anchor.el.getAttribute('name')).toBe('n1');
  });
  it.each([
    ['12fc22bc297429.html', '12fc22bc297429'],
    ['2dd1c663300469.html', '2dd1c663300469'],
  ])('anchors the %s button on a text input, not a leading checkbox', (file) => {
    document.body.innerHTML = new DOMParser().parseFromString(SAMPLES[file]!, 'text/html').body.innerHTML;
    const forms = detectForms(document);
    expect(forms.length).toBeGreaterThan(0);
    for (const form of forms) {
      const el = form.anchor.el;
      expect(el instanceof HTMLInputElement && ['text', 'email', 'tel', 'search'].includes(el.type)).toBe(true);
    }
  });
  it('12fc22bc297429.html fills the in-scope fields', async () => {
    expect(await planFor('12fc22bc297429.html')).toEqual({
      'field_4647587': '株式会社サンプル',
      'field_4647576_sei': '山田',
      'field_4647576_mei': '太郎',
      'field_4647577': 'yamada@example.com',
      'field_4647588_sei': 'やまだ',
      'field_4647588_mei': 'たろう',
      'field_4647591_1': '090',
      'field_4647591_2': '1234',
      'field_4647591_3': '5678',
    });
//   field_4647587 (法人・団体名): PBI-119 で company に分類され profile の会社名が入る
//   field_4647590 (都道府県 select): only a `--` option, correctly warn-no-option
//   field_4647582[0] (hidden): empty-submit shim or server state, never a fill target (exclude)
//   field_4647582[0] (checkbox): out of scope (skip fixed)
//   field_4647582[1] (hidden): empty-submit shim or server state, never a fill target (exclude)
//   field_4647582[1] (checkbox): out of scope (skip fixed)
//   field_4647582[2] (hidden): empty-submit shim or server state, never a fill target (exclude)
//   field_4647582[2] (checkbox): out of scope (skip fixed)
//   field_4647582[3] (hidden): empty-submit shim or server state, never a fill target (exclude)
//   field_4647582[3] (checkbox): out of scope (skip fixed)
//   field_4647582[4] (hidden): empty-submit shim or server state, never a fill target (exclude)
//   field_4647582[4] (checkbox): out of scope (skip fixed)
//   field_4647584 (hidden): empty-submit shim or server state, never a fill target (exclude)
//   field_4647584 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   field_4647584 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   field_4647584 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   field_4647584 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   field_4647584 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   field_4647586 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)
//   field_4647594 (hidden): empty-submit shim or server state, never a fill target (exclude)
//   field_4647594 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   field_4647594 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   field_4647579 (hidden): empty-submit shim or server state, never a fill target (exclude)
//   field_4647579 (checkbox): out of scope (skip fixed)
//   submit (submit): action element, never a fill target (exclude)
//   validated (hidden): empty-submit shim or server state, never a fill target (exclude)
//   (no name/id) (button): unaddressable (exclude)
//   (no name/id) (button): unaddressable (exclude)
  });
  it('2dd1c663300469.html fills the in-scope fields', async () => {
    expect(await planFor('2dd1c663300469.html')).toEqual({
      'field_4695578_sei': '山田',
      'field_4695578_mei': '太郎',
      'field_4695585_sei': 'ヤマダ',
      'field_4695585_mei': 'タロウ',
      'field_4695586_y': '1990',
      'field_4695587': '都立日比谷高校',
      'field_4695590': '普通科',
      'field_4695579': 'yamada@example.com',
      'field_4695579_mcon': 'yamada@example.com',
    });
//   field_4695586_m/_d (month/day selects): only a `--` option, correctly warn-no-option
//   field_4696239 (その他の経緯): no profile value, correctly unfilled
//   field_4695584 (hidden): empty-submit shim or server state, never a fill target (exclude)
//   field_4695584 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   field_4695584 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   field_4695584 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   field_4696236[0] (hidden): empty-submit shim or server state, never a fill target (exclude)
//   field_4696236[0] (checkbox): out of scope (skip fixed)
//   field_4696236[1] (hidden): empty-submit shim or server state, never a fill target (exclude)
//   field_4696236[1] (checkbox): out of scope (skip fixed)
//   field_4696236[2] (hidden): empty-submit shim or server state, never a fill target (exclude)
//   field_4696236[2] (checkbox): out of scope (skip fixed)
//   field_4696236[3] (hidden): empty-submit shim or server state, never a fill target (exclude)
//   field_4696236[3] (checkbox): out of scope (skip fixed)
//   field_4696236[4] (hidden): empty-submit shim or server state, never a fill target (exclude)
//   field_4696236[4] (checkbox): out of scope (skip fixed)
//   field_4696236[5] (hidden): empty-submit shim or server state, never a fill target (exclude)
//   field_4696236[5] (checkbox): out of scope (skip fixed)
//   field_4696240 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)
//   field_4696241 (hidden): empty-submit shim or server state, never a fill target (exclude)
//   field_4696241 (checkbox): out of scope (skip fixed)
//   submit (submit): action element, never a fill target (exclude)
//   key (hidden): empty-submit shim or server state, never a fill target (exclude)
//   code (hidden): empty-submit shim or server state, never a fill target (exclude)
//   validated (hidden): empty-submit shim or server state, never a fill target (exclude)
//   (no name/id) (button): unaddressable (exclude)
//   (no name/id) (button): unaddressable (exclude)
  });
  it('registration.html fills the in-scope fields', async () => {
    expect(await planFor('registration.html')).toEqual({
      'company': '株式会社サンプル',
      // PBI-160: 会社名（フリガナ）欄は companyNameKana に分類され会社カナが入る
      'company_kana': 'カブシキガイシャサンプル',
      'postalCode': '1000001',
      'address': '東京都千代田区千代田1-1',
      'building': '千代田ビル101',
      'deptTxt': '開発部',
      'work_email': 'yamada@example.com',
      'nameSei': '山田',
      'nameMei': '太郎',
      // yomiSei/yomiMei は従来どおり fullNameKana の結合値（セイ/メイ別ラベルのため
      // same-label 分割が適用されない既存動作。PBI-160 の差分では不変）。
      'yomiSei': 'ヤマダタロウ',
      'yomiMei': 'ヤマダタロウ',
      'phone:a': '090-1234-5678',
      'email': 'yamada@example.com',
      'email:cf': 'yamada@example.com',
    });
//   legalEnt (select): only a `--` option, correctly warn-no-option
//   state (select): only a `--` option, correctly warn-no-option
//   jobTxt (役職): no profile value, correctly unfilled
//   q6_other (その他業種): no profile value, correctly unfilled
//   q7_other (その他職種): no profile value, correctly unfilled
//   corporation_position (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   corporation_position (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   password (password): not scanned (scan covers text/email/tel/search + select; exclude)
//   confirmation_password (password): not scanned (scan covers text/email/tel/search + select; exclude)
//   member_category (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   q1 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   q2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   q3 (checkbox): out of scope (skip fixed)
//   q4 (checkbox): out of scope (skip fixed)
//   q5 (checkbox): out of scope (skip fixed)
//   q6 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   q7 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   ok (checkbox): out of scope (skip fixed)
//   exhibitor_share_consent (checkbox): out of scope (skip fixed)
//   marketing_consent (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   (no name/id) (button): unaddressable (exclude)
//   privacy_consent (checkbox): out of scope (skip fixed)
//   division_none (checkbox): out of scope (skip fixed)
//   position_none (checkbox): out of scope (skip fixed)
//   password (password): not scanned (scan covers text/email/tel/search + select; exclude)
//   confirmation_password (password): not scanned (scan covers text/email/tel/search + select; exclude)
//   survey_purpose (checkbox): out of scope (skip fixed)
//   survey_challenges (checkbox): out of scope (skip fixed)
//   (no name/id) (button): unaddressable (exclude)
//   (no name/id) (button): unaddressable (exclude)
//   (no name/id) (button): unaddressable (exclude)
//   (no name/id) (button): unaddressable (exclude)
//   (no name/id) (button): unaddressable (exclude)
//   cms_directory_id (hidden): empty-submit shim or server state, never a fill target (exclude)
  });
  it('forum.html fills the in-scope fields', async () => {
    expect(await planFor('forum.html')).toEqual({
      // 参加者名・フリガナ欄は placeholder 空 → 結合区切りは detectNameSeparator の
      // 既定半角スペース（overseas-webform-joshibi の name_kana_last pin と同じ。
      // single-field-form の全角スペース pin は placeholder 由来なので別物）。
      'wpforms[fields][55]': '山田 太郎',
      'wpforms[fields][56]': 'ヤマダ タロウ',
      'wpforms[fields][67]': '株式会社サンプル',
      // 都道府県 select: 実ページどおり option value は名称そのもの
      'wpforms[fields][63]': '東京都',
      'wpforms[fields][94]': '090-1234-5678',
      'wpforms[fields][5][primary]': 'yamada@example.com',
      'wpforms[fields][5][secondary]': 'yamada@example.com',
    });
//   (no name/id) (button): unaddressable (exclude)
//   (no name/id) (button): unaddressable (exclude)
//   wpforms[fields][100] (hidden): empty-submit shim or server state, never a fill target (exclude)
//   wpforms[fields][97] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   wpforms[fields][97] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   wpforms[fields][97] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   wpforms[fields][97] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   wpforms[fields][97] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   wpforms[fields][97] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   wpforms[fields][97] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   wpforms[fields][97] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   wpforms[fields][97] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   wpforms[fields][97] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   wpforms[fields][80] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   wpforms[fields][80] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   wpforms[fields][80] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)
//   wpforms[fields][8][] (checkbox): out of scope (skip fixed)
//   wpforms[fields][93][] (checkbox): out of scope (skip fixed)
//   (no name/id) (button): unaddressable (exclude)
//   (no name/id) (button): unaddressable (exclude)
//   wpforms[recaptcha] (hidden): empty-submit shim or server state, never a fill target (exclude)
//   wpforms[id] (hidden): empty-submit shim or server state, never a fill target (exclude)
//   page_title (hidden): empty-submit shim or server state, never a fill target (exclude)
//   page_url (hidden): empty-submit shim or server state, never a fill target (exclude)
//   url_referer (hidden): empty-submit shim or server state, never a fill target (exclude)
//   page_id (hidden): empty-submit shim or server state, never a fill target (exclude)
//   wpforms[post_id] (hidden): empty-submit shim or server state, never a fill target (exclude)
//   wpforms[submit] (button): action element, never a fill target (exclude)
  });
  it('richell-anketo-rating.html fills the in-scope fields', async () => {
    expect(await planFor('richell-anketo-rating.html')).toEqual({});
//   field_2953454 (text): the only in-scope control; 受付番号 stays unclassified (LLM fallback)
//   field_2953447-2953450, 2953452-2953453 (radio): matrix rating groups, bundled per name; stay unclassified (radio policy)
//   field_2953451, 2953455 (textarea): out of scan
//   key/code/validated (hidden): empty-submit shim or server state, never a fill target (exclude)
//   submit (submit): action element, never a fill target (exclude)
  });
  it('kosodate-contact.html fills the in-scope fields', async () => {
    expect(await planFor('kosodate-contact.html')).toEqual({
      'wpforms[fields][6]': '山田 太郎',
      'wpforms[fields][41]': '090-1234-5678',
      'wpforms[fields][14][primary]': 'yamada@example.com',
      'wpforms[fields][14][secondary]': 'yamada@example.com',
    });
//   s (text): site-search field, stays unclassified (same as forum.html)
//   wpforms[fields][29] (select): お問い合わせ種別, stays unclassified (LLM fallback)
//   wpforms[fields][12] (text): 所属（会社・団体・学校等） is a compound office label, stays unclassified (office pre-pass)
//   wpforms[fields][42] (radio): 電話番号種別 自宅/携帯/所属先, bundled per name; stays unclassified (radio policy)
//   wpforms[fields][8] (textarea), wpforms[fields][13] (number): out of scan
//   wpforms[fields][40][] (checkbox): out of scope (skip fixed)
//   wpforms[recaptcha]/[id]/page_*/url_referer/[post_id] (hidden): empty-submit shim or server state, never a fill target (exclude)
//   submit (submit): action element, never a fill target (exclude)
  });
  it('library-theater-apply.html fills the in-scope fields', async () => {
    expect(await planFor('library-theater-apply.html')).toEqual({
      field_5755075_sei: '山田', field_5755075_mei: '太郎',
      field_5755308_sei: '山田', field_5755308_mei: '太郎',
      field_5755078_zip1: '100', field_5755078_zip2: '0001',
      field_5755078_pref: '東京都', field_5755078_city: '千代田区',
      field_5755078_block: '千代田1-1', field_5755078_building: '千代田ビル101',
      field_5755079_1: '090', field_5755079_2: '1234', field_5755079_3: '5678',
      field_5755076: 'yamada@example.com', field_5755076_mcon: 'yamada@example.com',
    });
//   field_6426354 (radio): 会員/非会員, bundled per name; stays unclassified (radio policy)
//   validated (hidden): empty-submit shim or server state, never a fill target (exclude)
//   submit (submit): action element, never a fill target (exclude)
  });
  it('nishimachi-inquiry.html fills the in-scope fields', async () => {
    expect(await planFor('nishimachi-inquiry.html')).toEqual({
      field_914: 'Taro', field_915: 'Taro Yamada', field_916: 'Yamada',
      field_972: 'United States',
      field_922: '都立日比谷高校', field_976: '都立日比谷高校',
      field_963: '1990-05-07',
      field_935: 'Taro', field_936: 'Yamada',
      field_937: 'yamada@example.com', field_938: '090-1234-5678',
      field_944: 'NEW YORK', field_953: 'United States',
    });
//   field_914-916/935-936 (text): romaji names via autocomplete tokens on an English page
//   field_915 (text): Nickname reads as a full romaji name (no nickname vocabulary yet)
//   field_976 (text): School Website reads as school (no URL vocabulary yet)
//   field_944 (text): Prefecture / State reads as the overseas state field (address4)
//   field_962/946 (radio): Gender groups classify as gender but Male/Female options do not resolve against 女性 (warn-no-option)
//   field_963 (text): Date of Birth has pattern MM/DD/YYYY but the plan pins the ISO date; intentional pin exposing the pattern-violation injection bug (PBI-210 rationale)
//   field_923/927/956 (select): grade/year/enrollment selects, stay unclassified (LLM fallback)
//   field_926 (select): School Year reads as school; a school select has no matching option (warn-no-option)
//   field_928 (checkbox): out of scope (skip fixed); field_955 (textarea): out of scan
//   submission_uuid (hidden): empty-submit shim or server state, never a fill target (exclude)
//   submit (submit): action element, never a fill target (exclude)
  });
  it('gis-intl-admission.html fills the in-scope fields', async () => {
    expect(await planFor('gis-intl-admission.html')).toEqual({
      'parent-name': '山田 太郎',
      'your-email': 'yamada@example.com',
      'student-name': '山田 太郎',
      'current-country': 'United States',
      'current-school': '都立日比谷高校',
      'name-institution': '山田 太郎',
    });
//   parent-name/student-name (text): 氏名 labels resolve to fullName
//   name-institution (text): name-institution reads as a person name (no institution vocabulary yet)
//   student-nationality/current-grade (text): stay unclassified (LLM fallback)
//   student-birth (date): out of scan in this fixture family
//   desired-enrollment/desired-grade/dormitory-accommodation/japanese-proficiency/jlpt-level/studied-japanese (radio): bundled per name; stay unclassified (radio policy)
//   your-message (textarea): out of scan; acceptance-sample (checkbox): out of scope (skip fixed)
//   _wpcf7* (hidden): empty-submit shim or server state, never a fill target (exclude)
//   submit (submit): action element, never a fill target (exclude)
  });
});
