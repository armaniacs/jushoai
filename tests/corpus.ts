// Single corpus ledger module (PBI-216): one glob collects every sample
// fixture, and one interface carries the per-fixture expectations and
// exclusion reasons. samples.test.ts and corpus.eval.ts both consume this
// module, so a fixture added under samples/ joins the corpus with its html
// alone (PBI-136: no second registry, corpus-wide), and `make addurl` appends
// its template entry at the marker inside LEDGER.
export interface CorpusEntry {
  html: string;
  // Fill expectations copied from the samples.test.ts cases. Optional in the
  // interface: a fixture collected only by the glob (no ledger entry yet) has
  // none, and expectedFor() throws for it instead of returning undefined.
  expected?: Record<string, string>;
  // Per-control exclusion reasons, formerly the `//   field_xxx ...` comment
  // lines inside the samples.test.ts cases.
  excluded?: string[];
}

interface CorpusExtras {
  expected: Record<string, string>;
  excluded?: string[];
}

// demo-registration / demo-shop-checkout / demo-request-info fill the same ten
// address fields, so the three entries share one expectation.
const TEN_ADDRESS_EXPECTED = {
  lastName: '山田', firstName: '太郎', lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
  zip: '100-0001', pref: '13', address1: '千代田区千代田1-1', address2: '千代田ビル101',
  tel: '090-1234-5678', email: 'yamada@example.com',
};

// epson-csr-form / epson-ir-form fill the same two citycode fields: coded
// c_q names carry no classification signal without labels, so only the
// citycode names read as city (the rest is LLM-fallback territory).
const EPSON_EXPECTED = {
  c_q14_citycode: '千代田区', c_q15_citycode: '千代田区',
};

// ff-csr / ff-webmaster / ff-procurement fill the same twelve Drupal-form
// fields: 姓/名 labels each read as a full name (no first/last split
// applied); 勤務先・学校名 compound reads as the school vocabulary, so the
// school profile value fills; FAX has no profile value, so the rule fills
// the tel value (honest pin, fax-vocabulary candidate).
const FF_EXPECTED = {
  'name[first]': '山田 太郎',
  'name[last]': '山田 太郎',
  'name_kana[first]': 'ヤマダ タロウ',
  'name_kana[last]': 'ヤマダ タロウ',
  'e_mailatoresu[mail_1]': 'yamada@example.com',
  'e_mailatoresu[mail_2]': 'yamada@example.com',
  qinwuxianxuexiaoming: '都立日比谷高校',
  postal_code: '100-0001',
  city: '千代田区',
  jianwuming: '千代田ビル101',
  // T2: the 部署名 label now reads as companyDepartment, so the department value fills.
  organization_unit_name: '開発部',
  tel: '090-1234-5678',
  fax: '090-1234-5678',
};

