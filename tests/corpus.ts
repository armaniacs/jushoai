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
      'field_4647582[0] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_4647582[0] (checkbox): out of scope (skip fixed)',
      'field_4647582[1] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_4647582[1] (checkbox): out of scope (skip fixed)',
      'field_4647582[2] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_4647582[2] (checkbox): out of scope (skip fixed)',
      'field_4647582[3] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_4647582[3] (checkbox): out of scope (skip fixed)',
      'field_4647582[4] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_4647582[4] (checkbox): out of scope (skip fixed)',
      'field_4647584 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_4647584 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'field_4647584 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'field_4647584 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'field_4647584 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'field_4647584 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'field_4647586 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'field_4647594 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_4647594 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'field_4647594 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'field_4647579 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_4647579 (checkbox): out of scope (skip fixed)',
      'submit (submit): action element, never a fill target (exclude)',
      'validated (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
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
      'field_4695584 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'field_4695584 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'field_4695584 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'field_4696236[0] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_4696236[0] (checkbox): out of scope (skip fixed)',
      'field_4696236[1] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_4696236[1] (checkbox): out of scope (skip fixed)',
      'field_4696236[2] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_4696236[2] (checkbox): out of scope (skip fixed)',
      'field_4696236[3] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_4696236[3] (checkbox): out of scope (skip fixed)',
      'field_4696236[4] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_4696236[4] (checkbox): out of scope (skip fixed)',
      'field_4696236[5] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_4696236[5] (checkbox): out of scope (skip fixed)',
      'field_4696240 (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'field_4696241 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'field_4696241 (checkbox): out of scope (skip fixed)',
      'submit (submit): action element, never a fill target (exclude)',
      'key (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'code (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'validated (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
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
      '(no name/id) (button): unaddressable (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      'wpforms[fields][100] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'wpforms[fields][97] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'wpforms[fields][97] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'wpforms[fields][97] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'wpforms[fields][97] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'wpforms[fields][97] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'wpforms[fields][97] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'wpforms[fields][97] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'wpforms[fields][97] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'wpforms[fields][97] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'wpforms[fields][97] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'wpforms[fields][80] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'wpforms[fields][80] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'wpforms[fields][80] (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'wpforms[fields][8][] (checkbox): out of scope (skip fixed)',
      'wpforms[fields][93][] (checkbox): out of scope (skip fixed)',
      '(no name/id) (button): unaddressable (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      'wpforms[recaptcha] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'wpforms[id] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'page_title (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'page_url (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'url_referer (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'page_id (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'wpforms[post_id] (hidden): empty-submit shim or server state, never a fill target (exclude)',
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
      'legalEnt (select): only a `--` option, correctly warn-no-option',
      'state (select): only a `--` option, correctly warn-no-option',
      'jobTxt (役職): no profile value, correctly unfilled',
      'q6_other (その他業種): no profile value, correctly unfilled',
      'q7_other (その他職種): no profile value, correctly unfilled',
      'corporation_position (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'corporation_position (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'password (password): not scanned (scan covers text/email/tel/search + select; exclude)',
      'confirmation_password (password): not scanned (scan covers text/email/tel/search + select; exclude)',
      'member_category (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'q1 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'q2 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'q3 (checkbox): out of scope (skip fixed)',
      'q4 (checkbox): out of scope (skip fixed)',
      'q5 (checkbox): out of scope (skip fixed)',
      'q6 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'q7 (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'ok (checkbox): out of scope (skip fixed)',
      'exhibitor_share_consent (checkbox): out of scope (skip fixed)',
      'marketing_consent (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      '(no name/id) (button): unaddressable (exclude)',
      'privacy_consent (checkbox): out of scope (skip fixed)',
      'division_none (checkbox): out of scope (skip fixed)',
      'position_none (checkbox): out of scope (skip fixed)',
      'password (password): not scanned (scan covers text/email/tel/search + select; exclude)',
      'confirmation_password (password): not scanned (scan covers text/email/tel/search + select; exclude)',
      'survey_purpose (checkbox): out of scope (skip fixed)',
      'survey_challenges (checkbox): out of scope (skip fixed)',
      '(no name/id) (button): unaddressable (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
      '(no name/id) (button): unaddressable (exclude)',
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
    expected: {
      // 姓/名 labels each read as a full name (no first/last split applied);
      // pinned honest, same shape as the ois-contact kana pair.
      'name[first]': '山田 太郎',
      'name[last]': '山田 太郎',
      'name_kana[first]': 'ヤマダ タロウ',
      'name_kana[last]': 'ヤマダ タロウ',
      'e_mailatoresu[mail_1]': 'yamada@example.com',
      'e_mailatoresu[mail_2]': 'yamada@example.com',
      // 勤務先・学校名 compound reads as the school vocabulary (PBI-212
      // Institution), so the school profile value fills.
      'qinwuxianxuexiaoming': '都立日比谷高校',
      'postal_code': '100-0001',
      'city': '千代田区',
      'jianwuming': '千代田ビル101',
      'tel': '090-1234-5678',
      // FAX has no profile value; the rule fills the tel value (honest pin,
      // fax-vocabulary candidate).
      'fax': '090-1234-5678',
    },
    excluded: [
      'inquiry_title (text): 件名, no profile value, correctly unfilled',
      'organization_unit_name (text): 部署名, stays unclassified (LLM fallback; 部署 vocabulary candidate)',
      'state_province_list (select): only a `--` option, correctly warn-no-option',
      '(no name/id) (button): unaddressable (exclude)',
      'inquiry_body (textarea): not scanned (scan covers text/email/tel/search + select; exclude)',
      'contactto (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'contactto (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      '(no name/id) (button): unaddressable (exclude)',
      'captcha_sid (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'captcha_token (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'captcha_response (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'is_recaptcha_v3 (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'agreement_check (checkbox): out of scope (skip fixed)',
      'op (submit): action element, never a fill target (exclude)',
      'form_build_id (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'form_id (hidden): empty-submit shim or server state, never a fill target (exclude)',
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
      '_Token[fields] (hidden): empty-submit shim or server state, never a fill target (exclude)',
      '_Token[unlocked] (hidden): empty-submit shim or server state, never a fill target (exclude)',
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
      'tantou (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'tantou (radio): grouped as one field by name; only gender/decade groups fill (matrix etc. stay skipped)',
      'koukoku[] (checkbox): out of scope (skip fixed)',
      'koukoku[] (checkbox): out of scope (skip fixed)',
      'koukoku[] (checkbox): out of scope (skip fixed)',
      'koukoku[] (checkbox): out of scope (skip fixed)',
      'koukoku[] (checkbox): out of scope (skip fixed)',
      'koukoku[] (checkbox): out of scope (skip fixed)',
      'koukoku[] (checkbox): out of scope (skip fixed)',
      'koukoku[] (checkbox): out of scope (skip fixed)',
      'TOKEN_GENERAL (hidden): empty-submit shim or server state, never a fill target (exclude)',
      'mode (hidden): empty-submit shim or server state, never a fill target (exclude)',
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