const LEDGER = {
  '12fc22bc297429.html': {
    expected: {
      field_4647587: '株式会社サンプル',
      field_4647576_sei: '山田',
      field_4647576_mei: '太郎',
      field_4647577: 'yamada@example.com',
      field_4647588_sei: 'やまだ',
      field_4647588_mei: 'たろう',
      field_4647591_1: '090',
      field_4647591_2: '1234',
      field_4647591_3: '5678',
    },
    excluded: [
      'field_4647587 (法人・団体名): PBI-119 で company に分類され profile の会社名が入る',
      'field_4647590 (都道府県 select): only a `--` option, correctly warn-no-option',
      'field_4647582[0]/field_4647582[1]/field_4647582[2]/field_4647582[3]/field_4647582[4]/field_4647584 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_4647582[0]/field_4647582[1]/field_4647582[2]/field_4647582[3]/field_4647582[4] (checkbox): out of scope (skip fixed)',
      'field_4647584 x5 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'field_4647586 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'field_4647594/field_4647579 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_4647594 x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'field_4647579 (checkbox): out of scope (skip fixed)',
      'submit (submit): action element, never a fill target (exclude)',
      'validated (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) x2 (button): unaddressable (exclude)',
    ],
  },
  '2dd1c663300469.html': {
    expected: {
      field_4695578_sei: '山田',
      field_4695578_mei: '太郎',
      field_4695585_sei: 'ヤマダ',
      field_4695585_mei: 'タロウ',
      field_4695586_y: '1990',
      field_4695587: '都立日比谷高校',
      field_4695590: '普通科',
      field_4695579: 'yamada@example.com',
      field_4695579_mcon: 'yamada@example.com',
    },
    excluded: [
      'field_4695586_m/_d (month/day selects): only a `--` option, correctly warn-no-option',
      'field_4696239 (その他の経緯): no profile value, correctly unfilled',
      'field_4695584 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_4695584 x3 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'field_4696236[0] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_4696236[0]/field_4696236[1]/field_4696236[2]/field_4696236[3]/field_4696236[4]/field_4696236[5] (checkbox): out of scope (skip fixed)',
      'field_4696236[1]/field_4696236[2]/field_4696236[3]/field_4696236[4]/field_4696236[5] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_4696240 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'field_4696241 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_4696241 (checkbox): out of scope (skip fixed)',
      'submit (submit): action element, never a fill target (exclude)',
      'key/code/validated (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) x2 (button): unaddressable (exclude)',
    ],
  },
  'age-decade-select-form.html': {
    expected: {
      age: '1', fullname: '山田　太郎',
    },
  },
  'demo-ai-ambiguous.html': {
    // Rule-only result; the samples.test.ts case checks the LLM path separately.
    expected: { tel: '090-1234-5678', f10: 'yamada@example.com' },
  },
  'demo-registration.html': { expected: TEN_ADDRESS_EXPECTED },
  'demo-request-info.html': { expected: TEN_ADDRESS_EXPECTED },
  'demo-shop-checkout.html': { expected: TEN_ADDRESS_EXPECTED },
  'formmailer-anketo-gender.html': {
    expected: {
      field_2760246: '12',
      field_2760244: '1',
    },
  },
  'formmailer-raijo-age.html': {
    expected: {
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
    },
  },
  'forum.html': {
    expected: {
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
    },
    excluded: [
      '(no name/id) x2 (button): unaddressable (exclude)',
      'wpforms[fields][100] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'wpforms[fields][97] x10/wpforms[fields][80] x3 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'wpforms[fields][8][]/wpforms[fields][93][] (checkbox): out of scope (skip fixed)',
      '(no name/id) x2 (button): unaddressable (exclude)',
      'wpforms[recaptcha]/wpforms[id]/page_title/page_url/url_referer/page_id/wpforms[post_id] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'wpforms[submit] (button): action element, never a fill target (exclude)',
    ],
  },
  'furigana-fieldset-form.html': {
    expected: {
      field_1_sei: '山田', field_1_mei: '太郎',
      field_2_sei: 'やまだ', field_2_mei: 'たろう',
    },
  },
  'gender-select-form.html': {
    expected: {
      sex: '女性', fullname: '山田　太郎',
    },
  },
  'gis-intl-admission.html': {
    expected: {
      'parent-name': '山田 太郎',
      'your-email': 'yamada@example.com',
      'student-name': '山田 太郎',
      'current-country': 'United States',
      'current-school': '都立日比谷高校',
      // PBI-212: Institution 語彙で school に載り、学校プロファイルの値が入る
      // （従来の fullName 誤検出から意図した分類へ）。
      'name-institution': '都立日比谷高校',
    },
    excluded: [
      'parent-name/student-name (text): 氏名 labels resolve to fullName',
      'name-institution (text): Institution reads as the school vocabulary (PBI-212), so the label stops misreading as a person name',
      'student-nationality/current-grade (text): stay unclassified (LLM fallback)',
      'student-birth (date): out of scan in this fixture family',
      'desired-enrollment/desired-grade/dormitory-accommodation/japanese-proficiency/jlpt-level/studied-japanese (radio): bundled per name; stay unclassified (radio policy)',
      'your-message (textarea): out of scan; acceptance-sample (checkbox): out of scope (skip fixed)',
      '_wpcf7* (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'submit (submit): action element, never a fill target (exclude)',
    ],
  },
  'katakana-fieldset-form.html': {
    expected: {
      field_1_sei: '山田', field_1_mei: '太郎',
      field_2_sei: 'ヤマダ', field_2_mei: 'タロウ',
    },
  },
  'kosodate-contact.html': {
    expected: {
      'wpforms[fields][6]': '山田 太郎',
      'wpforms[fields][41]': '090-1234-5678',
      'wpforms[fields][14][primary]': 'yamada@example.com',
      'wpforms[fields][14][secondary]': 'yamada@example.com',
    },
    excluded: [
      's (text): site-search field, stays unclassified (same as forum.html)',
      'wpforms[fields][29] (select): お問い合わせ種別, stays unclassified (LLM fallback)',
      'wpforms[fields][12] (text): 所属（会社・団体・学校等） is a compound office label, stays unclassified (office pre-pass)',
      'wpforms[fields][42] (radio): 電話番号種別 自宅/携帯/所属先, bundled per name; stays unclassified (radio policy)',
      'wpforms[fields][8] (textarea), wpforms[fields][13] (number): out of scan',
      'wpforms[fields][40][] (checkbox): out of scope (skip fixed)',
      'wpforms[recaptcha]/[id]/page_*/url_referer/[post_id] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'submit (submit): action element, never a fill target (exclude)',
    ],
  },
  'library-theater-apply.html': {
    expected: {
      field_5755075_sei: '山田', field_5755075_mei: '太郎',
      field_5755308_sei: '山田', field_5755308_mei: '太郎',
      field_5755078_zip1: '100', field_5755078_zip2: '0001',
      field_5755078_pref: '東京都', field_5755078_city: '千代田区',
      field_5755078_block: '千代田1-1', field_5755078_building: '千代田ビル101',
      field_5755079_1: '090', field_5755079_2: '1234', field_5755079_3: '5678',
      field_5755076: 'yamada@example.com', field_5755076_mcon: 'yamada@example.com',
    },
    excluded: [
      'field_6426354 (radio): 会員/非会員, bundled per name; stays unclassified (radio policy)',
      'validated (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'submit (submit): action element, never a fill target (exclude)',
    ],
  },
  'nishimachi-inquiry.html': {
    expected: {
      field_914: 'Taro', field_915: 'Taro Yamada', field_916: 'Yamada',
      field_962: 'Female', field_972: 'United States',
      field_922: '都立日比谷高校',
      field_935: 'Taro', field_936: 'Yamada',
      field_937: 'yamada@example.com', field_938: '090-1234-5678',
      field_944: 'NEW YORK', field_946: 'Female', field_953: 'United States',
    },
    excluded: [
      'field_914-916/935-936 (text): romaji names via autocomplete tokens on an English page',
      'field_915 (text): Nickname reads as a full romaji name (no nickname vocabulary yet)',
      'field_962/946 (radio): Gender groups resolve Male/Female against 女性 through the English alias (PBI-212); the option value Female fills',
      'field_976 (text): School Website is a URL field; PBI-212 removes website fields from classification (no fill, the school name never rides a URL box)',
      'field_944 (text): Prefecture / State reads as the overseas state field (address4)',
      "field_963 (text): Date of Birth has pattern MM/DD/YYYY and the ISO birthday does not match it; PBI-210 turns the row into warn-pattern (value empty, not injected even on approval), so the former intentional pin '1990-05-07' (PBI-210 rationale) no longer fills",
      'field_923/927/956 (select): grade/year/enrollment selects, stay unclassified (LLM fallback)',
      'field_926 (select): School Year reads as school; a school select has no matching option (warn-no-option)',
      'field_928 (checkbox): out of scope (skip fixed); field_955 (textarea): out of scan',
      'submission_uuid (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'submit (submit): action element, never a fill target (exclude)',
    ],
  },
  'overseas-address-form.html': {
    expected: {
      name_last: 'Taro Yamada', country: 'United States',
      address_1: '#123 Central Apartment', address_2: '25-15 M.G.Peterson Ave',
      address_3: 'Long Island City', address_4: 'NEW YORK',
      postal_code: '11375', fullname: '山田　太郎',
    },
  },
  'overseas-webform-joshibi.html': {
    expected: {
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
    },
  },
  'profile-fields-form.html': {
    expected: {
      by_y: '1990', by_m: '05', by_d: '07', sch: '都立日比谷高校', dep: '普通科',
    },
  },
  'registration.html': {
    expected: {
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
    },
    excluded: [
      'legalEnt/state (select): only a `--` option, correctly warn-no-option',
      'jobTxt (役職): no profile value, correctly unfilled',
      'q6_other (その他業種): no profile value, correctly unfilled',
      'q7_other (その他職種): no profile value, correctly unfilled',
      'corporation_position x2/member_category/q1/q2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'password/confirmation_password (password): not scanned (scan covers text/email/tel/search + select; exclude)',
      'q3/q4/q5/ok/exhibitor_share_consent (checkbox): out of scope (skip fixed)',
      'q6/q7/marketing_consent (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      '(no name/id) (button): unaddressable (exclude)',
      'privacy_consent/division_none/position_none (checkbox): out of scope (skip fixed)',
      'password/confirmation_password (password): not scanned (scan covers text/email/tel/search + select; exclude)',
      'survey_purpose/survey_challenges (checkbox): out of scope (skip fixed)',
      '(no name/id) x5 (button): unaddressable (exclude)',
      'cms_directory_id (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'reinvent-registration-contact.html': {
    expected: {
      'formAttendee-firstname': 'Taro',
      'formAttendee-lastname': 'Yamada',
      'formAttendee-city': 'Long Island City',
      'formAttendee-zip': '11375',
    },
  },
  'richell-anketo-rating.html': {
    expected: {},
    excluded: [
      'field_2953454 (text): the only in-scope control; 受付番号 stays unclassified (LLM fallback)',
      'field_2953447-2953450, 2953452-2953453 (radio): matrix rating groups, bundled per name; stay unclassified (radio policy)',
      'field_2953451, 2953455 (textarea): out of scan',
      'key/code/validated (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'submit (submit): action element, never a fill target (exclude)',
    ],
  },
  'roman-name-form.html': {
    expected: {
      name_last: 'Taro Yamada', fullname: '山田　太郎', mail: 'yamada@example.com',
    },
  },
  'single-field-form.html': {
    expected: {
      fullname: '山田　太郎', furigana: 'ヤマダ　タロウ',
      addr: '東京都千代田区千代田1-1 千代田ビル101', phone: '09012345678',
    },
  },
  'split-form.html': {
    expected: {
      lastName: '山田', firstName: '太郎', lk: 'ヤマダ', fk: 'ﾀﾛｳ', zip: '100-0001',
      pref: '13', address1: '千代田区千代田1-1', address2: '千代田ビル101',
      tel: '09012345678', em: 'yamada@example.com',
    },
  },
  'table-form.html': {
    expected: {
      n1: '山田', n2: '太郎', k1: 'ヤマダ', k2: 'タロウ', z1: '100', z2: '0001',
      p: '13', a1: '千代田区千代田1-1', a2: '千代田ビル101',
      t1: '090', t2: '1234', t3: '5678', m: 'yamada@example.com',
    },
  },
  'bst-inquire.html': {
    expected: {
      'student[parent][0][last_name]': 'Yamada',
      'student[parent][0][first_name]': 'Taro',
      // The honeypot rides the nearby Email Address label exactly as on the
      // real page, so it classifies as email and fills (future honeypot
      // exclusion candidate; pinned honest, not as desired behavior).
      'fake_email[]': 'yamada@example.com',
      'student[parent][0][email]': 'yamada@example.com',
      'student[parent][0][field_attributes][75]': '09012345678',
      'student[last_name]': 'Yamada',
      'student[first_name]': 'Taro',
      // Middle Name(s) reads as a full romaji name (same as the Nishimachi
      // Nickname precedent: no middle-name vocabulary yet).
      'student[field_attributes][6]': 'Taro Yamada',
      'student[preferred_name]': 'Taro Yamada',
      // Gender values are numeric (Male=1/Female=0); the English alias
      // resolves Female against 女性 through the wrapping labels (PBI-212).
      'student[gender]': '0',
      'student[birth_date]': '1990-05-07',
      // Applicant's Current School/Preschool reads as the school vocabulary
      // (PBI-212 Institution), same as the GIS name-institution row.
      'student[field_attributes][17]': '都立日比谷高校',
    },
    excluded: [
      'student[parent][0][field_attributes][35477] (select): Title, stays unclassified (LLM fallback)',
      'student[parent][0][parent_role] (select): Relation to Child, stays unclassified (LLM fallback)',
      'student[parent][0][field_attributes][84]/[85] (select): 1st/2nd Nationality, stay unclassified (LLM fallback)',
      'student[field_attributes][234537] (radio): passport Yes/No, bundled per name; stays unclassified (radio policy)',
      'student[field_attributes][231630] (select): Current Place of Residence country list, stays unclassified (LLM fallback)',
      'student[enrollment_year]/[grade]/[221734]/[campus_id]/[221735] (select): entry year/group/term/campus/reason, stay unclassified (LLM fallback)',
      'student[field_attributes][231629]/[124830] (text): Please specify/Current Year Group, stay unclassified (LLM fallback)',
      'student[field_attributes][374968]/[374969] (select): referral source selects, stay unclassified (LLM fallback)',
      'student[parent][1][*] second guardian block: duplicate of the parent block above, trimmed (exclude)',
      'student[parent][0][password]/[password_confirmation]/fake_input[] (password): not scanned (scan covers text/email/tel/search + select; exclude)',
      'student[parent][0][notification]/[loginable] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'authenticity_token/convert_token/idempotency_key/trap_input (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'commit/multi (submit): action element, never a fill target (exclude)',
    ],
  },
  'isi-contact.html': {
    expected: {
      'Last_Name': 'Yamada',
      'First_Name': 'Taro',
      'Email': 'yamada@example.com',
      'Phone': '090-1234-5678',
    },
    excluded: [
      'pardot_extra_field (text): offscreen honeypot with its own Comments label, stays unclassified (LLM fallback)',
      'SNS/SNS_Id (text): messaging-app handles, no profile value, stay unclassified (LLM fallback)',
      'Nationality (text): readonly country picker, stays unclassified (LLM fallback)',
      'Residence_in_Japan (radio): Yes/No, bundled per name; stays unclassified (radio policy)',
      'Preferred_Study_Duration (radio): Short-term/Long-term/Undecided, bundled per name; stays unclassified (radio policy)',
      'Purpose_of_Inquiry/Referral_Source (select): stripped options, stay unclassified (LLM fallback)',
      'Preferred_Intake/Japanese_Learning_History/Educational_Background (select): conditional application blocks hidden until Purpose selects application, trimmed (exclude)',
      'Preferred_School/Topics_of_Interest (checkbox): conditional blocks hidden until Purpose selects application, out of scope (skip fixed)',
      'Agent_Name/Other_reason (text): conditional inputs hidden until Referral selects agency/other, trimmed (exclude)',
      'interested_in_JUQ/Individual_Agency (radio): language-gated disabled blocks, trimmed (exclude)',
      'Inquries_Details (textarea): conditional block hidden until Purpose selects application, not scanned (scan covers text/email/tel/search + select; exclude)',
      'form_language/utm_*/Country_Id (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'ois-contact.html': {
    expected: {
      'form_fields[name]': '山田 太郎',
      // The two identical フリガナ labels split first→last / second→first
      // through the same-label path (parent kana rides lastNameKana here).
      'form_fields[field_6664910]': 'ヤマダ',
      'form_fields[field_9405afa]': '山田 太郎',
      'form_fields[field_958d73c]': 'タロウ',
      'form_fields[field_23b7625]': '女',
      'form_fields[zipcode]': '1000001',
      'form_fields[adress]': '東京都千代田区千代田1-1 千代田ビル101',
      'form_fields[field_ac345c0]': 'yamada@example.com',
      'form_fields[field_0187ee9]': '09012345678',
    },
    excluded: [
      's (text) x2: site-search fields, stay unclassified (same as forum.html)',
      'cname2/cname3 child blocks (text + furigana + gender select + date): duplicates of the first child block, trimmed (exclude)',
      'form_fields[field_9820c13] (date): 生年月日, not scanned (scan covers text/email/tel/search + select; exclude)',
      'form_fields[field_d05b167] (text): Fax, no profile value, stays unclassified (LLM fallback)',
      'form_fields[field_ea27631] (text): 紹介者名, stays unclassified (LLM fallback)',
      'form_fields[field_3ff6f09][] (checkbox): お問い合わせ学部、コース, out of scope (skip fixed)',
      'form_fields[field_7972aa4][] (checkbox): お問い合わせ項目, out of scope (skip fixed)',
      'form_fields[field_1ede2d6][] (checkbox): どのようにしてOISをお知りになりましたか？, out of scope (skip fixed)',
      'form_fields[field_7ae0589] (textarea): お問合せ内容, not scanned (scan covers text/email/tel/search + select; exclude)',
      'user_name/user_email/user_login (login/register/reset modals): separate forms, trimmed (exclude)',
      'user_password (password): not scanned (scan covers text/email/tel/search + select; exclude)',
      'post_id/form_id/referer_title/queried_id/request_type/redirect/nonce (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'kigakuen-briefing.html': {
    expected: {
      field_5969382_sei: '山田',
      field_5969382_mei: '太郎',
      // The child furigana pair classifies as lastName/firstName (kanji) but
      // the real katakana-only pattern rejects the kanji plan, so the rows
      // turn warn-pattern and stay unfilled (PBI-210 semantics, verified by
      // stripping the pattern). Legend-aware kana classification is the
      // vocabulary candidate, same shape as library-theater-apply.
      field_5969384: '1',
      field_5969385_y: '1990',
      field_5969387: '都立日比谷高校',
      field_5969390_sei: '山田',
      field_5969390_mei: '太郎',
      field_5969391_zip1: '100',
      field_5969391_zip2: '0001',
      field_5969391_pref: '東京都',
      field_5969391_city: '千代田区',
      field_5969391_block: '千代田1-1',
      field_5969391_building: '千代田ビル101',
      field_5969392_1: '090',
      field_5969392_2: '1234',
      field_5969392_3: '5678',
      field_5969393: 'yamada@example.com',
      field_5969393_mcon: 'yamada@example.com',
    },
    excluded: [
      'field_5969379 (radio): 実施教室 single option, bundled per name; stays unclassified (radio policy)',
      'field_5970949 (select): ご来場者数, stays unclassified (LLM fallback)',
      'field_5969383_sei/mei (text): お子さまのフリガナ, plan blocked by the real katakana pattern (warn-pattern, see expected comment)',
      'field_5969385_m/_d (select): only a `--` option, correctly warn-no-option',
      'field_5969386 (select): お子さまの学年, stays unclassified (LLM fallback)',
      'field_5969388 (radio): 兄弟姉妹 有り/無し, bundled per name; stays unclassified (radio policy)',
      'field_5969389 (select): 兄弟姉妹学年, stays unclassified (LLM fallback)',
      'field_5969394 (select): 最寄りの教室, stays unclassified (LLM fallback)',
      'field_5969395 (select): きっかけ, stays unclassified (LLM fallback)',
      'field_5969396/5969397/5969398 (text): conditional detail fields, stay unclassified (LLM fallback)',
      'field_6523584[1] (checkbox): 実施日・時間, out of scope (skip fixed)',
      'field_5969401[0] (checkbox): 個人情報の取扱いへの同意, out of scope (skip fixed)',
      'field_5969379/5969384/5969388/6523584 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'submit (submit): action element, never a fill target (exclude)',
      'validated (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'seedome-openschool.html': {
    expected: {
      field_1325704_sei: '山田',
      field_1325704_mei: '太郎',
      field_1325703: 'yamada@example.com',
      field_5857817_1: '090',
      field_5857817_2: '1234',
      field_5857817_3: '5678',
    },
    excluded: [
      'field_5857810 (text): 参加人数 子どもの年齢, no profile value, stays unclassified (LLM fallback)',
      'field_1367629[0]/[1] (checkbox): ご希望日 10/24・11/14, out of scope (skip fixed)',
      'field_7605026[0..6] (checkbox): 説明会参加の目的 7 options, out of scope (skip fixed)',
      'field_1367629/7605026 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_1325701 (textarea): あなたのことを教えてください, not scanned (scan covers text/email/tel/search + select; exclude)',
      'submit (submit): action element, never a fill target (exclude)',
      'validated (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'ff-csr.html': {
    expected: FF_EXPECTED,
    excluded: [
      'inquiry_title (text): 件名, no profile value, correctly unfilled',
      'state_province_list (select): only a `--` option, correctly warn-no-option',
      '(no name/id) (button): unaddressable (exclude)',
      'inquiry_body (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'contactto x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      '(no name/id) (button): unaddressable (exclude)',
      'captcha_sid/captcha_token/captcha_response/is_recaptcha_v3 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'agreement_check (checkbox): out of scope (skip fixed)',
      'op (submit): action element, never a fill target (exclude)',
      'form_build_id/form_id (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'otsuka-opinion-form.html': {
    expected: {
      // Placeholder-only text fields (no <label> on the real page either):
      // the 例） placeholders carry the name readings.
      'name': '山田 太郎',
      'name_kana': 'ヤマダ タロウ',
      'tel[1]': '090',
      'tel[2]': '1234',
      'tel[3]': '5678',
      // The sex name itself matches the gender rule; 女 (value 2) resolves
      // against 女性 (same as the bst-inquire Male/Female precedent).
      'sex': '2',
    },
    excluded: [
      'company (text): ご所属 placeholder 例）大塚製薬株式会社, stays unclassified (LLM fallback; company-by-placeholder candidate)',
      'mail (text): type=text named mail with an email placeholder, stays unclassified (LLM fallback; email-via-placeholder candidate)',
      'age (text): bare 年齢 field with no label or placeholder, no profile value, correctly unfilled',
      '_csrfToken (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'agree (checkbox): out of scope (skip fixed)',
      'contents (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      '_Token[fields]/_Token[unlocked] (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'mitsuihome-sonota-form.html': {
    expected: {
      // Name/kana split by the _1/_2 suffix (same-label path); zip split
      // stays silent here (no label or placeholder signal on post1/post2).
      'name_1': '山田',
      'name_2': '太郎',
      'name_kana_1': 'ヤマダ',
      'name_kana_2': 'タロウ',
      'address1': '千代田区千代田1-1',
      'address2': '千代田ビル101',
      // address3 duplicates the address1 value (honest pin of the refine row).
      'address3': '千代田区千代田1-1',
      'tel': '090-1234-5678',
      'mail': 'yamada@example.com',
    },
    excluded: [
      'kw x2 (text): header/footer site-search fields, stay unclassified (same as forum.html s)',
      'syozoku/shimei/company/busho (text): 所属・指名・会社・部署 with no label association, stay unclassified (LLM fallback; company/department-by-name candidates)',
      'post1/post2 (text): bare 郵便番号 split with no label signal, stay unclassified (LLM fallback; post-prefix zip candidate)',
      'pref (select): only a `--` option, correctly warn-no-option',
      'koukoku_paper/magazine/site (select): only a `--` option, correctly warn-no-option',
      'koukoku_paper_else/magazine_else/site_else (text): conditional detail fields, stay unclassified (LLM fallback)',
      'ie (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) (submit): unaddressable (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      'ie (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) (submit): unaddressable (exclude)',
      'agree (checkbox): out of scope (skip fixed)',
      'contents (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'tantou x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'koukoku[] x8 (checkbox): out of scope (skip fixed)',
      'TOKEN_GENERAL/mode (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'mitsui-reform-catalog-form.html': {
    expected: {
      // dl/dt/dd rows restore the real headings (the scanner reads dt as
      // nearby, the split/leftover grouping key). Name/kana split by _1/_2.
      'name_1': '山田',
      'name_2': '太郎',
      'kana_1': 'ヤマダ',
      'kana_2': 'タロウ',
      // tel and tel2 sit under different dts (電話番号 / 電話番号2), so the
      // PBI-09 empty-key leftover rule does not group them; both classify as
      // tel and wantsHyphen fits the undashed value into maxlength=12.
      'tel': '09012345678',
      'tel2': '09012345678',
      'email': 'yamada@example.com',
      'email_2': 'yamada@example.com',
      'pref': '東京都',
      'address': '千代田区千代田1-1',
      'address2': '千代田ビル101',
      // address3/address4 duplicate the addressNoPref row (same shape as the
      // mitsuihome address3 pin).
      'address3': '千代田区千代田1-1',
      'address4': '千代田区千代田1-1',
      'place_zip': '1000001',
      'place_pref': '東京都',
      'place_address1': '千代田区千代田1-1',
      'place_address2': '千代田ビル101',
      'place_address3': '千代田区千代田1-1',
      'place_address4': '千代田区千代田1-1',
    },
    excluded: [
      'post (text): bare post name with only an 例） placeholder, stays unclassified (LLM fallback; post-prefix zip candidate, same as mitsuihome post1/post2)',
      'loop_number (text): LOOP会員番号, no profile value, correctly unfilled',
      'purchase_area_1/2/3 (text): ご希望エリア, no profile value, stay unclassified (LLM fallback)',
      'purchase_type_other (text): conditional detail field, stays unclassified (LLM fallback)',
      'purchase_budget_home_b/_t/reform_b/_t (text): ご予算 ranges, no profile value, stay unclassified (LLM fallback)',
      'form_type/genre/reform_menu/reform_sheet/purchase_sheet/recaptchaResponse/init_time/token (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'privacy (checkbox): out of scope (skip fixed)',
      'place_reform x3/building_type x3/construction_type x3/construction_type_detail x8/building_situation x5/reform x3/loop x3/purchase_type x5 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'comment/purchase_comment (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'check (button): action element, never a fill target (exclude)',
    ],
  },
  'tokyu-land-contact-form.html': {
    expected: {
      // One dl per row on the real page (no <label> association); the dt
      // texts are kept as the scanner's nearby.
      'name': '山田 太郎',
      'kana': 'ヤマダ タロウ',
      'zip': '1000001',
      // 市区町村 fills the prefecture-prefixed concatenation (honest pin of
      // the address row; 番地・建物名 reads as building).
      'address1': '東京都千代田区千代田1-1',
      'address2': '千代田ビル101',
      'mail': 'yamada@example.com',
      'mail2': 'yamada@example.com',
    },
    excluded: [
      'q x2 (search): header/footer site-search fields, stay unclassified (same as forum.html s)',
      'pref (select): only a `--` option, correctly warn-no-option',
      '(no name/id) x2 (submit): unaddressable (exclude)',
      'flow (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'type x3 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'contenttext (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      '(no name/id) (submit): unaddressable (exclude)',
    ],
  },
  'kobe-city-contact-form.html': {
    expected: {
      // Only the katakana placeholder resolves (fullNameKana, same as the
      // single-field-form furigana pin). Everything else rides numbered
      // table-cell headings the scanner never reads.
      'singleAnswer(ANSWER2)': 'ヤマダ　タロウ',
    },
    excluded: [
      'singleAnswer(ANSWER1) (text): １．お名前 placeholder 神戸 太郎, stays unclassified (LLM fallback; kanji person-name placeholder does not infer fullName)',
      'singleAnswer(ANSWER3) (text): type=text with an email placeholder, stays unclassified (LLM fallback; email-via-placeholder candidate, same as otsuka mail)',
      'singleAnswer(ANSWER4) (select): ４．居住区 ward options restored verbatim, stays unclassified (LLM fallback)',
      'singleAnswer(ANSWER5) (text): ５．住所 with a 市内/市外 example placeholder, stays unclassified (LLM fallback)',
      'singleAnswer(ANSWER6-1/2/3) (text): ６．電話番号 bare 3-split with no label or placeholder signal, stay unclassified (LLM fallback; tel-split-by-name candidate)',
      'singleAnswer(ANSWER8) (text): ８．タイトル, no profile value, correctly unfilled',
      'org.apache.struts.taglib.html.TOKEN (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) x3 (button): unaddressable (exclude)',
      'multiAnswer(ANSWER7) x4 (checkbox): out of scope (skip fixed)',
      'singleAnswer(ANSWER9) (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'multiAnswer(ANSWER10) (checkbox): out of scope (skip fixed)',
      'submit-btn (submit): action element, never a fill target (exclude)',
    ],
  },
  'epson-csr-form.html': {
    expected: EPSON_EXPECTED,
    excluded: [
      'c_q1/c_q1_confirm (text): 1.Eメールアドレス with no label or placeholder signal, stay unclassified (LLM fallback)',
      'c_q3_first/second (text): 2.お名前 姓/名, stay unclassified (LLM fallback; coded-name person fields)',
      'c_q4_first/second (text): 3.フリガナ セイ/メイ, stay unclassified (LLM fallback; coded-name kana fields)',
      'c_q5_left/right (text): 4.郵便番号 split, stay unclassified (LLM fallback; left/right-split zip candidate)',
      'c_q6 (select): 5.都道府県 options restored verbatim, stays unclassified (LLM fallback)',
      'c_q7 (text): 6.市郡区町村, stays unclassified (LLM fallback)',
      'c_q8 (text): 7.町域, stays unclassified (LLM fallback)',
      'c_q10 (text): 8.番地, stays unclassified (LLM fallback)',
      'c_q9 (text): 9.ビル・マンション名, stays unclassified (LLM fallback; coded-name building field)',
      'c_q14_areacode/subscribercode (text): 10.電話番号 outer parts, stay unclassified (LLM fallback; areacode-split tel candidate)',
      'c_q15_areacode/subscribercode (text): 11.FAX番号 outer parts, stay unclassified (LLM fallback)',
      'c_q11 (text): 12.会社名・団体名, stays unclassified (LLM fallback; coded-name company field)',
      '__pid/__pageId (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'searchAddr_c_q5 (submit): action element, never a fill target (exclude)',
      'c_q16 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'wcf5start (submit): action element, never a fill target (exclude)',
    ],
  },
  'ricoh-risb-form.html': {
    expected: {
      // Same cform family as epson-csr-form: coded names, no labels, so only
      // the citycode name reads as city.
      'c_q3_citycode': '千代田区',
    },
    excluded: [
      'c_q1_first/second (text): お名前 姓/名 with no label or placeholder signal, stay unclassified (LLM fallback)',
      'c_q70/_confirm (text): メールアドレス確認再入力, stay unclassified (LLM fallback; coded-name email fields)',
      'c_q3_areacode/subscribercode (text): 電話番号 outer parts, stay unclassified (LLM fallback)',
      '__pid/__pageId/__token (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'c_q4 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'wcf5start (submit): action element, never a fill target (exclude)',
    ],
  },
  'kikkoman-website-form.html': {
    expected: {
      // 姓/名 placeholders split kanji; せい/めい placeholders read hiragana
      // (same-label path, ois-contact kana-pair shape in hiragana).
      'e_25020': '山田',
      'e_25021': '太郎',
      'e_25022': 'やまだ',
      'e_25023': 'たろう',
      // [tel1/2/3] suffix splits like the otsuka tel[1/2/3] precedent.
      'e_25028[tel1]': '090',
      'e_25028[tel2]': '1234',
      'e_25028[tel3]': '5678',
    },
    excluded: [
      'e_25018 (text): お問い合わせタイトル, no profile value, correctly unfilled',
      'e_26455 (text): page-URL field, no URL fill (PBI-212 website-field exclusion precedent, same as nishimachi field_976)',
      'e_25042 (select): 性別 options restored verbatim, stays unclassified (LLM fallback; coded-name gender-select candidate — cf. gender-select-form which relies on the sex name/label)',
      'e_25031/_re (text): type=text with a メールアドレス heading, stay unclassified (LLM fallback; email-via-heading candidate, same as otsuka mail)',
      'e_25045 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'agreement (checkbox): out of scope (skip fixed)',
      '__send (submit): action element, never a fill target (exclude)',
      'commit_agreement/__name/f/gtmkr (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'smp-regist-inquiry-form.html': {
    expected: {
      // dl/dt/dd rows restore the real headings as nearby (mitsui-reform
      // shape): name/zip splits resolve, and phone/faxnumber sit under
      // different dts so the PBI-09 empty-key leftover rule does not group
      // them — both classify as tel and wantsHyphen fits the undashed value
      // into maxlength=11 (FAX takes the tel value, same honest shape as
      // the ff-csr fax pin).
      'name1': '山田',
      'name2': '太郎',
      'postalCode1:a': '100',
      'postalCode1:t': '0001',
      'address2': '千代田ビル101',
      'address3': '東京都千代田区千代田1-1',
      'phone': '09012345678',
      'faxnumber': '09012345678',
      'mail': 'yamada@example.com',
      'mail:cf': 'yamada@example.com',
    },
    excluded: [
      'kana1/kana2 (text): ふりがな nearby with parenthesized 例 placeholders, stay unclassified (LLM fallback; bare せい/めい resolved in kikkoman, the parens+例 prefix does not)',
      'address1 (select): 都道府県 nearby with verbatim 名称 options, stays unclassified (LLM fallback; prefecture-select-by-nearby candidate)',
      '(no name/id) x2 (button): unaddressable (exclude)',
      'zipcodeBtn (button): action element, never a fill target (exclude)',
      'content (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'detect/SMPFORM/smpsk/mode (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'submit (submit): action element, never a fill target (exclude)',
    ],
  },
  'toshiba-gx-contact-form.html': {
    expected: {
      // Pardot romaji-style names resolve to Japanese person names; the
      // hyphenated 例 placeholders drive dashed zip/tel.
      'lastname': '山田',
      'firstname': '太郎',
      'zip': '100-0001',
      'state': '東京都',
      'city': '千代田区',
      // 町名・番地 fills the full concatenation (honest pin of the
      // address row, cf. mitsuihome address3).
      'addressone': '東京都千代田区千代田1-1 千代田ビル101',
      'phone': '090-1234-5678',
      'email': 'yamada@example.com',
      'mailConfirm': 'yamada@example.com',
      // 部署名 reads as the school department, so 普通科 fills (honest pin;
      // companyDepartment 開発部 is not used — department-reading candidate).
      'department': '普通科',
    },
    excluded: [
      'type (select): options restored verbatim, stays unclassified (LLM fallback; inquiry-kind select)',
      'company (text): 所属企業・団体名 with a 株式会社 placeholder, stays unclassified (LLM fallback; company-by-heading candidate, same as otsuka/mitsuihome)',
      'industry/departmentCategory/jobtitleCategory (select): options restored verbatim, stay unclassified (LLM fallback; no profile value)',
      'subject (text): 件名, no profile value, correctly unfilled',
      'InquiryClassification x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'description (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'Inquiry[agree] (checkbox): out of scope (skip fixed)',
      'Inquiry[agree] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'Inquiry[agree] (checkbox): out of scope (skip fixed)',
      'OptInAccept (submit): action element, never a fill target (exclude)',
    ],
  },
  'ff-webmaster-form.html': {
    expected: FF_EXPECTED,
    excluded: [
      'inquiry_title (text): 件名, no profile value, correctly unfilled',
      'state_province_list (select): only a `--` option, correctly warn-no-option',
      '(no name/id) (button): unaddressable (exclude)',
      'inquiry_body (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'contactto x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      '(no name/id) (button): unaddressable (exclude)',
      'captcha_sid/captcha_token/captcha_response/is_recaptcha_v3 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'agreement_check (checkbox): out of scope (skip fixed)',
      'op (submit): action element, never a fill target (exclude)',
      'form_build_id/form_id (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'ff-procurement-form.html': {
    expected: FF_EXPECTED,
    excluded: [
      'inquiry_title (text): 件名, no profile value, correctly unfilled',
      'state_province_list (select): only a `--` option, correctly warn-no-option',
      '(no name/id) (button): unaddressable (exclude)',
      'inquiry_body/guishenotese (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      'captcha_sid/captcha_token/captcha_response/is_recaptcha_v3 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'agreement_check (checkbox): out of scope (skip fixed)',
      'op (submit): action element, never a fill target (exclude)',
      'form_build_id/form_id (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'ff-compliance-hotline-form.html': {
    expected: {
      // Same Drupal form family as ff-csr but without address/company/tel
      // fields: 姓/名 labels each read as a full name; pinned honest.
      'name[first]': '山田 太郎',
      'name[last]': '山田 太郎',
      'name_kana[first]': 'ヤマダ タロウ',
      'name_kana[last]': 'ヤマダ タロウ',
      'e_mailatoresu[mail_1]': 'yamada@example.com',
      'e_mailatoresu[mail_2]': 'yamada@example.com',
    },
    excluded: [
      'inquiry_title (text): 件名, no profile value, correctly unfilled',
      '(no name/id) (button): unaddressable (exclude)',
      'inquiry_body (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      'captcha_sid/captcha_token/captcha_response/is_recaptcha_v3 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'agreement_check (checkbox): out of scope (skip fixed)',
      'op (submit): action element, never a fill target (exclude)',
      'form_build_id/form_id (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'tokyu-land-kojin-form.html': {
    expected: {
      // One dl per row on the real page (no <label> association); the dt
      // texts are kept as the scanner's nearby (same as tokyu-land-contact).
      'name': '山田 太郎',
      'kana': 'ヤマダ タロウ',
      'zip': '1000001',
      // Both 市区町村 rows (物件条件 + 現住所) fill the prefecture-prefixed
      // concatenation; both 番地・建物名 rows read as building (duplicate
      // fill across the two address blocks, honest pin).
      'address1_house': '東京都千代田区千代田1-1',
      'address2_house': '千代田ビル101',
      'address1': '東京都千代田区千代田1-1',
      'address2': '千代田ビル101',
      // type=text so the value stays undashed (honest pin).
      'tel': '09012345678',
      'mail': 'yamada@example.com',
      'mail2': 'yamada@example.com',
    },
    excluded: [
      'q x2 (search): header/footer site-search fields, stay unclassified (same as tokyu-land-contact)',
      'pref_house (select): only a `--` option, correctly warn-no-option (same as tokyu-land-contact)',
      'min_price/max_price (text): 売却・購入希望価格, no profile value, correctly unfilled',
      'land/bill (text): 物件面積, no profile value, correctly unfilled',
      'pref (select): only a `--` option, correctly warn-no-option',
      '(no name/id) x2 (submit): unaddressable (exclude)',
      'flow (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'type[] x3 (checkbox): out of scope (skip fixed)',
      'kind x6 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'contenttext (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'contact x3 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      '(no name/id) (submit): unaddressable (exclude)',
    ],
  },
  'tokyu-land-tenant-form.html': {
    expected: {
      // One dl per row on the real page (no <label> association); the dt
      // texts are kept as the scanner's nearby (same as tokyu-land-contact).
      'name': '山田 太郎',
      'kana': 'ヤマダ タロウ',
      'zip': '1000001',
      // 市区町村 fills the prefecture-prefixed concatenation; 番地・建物名
      // reads as building (same as tokyu-land-contact).
      'address1': '東京都千代田区千代田1-1',
      'address2': '千代田ビル101',
      // type=text so the value stays undashed (honest pin, same as kojin).
      'tel': '09012345678',
      'mail': 'yamada@example.com',
      'mail2': 'yamada@example.com',
      // T2: the 部署名 dt now reads as companyDepartment via the legend path (0.65).
      'team': '開発部',
    },
    excluded: [
      'q x2 (search): header/footer site-search fields, stay unclassified (same as tokyu-land-contact)',
      'park/cate/land (text): 出店施設・業種・面積, no profile value, correctly unfilled',
      'company (text): 貴社名, stays unclassified (LLM fallback; 会社語彙 candidate, same as R4-2a C3)',
      'job (text): 役職, stays unclassified (LLM fallback)',
      'pref (select): only a `--` option, correctly warn-no-option',
      '(no name/id) x2 (submit): unaddressable (exclude)',
      'flow (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'contenttext/shopdetail (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'contact x3 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      '(no name/id) (submit): unaddressable (exclude)',
    ],
  },
  'benesse-inquiry-form.html': {
    expected: {
      // Coded names, but the 姓/名 and せい/めい labels drive the split
      // (pinned honest).
      'q01001001': '山田',
      'q01001002': '太郎',
      'q01002001': 'ヤマダ',
      'q01002002': 'タロウ',
      // type=tel with maxlength=11; stays undashed (honest pin).
      'q01007001': '09012345678',
      // Email via the zemi@benesse.co.jp placeholder (email-via-placeholder
      // resolves here, unlike the kobe/otsuka bare cases).
      'q01008001': 'yamada@example.com',
      'q01008002': 'yamada@example.com',
    },
    excluded: [
      'q01005001/2/3 (tel): 会員番号 bare 3-split with digit-example placeholders, stay unclassified (LLM fallback; tel-split-by-name candidate, same as kobe ANSWER6)',
      'q90001001 (select): お問い合わせの分野 content question with real options, stays unclassified (LLM fallback)',
      'csrfmiddlewaretoken/action_flg/plan_param_flg/child_disp_flg2/child_disp_flg3/child_disp_flg4/child_disp_flg5/address_judge_area_cd/address_judge_msg_cd/address_judge_fst_warn/hdn_plan_cd/serial_id/remove_controlqa_list/all_controlqa_list/pattern_question_disp_list/mail_token/action (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'q90003001 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      'is_tablet (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'mitsui-chintai-inquiry-form.html': {
    expected: {
      // Only the katakana placeholder resolves (fullNameKana, same as the
      // kobe singleAnswer(ANSWER2) pin). Everything else rides numbered
      // Struts headings the scanner never reads.
      'singleAnswer(ANSWER1862)': 'ヤマダ　タロウ',
    },
    excluded: [
      'singleAnswer(ANSWER1861) (text): お名前 placeholder 例）三井 太郎, stays unclassified (LLM fallback; kanji person-name placeholder does not infer fullName, same as kobe ANSWER1)',
      'singleAnswer(ANSWER1863) (text): type=text with an email placeholder, stays unclassified (LLM fallback; email-via-placeholder candidate, same as kobe ANSWER3)',
      'singleAnswer(ANSWER1864) (text): type=text with a phone-number placeholder, stays unclassified (LLM fallback)',
      'singleAnswer(ANSWER1880) (text): ご希望物件名 placeholder, no profile value, correctly unfilled',
      'org.apache.struts.taglib.html.TOKEN (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'multiAnswer(ANSWER1860) (checkbox): out of scope (skip fixed)',
      'singleAnswer(ANSWER1883) (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'submit (submit): action element, never a fill target (exclude)',
    ],
  },
  'epson-ir-form.html': {
    expected: EPSON_EXPECTED,
    excluded: [
      'c_q1/c_q1_confirm (text): Eメールアドレス with no label or placeholder signal, stay unclassified (LLM fallback)',
      'c_q3_first/second (text): お名前 姓/名, stay unclassified (LLM fallback; coded-name person fields)',
      'c_q4_first/second (text): フリガナ セイ/メイ, stay unclassified (LLM fallback; coded-name kana fields)',
      'c_q5_left/right (text): 郵便番号 split, stay unclassified (LLM fallback; left/right-split zip candidate)',
      'c_q6 (select): 都道府県 options restored verbatim, stays unclassified (LLM fallback)',
      'c_q7 (text): 市郡区町村, stays unclassified (LLM fallback)',
      'c_q8 (text): 町域, stays unclassified (LLM fallback)',
      'c_q10 (text): 番地, stays unclassified (LLM fallback)',
      'c_q9 (text): ビル・マンション名, stays unclassified (LLM fallback; coded-name building field)',
      'c_q14_areacode/subscribercode (text): 電話番号 outer parts, stay unclassified (LLM fallback; areacode-split tel candidate)',
      'c_q15_areacode/subscribercode (text): FAX番号 outer parts, stay unclassified (LLM fallback)',
      'c_q11 (text): 会社名・団体名, stays unclassified (LLM fallback; coded-name company field)',
      '__pid/__pageId (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'searchAddr_c_q5 (submit): action element, never a fill target (exclude)',
      'c_q16 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'wcf5start (submit): action element, never a fill target (exclude)',
    ],
  },
  'ricoh-vulnerability-form.html': {
    // Same cform family as ricoh-risb-form: coded names with table-cell
    // headings the scanner never reads, so nothing resolves by rule. The
    // thinnest fixture so far (0 in-scope fills); pinned honest, same shape
    // as the richell-anketo-rating.html empty-expected precedent.
    expected: {},
    excluded: [
      'c_q73 (text): 会社名, stays unclassified (LLM fallback; coded-name company field)',
      'c_q74 (text): 組織名, stays unclassified (LLM fallback)',
      'c_q1_first/second (text): お名前 姓/名 with no label or placeholder signal, stay unclassified (LLM fallback; coded-name person fields)',
      'c_q10_first/second (text): お名前 ふりがな せい/めい, stay unclassified (LLM fallback; coded-name kana fields)',
      'c_q70/_confirm (text): メールアドレス確認再入力, stay unclassified (LLM fallback; coded-name email fields)',
      'c_q41 (select): 製品カテゴリー options restored verbatim, stays unclassified (LLM fallback)',
      'c_q72 (text): 製品名, stays unclassified (LLM fallback)',
      '__pid/__pageId/__token (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'c_q71 (checkbox): out of scope (skip fixed)',
      'c_q4 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'wcf5start (submit): action element, never a fill target (exclude)',
    ],
  },
  'brother-inquiry-form.html': {
    expected: {
      // Name tails zip1/tel/email resolve by name alone (same shape as the
      // bare cform coded names that resolve). The prefecture select keeps
      // its real options verbatim and resolves 東京都 by option text.
      'Public::Application::Userenquete_D__P__D_zip1': '100-0001',
      'Public::Application::Userenquete_D__P__D_prefecture_master_id': '10',
      'Public::Application::Userenquete_D__P__D_tel': '090-1234-5678',
      'Public::Application::Userenquete_D__P__D_email': 'yamada@example.com',
    },
    excluded: [
      '...company_name (text): 会社名, stays unclassified (LLM fallback; 会社語彙 candidate, same as R4-2a C3)',
      '...division (text): 部署名, stays unclassified (部署 vocabulary candidate)',
      '...name1/name2 (text): 姓/名 headings live in plain divs the scanner never reads as nearby, stay unclassified (LLM fallback; coded-name person fields)',
      '...address1 (text): 住所 with no readable nearby, stays unclassified (LLM fallback; coded-name address field)',
      '...Enquete.attribute141 (select): ご用件 options restored verbatim, stays unclassified (LLM fallback)',
      '...Enquete.attribute4064_plus_text (text): その他製品 free text, no profile value, correctly unfilled',
      '...Enquete.attribute142 (text): 製品名, no profile value, correctly unfilled',
      '...Enquete.attribute465_plus_text (text): その他 free text, no profile value, correctly unfilled',
      '...Enquete.attribute343 (text): 納入時期 free text, no profile value, correctly unfilled',
      '...Enquete.attribute145 (select): 業種 options restored verbatim, stays unclassified (LLM fallback)',
      '...Enquete.attribute148_plus_text (text): その他 free text, no profile value, correctly unfilled',
      '(no name/id) (button): unaddressable (exclude)',
      'csrf_id (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'Public::Application::Userenquete_D__P__D_VisitorData.attribute391/Public::Application::Userenquete_D__P__D_Enquete.attribute4064 x10 (checkbox): out of scope (skip fixed)',
      'Public::Application::Userenquete_D__P__D_Enquete.attribute465 x7/Public::Application::Userenquete_D__P__D_Enquete.attribute341 x12/Public::Application::Userenquete_D__P__D_Enquete.attribute342 x7 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'Public::Application::Userenquete_D__P__D_Enquete.attribute146/Public::Application::Userenquete_D__P__D_Enquete.attribute149 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'Public::Application::Userenquete_D__P__D_Enquete.attribute148 x8/Public::Application::Userenquete_D__P__D_Enquete.attribute796 x12 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'selected_action/cart_delete/action/serialkey/Public::Application::Userenquete_D__P__D_language_master_id/use_recaptcha (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'kikkoman-media-form.html': {
    expected: {
      // [tel1/2/3] suffix splits like the kikkoman-website e_25028 precedent.
      // The personal/company fields are bare coded names (the real page has
      // no placeholder attributes and table-cell headings the scanner never
      // reads), so nothing else resolves by rule.
      'e_29115[tel1]': '090',
      'e_29115[tel2]': '1234',
      'e_29115[tel3]': '5678',
    },
    excluded: [
      'e_29111 (text): 貴社名, stays unclassified (LLM fallback; coded-name company field)',
      'e_29112 (text): 媒体名, no profile value, correctly unfilled',
      'e_29113 (text): お名前 with no label or placeholder signal, stays unclassified (LLM fallback)',
      'e_29114 (text): お名前（ふりがな）, stays unclassified (LLM fallback; coded-name kana field)',
      'e_29116/_re (text): type=text with メールアドレス headings, stay unclassified (LLM fallback; email-via-heading candidate, same as kikkoman-website e_25031)',
      'e_29110 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      '__send (submit): action element, never a fill target (exclude)',
      '__name/f/gtmkr (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'kikkoman-works-form.html': {
    expected: {
      // 姓/名 placeholders split kanji; せい/めい placeholders read hiragana
      // (same as kikkoman-website-form).
      'e_26139': '山田',
      'e_26140': '太郎',
      'e_26141': 'やまだ',
      'e_26142': 'たろう',
      // [tel1/2/3] suffix splits like the kikkoman-website e_25028 precedent.
      'e_26145[tel1]': '090',
      'e_26145[tel2]': '1234',
      'e_26145[tel3]': '5678',
    },
    excluded: [
      'e_26138 (text): お問い合わせタイトル, no profile value, correctly unfilled',
      'e_26144 (select): 性別 options restored verbatim, stays unclassified (LLM fallback; coded-name gender-select candidate, same as kikkoman-website e_25042)',
      'e_25071/_re (text): type=text with メールアドレス headings, stay unclassified (LLM fallback; email-via-heading candidate, same as kikkoman-website e_25031)',
      'e_26143 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'agreement (checkbox): out of scope (skip fixed)',
      '__send (submit): action element, never a fill target (exclude)',
      'commit_agreement/__name/f/gtmkr (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'aeon-voice-form.html': {
    expected: {
      // Salesforce mirror fields (type=text in a display:none form,
      // JS-populated from the visible inputs on submit): the scanner sees
      // them, so they pin honest too.
      'page:apexForm1:hidden_name': '山田 太郎',
      'page:apexForm1:hidden_sex': '女性',
      'page:apexForm1:hidden_email': 'yamada@example.com',
      // Undashed here while the visible phone fills dashed (honest pin).
      'page:apexForm1:hidden_phone': '09012345678',
      // The イオン ハナコ placeholder infers fullNameKana (same shape as the
      // kobe singleAnswer(ANSWER2) pin, U+3000 separator kept).
      'name_field': 'ヤマダ　タロウ',
      'email': 'yamada@example.com',
      'phone': '090-1234-5678',
    },
    excluded: [
      'page:apexForm1:hidden_shop (text): 店舗名 mirror, stays unclassified (no profile value for shop)',
      'shop (text): 店舗名, no profile value, correctly unfilled',
      'page:apexForm1 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'page:apexForm1:hidden_submitBtn (button): action element, never a fill target (exclude)',
      'page:apexForm1:hidden_comment (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'page:apexForm1:hidden_isStoreRequired/page:apexForm1:hidden_clientParam/com.salesforce.visualforce.ViewState/com.salesforce.visualforce.ViewStateVersion/com.salesforce.visualforce.ViewStateMAC (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'form-field-checkbox (checkbox): out of scope (skip fixed)',
      'comment (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'form-field-radio x3 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
    ],
  },
  'auhikari-callback-form.html': {
    expected: {
      // tr/th rows restore the real headings as the scanner's nearby:
      // 氏名/カナ rows split 姓/名, phone/zip rows split by name suffix,
      // 番地・号 reads as street, マンション/部屋番号 both read as building
      // (honest pin of the duplicate fill, same shape as R4-2a C8).
      'name1': '山田',
      'name2': '太郎',
      'kana1': 'ヤマダ',
      'kana2': 'タロウ',
      'tel1_1': '090',
      'tel1_2': '1234',
      'tel1_3': '5678',
      'zip_1': '100',
      'zip_2': '0001',
      'add5': '千代田1-1',
      'add6': '千代田ビル101',
      'add7': '千代田ビル101',
      'email': 'yamada@example.com',
    },
    excluded: [
      'label_add1234 (text): readonly zip-lookup display under the 住所 th, stays unclassified (LLM fallback)',
      'mode/sid/tel2_1/tel2_2/tel2_3 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'q1 x5/q2 x12 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'add (button): action element, never a fill target (exclude)',
      'add_cd/add1/add2/add3/add4 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'week1/week2/week3/week4/week5/week6/week7/week8/time1/time2/time3/time4/time5 (checkbox): out of scope (skip fixed)',
      'quest (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      '(no name/id) (submit): unaddressable (exclude)',
    ],
  },
  'hamamatsu-kocho-form.html': {
    expected: {
      // ふりがな label + 全角ひらがな memo reads as fullNameKana (hiragana);
      // placeholder 空のため結合区切りは既定半角スペース (forum.html と同形)。
      'item_1': '山田 太郎',
      'item_2': 'やまだ たろう',
      // type=text + maxlength=10 でも zip は dashed 値 (undashed の tel item_8 と対照)。
      'item_6': '100-0001',
      'item_7': '東京都千代田区千代田1-1 千代田ビル101',
      'item_8': '09012345678',
      // type=text でも メールアドレス label で email 解決 (otsuka mail の
      // placeholder 由来は未解決のまま。label/placeholder 非対称)。
      'item_10': 'yamada@example.com',
    },
    excluded: [
      'item_9 (text): 9.ファクス, stays unclassified (LLM fallback; ファクス label 語彙なし。ff-csr fax は name=fax + type=tel で tel 値を fill しており非対称)',
      'item_11 (text): 11.問い合わせ件名, no profile value, correctly unfilled',
      'page_id/page_title/page_url/item_cnt/form_type/discrimination_number/publish_ssl_flg/mail_1/reply_mail_1/label_1/nes_1/desc_mail_1/mail_2/reply_mail_2/label_2/nes_2/desc_mail_2/label_3/nes_3/desc_mail_3/label_4/nes_4/desc_mail_4/label_5/nes_5/desc_mail_5/mail_6/reply_mail_6/label_6/nes_6/desc_mail_6/mail_7/reply_mail_7/label_7/nes_7/desc_mail_7/mail_8/reply_mail_8/label_8/nes_8/desc_mail_8/mail_9/reply_mail_9/label_9/nes_9/desc_mail_9/mail_10/reply_mail_10/label_10/nes_10/desc_mail_10/mail_11/reply_mail_11/label_11/nes_11/desc_mail_11 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'item_3 x2/item_4 x8/item_5 x7 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'item_12 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'label_12/nes_12/desc_mail_12 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) (submit): unaddressable (exclude)',
      '(no name/id) (reset): unaddressable (exclude)',
      '(no name/id) (image): unaddressable (exclude)',
      'code/dept/page/ENQ_RETURN_MAIL_SEND_FLG/publish_ssl_flg (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'okayama-inquiry-form.html': {
    expected: {
      // ふりがな label + hurigana name reads as fullNameKana (hiragana);
      // placeholder 空のため結合区切りは既定半角スペース (hamamatsu item_2 と同形)。
      'namae': '山田 太郎',
      'hurigana': 'やまだ たろう',
      'jyusyo': '東京都千代田区千代田1-1 千代田ビル101',
      // denwa_no name は dashed 値 (hamamatsu item_8 の bare 名は undashed。N4系)。
      'denwa_no': '090-1234-5678',
      'mail': 'yamada@example.com',
      'mail2': 'yamada@example.com',
    },
    excluded: [
      'q x4 (text): header/footer/article-ID site-search boxes (検索キーワード/記事ID検索), stay unclassified (same as forum.html s)',
      'fax_no (text): ファクス番号, stays unclassified (LLM fallback; hamamatsu item_9 と同形。ff-csr fax は name=fax + type=tel で tel 値を fill しており非対称)',
      'taitoru (text): 件名, no profile value, correctly unfilled',
      'cx/ie (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'search_button (button): action element, never a fill target (exclude)',
      'cx/ie (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      'cx/ie (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'search_button_sp/search_button3 (button): action element, never a fill target (exclude)',
      'cx/ie (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'naiyou (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'mode/id/so/ref (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'btn2 (button): action element, never a fill target (exclude)',
    ],
  },
  'fukuoka-teian-form.html': {
    expected: {
      // 氏名/フリガナ nearby + name/kana: fullName + fullNameKana (katakana)。
      // placeholder 空のため結合区切りは既定半角スペース (otsuka と同形)。
      'name': '山田 太郎',
      'kana': 'ヤマダ タロウ',
      // maxlength=7 のため undashed (dashed 8字は入らない)。
      'zipcode': '1000001',
      // ku (区 select) は未分類のまま、choumei が都道府県付き連結を fill。
      'choumei': '東京都千代田区千代田1-1',
      // アパートマンション reads as building.
      'apartname': '千代田ビル101',
      'phone': '090-1234-5678',
      'email': 'yamada@example.com',
      // 年齢 select: 実選択肢の 30代 (value 30) に解決 (profile 1990年生)。
      'age': '30',
    },
    excluded: [
      'm_title (text): 件名, no profile value, correctly unfilled',
      'ku (select): 区 select (―-/中央区/…/不明 実選択肢), stays unclassified (LLM fallback; prefecture/ward-select candidate, same as kobe ANSWER4)',
      'choume/ban/gou + sex radios: HTML comments on the real page (phantom, never scanned; dropped from the fixture)',
      'm_data (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'mode/maxlength/sex (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) (submit): unaddressable (exclude)',
    ],
  },
  'tokyo-steel-contact-form.html': {
    expected: {
      'department': '普通科',
      'name': '山田 太郎',
      'tel': '09012345678',
      'email': 'yamada@example.com',
      'email2': 'yamada@example.com',
    },
    excluded: [
      'method/ticket (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'message (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'agree (checkbox): out of scope (skip fixed)',
      'entry (button): action element, never a fill target (exclude)',
    ],
  },
  'taiheiyo-cement-contact-form.html': {
    expected: {
      'name': '山田太郎',
      'kana': '山田太郎',
      'email': 'yamada@example.com',
      'emailConfirm': 'yamada@example.com',
      'postal': '1000001',
      'address': '東京都千代田区千代田1-1 千代田ビル101',
      'tel': '09012345678',
      'department': '普通科',
    },
    excluded: [
      '_formrun_redirect (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) x4 (textarea): unaddressable (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      '(no name/id) x5 (textarea): unaddressable (exclude)',
      'message (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      '(no name/id) x4 (button): unaddressable (exclude)',
    ],
  },
  'ngk-contact-form.html': {
    expected: {
      'name': '山田 太郎',
      'name-kana': 'やまだ たろう',
      'zip': '1000001',
      'address': '東京都千代田区千代田1-1 千代田ビル101',
      'tel': '090-1234-5678',
      'mail': 'yamada@example.com',
      'department': '普通科',
    },
    excluded: [
      '_csrfToken (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      'inquiry (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'agree (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'agree (checkbox): out of scope (skip fixed)',
      '(no name/id) (button): unaddressable (exclude)',
      '_Token[fields]/_Token[unlocked] (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'lixil-inquiry-form.html': {
    expected: {
      'item_name': '山田 太郎',
      'name_sei': '山田',
      'name_mei': '太郎',
      'kokyaku_sei_kana': 'ヤマダ',
      'kokyaku_mei_kana': 'タロウ',
      'post:a': '100',
      'post:t': '0001',
      'pref_name': '東京都',
      'address1': '東京都千代田区千代田1-1',
      'address2': '千代田ビル101',
      'address3': '東京都千代田区千代田1-1',
      'address4': '東京都千代田区千代田1-1',
      'telephone': '090-1234-5678',
      'mail': 'yamada@example.com',
      'mail:cf': 'yamada@example.com',
    },
    excluded: [
      'question (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'f012876605/f012876606/f012876607/f012876608/f013047598 (file): not scanned (scan covers text/email/tel/search + select; exclude)',
      'post (button): action element, never a fill target (exclude)',
      'privacy (checkbox): out of scope (skip fixed)',
      'privacy/detect/SMPFORM/qcat/mode/pref_name_no/work_id/work_val/category_id/category_val/customer_id/pref_name_v/hc_val/hc_result/hc_sum (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'submit (submit): action element, never a fill target (exclude)',
    ],
  },
  'sapporo-iken-form.html': {
    expected: {
      // お名前 label + item_2: fullName。メールアドレス label (type=text) で
      // email 解決 (hamamatsu item_10・okayama mail と同形)。
      'item_2': '山田 太郎',
      'item_3': 'yamada@example.com',
    },
    excluded: [
      'q (text): site-search field (検索), stays unclassified (same as forum.html s)',
      'item_1 (textarea): ご意見・ご提案本文, not scanned (scan covers text/email/tel/search + select; exclude)',
      'btnG (image): action element, never a fill target (exclude)',
      'lang/view/fields.label/page_id/page_title/page_url/item_cnt/form_type/discrimination_number/publish_ssl_flg (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'item_1 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'label_1/nes_1/input_check_1/input_type_1/desc_mail_1/mail_2/reply_mail_2/label_2/nes_2/input_check_2/input_type_2/desc_mail_2/mail_3/reply_mail_3/label_3/nes_3/input_check_3/input_type_3/desc_mail_3 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) (submit): unaddressable (exclude)',
      '(no name/id) (reset): unaddressable (exclude)',
      '(no name/id) (image): unaddressable (exclude)',
      'code/dept/page (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'kubota-engine-contact-form.html': {
    expected: {
      'last_name': '山田',
      'last_kana': 'やまだたろう',
      'zipCode': '1000001',
      'pref_name': '東京都',
      'address': '千代田区千代田1-1 千代田ビル101',
      'phone': '090-1234-5678',
      'email': 'yamada@example.com',
      'email_confirm': 'yamada@example.com',
      'department': '普通科',
    },
    excluded: [
      'fid/token/cno/referer/g-recaptcha-response/action (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'inquiry (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'check (checkbox): out of scope (skip fixed)',
      '(no name/id) (reset): unaddressable (exclude)',
      'subBtn (submit): action element, never a fill target (exclude)',
    ],
  },
  'mailform.html': {
    expected: {
      // 葛飾区立図書館 Eメールレファレンス (LiCS系)。氏名/ふりがな/email/tel。
      // txtKana は「ふりがな」label のため hiragana の結合値 (honest pin)。
      'txtName': '山田 太郎',
      'txtKana': 'やまだ たろう',
      'txtMail': 'yamada@example.com',
      'txtTel': '090-1234-5678',
    },
    excluded: [
      'ddBig:btnBig/ddMiddle:btnMiddle/ddSmall:btnSmall (submit): action element, never a fill target (exclude)',
      'radioReply x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'txtQtext (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'btnConfirm/btnReset (submit): action element, never a fill target (exclude)',
    ],
  },
  'opinion-html.html': {
    expected: {
      // 江東区立図書館ご意見フォーム (TRC系)。氏名/住所/email が fill。
      // item1 は「住所」単独 label のため full address の結合値 (honest pin)。
      'item0': '山田 太郎',
      'item1': '東京都千代田区千代田1-1 千代田ビル101',
      'item3': 'yamada@example.com',
    },
    excluded: [
      // header/footer の検索 form (T_Keyword/B_Search/T_File/T_* hidden) と
      // login form (login/password/option) は別 form のため trimmed (exclude)。
      'item2_0/item2_1/item2_2 (text): 電話番号 bare 3-split with no label/id signal per part, stay unclassified (LLM fallback; tel-split-by-name candidate, same as kobe ANSWER6)',
      'item4 (text): 件名, no profile value, correctly unfilled',
      'item5 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'item6 x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'B_Reset (button): action element, never a fill target (exclude)',
      'B_Submit (submit): action element, never a fill target (exclude)',
      'idSubTop/formId/preview/httpReferer/T_Id_s/T_IdCnt/T_IdFaq/totalFileLimit (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'arakawa-mailform.html': {
    expected: {
      // 荒川区立図書館お問い合わせ (LiCS系)。氏名/住所/mail/tel が fill。
      // textAddress は「ご住所」単独 label のため full address の結合値 (honest pin)。
      'textName': '山田 太郎',
      'textAddress': '東京都千代田区千代田1-1 千代田ビル101',
      'textMail': 'yamada@example.com',
      'textTel': '090-1234-5678',
    },
    excluded: [
      '(no name/id) x4 (button): unaddressable (exclude)',
      'big/middle/small (button): action element, never a fill target (exclude)',
      'groupKind x3 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'textMessage (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'groupReply x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'btnConfirm (submit): action element, never a fill target (exclude)',
    ],
  },
  '2000033.html': {
    expected: {
      // 板橋区 CMS メールアドレス確認ステップ。type=text のため email 解決せず
      // full-address 値が fill される (honest pin。email-via-label 候補)。
      'MailAddress': '東京都千代田区千代田1-1 千代田ビル101',
      'MailAddressKakunin': '東京都千代田区千代田1-1 千代田ビル101',
    },
    excluded: [
      // header の Google CSE 検索 form (q/cx/ie) は別 form のため trimmed (exclude)。
      'Token/PathBase/__RequestVerificationToken (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'tosyo-00001-html.html': {
    // 新宿区 中央図書館ページのページ評価ミニ survey (区CMS fb.php)。
    // in-scope の fill 対象なし (radio のみで性別・年代群に該当せず)。
    // richell-anketo-rating.html と同型の thin fixture。
    expected: {},
    excluded: [
      // q2「本ページの情報は役に立ちましたか」/ q3「見つけやすかったですか」:
      // いずれも性別・年代群ではないため bundled のまま stay unclassified (radio policy)。
      'widgetCloseButton/widgetCloseButtonSp (button): action element, never a fill target (exclude)',
      'email/mode/code/pgid/url/baseurl/q1 x2 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'q2 x3/q3 x3 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'send (submit): action element, never a fill target (exclude)',
    ],
  },
  'azbil-kikubari-form.html': {
    expected: {
      'c_q8_citycode': '千代田区',
      'c_q13_citycode': '千代田区',
      'c_q17_citycode': '千代田区',
    },
    excluded: [
      '__pid/__pageId/__token (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'searchAddr_c_q3 (submit): action element, never a fill target (exclude)',
      'c_q10 x6 (checkbox): out of scope (skip fixed)',
      'c_q11 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'c_q12 x2/c_q16 x2/c_q20 x3/c_q23 x5/c_q24 x5/c_q25 x5/c_q26 x6/c_q28 x14 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'c_q19 x2/c_q21 x7/c_q36 x6/c_q35 (checkbox): out of scope (skip fixed)',
      'wcf5start (submit): action element, never a fill target (exclude)',
    ],
  },
  'keyence-inquiry-form.html': {
    expected: {
      'checkRegistered': 'yamada@example.com',
      'lastName': '山田',
      'firstName': '太郎',
      'emailAddress': 'yamada@example.com',
      'companyName': '株式会社サンプル',
      'zipCode': '1000001',
      'stateID': '13',
      'address1': '千代田区千代田1-1',
      'address2': '千代田ビル101',
      'department': '普通科',
      'phoneNumber': '090-1234-5678',
      'mobilePhoneNumber': '090-1234-5678',
    },
    excluded: [
      'currentUrl/enqueteId/qEnglish/qSite/qDisplay/qAttribute/enq0 x3/qEnglish/qSite/qDisplay/qAttribute/qEnglish/qSite/qDisplay/qAttribute/qEnglish/qSite/qDisplay/qAttribute/qEnglish/qSite/qDisplay/qAttribute/qEnglish/qSite/qDisplay/qAttribute (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'enq1 x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'enq2 x8 (checkbox): out of scope (skip fixed)',
      'enq3 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'enq4 x9/enq5 x7 (checkbox): out of scope (skip fixed)',
      'js-form-btnCheckRegistered (button): action element, never a fill target (exclude)',
      'loginPassword (password): not scanned (scan covers text/email/tel/search + select; exclude)',
      'loginPassword-showPassword (checkbox): out of scope (skip fixed)',
      'login/js-form-btnCheckSendMail/js-form-btnCheckSendAutoSignupMail/js-signinForm-btnBackToEmail/js-signinForm-btnForwardToRegister (button): action element, never a fill target (exclude)',
      'suzChangePwdFlg/forwardUrl (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'js-link-regstrationNext-1/js-link-regstrationPrev-1/js-link-regstrationNext-2/js-link-regstrationPrev-2 (button): action element, never a fill target (exclude)',
      'newsLetter (checkbox): out of scope (skip fixed)',
      'confirm/js-link-regstrationPrev-3 (button): action element, never a fill target (exclude)',
      'hidMaxStepCount/formActionPath/sb/qTitle/suzHdnLandingPageUrl/forwardType/suzSesOutBkPgUrl/org.apache.struts.taglib.html.TOKEN (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'js-sendEmail-btnBackToSignin/js-sendEmail-btnBackToAutoSignup (button): action element, never a fill target (exclude)',
      '(no name/id) x7 (button): unaddressable (exclude)',
    ],
  },
  'sysmex-contact-form.html': {
    expected: {
      'name': '山田 太郎',
      'name_furigana': 'やまだ たろう',
      'facility_company': '株式会社サンプル',
      // T2: the opened office gate lets the department-name token read as the
      // school department (DISPATCH order keeps name=department fields there),
      // so 普通科 fills. Japanese-only 部署名 fields read as companyDepartment.
      'department': '普通科',
      'zip': '1000001',
      'pref': '13',
      'city': '千代田区',
      'building': '千代田ビル101',
      'tel': '09012345678',
      'fax': '09012345678',
      'email': 'yamada@example.com',
    },
    excluded: [
      '_csrfToken/inquiry_other (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'inquiry_other x3 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      '(no name/id) (button): unaddressable (exclude)',
      'inquiry (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'inquiry_type (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      '_Token[fields]/_Token[unlocked] (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'lasertec-inquiry-form.html': {
    expected: {
      'seiName': '山田',
      'meiName': '太郎',
      'seiNameKana': 'ヤマダ',
      'meiNameKana': 'タロウ',
      'department': '普通科',
      'post:a': '100',
      'post:t': '0001',
      'pref': '東京都',
      'address': '千代田区',
      'address2': '千代田ビル101',
      'address3': 'Long Island City',
      'phone:a': '090',
      'phone:e': '1234',
      'phone:n': '5678',
      'mail': 'yamada@example.com',
    },
    excluded: [
      '(no name/id) (button): unaddressable (exclude)',
      'inquiry (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'detect/SMPFORM/mode (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'submit (button): action element, never a fill target (exclude)',
    ],
  },
  'toyoda-gosei-form.html': {
    expected: {
      'name': '山田 太郎',
      'name2': 'やまだ たろう',
      'zip1': '100',
      'zip2': '0001',
      'adr1': '千代田1-1 千代田ビル101',
      'tel': '090-1234-5678',
      'email': 'yamada@example.com',
      'email2': 'yamada@example.com',
    },
    excluded: [
      '_form_id_/action/token_seihin_form (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'matter (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'submit (button): action element, never a fill target (exclude)',
    ],
  },
  'mitsubishi-materials-form.html': {
    expected: {
      'e_8552': '山田',
      'e_8553': '太郎',
      'e_8554': 'ヤマダ',
      'e_8555': 'タロウ',
      'e_8556': 'yamada@example.com',
      'e_8556_re': 'yamada@example.com',
      'e_8564[tel1]': '090',
      'e_8564[tel2]': '1234',
      'e_8564[tel3]': '5678',
      'e_8565[tel1]': '090',
      'e_8565[tel2]': '1234',
      'e_8565[tel3]': '5678',
      'e_8561[zip1]': '100',
      'e_8561[zip2]': '0001',
      'e_8562': '東京都',
      'e_8563': '千代田1-1',
      'e_8591': '千代田ビル101',
      'e_8558': '株式会社サンプル',
      // T2: the 部署名 th now reads as companyDepartment via the legend path (0.65).
      'e_8559': '開発部',
    },
    excluded: [
      'e_8569[value][] x2 (checkbox): out of scope (skip fixed)',
      '(no name/id) (button): unaddressable (exclude)',
      '__send (submit): action element, never a fill target (exclude)',
      '__search_e_8561/e_8557/e_8560/__name/f (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'yoshinoya-store-form.html': {
    expected: {
      'name': '山田太郎',
      'kana': 'ヤマダタロウ',
      'zip1': '100',
      'zip2': '0001',
      'pref': '東京都',
      'address': '千代田区千代田1-1 千代田ビル101',
      'tel': '090-1234-5678',
      'mail': 'yamada@example.com',
      'store_name': '山田太郎',
    },
    excluded: [
      '_csrfToken (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      'request (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'data_agree (checkbox): out of scope (skip fixed)',
      '(no name/id) (button): unaddressable (exclude)',
      'recaptchaToken (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'tonami-luggage-form.html': {
    expected: {
      'position': '開発部',
      'name-sei': '山田',
      'name-mei': '太郎',
      'post_code': '100-0001',
      'prefectures': '東京都',
      'address1': '東京都千代田区千代田1-1',
      'address2': '千代田ビル101',
      'phone_number': '090-1234-5678',
      'email': 'yamada@example.com',
      'email_confirm': 'yamada@example.com',
    },
    excluded: [
      '(no name/id) (submit): unaddressable (exclude)',
      '_wpcf7/_wpcf7_version/_wpcf7_locale/_wpcf7_unit_tag/_wpcf7_container_post/_wpcf7_posted_data_hash/_cf7msm_multistep_tag/cf7msm-no-ss (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'radio-type x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'zip-btn (button): action element, never a fill target (exclude)',
      'textarea1 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'agree (checkbox): out of scope (skip fixed)',
      '(no name/id) (submit): unaddressable (exclude)',
    ],
  },
  'contact.html': {
    expected: {
      // お名前 th is shared by name1/name2 (same-label split does not apply),
      // so both read as fullName (same as the ois-contact kana pair shape).
      'name1': '山田 太郎',
      'name2': '山田 太郎',
      // フリガナ th is shared the same way; both read as fullNameKana.
      'kana1': 'ヤマダ タロウ',
      'kana2': 'ヤマダ タロウ',
      // zip1/zip2 stay undashed full values (no hyphen split applied).
      'zip1': '1000001',
      'zip2': '1000001',
      'pref_code': '東京都',
      // 市区町村・番地 fills the prefecture-prefixed concatenation
      // (same as the tokyu-land-contact address1 pin).
      'address1': '東京都千代田区千代田1-1',
      'address2': '千代田ビル101',
      'tel': '09012345678',
      'email': 'yamada@example.com',
    },
    excluded: [
      'js_language (select): header language switcher, not part of the contact form, trimmed (exclude)',
      'inquiry (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'field[]/inquiry:v#required/inquiry:c/field[]/name1:v#required/name1:c/field[]/name2:v#required/name2:c/field[]/kana1:v#required/kana1:c/field[]/kana2:v#required/kana2:c/field[]/zip1:v#required/zip1:v#digits/zip1:c/field[]/zip2:v#required/zip2:v#digits/zip2:c/field[]/pref_code:v#required/field[]/address1:v#required/address1:c/field[]/address2:c/field[]/tel:v#required/tel:c/field[]/email:v#email/email:v#required/email:c/step/error/id (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'ACMS_POST_Form_Confirm (button): action element, never a fill target (exclude)',
    ],
  },
  'inquiry-html.html': {
    expected: {
      // お名前 pair: the first reads fullName, the second lastName
      // (same-label grouping shape; pinned honest).
      'query[1][0]': '山田 太郎',
      'query[1][1]': '山田',
      // ふりがな pair: the first reads hiragana full, the second kanji
      // firstName (classification drift; pinned honest, not as desired).
      'query[2][0]': 'やまだ たろう',
      'query[2][1]': '太郎',
      'query[7]': '100-0001',
      'query[8]': '東京都',
      'query[9]': '千代田区',
      'query[10]': '千代田ビル101',
      // maxlength=24 fits the dashed form (dash-condition candidate,
      // same as R4-2b N4 aeon vs kojin).
      'query[11]': '090-1234-5678',
      'query[3]': 'yamada@example.com',
      // 高校名 reads as the school vocabulary.
      'query[1035]': '都立日比谷高校',
    },
    excluded: [
      'query[1027] (select): 志望学科 with real options, stays unclassified (LLM fallback)',
      'dummy/stage/check/__query_token__ (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'query[1030] x5/query[1028] x3 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'query[22] (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      '(no name/id) (submit): unaddressable (exclude)',
    ],
  },
  'index-asp.html': {
    expected: {
      // Bare names carry the split (kanzi/kana + sei/mei tokens).
      'kanzi_sei': '山田',
      'kanzi_mei': '太郎',
      'kana_sei': 'ヤマダ',
      'kana_mei': 'タロウ',
    },
    excluded: [
      'seibetsu1 (radio): gender pair 男性/女性 in wrapping labels with no for-association, stays unclassified (wrapped-label radio candidate)',
      'yubin (tel): bare yubin name + 1234567 placeholder, stays unclassified (LLM fallback; yubin-via-name candidate, same as kobe ANSWER6)',
      'state (select): numeric values 00-48 with real prefecture names, stays unclassified (LLM fallback; numeric-pref candidate)',
      'jusho1/2/3 (text): bare jusho names, stay unclassified (LLM fallback; address-via-name candidate)',
      'phone1 (text): bare phone1 name with ハイフンなし hint, stays unclassified (LLM fallback; tel-via-name candidate)',
      'school_1 (select): 高校所在地県名 with real prefecture options, stays unclassified (LLM fallback)',
      'school_2 (select): kana index for the 高校検索 helper, stays unclassified (LLM fallback)',
      'koukou (select): genuinely empty on the real page (JS-populated), correctly warn-no-option',
      'grade (select): 学年 with real options, stays unclassified (LLM fallback)',
      'yobikou/yobikou_k (text): 予備校・塾名/校舎, no profile value, correctly unfilled',
      'PCmail (text): type=text named PCmail, stays unclassified (LLM fallback; email-via-name candidate, same as otsuka mail)',
      'jyouken14_2 (text): conditional その他 detail field, stays unclassified (LLM fallback)',
      'school_btn (button): action element, never a fill target (exclude)',
      'm_maga x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'gakka1/gakka2/gakka3/gakka4/gakka5/gakka6 x6/shiryou1 x7/shiryou2/shiryou3/jyouken1/jyouken2/jyouken3/jyouken4/jyouken5/jyouken6/jyouken7/jyouken8/jyouken9/jyouken10/jyouken11/jyouken12/jyouken13/jyouken14 (checkbox): out of scope (skip fixed)',
      'sub_btn (submit): action element, never a fill target (exclude)',
      'reset (reset): not scanned (scan covers text/email/tel/search + select; exclude)',
    ],
  },
  '6932.html': {
    expected: {
      // 姓/名 labels resolve against the crossed en names.
      'first-name': '太郎',
      'last-name': '山田',
      // セイ/メイ labels both read fullKana (same shape as kyutech kana).
      'kana_1': 'ヤマダ タロウ',
      'kana_2': 'ヤマダ タロウ',
      'zipcode': '1000001',
      // 東京都 resolves to the +10-scheme value (same as R4-2b N3 brother).
      'pref': '23',
      'city': '千代田区',
      'address': '千代田1-1',
      'build': '千代田ビル101',
      'tel': '09012345678',
      // The sex name itself matches the gender rule (same as the otsuka
      // sex precedent); the wrapping labels are unread but unneeded here.
      'sex': '女性',
    },
    excluded: [
      'school_ken (select): 高校所在地県名 with real prefecture options; the school token reads as the school vocabulary, so the prefecture options never match (warn-no-option; school_ken-misread candidate)',
      'school (select): genuinely a single 高校選択 option (JS-populated), correctly warn-no-option',
      'freetext (text): 高校フリー入力 with no label signal, stays unclassified (LLM fallback)',
      'birthday_y/m/d (select): real ranges with matching options, stay unclassified (LLM fallback; birthday-by-name candidate, cf. profile-fields-form by_y)',
      'buzai[] x11 (checkbox): out of scope (skip fixed)',
      'stage x12 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'viewmode (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'sex x2/dm x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'value_1[] x12 (checkbox): out of scope (skip fixed)',
      '(no name/id) (submit): unaddressable (exclude)',
      'dai_cd/edano/seccode (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'kit-contact-form.html': {
    expected: {
      // Bare sei/mei/sei_kana/mei_kana names resolve via name tokens.
      'sei': '山田',
      'mei': '太郎',
      'sei_kana': 'ヤマダ',
      'mei_kana': 'タロウ',
      'tel': '09012345678',
      'mail': 'yamada@example.com',
      'mail2': 'yamada@example.com',
    },
    excluded: [
      's (text): header site-search field in a separate form, trimmed (exclude; same as forum.html s)',
      'org/unit (text): 組織名/部署名 with no label association, stay unclassified (LLM fallback; company/department-by-name candidate, same as R4-2b C3)',
      '(no name/id) (submit): unaddressable (exclude)',
      'toiawase_komoku x20 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'toiawase_body (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'scroll_y/hid_token (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'shimane-inquiry-form.html': {
    expected: {
      // Coded names; the 氏名 label drives fullName.
      'question_answers[1]': '山田 太郎',
      // 企業・団体名 resolves to company (unlike the bare tenant C3 case).
      'question_answers[2]': '株式会社サンプル',
      'question_answers[3]': 'yamada@example.com',
    },
    excluded: [
      'question_answers[4] (select): お問い合わせ区分 with real numbered options, stays unclassified (LLM fallback)',
      'captcha (text): 画像認証, no profile value, correctly unfilled',
      'q (text): header site-search field in a separate form, trimmed (exclude; same as forum.html s)',
      'language (select): header JP/EN switcher in a separate form, trimmed (exclude)',
      'ie/oe/hl/domains (hidden): header search-form state, trimmed with the form (exclude)',
      'sitesearch x2 (radio): header search-scope radios (display:none), trimmed with the form (exclude)',
      '(no name/id) (submit): header search submit, trimmed with the form (exclude)',
      'authenticity_token (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'question_answers[5] (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'captcha_key (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'commit (submit): action element, never a fill target (exclude)',
      'current_url/current_url_title (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'aoyama-campus-inquiry.html': {
    expected: {
      // 名前の姓/名 labels with 姓/名 placeholders drive the split.
      'field_2295359_sei': '山田',
      'field_2295359_mei': '太郎',
      'field_2295420': 'yamada@example.com',
      'field_2295420_mcon': 'yamada@example.com',
      // 連絡先 3-split with 市外局番/市内局番/加入者番号 labels.
      'field_2295364_1': '090',
      'field_2295364_2': '1234',
      'field_2295364_3': '5678',
    },
    excluded: [
      'field_2295371 (text): 学生番号, no profile value, correctly unfilled',
      'field_2295375 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_2295375/field_2295410 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'field_2295410/field_2295416[0] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_2295416[0]/field_2295418[0]/field_2295418[1]/field_2295418[2]/field_2295418[3]/field_2295418[4]/field_2295418[5] (checkbox): out of scope (skip fixed)',
      'field_2295418[0]/field_2295418[1]/field_2295418[2]/field_2295418[3]/field_2295418[4]/field_2295418[5] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_2295366 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'submit (submit): action element, never a fill target (exclude)',
      'validated (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) x2 (button): unaddressable (exclude)',
    ],
  },
  'aoyama-sagamihara-career.html': {
    expected: {
      'field_7341167_sei': '山田',
      'field_7341167_mei': '太郎',
      'field_7341168': 'yamada@example.com',
      'field_7341168_mcon': 'yamada@example.com',
      // 学部・学科、研究科 reads as the school vocabulary (same as the
      // ff-csr 勤務先・学校名 pin).
      'field_7341181': '都立日比谷高校',
    },
    excluded: [
      'field_7341173 (text): 学生番号 / Student ID Number, no profile value, correctly unfilled',
      'field_7341180 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_7341180 x3 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'field_7341182 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_7341182 x9 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'field_7341185 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'submit (submit): action element, never a fill target (exclude)',
      'validated (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) x2 (button): unaddressable (exclude)',
    ],
  },
  'smp-openhouse-inquiry.html': {
    expected: {
      // 住友不動産 SMP オープンハウス系。label 結合なし・name 語彙のみで分類。
      'name': '山田 太郎',
      'name_kana': 'ヤマダ タロウ',
      'phone:a': '090',
      'phone:e': '1234',
      'phone:n': '5678',
      'zipcode:a': '100',
      'zipcode:t': '0001',
      'address': '東京都千代田区千代田1-1 千代田ビル101',
      // department は学校の学科に載り普通科が入る (honest pin。部署語彙が候補)。
      'department': '普通科',
    },
    excluded: [
      'contact/todofuken (select): only a `--` option, correctly warn-no-option',
      'mail/mail:cf (text): type=text named mail with no email signal, stay unclassified (LLM fallback; email-via-name candidate, same as otsuka mail)',
      'company (text): bare company name with no label association, stays unclassified (LLM fallback; company-by-name candidate)',
      'facility x3 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'facility/gender (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'gender x3 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'inquiry (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'privacy (checkbox): out of scope (skip fixed)',
      'privacy/detect/SMPFORM/mode (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'submit (submit): action element, never a fill target (exclude)',
    ],
  },
  'sumitomo-latour-inquiry.html': {
    expected: {
      // ラ・トゥール見学予約。label 結合あり。住所2欄は refine の分割で
      // extended_address→addressNoPref・address2→building に載る (honest pin)。
      'name': '山田 太郎',
      'name_ruby': 'ヤマダ タロウ',
      'postcode1': '100-0001',
      'address2': '千代田ビル101',
      'extended_address': '東京都千代田区千代田1-1',
      'mail': 'yamada@example.com',
      'mailConfirm': 'yamada@example.com',
      'tel': '09012345678',
    },
    excluded: [
      'keyword (search): 物件検索 box (placeholder 例）中野 1LDK), stays unclassified (LLM fallback; in-form search-box candidate)',
      'address1/sel_area[]/sel_building[]/sel_building_dummy/budget_lower/budget_higher/space_lower/space_higher/season_year/season_month/time/birthday_year/birthday_month/birthday_day (select): only a `--` option, correctly warn-no-option',
      'gnaviBtn/gnaviClose (button): action element, never a fill target (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      'form_token (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'building_delete/building_add (button): action element, never a fill target (exclude)',
      'layout[] x6 (checkbox): out of scope (skip fixed)',
      'postcode_search (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'comment (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'agreement (checkbox): out of scope (skip fixed)',
      '(no name/id) (button): unaddressable (exclude)',
    ],
  },
  'sumifu-step-otoiawase.html': {
    expected: {
      // すみふの仲介ステップ (SPIRAL)。placeholder の例）が分類信号。
      // name/name_kana 対は姓/名分割に載り name→山田・name_kana→太郎
      // (カナ欄に漢字が入る honest pin。placeholder 対の分割が候補)。
      'name': '山田',
      'name_kana': '太郎',
      'email': 'yamada@example.com',
      'email:reenter': 'yamada@example.com',
      'tel': '090-1234-5678',
      // name なし・id のみ (zipCode) も placeholder 例）163-0820 で解決。
      'zipCode': '100-0001',
      'address01': '千代田区千代田1-1 千代田ビル101',
      // department は学校の学科に載り普通科が入る (honest pin。部署語彙が候補)。
      'department': '普通科',
    },
    excluded: [
      'sendTarget/pref (select): only a `--` option, correctly warn-no-option',
      'company (text): placeholder 例）住友不動産ステップ株式会社, stays unclassified (LLM fallback; company-by-placeholder candidate, same as otsuka company)',
      'position (text): 役職 placeholder 例）部長, no profile value, correctly unfilled (same as registration jobTxt)',
      '(no name/id) x7 (button): unaddressable (exclude)',
      'zip01/zip02 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'message (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'privacy (checkbox): out of scope (skip fixed)',
      'action (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) (submit): unaddressable (exclude)',
      'IpAddress/UserAgent/f01/sendTarget/f011/pref/f015/privacy/deploymentId/session (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'proud-procedure-form.html': {
    expected: {
      // プラウド住所変更・発送停止 (旧・新の対照型)。label 姓/名は素直に分割。
      'last_name': '山田',
      'first_name': '太郎',
      'last_name_new': '山田',
      'first_name_new': '太郎',
      // email は placeholder 例：proud@nomura-re.co.jp で解決 (type=text)。
      'email': 'yamada@example.com',
      'email_new': 'yamada@example.com',
      // 旧・新の郵便2欄は 3+4 分割対に載る (honest pin。新旧対照の誤結合が候補)。
      'zip_code': '100',
      'zip_code_new': '0001',
      // 住所4行×旧新は refine の行分割に載る (honest pin)。
      'address1': '#123 Central Apartment',
      'address1_new': '#123 Central Apartment',
      'address2': '千代田ビル101',
      'address2_new': '千代田ビル101',
      'address3': '千代田区千代田1-1',
      'address3_new': '千代田区千代田1-1',
      'address4': '千代田区千代田1-1',
      'address4_new': '千代田区千代田1-1',
    },
    excluded: [
      'consumer_number (text): お客様番号 placeholder 例：12345678, no profile value, correctly unfilled',
      'company (text): placeholder 例：野村不動産株式会社, stays unclassified (LLM fallback; company-by-placeholder candidate)',
      'tel_num/tel_num_new (text): placeholder 例：0312345678, stay unclassified (LLM fallback; tel-by-name/placeholder candidate)',
      'pref_name/pref_name_new (select): only a `--` option, correctly warn-no-option',
      'sub_type x4/is_domestic x2/is_domestic_new x2/about_reply x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'search_address/search_address_new (button): action element, never a fill target (exclude)',
      'personal (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'FormAssist_submit (button): action element, never a fill target (exclude)',
    ],
  },
  'tokyu-branz-owner-form.html': {
    expected: {
      // BRANZ オーナー (東急)。label なし・name/id 語彙のみ。
      // mansion_name/name 対は姓/名分割に載り mansion_name→山田・name→太郎
      // (honest pin。物件名欄への姓注入が候補)。
      'mansion_name': '山田',
      'name': '太郎',
      'kana': 'ヤマダ タロウ',
      'zip': '1000001',
      'address1': '千代田区千代田1-1',
      'address2': '千代田ビル101',
      'tel': '09012345678',
    },
    excluded: [
      'q x2 (search): header/footer site-search fields, stay unclassified (same as forum.html s)',
      'room_no (text): 部屋番号, no profile value, correctly unfilled',
      'pref (select): only a `--` option, correctly warn-no-option',
      'mail/mail2 (text): type=text with no email signal, stay unclassified (LLM fallback; email-via-name candidate, same as otsuka mail)',
      '(no name/id) x2 (submit): unaddressable (exclude)',
      'flow (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'who_have_questions x3/area x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'contentcheck[] x5 (checkbox): out of scope (skip fixed)',
      'contenttext (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'contact x3 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      '(no name/id) (submit): unaddressable (exclude)',
    ],
  },
  'tokyu-commercial-form.html': {
    expected: {
      // 商業施設 (東急。自宅 house 系+連絡先の複合)。label なし。
      'name': '山田 太郎',
      'kana': 'ヤマダ タロウ',
      // 自宅・連絡先の郵便2欄は 3+4 分割対に載る (honest pin。proud と同形)。
      'zip_house': '100',
      'zip': '0001',
      // 住所2行×自宅/連絡先は refine で同値に載る (honest pin)。
      'address1_house': '千代田区千代田1-1',
      'address1': '千代田区千代田1-1',
      'address2_house': '千代田ビル101',
      'address2': '千代田ビル101',
      'tel': '09012345678',
    },
    excluded: [
      'q x2 (search): header/footer site-search fields, stay unclassified (same as forum.html s)',
      'kind/pref_house/pref (select): only a `--` option, correctly warn-no-option',
      'kind_etc_text (text): conditional detail field (placeholder その他), stays unclassified (LLM fallback)',
      'land_1/land_2/bill_1/bill_2 (text): conditional branch fields (土地・ビル条件), no profile value, correctly unfilled',
      'company/team/job (text): 会社・部署・役職 with no label association, stay unclassified (LLM fallback; company/department-by-name candidates)',
      'mail/mail2 (text): type=text with no email signal, stay unclassified (LLM fallback; email-via-name candidate, same as otsuka mail)',
      '(no name/id) x2 (submit): unaddressable (exclude)',
      'flow (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'contenttext (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'type x3/contact x3 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      '(no name/id) (submit): unaddressable (exclude)',
    ],
  },
  'tokyu-cre-form.html': {
    expected: {
      // CRE コンサル (東急。No.6 商業施設と同系)。label なし。
      'name': '山田 太郎',
      'kana': 'ヤマダ タロウ',
      // 自宅・連絡先の郵便2欄は 3+4 分割対に載る (honest pin。No.6 と同形)。
      'zip_house': '100',
      'zip': '0001',
      // 住所2行×自宅/連絡先は refine で同値に載る (honest pin)。
      'address1_house': '千代田区千代田1-1',
      'address1': '千代田区千代田1-1',
      'address2_house': '千代田ビル101',
      'address2': '千代田ビル101',
      'tel': '09012345678',
    },
    excluded: [
      'q x2 (search): header/footer site-search fields, stay unclassified (same as forum.html s)',
      'pref_house/pref (select): only a `--` option, correctly warn-no-option',
      'land/bill (text): conditional branch fields (土地・ビル条件), no profile value, correctly unfilled',
      'company/team/job (text): 会社・部署・役職 with no label association, stay unclassified (LLM fallback; company/department-by-name candidates)',
      'mail/mail2 (text): type=text with no email signal, stay unclassified (LLM fallback; email-via-name candidate, same as otsuka mail)',
      '(no name/id) x2 (submit): unaddressable (exclude)',
      'flow (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'contentcheck[] x13 (checkbox): out of scope (skip fixed)',
      'contenttext (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'receive x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      '(no name/id) (submit): unaddressable (exclude)',
    ],
  },
  'brillia-support-contact.html': {
    expected: {
      // ブリリア住まい相談 (e-state)。placeholder が分類信号。
      // 姓/名・カナ対は素直に分割 (かな欄はひらがな placeholder 由来でひらがな値)。
      'family_name': '山田',
      'first_name': '太郎',
      'family_name_kana': 'やまだ',
      'first_name_kana': 'たろう',
      // email (type=text)・tel は placeholder の例で解決。
      'email': 'yamada@example.com',
      'tel': '090-1234-5678',
    },
    excluded: [
      'day1a/day2a (text): 希望日, no profile value, correctly unfilled',
      'enquete14_text/15/16 (text): 希望区・沿線・駅, no profile value, correctly unfilled',
      'enquete18_text/20/21 (text): 希望面積・予算・築年, no profile value, correctly unfilled',
      'time1/time2/birthyear/birthmonth/birthday (select): only a `--` option, correctly warn-no-option',
      'page_ticket/eCOL_519 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'enquete1/enquete2 x2/enquete1/enquete11_text x7 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'question (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'enquete12_text x5/enquete13_text x4/enquete17_text x4/enquete19_text x5/enquete22_text (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'personal_info_flg[] (checkbox): out of scope (skip fixed)',
      'sub (image): action element, never a fill target (exclude)',
    ],
  },
  'hulic-develop-plan.html': {
    expected: {
      // ヒューリック不動産開発。label なし・placeholder が信号。
      // name1/2・kana1/2 は _1/_2 分割で素直に解決。
      'name1': '山田',
      'name2': '太郎',
      'kana1': 'ヤマダ',
      'kana2': 'タロウ',
      'zip': '100-0001',
      'address': '東京都千代田区千代田1-1',
      'building': '千代田ビル101',
      'tel': '090-1234-5678',
      // mail は未分類のまま mail_conf のみ解決 (honest pin。確認欄の非対称が候補)。
      'mail_conf': 'yamada@example.com',
    },
    excluded: [
      'query x2 (text): site-search fields (id ss-query1), stay unclassified (same as forum.html s)',
      'mail (text): placeholder 例）hulic@hulic.co.jp, stays unclassified while mail_conf fills (LLM fallback; email-confirm asymmetry candidate)',
      'company_name (text): placeholder 例）株式会社ヒューリック, stays unclassified (LLM fallback; company-by-placeholder candidate)',
      'fax (text): placeholder 例）03-0000-0000, stays unclassified (LLM fallback; ff-csr では tel 値が入るが本頁では未解決、fax vocabulary candidate)',
      'btnG x2 (submit): action element, never a fill target (exclude)',
      '_token/subject (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'subject x6 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'body (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'company (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'company x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      '(no name/id) (submit): unaddressable (exclude)',
    ],
  },
  'mori-webcas-contact.html': {
    expected: {
      // 森ビル総合問合せ (webcas)。コード化 c_q* 名・placeholder のみが信号。
      // かな対はひらがな placeholder 由来で解決。
      'c_q28_first': 'やまだ',
      'c_q28_second': 'たろう',
      // 会社名/学校名 placeholder は学校語彙に載り学校値が入る (honest pin)。
      'c_q14': '都立日比谷高校',
      // citycode 欄に市区町村値が入る (honest pin。電話3分割の誤結合が候補)。
      'c_q17_citycode': '千代田区',
    },
    excluded: [
      'c_q10_first/second (text): 漢字 placeholder 森/太郎, stay unclassified (LLM fallback; kanji person-name placeholder does not infer fullName, same as kobe-city ANSWER1)',
      'c_q27/c_q27_confirm (text): type=text with an email placeholder, stay unclassified (LLM fallback; email-via-placeholder candidate, same as otsuka mail)',
      'c_q17_areacode/subscribercode (text): bare 電話 3-split with placeholder only, stay unclassified (LLM fallback; tel-split-by-name candidate, same as kobe-city ANSWER6)',
      'c_q29 (text): 住所 placeholder 例, stays unclassified (LLM fallback; address-via-placeholder candidate)',
      'c_q3 (select): only a `--` option, correctly warn-no-option',
      'c_q30 (text): 担当者名, no profile value, correctly unfilled',
      '__pid/__pageId/__token (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'c_q6 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'wcf5start (submit): action element, never a fill target (exclude)',
    ],
  },
  'openhouse-customer-contact.html': {
    expected: {
      // オープンハウス顧客相談窓口 (SMP直結)。英語式の素直な命名。
      'family_name': '山田',
      'given_name': '太郎',
      'family_name_kana': 'ヤマダ',
      'given_name_kana': 'タロウ',
      'phone_number': '09012345678',
      'email': 'yamada@example.com',
      'zip_code': '1000001',
      'city': '千代田区',
      'street': '千代田1-1 千代田ビル101',
      // 担当者名欄は fullName に載り氏名が入る (honest pin。担当者除外が候補)。
      'sales_name': '山田　太郎',
    },
    excluded: [
      'area (text): placeholder 例）丸の内2-4-1, stays unclassified (LLM fallback; area vocabulary candidate)',
      'prefecture (select): only a `--` option, correctly warn-no-option',
      'residence_type x4/inquiry_type x6 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'inquiry x7 (checkbox): out of scope (skip fixed)',
      'inquiry_text (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'f004179635/f004179636 (file): not scanned (scan covers text/email/tel/search + select; exclude)',
      '(no name/id) (submit): unaddressable (exclude)',
      'detect/SMPFORM/submitTime/submitTimeSub/residence_type/inquiry_type/inquiry/inquiry_text (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'f004179635/f004179636 (file): not scanned (scan covers text/email/tel/search + select; exclude)',
      'family_name/given_name/family_name_kana/given_name_kana/phone_number/email/zip_code/prefecture/city/area/street/sales_name (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) (submit): unaddressable (exclude)',
    ],
  },
  'anabuki-general-contact.html': {
    expected: {
      // 穴吹興産総合問合せ。placeholder（例）が信号。メール欄は type=mail
      // のため走査対象外 (tooling が除外)。
      'name': '山田 太郎',
      'zip': '100-0001',
      'address': '東京都千代田区千代田1-1 千代田ビル101',
    },
    excluded: [
      'contact_type (select): only a `--` option, correctly warn-no-option',
      'company (text): placeholder（例）穴吹興産株式会社, stays unclassified (LLM fallback; company-by-placeholder candidate)',
      'kana (text): placeholder（例）アナブキ タロウ, stays unclassified (LLM fallback; kana-via-placeholder candidate)',
      'tel/fax (tel): type=tel with placeholder 例, stay unclassified (LLM fallback; tel-by-name candidate)',
      'q (text): site-search field (id input-search), stays unclassified (same as forum.html s)',
      'email/email_confirm (mail): non-standard type, not scanned (scan covers text/email/tel/search + select; exclude)',
      'inquiry (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'business_type x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      '(no name/id) (button): unaddressable (exclude)',
      'email/email_confirm (mail): not scanned (scan covers text/email/tel/search + select; exclude)',
      'agree_confirm (checkbox): out of scope (skip fixed)',
      'btn_submit (button): action element, never a fill target (exclude)',
      'csrf_token (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      'csrf_token (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'anabuki-landuse-contact.html': {
    expected: {
      // 穴吹興産土地活用 (No.12 と同系+土地条件)。メール欄は type=mail
      // のため走査対象外。
      'name': '山田 太郎',
      // 連絡先・物件の郵便2欄は 3+4 分割対に載る (honest pin。No.4/6/7 と同形)。
      'zip': '100',
      'site_zip': '0001',
      'address': '東京都千代田区千代田1-1',
      'site_address': '東京都千代田区千代田1-1',
      // building_ 接頭の3欄は建物名に載り同値が入る (honest pin。接頭語の誤読が候補)。
      'building_scale': '千代田ビル101',
      'building_floor_space': '千代田ビル101',
      'building_age': '千代田ビル101',
    },
    excluded: [
      'contact_type (select): only a `--` option, correctly warn-no-option',
      'company (text): placeholder（例）穴吹興産株式会社, stays unclassified (LLM fallback; company-by-placeholder candidate)',
      'kana (text): placeholder（例）アナブキ タロウ, stays unclassified (LLM fallback; kana-via-placeholder candidate)',
      'tel/fax (tel): type=tel with placeholder 例, stay unclassified (LLM fallback; tel-by-name candidate)',
      'site_area (text): 土地面積, no profile value, correctly unfilled',
      'q (text): site-search field (id input-search), stays unclassified (same as forum.html s)',
      'email/email_confirm (mail): non-standard type, not scanned (scan covers text/email/tel/search + select; exclude)',
      'inquiry (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'business_type x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      '(no name/id) (button): unaddressable (exclude)',
      'email/email_confirm (mail): not scanned (scan covers text/email/tel/search + select; exclude)',
      'site_type[] x5/counseling_type[] x3 (checkbox): out of scope (skip fixed)',
      '(no name/id) (button): unaddressable (exclude)',
      'building_structure_type[] x3/agree_confirm (checkbox): out of scope (skip fixed)',
      'btn_submit (button): action element, never a fill target (exclude)',
      'csrf_token (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      'csrf_token (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'haseko-contact-input.html': {
    expected: {
      // 長谷工コーポレーション。label・placeholder なし・name 語彙のみ。
      // name01/02 は 01/02 分割で解決。
      'name01': '山田',
      'name02': '太郎',
      'tel': '090-1234-5678',
    },
    excluded: [
      'company (text): bare company name with no label association, stays unclassified (LLM fallback; company-by-name candidate)',
      'post (text): bare 郵便番号 with no label signal, stays unclassified (LLM fallback; post-prefix zip candidate, same as mitsuihome post1/post2)',
      'mail01/mail02 (text): type=text bare mail names, stay unclassified (LLM fallback; email-via-name candidate)',
      '_csrfToken (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'other (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'transfer (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'transfer x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'agree (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'agree (checkbox): out of scope (skip fixed)',
      'fsubmit (submit): action element, never a fill target (exclude)',
      'g-recaptcha-response/action/_Token[fields]/_Token[unlocked] (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'toshin-shiryo-form.html': {
    expected: {
      // 東進ハイスクール資料請求 (CakePHP sform)。label なし bare 構成だが
      // name 語彙で素直に解決する欄が多い。
      'last_name': '山田',
      'first_name': '太郎',
      'last_name_kana': 'ヤマダ',
      'first_name_kana': 'タロウ',
      'email': 'yamada@example.com',
      'email_confirm': 'yamada@example.com',
      'zip': '100-0001',
      'address1': '千代田区千代田1-1',
      'address2': '千代田ビル101',
      // address3 は address1 と同値に載る (refine の重複注入。mitsuihome と同形、honest pin)。
      'address3': '千代田区千代田1-1',
      'school_name': '都立日比谷高校',
      // target_university_name (志望大学名 placeholder 例）東京大学) も学校語彙に載る。
      'target_university_name': '都立日比谷高校',
    },
    excluded: [
      'birthdate[year]/[month]/[day] (select): only a `--` option, correctly warn-no-option',
      'prefecture_code/school_prefecture_code (select): only a `--` option, correctly warn-no-option',
      'school_grade/school_city/schoollist_id/school_code/application_opportunity*3/contactable_week*3/contactable_time*3 (select): only a `--` option, correctly warn-no-option',
      'tel1/tel2/tel3 (text): bare 3-split with no label or placeholder signal, stay unclassified (LLM fallback; tel-split-by-name candidate, same as kobe ANSWER6-1/2/3)',
      'tel_check (text): bare tel check field with no signal, stays unclassified (LLM fallback)',
      'relationship_other (text): bare with no signal, stays unclassified (LLM fallback)',
      '_method/_csrfToken/rq_select/online_consultation_term (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'rq_select x5 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      '(no name/id) (button): unaddressable (exclude)',
      'kousha_name/kousha_type/kousha_code/check_kousha/sex (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'sex x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'tel_pre_check/ptel_pre_check (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'landline1/landline2/landline3 (landline): not scanned (scan covers text/email/tel/search + select; exclude)',
      'relationship (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'relationship x3/enrollment x3/mail_magazine x2/course_type x5/is_target_decided x2/university_type x4 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'enrollment/mail_magazine/course_type/is_target_decided/university_type (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'free_text (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      '(no name/id) (submit): unaddressable (exclude)',
      'form_id (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'toshin-mendan-form.html': {
    expected: {
      // 東進ハイスクール個別相談 (CakePHP sform)。No.1 資料請求と同系。
      'last_name': '山田',
      'first_name': '太郎',
      'last_name_kana': 'ヤマダ',
      'first_name_kana': 'タロウ',
      'email': 'yamada@example.com',
      'email_confirm': 'yamada@example.com',
      'zip': '100-0001',
      'address1': '千代田区千代田1-1',
      'address2': '千代田ビル101',
      // address3 は address1 と同値に載る (refine の重複注入。No.1 と同形、honest pin)。
      'address3': '千代田区千代田1-1',
      'school_name': '都立日比谷高校',
      'target_university_name': '都立日比谷高校',
    },
    excluded: [
      'check_kousha (text): 校舎選択の確認欄。bare で信号なし、未分類のまま (LLM fallback)',
      'birthdate[year]/[month]/[day] (select): only a `--` option, correctly warn-no-option',
      'prefecture_code/school_prefecture_code (select): only a `--` option, correctly warn-no-option',
      'school_grade/school_city/schoollist_id/school_code/application_opportunity (select): only a `--` option, correctly warn-no-option',
      'tel1/tel2/tel3 (text): bare 3-split with no label or placeholder signal, stay unclassified (LLM fallback; tel-split-by-name candidate, same as No.1)',
      'tel_check (text): bare tel check field with no signal, stays unclassified (LLM fallback)',
      'relationship_other (text): bare with no signal, stays unclassified (LLM fallback)',
      '_method/_csrfToken/rq_select (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'rq_select (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'button-kousha-select (button): action element, never a fill target (exclude)',
      'kousha_name/kousha_type/kousha_code/sex (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'sex x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'tel_pre_check/ptel_pre_check (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'landline1/landline2/landline3 (landline): not scanned (scan covers text/email/tel/search + select; exclude)',
      'relationship (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'relationship x3/enrollment x3/mail_magazine x2/course_type x5/is_target_decided x2/university_type x4 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'enrollment/mail_magazine/course_type/is_target_decided/university_type (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'free_text (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      '(no name/id) (submit): unaddressable (exclude)',
      'form_id (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'yotsuya-nyujuku-form.html': {
    expected: {
      // 四谷大塚入塾テスト (lform)。児童+保護者の氏名・カナが name 語彙で解決。
      'family_name': '山田',
      'first_name': '太郎',
      'family_name_kana': 'ヤマダ',
      'first_name_kana': 'タロウ',
      // 保護者欄も同一プロファイル値で fill (honest pin。児童と保護者の区別は将来PBIで)。
      'parent_family_name': '山田',
      'parent_first_name': '太郎',
      'parent_family_name_kana': 'ヤマダ',
      'parent_first_name_kana': 'タロウ',
      'mail_address': 'yamada@example.com',
      'mail_address_confirm': 'yamada@example.com',
      // zip は type=tel・maxlength=7 のため undashed。
      'zip': '1000001',
      'address1': '千代田区千代田1-1',
      'address2': '千代田ビル101',
      // tel 3欄は type=tel・maxlength=7 で分割対に載る (toshin bare と対照的)。
      'tel1': '090',
      'tel2': '1234',
      'tel3': '5678',
      'school_name': '都立日比谷高校',
    },
    excluded: [
      'kousha/request/birth_year/birth_month/birth_date/prefecture/school_grade/school_prefecture (select): only a `--` option, correctly warn-no-option',
      '_method/_csrfToken/sex/relationship/school_section/school_class (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'sex x2/relationship x3/school_section x3 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'freetext (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'enquete (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) (image): unaddressable (exclude)',
    ],
  },
  'kumon-annai-form.html': {
    expected: {
      // 公文教室案内。placeholder の例が分類信号。name1/2 (漢字)・name3/4 (カナ) は連番分割で素直に解決。
      'name1': '山田',
      'name2': '太郎',
      'name3': 'ヤマダ',
      'name4': 'タロウ',
      // post は type=tel・maxlength=7 のため undashed。
      'post': '1000001',
      // add2 (番地以下) は addressNoPref と building の結合値が入る (honest pin)。
      'add2': '千代田1-1 千代田ビル101',
      // tel/tel2/tel3 は placeholder 123/4567/8910 の桁幅どおりに分割対に載る。
      'tel': '090',
      'tel2': '1234',
      'tel3': '5678',
      'mail': 'yamada@example.com',
    },
    excluded: [
      'cprg/gakunen1/gakunen2/gakunen3/add1/muni/town (select): only a `--` option, correctly warn-no-option',
      'text (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'form_submit (submit): action element, never a fill target (exclude)',
      'status (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'manavis-shiryo-form.html': {
    expected: {
      // 河合塾マナビス資料請求。placeholder の例 (河合/太郎/カワイ/タロウ) が分類信号。
      'sei_kanji': '山田',
      'mei_kanji': '太郎',
      'sei_katakana': 'ヤマダ',
      'mei_katakana': 'タロウ',
      'email': 'yamada@example.com',
      'email_conf': 'yamada@example.com',
      'school_name': '都立日比谷高校',
      // address_sei/mei (住所欄の姓名) も氏名語彙に載る (honest pin)。
      'address_sei': '山田',
      'address_mei': '太郎',
      'zip': '100-0001',
      // address と address_etc はともに全住所結合値に載る (honest pin)。
      'address': '東京都千代田区千代田1-1 千代田ビル101',
      'address_etc': '東京都千代田区千代田1-1 千代田ビル101',
      'tel_1': '090',
      'tel_2': '1234',
      'tel_3': '5678',
    },
    excluded: [
      'birthYear/birthMonth/birthDay/schoolPrefecture/schoolName/q2 (select): only a `--` option, correctly warn-no-option',
      'onlineevent_other (text): conditional detail field with no signal, stays unclassified (LLM fallback)',
      '(no name/id) (submit): unaddressable (exclude)',
      '(no name/id) (text): unaddressable (exclude)',
      'mode x2 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'sex x2/schoolYear x8/relationShip x4 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'zipBtn (button): action element, never a fill target (exclude)',
      'onlineevent x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'survey1[] x9 (checkbox): out of scope (skip fixed)',
      'survey1_other (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'survey2[] x8/agreement[] (checkbox): out of scope (skip fixed)',
      '(no name/id) x6 (button): unaddressable (exclude)',
    ],
  },
  'eikoh-shiryo-form.html': {
    expected: {
      // 栄光ゼミナール総合資料請求 (eforms)。見出しは div 構成で scanner の
      // nearby 対象外のため、氏名欄は placeholder のみで bare と等価
      // (brother 前例と同じ。実ページ確認済み)。
      // tel は placeholder 半角数字11桁のまま undashed。
      'tel': '09012345678',
      // email は type=text だが name が email のため解決。
      'email': 'yamada@example.com',
    },
    excluded: [
      'area_code/class_code/school_current (select): only a `--` option, correctly warn-no-option',
      'name_f1/name_m1 (text): 生徒氏名(漢字) の見出しは div で nearby 対象外。placeholder 姓/名(全角)のみでは未分類 (LLM fallback; brother N7 同型)',
      'k_name_f1/k_name_m1/k_name_f2/k_name_m2 (text): 生徒氏名(カナ) の見出しは div で nearby 対象外。placeholder セイ/メイ(全角)のみでは未分類 (LLM fallback)',
      'org_q[1][sel][] x8/org_q[3][sel][]/org_q[5][sel][] (checkbox): out of scope (skip fixed)',
      'org_q[2][sel] x3 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'org_q[4][txt] (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      'keycode/next_act_mode/efno/dummy (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      '(no name/id) x8 (text): unaddressable (exclude)',
    ],
  },
  'cigr-ir-contact.html': {
    expected: {
      // コスモスイニシア IR。label 結合あり (会社名・部署名・電話番号)。
      // 姓名・カナ対は _sei/_mei・seikana/meikana 分割で素直に解決。
      'ir_company_info': '株式会社サンプル',
      'user_name_seikana': 'ヤマダ',
      'user_name_meikana': 'タロウ',
      'email_first': 'yamada@example.com',
      'email_second': 'yamada@example.com',
      'tel': '09012345678',
      'address_zip': '1000001',
      'address_municipality': '千代田区',
      'address_lotnumber': '千代田1-1',
      'address_building': '千代田ビル101',
    },
    excluded: [
      'user_name_sei/mei (text): 漢字 placeholder 田町/太郎, stay unclassified (LLM fallback; kanji person-name placeholder does not infer fullName, same as mori c_q10)',
      'address_prefecture (select): only a `--` option, correctly warn-no-option',
      'ir_textarea (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'address_kaigai x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'address_minute (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'agree_checkbox[] (checkbox): out of scope (skip fixed)',
      '(no name/id) (button): unaddressable (exclude)',
      'csrf_token (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'shozemi-contact-form.html': {
    expected: {
      // 湘南ゼミナール。氏名2行は実ページどおり dt/dd 見出しを復元
      // (mitsuihome 前例)。name 起点で解決し placeholder とは逆対応になる
      // (first_name=姓欄に太郎。honest pin)。
      'first_name': '太郎',
      'last_name': '山田',
      'katakana_first_name': 'タロウ',
      'katakana_last_name': 'ヤマダ',
      'tel': '09012345678',
      'email': 'yamada@example.com',
      'zip': '100-0001',
      'address': '千代田1-1 千代田ビル101',
    },
    excluded: [
      'gakunen/purpose/area_prefecture_req/area_city/area_school/area_prefecture (select): only a `--` option, correctly warn-no-option',
      'referer_url/_token (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'content[] x5 (checkbox): out of scope (skip fixed)',
      'Form__addressBtn (button): action element, never a fill target (exclude)',
      'request (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'Form__submitButton (button): action element, never a fill target (exclude)',
    ],
  },
  'waseda-ac-form.html': {
    expected: {
      // 早稲田アカデミー申込基盤 (NY校問合せ)。attributeNN のコード化名が
      // 大半で語彙が効かず、末尾語彙 (zip/tel/email/address) のみ解決。
      'Public::Application::Userenquete_D__P__D_zip1': '100',
      'Public::Application::Userenquete_D__P__D_zip2': '0001',
      // address2 のみ building に載る。address1/address3 は未分類 (honest pin)。
      'Public::Application::Userenquete_D__P__D_address2': '千代田ビル101',
      'Public::Application::Userenquete_D__P__D_tel': '090-1234-5678',
      'Public::Application::Userenquete_D__P__D_email': 'yamada@example.com',
    },
    excluded: [
      '..._D_name1/_name2/_name1_ka/_name2_ka (text): coded prefix + bare, stay unclassified (LLM fallback; name-split-by-suffix candidate)',
      '..._D_VisitorData.attribute68-89/311/344/376/640/409/442/475/508/541/574/79/14 (text/select): coded attribute names with no vocabulary, stay unclassified (LLM fallback)',
      '..._D_prefecture_master_id (select): only a `--` option, correctly warn-no-option',
      '..._D_address1/_address3 (text): bare coded names, stay unclassified while address2 fills as building (LLM fallback)',
      '..._D_Enquete.attribute2185 (select): only a `--` option, correctly warn-no-option',
      'csrf_id (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'Public::Application::Userenquete_D__P__D_VisitorData.attribute1 (checkbox): out of scope (skip fixed)',
      'Public::Application::Userenquete_D__P__D_VisitorData.attribute2 x2/Public::Application::Userenquete_D__P__D_VisitorData.attribute85 x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'Public::Application::Userenquete_D__P__D_VisitorData.attribute673/Public::Application::Userenquete_D__P__D_Enquete.attribute2183 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'Public::Application::Userenquete_D__P__D_Enquete.attribute2184 x4 (checkbox): out of scope (skip fixed)',
      '(no name/id) x2 (button): unaddressable (exclude)',
      'selected_action/cart_delete/action/serialkey/Public::Application::Userenquete_D__P__D_language_master_id (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'morijuku-contact-form.html': {
    expected: {
      // 森塾問合せ。自社基盤 (kinds[]・name1/kana1)。label for 付きのまま残す。
      // name1/name2 はともに fullName (姓/名 label が同一のため same-label 分割
      // なし。ff C1 と同形、honest pin)。placeholder 姓/名は効かない。
      'name1': '山田 太郎',
      'name2': '山田 太郎',
      // kana1/kana2 はともに fullNameKana 結合値 (registration yomiSei/yomiMei と同形)。
      'kana1': 'やまだたろう',
      'kana2': 'やまだたろう',
      'tel': '09012345678',
      'mail': 'yamada@example.com',
      'zip': '100-0001',
      'addr': '千代田区千代田1-1 千代田ビル101',
    },
    excluded: [
      'prof/pref (select): only a `--` option, correctly warn-no-option',
      'kinds[1]/kinds[2]/kinds[6]/kinds[9]/kinds[8] (checkbox): out of scope (skip fixed)',
      '(no name/id) x3 (button): unaddressable (exclude)',
      'school (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      'content (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      '(no name/id) x3 (button): unaddressable (exclude)',
    ],
  },
  'wadakohsan-inquiry.html': {
    expected: {
      // 和田興産ワコーレ (mw-wp-form)。your- 接頭 + 例) placeholder が信号。
      // 氏名・フリガナは全角スペース結合の full 値。
      'your-name': '山田　太郎',
      'your-hurigana': 'やまだ　たろう',
      'your-email': 'yamada@example.com',
      'your-email-confirm': 'yamada@example.com',
      'your-tel': '090-1234-5678',
      'your-post-code': '1000001',
      'your-address': '東京都千代田区千代田1-1 千代田ビル101',
      // your-department は学校の学科に載り普通科が入る (honest pin。部署語彙が候補)。
      'your-department': '普通科',
    },
    excluded: [
      'q (text): site-search field (placeholder 検索内容を入力してください), stays unclassified (same as forum.html s)',
      'your-company (text): placeholder 例）和田興産株式会社, stays unclassified (LLM fallback; company-by-placeholder candidate)',
      'name-ga-cookie-accept-btn (button): action element, never a fill target (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      'cx/ie (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'sa (submit): action element, never a fill target (exclude)',
      'recaptcha-v3 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'your-content (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'submitConfirm (button): action element, never a fill target (exclude)',
      'mw-wp-form-form-id/mw_wp_form_token (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'jiritsu-red-contact-form.html': {
    expected: {
      // 自立学習RED問合せ。森塾と同系基盤 (kinds[]・name1/kana1)。
      // name1/name2 はともに fullName。結合区切りは placeholder 由来で
      // 森塾 (姓/名→半角スペース) と異なり無区切り (honest pin)。
      'name1': '山田太郎',
      'name2': '山田太郎',
      'kana1': 'やまだたろう',
      'kana2': 'やまだたろう',
      'tel': '09012345678',
      'mail': 'yamada@example.com',
      // zip は label なし・placeholder 7桁例のみで undashed のまま解決。
      'zip': '1000001',
    },
    excluded: [
      'prof/pref/city/school/address1 (select): only a `--` option, correctly warn-no-option',
      'address2 (textarea): 住所2行目は textarea のため not scanned (scan covers text/email/tel/search + select; exclude)',
      'kinds[0]/kinds[3]/kinds[1]/kinds[5]/kinds[6]/kinds[7]/kinds[4] (checkbox): out of scope (skip fixed)',
      'address2/content (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'token/introduction/g-recaptcha-response (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
    ],
  },
  'hhp-site-inquiry.html': {
    expected: {
      // 阪急阪神不動産 (CakePHP)。label・placeholder なし・name/id 語彙のみ。
      // 姓名・カナ・郵便・電話の番号分割は素直に解決。
      'data[Question][name1]': '山田',
      'data[Question][name2]': '太郎',
      'data[Question][kana1]': 'ヤマダ',
      'data[Question][kana2]': 'タロウ',
      'data[Question][zip1]': '100',
      'data[Question][zip2]': '0001',
      'data[Question][tel1]': '090',
      'data[Question][tel2]': '1234',
      'data[Question][tel3]': '5678',
    },
    excluded: [
      'data[Question][add1] (select): only a `--` option, correctly warn-no-option',
      'data[Question][add2/3/4] (text): bare add* names, stay unclassified (LLM fallback; address-via-name candidate)',
      'data[Question][mail1/2] (text): type=text bare mail names, stay unclassified (LLM fallback; email-via-name candidate)',
      '_method/data[_Token][key]/recaptchaResponse (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'data[Questionitem][4] (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'privacy (checkbox): out of scope (skip fixed)',
      'confirm_btn (submit): action element, never a fill target (exclude)',
    ],
  },
  'nttud-inquiry.html': {
    expected: {
      // NTT都市開発総合問合せ。form_ 接頭 + 和文 label が信号。
      'form_name': '山田 太郎',
      'form_name_kana': 'ヤマダ タロウ',
      'form_company': '株式会社サンプル',
      // T2: the 部署名 label now reads as companyDepartment.
      'form_division': '開発部',
      'form_mail': 'yamada@example.com',
      'form_tel': '09012345678',
    },
    excluded: [
      'kw (text): site-search field (placeholder キーワードを入力), stays unclassified (same as forum.html s)',
      '(no name/id) x12 (button): unaddressable (exclude)',
      'env/temp (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) (submit): unaddressable (exclude)',
      '(no name/id) x2 (button): unaddressable (exclude)',
      'sessid/__mode/blog_id/id/object_id/model (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'form_inquiry (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      '(no name/id) x2 (button): unaddressable (exclude)',
    ],
  },
  'sekisui-catalog-request.html': {
    expected: {
      // 積水ハウスカタログ請求 (最大規模。Shift_JIS 由来の文字化け placeholder
      // あり・個人情報なし)。現住所・建築予定地の2系統+会員登録項目の複合。
      'name1': '山田',
      'name2': '太郎',
      'kana1': 'ヤマダ',
      'kana2': 'タロウ',
      'address1': '東京都千代田区千代田1-1',
      'address2': '千代田ビル101',
      'planned_address1': '東京都千代田区千代田1-1',
      'tel1': '090-1234-5678',
      'email': 'yamada@example.com',
      'emailConfirm': 'yamada@example.com',
      // 性別 radio は実ページの選択肢 (男性/女性/選択しない) を最小形で復元。
      // 女性が profile 性別に解決 (honest pin。otsuka sex と同形)。
      'sex': '女性',
    },
    excluded: [
      'zip1/zip2/planned_zip1/2 (text): bare 郵便番号 split with no label signal, stay unclassified (LLM fallback; post-prefix zip candidate, same as mitsuihome post1/post2)',
      'prefs/planned_prefs/house_figure/budget/occupation/shawoodclubSecretQuestion/construction x2 (select): only a `--` option, correctly warn-no-option',
      'group_company/company1/2 (text): bare 会社名 with no label association, stay unclassified (LLM fallback; company-by-name candidate)',
      'tsubo/kibou/shop/employeename/office (text): 坪数・希望・店舗・担当・勤務先, no profile value, correctly unfilled',
      'birthday (text): bare 生年月日 single field, no profile value, correctly unfilled (profile-fields-form は y/m/d 分割のみ解決)',
      'shawoodclubPassword/Confirm/SecretAnswer (text): 会員 password 系, no profile value, correctly unfilled',
      'sex_corp (radio): 法人側の性別群。同一機構のため sex に代表させ trim (exclude)',
      'kind/cogrid/adreferer/category/overlapConfilm/preAdmissionKind/preEmail/ssoUrl/media/OID/PID/TID/catselect/present/swclub (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) x45 (button): unaddressable (exclude)',
      'CID x20 (checkbox): out of scope (skip fixed)',
      'country x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      '(no name/id) (button): unaddressable (exclude)',
      'zip_searflg (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'planned x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      '(no name/id) (button): unaddressable (exclude)',
      'planned_zip_searflg (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'sex_corp x3/place x2/dm x2/negotiation x2/mail1 x2/shawoodclub x2/shawoodclubTerms/exhibition x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'exhibition_description/comment (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'privacy (checkbox): out of scope (skip fixed)',
      '(no name/id) x5 (button): unaddressable (exclude)',
      'regist (button): action element, never a fill target (exclude)',
      'submit_btn (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'knowfrom x30 (checkbox): out of scope (skip fixed)',
      'haveland x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'regist2/catalog_accordion_btn (button): action element, never a fill target (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
    ],
  },
  'tomas-trial-form.html': {
    expected: {
      // TOMAS 体験授業 (Laravel)。保護者+生徒の氏名・カナ構成。
      'last_name': '山田',
      'first_name': '太郎',
      // 生徒氏名も同一プロファイル値で fill (yotsuya parent と同形、honest pin)。
      'student_last_name': '山田',
      'student_first_name': '太郎',
      'zip1': '100',
      'zip2': '0001',
      'city': '千代田区',
      // town (町域以下) は addressNoPref+building 結合値に載る。
      'town': '千代田1-1 千代田ビル101',
      'email': 'yamada@example.com',
    },
    excluded: [
      'student_last_kana/student_first_kana/guardian_last_kana/guardian_first_kana (text): bare カナ欄。placeholder セイ/メイのみでは未分類 (LLM fallback; eikoh と同型)',
      'tel x2 (tel/text): 同名2欄の重複 + bare。未分類のまま (LLM fallback; duplicate-name tel candidate)',
      'tel1/tel2/tel3 (text): bare 3-split (placeholder 000/0000) で未分類 (tel-split-by-name candidate, same as No.1)',
      'gakunen/pref/selapplicant/selClass/taiken_time/kyouka/selexam (select): only a `--` option, correctly warn-no-option',
      'taiken_date (text): bare 体験希望日 with no signal, stays unclassified (LLM fallback)',
      'toggle (checkbox): out of scope (skip fixed)',
      '_step/_token (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'seibetsu x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'question (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'newsletter x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'tl-agree-check (checkbox): out of scope (skip fixed)',
      '(no name/id) (button): unaddressable (exclude)',
    ],
  },
  'try-gakuin-reserve-form.html': {
    expected: {
      // トライ式高等学院予約。brief 懸念の段階式だったが静的欄が取込可能だった。
      // reserve[name_sei/mei]・tel 3分割・email・city が解決。
      'reserve[name_sei]': '山田',
      'reserve[name_mei]': '太郎',
      'reserve[tel_1]': '090',
      'reserve[tel_2]': '1234',
      'reserve[tel_3]': '5678',
      'reserve[email]': 'yamada@example.com',
      'reserve[city]': '千代田区',
    },
    excluded: [
      'reserve[pref_name]/reserve[date]/reserve[age]/reserve[pref] (select): only a `--` option, correctly warn-no-option',
      'action (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'reserve[event_type] x3 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'reserve[wish_date] (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'reserve[subjects] x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      '(no name/id) (image): unaddressable (exclude)',
      'reserve[category_type]/reserve[media_type]/reserve[referrer]/event_type/(event_data[] x274) (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'meiko-contact-form.html': {
    expected: {
      // 明光義塾問合せ (Drupal)。select 実選択肢は実ページどおり復元
      // (R4-2b 前例。sex・pref_cd の解決に必要)。
      'last_name': '山田',
      'first_name': '太郎',
      // カナ欄は placeholder せい/めい (ひらがな) のため fullNameKana ではなく分割値。
      'last_name_kana': 'やまだ',
      'first_name_kana': 'たろう',
      // sex は実選択肢 男性/女性で gender 群に載り、値 2 (女性) が fill。
      'sex': '2',
      'school_name': '都立日比谷高校',
      'zip1': '100',
      'zip2': '0001',
      // pref_cd は実選択肢 47 都道府県で prefecture が解決 (値 149=東京都)。
      'pref_cd': '149',
      'addr1': '千代田区千代田1-1',
      'addr2': '千代田ビル101',
      'building': '千代田ビル101',
      'tel1': '090',
      'tel2': '1234',
      'tel3': '5678',
      'email_input': 'yamada@example.com',
      // friend_name (紹介者名 placeholder 明光太郎) は fullName に載る (honest pin)。
      'friend_name': '山田太郎',
    },
    excluded: [
      'grade/relationship/school_type/opportunity_select (select): 実選択肢つきだが stay unclassified (LLM fallback)',
      'keyword_input (text): 教室検索欄。placeholder 教室名、駅名など、stays unclassified (same as forum.html s)',
      'zip_address_search/zip_school_search/keyword_search (button): action element, never a fill target (exclude)',
      'selected_school (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'question_request (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      'op (submit): action element, never a fill target (exclude)',
      'form_build_id/form_id (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'sekisui-inquiry-form.html': {
    expected: {
      // 積水ハウス総合問合せ (No.19 と同系)。メール欄は名前/ドメイン4分割。
      'addr1': '東京都千代田区千代田1-1',
      'addr2': '千代田ビル101',
      'birth-year': '1990',
      // SIMP-T1f: 文字化け placeholder 削除で name 由来の kana 分類が復活
      // (name-kana1 → lastNameKana / name-kana2 → firstNameKana)。
      'name-kana1': 'ヤマダ',
      'name-kana2': 'タロウ',
      // 名前/ドメイン4欄は各々 full email に載る (honest pin。分割結合が候補)。
      'email-name': 'yamada@example.com',
      'email-domain': 'yamada@example.com',
      'email-name-confirm': 'yamada@example.com',
      'email-domain-confirm': 'yamada@example.com',
      'tel1': '090',
      'tel2': '1234',
      'tel3': '5678',
      'zip1': '100',
      'zip2': '0001',
      // 性別 radio は実ページの選択肢を最小形で復元。女性が解決 (No.19 と同形)。
      'sex': '女性',
    },
    excluded: [
      'name-kanji1/2 (text): 文字化け placeholder は SIMP-T1 で削除済み (name-kana1/2 は kana 分類へ復帰し expected へ移動), kanji 2欄は stay unclassified (LLM fallback; kanji person-name does not infer)',
      'prefs/occupation (select): only a `--` option, correctly warn-no-option',
      'shop/employee-name/office (text): 店舗・担当・勤務先, no profile value, correctly unfilled',
      'charset_detect/dispatch/_u/_r/adreferer (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'country x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      '(no name/id) (button): unaddressable (exclude)',
      'zip-search (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'negotiation x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'comment (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'mail1 x2/video x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'privacy (checkbox): out of scope (skip fixed)',
      '(no name/id) (button): unaddressable (exclude)',
      'exhibition x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'exhibition_description (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'consultation x7 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'knowfrom x9 (checkbox): out of scope (skip fixed)',
      '(no name/id) (button): unaddressable (exclude)',
    ],
  },
  'keishin-contact-form.html': {
    expected: {
      // 京進スクール・ワン (SMP)。実ページ Shift_JIS のため tooling の
      // placeholder 文字化けを正規の日本語に復元済み (curl で実ページ確認)。
      'stu_fam_name': '山田',
      'stu_fir_name': '太郎',
      'stu_fam_name2': 'ヤマダ',
      'stu_fir_name2': 'タロウ',
      'school_name': '都立日比谷高校',
      // 保護者欄も同一プロファイル値で fill (yotsuya と同形、honest pin)。
      'par_fam_name': '山田',
      'par_fir_name': '太郎',
      'par_fam_name2': 'ヤマダ',
      'par_fir_name2': 'タロウ',
      'tel_num:a': '090',
      'tel_num:e': '1234',
      'tel_num:n': '5678',
      'e-mail': 'yamada@example.com',
      'e-mail:cf': 'yamada@example.com',
      'zip_code:a': '100',
      'zip_code:t': '0001',
      // pref (text。placeholder 例：京都府) は prefecture に載る。
      'pref': '東京都',
      // address1 と address3 はともに全住所結合値に載る (honest pin)。
      'address1': '千代田区千代田1-1 千代田ビル101',
      'address3': '千代田区千代田1-1 千代田ビル101',
      // inq_tri_grp (再入会者の生年月日を記入) は birthday-year に載り 1990 が fill。
      'inq_tri_grp': '1990',
    },
    excluded: [
      'class_region1/class_name1/grade3/birthday:y/m/d/relationship (select): only a `--` option, correctly warn-no-option',
      'grade3_other/relationship_o/inq_tri_other (text): bare conditional detail fields, stay unclassified (LLM fallback)',
      'reg0/nam0/class_ID1 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'sex2 x3 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      '(no name/id) (button): unaddressable (exclude)',
      '(no name/id) (hidden): unaddressable (exclude)',
      'inq_tri x18 (checkbox): out of scope (skip fixed)',
      'inq_tri (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'free_text (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'agree (checkbox): out of scope (skip fixed)',
      'detect/SMPFORM/mode/net_flag (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'submit (button): action element, never a fill target (exclude)',
    ],
  },
  'sekisui-mail-form.html': {
    expected: {
      // 積水ハウスメール問合せ (mpmail)。-kanji/-kana 接尾分割。
      'name-kanji1': '山田',
      'name-kanji2': '太郎',
      'name-kana1': 'ヤマダ',
      'name-kana2': 'タロウ',
      // mailaddress (type=text) は住所に載り住所値が入る (honest pin。
      // mailaddress 語彙が候補。ff-csr の fax と同形の誤読)。
      'mailaddress': '東京都千代田区千代田1-1',
      'zip1': '100',
      'zip2': '0001',
      'addr1': '東京都千代田区千代田1-1',
      'addr2': '千代田ビル101',
      'tel1': '090',
      'tel2': '1234',
      'tel3': '5678',
    },
    excluded: [
      'prefs (select): only a `--` option, correctly warn-no-option',
      'inq-subject (text): 件名, no profile value, correctly unfilled',
      '(no name/id) x2 (image): unaddressable (exclude)',
      'kind x10 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'privacy (checkbox): out of scope (skip fixed)',
      'inquiry (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'attachment (file): not scanned (scan covers text/email/tel/search + select; exclude)',
      '(no name/id) (image): unaddressable (exclude)',
    ],
  },
  'rinkai-shiryo-form.html': {
    expected: {
      // 臨海セミナー資料請求 (WordPress CF7)。form_group_grade のみ実選択肢
      // (学年 13件) を実ページどおり復元。course/prefecture/classroom は
      // 実ページでも空 (JS 連動) のため '--' のまま。
      'form_name_student': '山田',
      'form_name_student_kana': 'ヤマダ',
      'form_post_code': '100-0001',
      'form_address1': '千代田区千代田1-1',
      'form_address2': '千代田ビル101',
      'form_cf7rs_tel': '090-1234-5678',
      'form_cf7rs_mail': 'yamada@example.com',
      // 兄弟姉妹氏名もプロファイル値で fill (honest pin。兄弟と本人の区別は将来PBIで)。
      'form_name_brother': '太郎',
      'form_name_brother_kana': 'タロウ',
    },
    excluded: [
      's (text): site-search field, stays unclassified (same as forum.html s)',
      'form_group_grade (select): 実選択肢つき (学年) だが stay unclassified (LLM fallback)',
      'form_group_course/form_group_prefecture/form_group_classroom (select): 実ページでも空 (JS 連動のため)、correctly warn-no-option',
      'form_cf7rs_ad_set_text (text): bare 広告セット欄 with no signal, stays unclassified (LLM fallback)',
      '(no name/id) x3 (button): unaddressable (exclude)',
      '_wpcf7/_wpcf7_version/_wpcf7_locale/_wpcf7_unit_tag/_wpcf7_container_post/_wpcf7_posted_data_hash (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'form_cf7rs_checkbox427[] (checkbox): out of scope (skip fixed)',
      '(no name/id) (submit): unaddressable (exclude)',
      'form_cf7rs_ad_set x11 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'form_cf7rs_requests (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      '(no name/id) (submit): unaddressable (exclude)',
    ],
  },
  'sanaru-contact-form.html': {
    expected: {
      // 佐鳴予備校問合せ (idata[*])。name/zip/tel/email 系が素直に解決。
      'idata[name]': '山田',
      // name_k (カナ) は firstName に載り漢字が入る (honest pin。_k suffix の読分け候補)。
      'idata[name_k]': '太郎',
      'idata[zip_a]': '100',
      'idata[zip_b]': '0001',
      'idata[address]': '千代田区千代田1-1',
      'idata[building]': '千代田ビル101',
      'idata[tel_a]': '090',
      'idata[tel_b]': '1234',
      'idata[tel_c]': '5678',
      'idata[email]': 'yamada@example.com',
      'idata[email_check]': 'yamada@example.com',
    },
    excluded: [
      'idata[reason_other] (text): bare conditional detail field, stays unclassified (LLM fallback)',
      'idata[im]/idata[hc]/idata[cs]/idata[pref] (select): only a `--` option, correctly warn-no-option',
      'idata[company]/idata[company_k]/idata[section] (text): 会社・部署系は未分類 (LLM fallback; ff C3 と同型)',
      'idata[fax_a]/idata[fax_b]/idata[fax_c] (text): bare fax 3-split, stay unclassified (fax vocabulary candidate; ff では tel 値が入るが本頁では未解決)',
      'idata[reason] x6 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'idata[inquiry] (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'idata[iorc] x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'i_confirm/i_reset (submit): action element, never a fill target (exclude)',
    ],
  },
  'ichishin-contact-form.html': {
    expected: {
      // 市進学院 (SMP)。実ページは th/td 表組みのため auhikari 前例に倣い
      // th 見出しつき table に復元。select 実選択肢も実ページどおり復元。
      // jQuery Sizzle 断片の誤配線 select (name=""+b+"-...) は実在コントロール
      // でないため fixture・ledger とも除外。
      'name_l': '山田',
      'name_f': '太郎',
      'name_l_kana': 'ヤマダ',
      'name_f_kana': 'タロウ',
      // 保護者・兄弟姉妹欄も同一プロファイル値で fill (honest pin)。
      'g_name_l': '山田',
      'g_name_f': '太郎',
      'g_name_l_kana': 'ヤマダ',
      'g_name_f_kana': 'タロウ',
      'siblings_l': '山田',
      'siblings_f': '太郎',
      'siblings_l_kana': 'ヤマダ',
      'siblings_f_kana': 'タロウ',
      'Zipcode:a': '100',
      'Zipcode:t': '0001',
      'addr1': '東京都千代田区千代田1-1',
      'addr2': '千代田ビル101',
      'tel1': '090',
      'tel2': '1234',
      'tel3': '5678',
      // mailaddress 2欄は th メールアドレスつきでも full 住所値で fill される
      // (honest pin。重大な分類ずれとして Concerns に記録)。
      'mailaddress': '東京都千代田区千代田1-1',
      'mailaddress:cf': '東京都千代田区千代田1-1',
      // gendar は実選択肢 男性/女性で gender 群に載り、値「女性」が fill。
      'gendar': '女性',
      'schoolname': '都立日比谷高校',
      // syoukai_name (紹介者氏名) は fullName に載る (honest pin)。
      'syoukai_name': '山田 太郎',
    },
    excluded: [
      '"+b+"-\\r\\\\ (select): jQuery Sizzle 断片の誤配線。実在コントロールでないため fixture から除去 (exclude)',
      'kousyu_course/gd_cd/syoukai/naishin_gakunen/naishin_jiki (select): 実選択肢つきだが stay unclassified (LLM fallback)',
      'birth:y/m/d (select): 実ページでも選択肢なし (----/-- のみ)、correctly warn-no-option',
      'class_cd (text): ご希望教室名。bare コード名で未分類 (LLM fallback)',
      'number (text): 会員番号。no profile value, correctly unfilled',
      'survey_other (text): bare conditional detail field, stays unclassified (LLM fallback)',
      'pbzipsearch01 (button): action element, never a fill target (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      'comment (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'entry (checkbox): out of scope (skip fixed)',
      'entry (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'member x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'member (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'survey x10/kojin (checkbox): out of scope (skip fixed)',
      'survey/kojin (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'submit (submit): action element, never a fill target (exclude)',
      'comment (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'submit (submit): action element, never a fill target (exclude)',
      'naishin_koku x6/naishin_sya x6/naishin_suu x6/naishin_ri x6/naishin_on x6/naishin_bi x6/naishin_ho x6/naishin_gi x6/naishin_ei x6 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'naishin_koku/naishin_sya/naishin_suu/naishin_ri/naishin_on/naishin_bi/naishin_ho/naishin_gi/naishin_ei/detect/SMPFORM/mode/event_name/event_date/event_area/event_ID/class_name/entry_status (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'submit (submit): action element, never a fill target (exclude)',
      '(no name/id) (select): unaddressable (exclude)',
      '(no name/id) (text): unaddressable (exclude)',
      '(no name/id) (select): unaddressable (exclude)',
      '(no name/id) (textarea): unaddressable (exclude)',
    ],
  },
  'ena-request-form.html': {
    expected: {
      // ena 資料請求 (WordPress CF7)。児童+保護者の氏名・カナ構成。
      // grade/prefecture のみ実選択肢を実ページどおり復元
      // (gakubu は実ページでも空、kousha_area/kousha は連動のみ)。
      'child_family_name': '山田',
      'child_first_name': '太郎',
      'child_family_name_kana': 'ヤマダ',
      'child_first_name_kana': 'タロウ',
      // 保護者欄も同一プロファイル値で fill (honest pin)。
      'parent_family_name': '山田',
      'parent_first_name': '太郎',
      'parent_family_name_kana': 'ヤマダ',
      'parent_first_name_kana': 'タロウ',
      'postal_code1': '100',
      'postal_code2': '0001',
      // prefecture は実選択肢 (値=名称) で東京都に解決。
      'prefecture': '東京都',
      'address1': '千代田区千代田1-1',
      'bld': '千代田ビル101',
      'email': 'yamada@example.com',
      'email_confirm': 'yamada@example.com',
      'school_name': '都立日比谷高校',
    },
    excluded: [
      'birthday (text): 例）2002/04/02 の full-date。pattern 不整合で未注入のまま (PBI-210 形状。honest pin)',
      'grade (select): 実選択肢つき (学年 17件) だが stay unclassified (LLM fallback)',
      'gakubu (select): 実ページでも空、correctly warn-no-option',
      'kousha_area/kousha (select): 連動のみの placeholder 選択肢、correctly warn-no-option',
      'tel1/tel2/tel3 (text): bare 3-split with no signal, stay unclassified (tel-split-by-name candidate)',
      'enquete_etc/mailto/app-teltime (text): bare conditional detail fields, stay unclassified (LLM fallback)',
      'app-messageh (text): honeypot (このフィールドは空のままにしてください)。未注入のまま (honest pin)',
      'hanburger_r24/menu-parent01_r24/menu-parent02 (checkbox): out of scope (skip fixed)',
      '_wpcf7/_wpcf7_version/_wpcf7_locale/_wpcf7_unit_tag/_wpcf7_container_post/_wpcf7_posted_data_hash/_wpcf7cf_hidden_group_fields/_wpcf7cf_hidden_groups/_wpcf7cf_visible_groups/_wpcf7cf_repeaters/_wpcf7cf_steps/_wpcf7cf_options/_wpcf7_recaptcha_response (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'sex x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'enquete[] x8 (checkbox): out of scope (skip fixed)',
      'message (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'confirm_flg (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) (submit): unaddressable (exclude)',
      '_cf7msm_multistep_tag/cf7msm-no-ss (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '_wpcf7_ak_hp_textarea (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      '_wpcf7_ak_js (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'ftAbout_r24/ftCourse_r24 (checkbox): out of scope (skip fixed)',
    ],
  },
  'eishinkan-contact-form.html': {
    expected: {
      // 英進館 (SMP)。実ページ Shift_JIS のため tooling の placeholder
      // 文字化けを正規の日本語に復元済み (No.14 京進と同形)。
      'student_sei': '山田',
      'student_mei': '太郎',
      // student/guardian のカナ欄 (seiKana/meiKana) は未分類のまま
      // (LLM fallback; keishin の fam_name2 解決と対照的。suffix 読分け候補)。
      'school': '都立日比谷高校',
      // gender radio (男性/女性) は実値つきで復元。gender 群に載り値 2。
      'gender': '2',
      'phone:a': '090',
      'phone:e': '1234',
      'phone:n': '5678',
      'email': 'yamada@example.com',
      'email:cf': 'yamada@example.com',
      'zipcode:a': '100',
      'zipcode:t': '0001',
      'addr1': '千代田区千代田1-1',
      'addr2': '千代田ビル101',
      // addr3 は address1 と同値に載る (refine の重複。honest pin)。
      'addr3': '千代田区千代田1-1',
      // 保護者欄も同一プロファイル値で fill (honest pin)。
      'guardian_sei': '山田',
      'guardian_mei': '太郎',
    },
    excluded: [
      'school_year/entrance_exam/placeArea/placeName/birthday_y/m/d/pref/relationship/reason (select): only a `--` option, correctly warn-no-option',
      'reason_oth (text): bare conditional detail field, stays unclassified (LLM fallback)',
      'gender (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'inquiry (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'privacy (checkbox): out of scope (skip fixed)',
      'privacy/detect/SMPFORM/mode (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'submit (submit): action element, never a fill target (exclude)',
    ],
  },
  'axis-inquiry-form.html': {
    expected: {
      // 個別指導Axis問合せ。自社基盤 (camelCase)。label for 付きのまま残す。
      // native select は Vue カスタムで実ページでも空のため '--' が忠実。
      'lastName': '山田',
      'firstName': '太郎',
      'lastNameKana': 'ヤマダ',
      'firstNameKana': 'タロウ',
      // gender (text。bare) は name 起点で女性に載る。
      'gender': '女性',
      // dobYear のみ pattern 適合 (1990)。dobMonth/dobDate は profile
      // 05/07 が pattern (leading-zero 不可) に合わず未注入 (PBI-210 形状)。
      'dobYear': '1990',
      'schoolName': '都立日比谷高校',
      'postalCode': '1000001',
      // addressCity (市区町村) は addressNoPref 全体が入る (honest pin)。
      'addressCity': '千代田区千代田1-1',
      'address1': '千代田区千代田1-1',
      'address2': '千代田ビル101',
      'phone': '09012345678',
      'email': 'yamada@example.com',
      // その他3欄のうち schoolSelectionOther のみ school に載る
      // (honest pin。3欄の非対称は将来PBIで)。
      'schoolSelectionOther': '都立日比谷高校',
    },
    excluded: [
      'axisPrefectureCode/axisSchoolId/grade/addressPrefectureCode (select): Vue カスタムで実ページでも空、correctly warn-no-option',
      'dobMonth/dobDate (text): pattern (leading-zero 不可) に profile 05/07 が合わず warn-pattern で未注入 (honest pin)',
      'studyIssuesOther/learningGoalsOther (text): bare その他欄。schoolSelectionOther のみ解決する非対称 (LLM fallback)',
      'v-0-0-1/v-0-0-3/v-0-0-11:男性/v-0-0-11:女性/v-0-0-15/v-0-0-20/v-0-0-28:学校の定期テストで点が取れない/v-0-0-28:家庭学習が出来ていない/v-0-0-28:模試で偏差値が低迷している/v-0-0-28:部活動ばかりで勉強していない/v-0-0-28:塾があわない・成績が上がらない/v-0-0-36:受験・志望校合格対策/v-0-0-36:学校の定期テスト対策/v-0-0-36:模試・成績アップ対策/v-0-0-36:他塾内容の理解度アップ/v-0-0-36:学校の授業内容の理解度アップ/v-0-0-36:学習習慣づくり/v-0-0-45:個別指導形態・学習スタイル/v-0-0-45:授業料と諸費用/v-0-0-45:学習内容やテキスト/v-0-0-45:先生の質/v-0-0-45:通塾学校例 (button): action element, never a fill target (exclude)',
      'customRequests/concernsOrQuestions (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      '(no name/id) (button): unaddressable (exclude)',
    ],
  },
  'yotsuya-littleclub-form.html': {
    expected: {
      // 四谷大塚リトルクラブ (pform)。生徒+保護者の氏名・カナが _SEI/_MEI
      // suffix 分割で素直に解決。select 実選択肢は実ページどおり復元。
      'SEITO_KANJI_SEI': '山田',
      'SEITO_KANJI_MEI': '太郎',
      'SEITO_KANA_SEI': 'ヤマダ',
      'SEITO_KANA_MEI': 'タロウ',
      // 保護者欄も同一プロファイル値で fill (honest pin)。
      'HOGOSHA_KANJI_SEI': '山田',
      'HOGOSHA_KANJI_MEI': '太郎',
      'HOGOSHA_KANA_SEI': 'ヤマダ',
      'HOGOSHA_KANA_MEI': 'タロウ',
      'EMAIL': 'yamada@example.com',
      'EMAIL_confirm': 'yamada@example.com',
    },
    excluded: [
      'GAKKO_NM (text): bare 学校名。name 語彙が効かず未分類 (LLM fallback; school-by-name candidate)',
      'GAKUNEN_CD/BIRTH_Y/BIRTH_M/BIRTH_D/JUSHO_1/TSUIKA_6/TSUIKA_2/TSUIKA_3 (select): 実選択肢つきだが未分類 (LLM fallback。JUSHO_1 実選択肢でも prefecture 未解決)',
      'YUBIN_NO_1/YUBIN_NO_2/TEL1-3/FAX1-3 (text/tel): bare 分割 with no signal, stay unclassified (tel-split-by-name candidate)',
      'JUSHO_2-5 (text): bare 住所行。未分類 (LLM fallback)',
      'TSUIKA_7/check_TSUIKA_1/check_PAY_KBN (text): bare 追加・確認欄。未分類 (LLM fallback)',
      '_method/UKETSUKE_KBN/GOYOUKEN/DMHASSO_FUKA (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'GOYOUKEN x2/SEX x2/BROTHER_KBN x2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'SEITO_COMMENT (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'TSUIKA_1 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'TSUIKA_1 x3/PAY_KBN x4 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'PAY_KBN/enquete/kiyaku (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) (image): unaddressable (exclude)',
      'UKETSUKE_NO/BUMON_CD (hidden): empty-submit shim or server state, never a fill target (exclude)',
    ],
  },
  'fujita-contact.html': {
    expected: {
      // 姓/名 labels each read as a full name (no first/last split applied);
      // pinned honest, same shape as the ff-csr name[first]/name[last] pin.
      'company': '株式会社サンプル',
      'your_name_last': '山田 太郎',
      'your_name_first': '山田 太郎',
      'your_kana_last': 'ヤマダ タロウ',
      'your_kana_first': 'ヤマダ タロウ',
      'email': 'yamada@example.com',
      'email_check': 'yamada@example.com',
    },
    excluded: [
      'contact_type (select): real 10 options restored verbatim, stays unclassified (LLM fallback; inquiry-kind select candidate)',
      'tel01/02/03 (text): bare 3-split with only a label on tel01, stay unclassified (LLM fallback; tel-split-by-name candidate, same as kobe-city ANSWER6-1/2/3)',
      's (search) x2: header/footer site-search fields, trimmed as site chrome (same as forum.html s)',
      'customer_type x2 (radio): 法人/個人, bundled per name; stays unclassified (radio policy)',
      'nonce/referrer (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'note (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'js-gMainNav_search_btn (button): action element, never a fill target (exclude)',
      '(no name/id) x3 (button): unaddressable (exclude)',
      'js-gSearchBtn/js-gMenuBtn/js-gSiteMap_moreLink/js-gPageTop_button (button): action element, never a fill target (exclude)',
    ],
  },
  'yamada-holdings-contact.html': {
    expected: {
      'f01': '山田 太郎',
      // f03 fills the undashed tel value (no maxlength/hyphen signal on
      // the bare coded field; pinned honest).
      'f03': '09012345678',
      'pm_email': 'yamada@example.com',
      'pm_email2': 'yamada@example.com',
    },
    excluded: [
      'TITLE (select): real 4 options restored verbatim, stays unclassified (LLM fallback; inquiry-kind select candidate)',
      'f02 (text): フリガナ via th-nearby + placeholder only (coded name), stays unclassified (LLM fallback; kana-via-nearby candidate)',
      'user-id-state (text): unlabeled display:none trap field, trimmed as a honeypot (exclude)',
      'url (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'question (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'submitbtn (submit): action element, never a fill target (exclude)',
    ],
  },
  'apaman-contact.html': {
    expected: {
      'company': '株式会社サンプル',
      'your_name': '山田 太郎',
      // ひらがな placeholder をそのまま保持 (kobe-city ANSWER2 のカタカナ
      // pin と対称。かな種の正規化は将来PBI候補)。
      'kana': 'やまだ たろう',
      // 携帯/固定の2欄とも tel に載る (mitsui-reform の tel/tel2 と同形)。
      'tel_mobile': '090-1234-5678',
      'tel_home': '090-1234-5678',
      // FAX has no profile value; the rule fills the tel value (honest pin,
      // fax-vocabulary candidate, same as the ff-csr fax pin).
      'fax': '090-1234-5678',
      'zipcode': '100-0001',
      'address': '東京都千代田区千代田1-1 千代田ビル101',
      'email': 'yamada@example.com',
    },
    excluded: [
      'form_type/g-recaptcha-response (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'remarks (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'privacy (checkbox): out of scope (skip fixed)',
      'js--btn-confirm/js--btn-back/js--btn-send (button): action element, never a fill target (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
    ],
  },
  'jpaa-contact.html': {
    expected: {
      '会社名': '株式会社サンプル',
      // 部署・役職 reads as the department vocabulary (registration.html
      // deptTxt precedent), so the department profile value fills.
      '部署・役職': '開発部',
      '氏名': '山田 太郎',
      'フリガナ': 'ヤマダ タロウ',
      'メールアドレス': 'yamada@example.com',
      'メールアドレス(確認)': 'yamada@example.com',
      '電話番号[data][0]': '090',
      '電話番号[data][1]': '1234',
      '電話番号[data][2]': '5678',
    },
    excluded: [
      '職種 (select): real 5 options restored verbatim, stays unclassified (LLM fallback)',
      '業種 (select): real 6 options restored verbatim, stays unclassified (LLM fallback)',
      'お問い合わせ内容 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      '電話番号[separator] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'agree[data][] (checkbox): opt-out checkbox, out of scope (skip fixed)',
      'agree[separator]/__children[agree][] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'submitConfirm (submit): action element, never a fill target (exclude)',
      'mw-wp-form-form-id x2/mw_wp_form_token x2 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'cn-accept-cookie/cn-refuse-cookie/cn-close-notice (button): action element, never a fill target (exclude)',
    ],
  },
  'nkanzai-contact.html': {
    expected: {
      'contact_name': '山田 太郎',
      'contact_mail': 'yamada@example.com',
      'contact_mail_r': 'yamada@example.com',
    },
    excluded: [
      'contact_subject (text): 件名, no profile value, correctly unfilled (same as ff-csr inquiry_title)',
      'contactselect (select): SP-only tab switcher outside the form, trimmed as site chrome (exclude)',
      'q (text) x2: header/footer site-search fields, trimmed as site chrome (same as forum.html s)',
      'cx x2/cof x2/ie x2 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'contact_message (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'agree[] (checkbox): out of scope (skip fixed)',
      '(no name/id) x2 (button): unaddressable (exclude)',
    ],
  },
  'responsepage-aspx.html': {
    expected: {
      // Single fullName box with no separator cue in the placeholder, so the
      // planner joins without a space. Single tel box likewise keeps the raw
      // profile digits (hyphenation only applies to split tel parts).
      'q1': '山田太郎',
      'q2': '株式会社サンプル',
      // T2: 3.所属部署名 reads as companyDepartment, so the department value fills.
      'q3': '開発部',
      'q5': 'yamada@example.com',
      'q6': '09012345678',
    },
    excluded: [
      'q4 (text): 役職名, no job-title vocabulary in the rules, stays unclassified (T3: job-title candidate)',
      'q7 (text): trailing-question stand-in, stays unclassified',
    ],
  },
  // <corpus-ledger: make addurl appends its template entry above this line>
} satisfies Record<string, CorpusExtras>;

export type CorpusName = keyof typeof LEDGER;

// The glob is the only fixture registry: it lives here, once, and both
// consumers (samples.test.ts and corpus.eval.ts) read this module instead of
// collecting fixtures themselves.
const RAW = import.meta.glob('../samples/*.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const htmlByName: Record<string, string> = {};
for (const [path, html] of Object.entries(RAW)) {
  const name = path.split('/').pop();
  if (name) htmlByName[name] = html;
}

// Full corpus keyed by fixture name: every samples/*.html fixture, with the
// ledger extras merged in for the wired ones. Shallow-frozen: both consumers
// only read it, and an accidental entry replacement fails. Nested entry
// objects (expected/excluded) stay shared with the ledger by reference, so
// in-place edits inside an entry are not stopped by the freeze (PBI-216).
const corpusByName: Record<string, CorpusEntry> = {};
for (const [name, html] of Object.entries(htmlByName)) {
  const extras = LEDGER[name as CorpusName];
  corpusByName[name] = extras ? { html, ...extras } : { html };
}
export const corpus: Record<string, CorpusEntry> = Object.freeze(corpusByName);

// Wired entry for the samples.test.ts cases. The file parameter is typed by
// the LEDGER keys, so a fixture removed from the ledger fails typecheck at
// the case that still names it (no SAMPLES[file]! runtime TypeError), and the
// throw below names the missing piece instead of an undefined index.
export function corpusEntry(file: CorpusName): {
  html: string;
  expected: Record<string, string>;
  excluded?: string[];
} {
  const entry = corpus[file];
  if (!entry?.expected) {
    throw new Error(`corpus entry missing: samples/${file} is gone or the LEDGER entry carries no expectations`);
  }
  return { html: entry.html, expected: entry.expected, excluded: entry.excluded };
}

// Ledger expectations for the standard fill cases.
export function expectedFor(file: CorpusName): Record<string, string> {
  return corpusEntry(file).expected;
}
