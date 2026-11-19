import { describe, it, expect } from 'vitest';
import { classifyAll } from '../../src/core/analyze';
import type { FieldClassifier } from '../../src/core/classifier';
import type { Category } from '../../src/core/types';
import { buildPlan } from '../../src/core/planner';
import type { Address, FieldMeta, Profile } from '../../src/core/types';
import { detectForms } from '../../src/dom/detect-forms';
import { scanFields } from '../../src/dom/scan-fields';
import { corpusEntry, expectedFor, type CorpusName } from '../corpus';
import { isEnglishPageText } from '../../src/core/page-language';

const profile: Profile = {
  id: 'p1', label: 'メイン',
  lastName: '山田', firstName: '太郎', lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
  lastNameRomaji: 'Yamada', firstNameRomaji: 'Taro',
  gender: '女性',
  birthday: '1990-05-07', school: '都立日比谷高校', department: '普通科',
  companyName: '株式会社サンプル', companyDepartment: '開発部', jobTitle: '課長',
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
  file: CorpusName, today?: Date, classifier: FieldClassifier | null = null,
): Promise<Record<string, string>> {
  const { html } = corpusEntry(file);
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
    expect(await planFor('table-form.html')).toEqual(expectedFor('table-form.html'));
  });

  it('split-form', async () => {
    expect(await planFor('split-form.html')).toEqual(expectedFor('split-form.html'));
  });

  const demoForms: CorpusName[] = ['demo-registration.html', 'demo-shop-checkout.html', 'demo-request-info.html'];
  it.each(demoForms)('%s fills the ten address fields', async (file) => {
    expect(await planFor(file)).toEqual(expectedFor(file));
  });

  // Only the tel and email fields (by input type) are recognised by the rules; the button needs two such
  // fields to appear. The other eight labels carry no vocabulary the rules know, so only an LLM can place them.
  it('demo-ai-ambiguous is mostly left alone by the rules and filled once the LLM classifies it', async () => {
    expect(await planFor('demo-ai-ambiguous.html')).toEqual(expectedFor('demo-ai-ambiguous.html'));
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
    expect(await planFor('single-field-form.html')).toEqual(expectedFor('single-field-form.html'));
  });

  it('furigana-fieldset-form', async () => {
    expect(await planFor('furigana-fieldset-form.html')).toEqual(expectedFor('furigana-fieldset-form.html'));
  });

  it('katakana-fieldset-form', async () => {
    expect(await planFor('katakana-fieldset-form.html')).toEqual(expectedFor('katakana-fieldset-form.html'));
  });

  it('profile-fields-form', async () => {
    expect(await planFor('profile-fields-form.html')).toEqual(expectedFor('profile-fields-form.html'));
  });

  it('roman-name-form fills the half-width name in romaji and keeps the Japanese name', async () => {
    expect(await planFor('roman-name-form.html')).toEqual(expectedFor('roman-name-form.html'));
  });

  it('gender-select-form fills the gender select', async () => {
    expect(await planFor('gender-select-form.html')).toEqual(expectedFor('gender-select-form.html'));
  });

  it('age-decade-select-form fills the decade derived from the birthday', async () => {
    expect(await planFor('age-decade-select-form.html', new Date(2026, 9, 5))).toEqual(expectedFor('age-decade-select-form.html'));
  });

  it('overseas-address-form fills the half-width address in English', async () => {
    expect(await planFor('overseas-address-form.html')).toEqual(expectedFor('overseas-address-form.html'));
  });

  it('formmailer-anketo-gender resolves the prefecture and the gender radios', async () => {
    expect(await planFor('formmailer-anketo-gender.html')).toEqual(expectedFor('formmailer-anketo-gender.html'));
  });

  it('formmailer-raijo-age fills names, address and the age radios', async () => {
    expect(await planFor('formmailer-raijo-age.html')).toEqual(expectedFor('formmailer-raijo-age.html'));
  });

  it('overseas-webform-joshibi fills the real overseas form end to end', async () => {
    expect(await planFor('overseas-webform-joshibi.html')).toEqual(expectedFor('overseas-webform-joshibi.html'));
  });

  it('reinvent-registration-contact fills latin values and leaves the optional ID names empty', async () => {
    expect(await planFor('reinvent-registration-contact.html')).toEqual(expectedFor('reinvent-registration-contact.html'));
  });

  // T3: MS Forms (Tokyo OpenRoaming) minimal reproduction. The live page
  // renders client-side, so the fixture transcribes the reported questions
  // with the real placeholders. Rules fill 1-6; 7 (trailing question) stays
  // unclassified.
  it('ms-forms-openroaming pins the current rule classification', async () => {
    const { html } = corpusEntry('responsepage-aspx.html');
    document.body.innerHTML = new DOMParser().parseFromString(html, 'text/html').body.innerHTML;
    const fields = scanFields(document.body);
    expect(fields.map((f) => f.meta.name)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7']);
    const items = await classifyAll(fields.map((f) => f.meta), null, {
      englishPage: isEnglishPageText(document.body.textContent ?? ''),
    });
    expect(items.map((i) => i.cls.category)).toEqual([
      'fullName', 'company', 'companyDepartment', 'jobTitle', 'email', 'tel', 'unknown',
    ]);
    expect(items.map((i) => i.cls.confidence)).toEqual([0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0]);
    expect(items.map((i) => i.cls.source)).toEqual(['rule', 'rule', 'rule', 'rule', 'rule', 'rule', 'rule']);
    expect(await planFor('responsepage-aspx.html')).toEqual(expectedFor('responsepage-aspx.html'));
  });

  // 裸 1欄型 birthday (name=birthday、label 空、placeholder は例示 2002/04/02)。
  // anchored 判定の対象を label・name・id・placeholder に広げたため birthday に
  // 分類され、profile の ISO 値が入る (placeholder 例示の解析はしない設計は不変)。
  // 積水 (name+id とも birthday) と同じ裸形。孤独な pin: 期待値表だけでは
  // 「なぜ birthday か」が読めないため分類を明示する。
  it('ena-request-form classifies the bare single birthday field and fills the ISO value', async () => {
    const { html } = corpusEntry('ena-request-form.html');
    document.body.innerHTML = new DOMParser().parseFromString(html, 'text/html').body.innerHTML;
    const fields = scanFields(document.body);
    const birthday = fields.find((f) => f.meta.name === 'birthday')!;
    const items = await classifyAll([birthday.meta], null, {
      englishPage: isEnglishPageText(document.body.textContent ?? ''),
    });
    expect(items[0]!.cls).toMatchObject({ category: 'birthday', confidence: 0.7, source: 'rule' });
    expect(await planFor('ena-request-form.html')).toMatchObject({ birthday: '1990-05-07' });
  });

  it('anchors the table-form button on the last name field', () => {
    document.body.innerHTML = new DOMParser().parseFromString(corpusEntry('table-form.html').html, 'text/html').body.innerHTML;
    const forms = detectForms(document);
    expect(forms).toHaveLength(1);
    expect(forms[0]!.anchor.el.getAttribute('name')).toBe('n1');
  });

  const anchorFixtures: CorpusName[] = ['12fc22bc297429.html', '2dd1c663300469.html'];
  it.each(anchorFixtures)('anchors the %s button on a text input, not a leading checkbox', (file) => {
    document.body.innerHTML = new DOMParser().parseFromString(corpusEntry(file).html, 'text/html').body.innerHTML;
    const forms = detectForms(document);
    expect(forms.length).toBeGreaterThan(0);
    for (const form of forms) {
      const el = form.anchor.el;
      expect(el instanceof HTMLInputElement && ['text', 'email', 'tel', 'search'].includes(el.type)).toBe(true);
    }
  });

  const inScopeFixtures: CorpusName[] = [
    '12fc22bc297429.html',
    '2dd1c663300469.html',
    'registration.html',
    'forum.html',
    'richell-anketo-rating.html',
    'kosodate-contact.html',
    'library-theater-apply.html',
    'nishimachi-inquiry.html',
    'gis-intl-admission.html',
    'bst-inquire.html',
    'isi-contact.html',
    'ois-contact.html',
    'kigakuen-briefing.html',
    'seedome-openschool.html',
    'ff-csr.html',
    'otsuka-opinion-form.html',
    'mitsuihome-sonota-form.html',
    'mitsui-reform-catalog-form.html',
    'tokyu-land-contact-form.html',
    'kikkoman-website-form.html',
    'smp-regist-inquiry-form.html',
    'toshiba-gx-contact-form.html',
    'ff-webmaster-form.html',
    'ff-procurement-form.html',
    'ff-compliance-hotline-form.html',
    'tokyu-land-kojin-form.html',
    'tokyu-land-tenant-form.html',
    'benesse-inquiry-form.html',
    'brother-inquiry-form.html',
    'kikkoman-media-form.html',
    'kikkoman-works-form.html',
    'aeon-voice-form.html',
    'auhikari-callback-form.html',
    'hamamatsu-kocho-form.html',
    'okayama-inquiry-form.html',
    'fukuoka-teian-form.html',
    'ngk-contact-form.html',
    'lixil-inquiry-form.html',
    'kubota-engine-contact-form.html',
    'mailform.html',
    'opinion-html.html',
    'arakawa-mailform.html',
    'keyence-inquiry-form.html',
    'sysmex-contact-form.html',
    'lasertec-inquiry-form.html',
    'toyoda-gosei-form.html',
    'mitsubishi-materials-form.html',
    'yoshinoya-store-form.html',
    'tonami-luggage-form.html',
    'contact.html',
    'inquiry-html.html',
    'index-asp.html',
    '6932.html',
    'kit-contact-form.html',
    'shimane-inquiry-form.html',
    'aoyama-campus-inquiry.html',
    'aoyama-sagamihara-career.html',
    'smp-openhouse-inquiry.html',
    'sumitomo-latour-inquiry.html',
    'sumifu-step-otoiawase.html',
    'proud-procedure-form.html',
    'tokyu-branz-owner-form.html',
    'tokyu-commercial-form.html',
    'tokyu-cre-form.html',
    'brillia-support-contact.html',
    'hulic-develop-plan.html',
    'mori-webcas-contact.html',
    'openhouse-customer-contact.html',
    'anabuki-general-contact.html',
    'anabuki-landuse-contact.html',
    'toshin-shiryo-form.html',
    'toshin-mendan-form.html',
    'yotsuya-nyujuku-form.html',
    'kumon-annai-form.html',
    'manavis-shiryo-form.html',
    'eikoh-shiryo-form.html',
    'cigr-ir-contact.html',
    'shozemi-contact-form.html',
    'waseda-ac-form.html',
    'morijuku-contact-form.html',
    'wadakohsan-inquiry.html',
    'jiritsu-red-contact-form.html',
    'hhp-site-inquiry.html',
    'nttud-inquiry.html',
    'sekisui-catalog-request.html',
    'tomas-trial-form.html',
    'try-gakuin-reserve-form.html',
    'meiko-contact-form.html',
    'sekisui-inquiry-form.html',
    'keishin-contact-form.html',
    'rinkai-shiryo-form.html',
    'sanaru-contact-form.html',
    'ichishin-contact-form.html',
    'ena-request-form.html',
    'eishinkan-contact-form.html',
    'axis-inquiry-form.html',
    'yotsuya-littleclub-form.html',
    'fujita-contact.html',
    'yamada-holdings-contact.html',
    'apaman-contact.html',
    'jpaa-contact.html',
    'nkanzai-contact.html',
    'responsepage-aspx.html',
    'shizuoka-inquiry.html',
    'sony-inquiry.html',
    'advantest-contact.html',
    'keyence-price.html',
    'sakata-ir.html',
    'hokto-form.html',
    'yukiguni-contact.html',
    'bergearth-contact.html',
    'hoya-7741-contact.html',
    'olympus-7733-contact.html',
    'shimadzu-7701-contact.html',
    'asahi-intecc-7747-contact.html',
    'accretech-7729-contact.html',
    'citizen-7762-contact.html',
    'nakanishi-7716-contact.html',
    'tamron-7740-contact.html',
    'asics-7936-contact.html',
    'yamaha-7951-inquiry.html',
    'takaratomy-7867-inquiry.html',
    'mizuno-8022-ir.html',
    'osakagas-9532-contact.html',
    'jpower-9513-ir.html',
    'tepco-9501-voice.html',
    'energia-9504-inquiry.html',
    'jrcentral-9022-input.html',
    'nx-9147-contact.html',
    'hankyu-9042-goiken.html',
    'nyk-9101-contact.html',
    'mol-9104-ir.html',
    'kline-9107-contact.html',
    'nsuship-9110-contact.html',
    'iino-9119-contact.html',
    'sumitomosoko-9303-contact.html',
    'shibusawa-9304-contact.html',
    'trancy-9310-contact.html',
    'meiko-9357-inquiry.html',
    'ait-9381-ir.html',
    'softbankg-9984-ir.html',
    'ntt-9432-rd.html',
    'obic-4684-inquiry.html',
    'marubeni-8002-ir.html',
    'sumitomocorp-8053-ir.html',
    'toyotatsusho-8015-inquiry.html',
    'sojitz-2768-contact.html',
    'kobebussan-3038-mail.html',
    'medipal-7459-ir.html',
    'ppih-7532-form.html',
    'zensho-7550-hama.html',
    'nomura-8604-contact.html',
    'tokaitokyo-8616-contact.html',
    'iwaicosmo-8707-form.html',
    'sompo-8630-contact.html',
    'daiichi-8750-smp.html',
    'td-8795-contact.html',
    'kanpo-7181-request.html',
    'fpp-7388-ir.html',
    'tokyocentury-8439-contact.html',
    'fuyo-8424-smp.html',
    'aeonfin-8570-ir.html',
    'mitsubishijisho-8802-office.html',
    'hulic-3003-ir.html',
    'tokuyfudosanhd-3289-inquiry.html',
    'openhouse-3288-contact.html',
    'nomura-re-3231-contact.html',
    'starts-8850-ir.html',
    'baycurrent-6532-contact.html',
    'dentsu-4324-ir.html',
    'inpex-1605-ir.html',
    'nittetsukou-1515-smp.html',
    'otaki-1663-other.html',
    'sumiseki-1514-contact.html',
    'kajima-1812-ir.html',
    'sekisuihouse-1928-mail.html',
    'obayashi-1802-contact.html',
    'haseko-1808-contact.html',
    'jgc-1963-inquiry.html',
    'toda-1860-smp.html',
    'pentaocean-1893-inquiry.html',
    'asahi-2502-ir.html',
    'ajinomoto-2802-question.html',
    'kikkoman-2801-ir.html',
    'suntory-2587-contact.html',
    'toyo-2875-inquiry.html',
    'goldwin-8111-inquiry.html',
    'wacoal-3591-contact.html',
    'kurabo-3106-contact.html',
    'gunze-3002-form.html',
    'world-3612-form.html',
    'oji-3861-ir.html',
    'tokkai-3708-contact.html',
    'chuetsu-3877-contact.html',
    'shinetsu-4063-ir.html',
    'fujifilmhd-4901-general.html',
    'mcgc-4188-ir.html',
    'nissanchem-4021-contact.html',
    'tosoh-4042-ir.html',
    'otsukahd-4578-smp.html',
    'daiichisankyo-4568-contact.html',
    'astellas-4503-ir.html',
    'shionogi-4507-fofa.html',
    'ono-4527-contact.html',
    'santen-4536-contact.html',
    'eneos-5020-inquiry.html',
    'idemitsu-5019-spiral.html',
    'nichireki-5011-inquiry.html',
    'ncoke-3315-contact.html',
    'yokohama-5101-inquiry.html',
    'sumitomorubber-5110-smp.html',
    'toyotires-5105-contact.html',
    'sumitomoriko-5191-contact.html',
    'okamoto-5122-contact.html',
    'fujikuracompo-5121-contact.html',
    'nichirin-5184-ir.html',
    'achilles-5142-iri.html',
    'ngk-5333-contact.html',
    'taiheiyo-5233-contact.html',
    'tokaicarbon-5301-inquiry.html',
    'fujimi-5384-survey.html',
    'nipponsteel-5401-ir.html',
    'kobelco-5406-ir.html',
    'yamatokogyo-5444-form.html',
    'daido-5471-ask.html',
    'maruichi-5463-inquiry.html',
    'yodoko-5451-contact.html',
    'tokyosteel-5423-contact.html',
    'nyksteel-5480-contact.html',
    'fujikura-5803-investor.html',
    'uacj-5741-smp.html',
    'sanwa-5929-entry.html',
    'sumco-3436-input.html',
    'rinnai-5947-about.html',
    'lixil-5938-financial.html',
    'tocalo-3433-agree.html',
    'bunka-5930-form.html',
    'yokogawa-5911-inquiry.html',
    'smc-6273-ir.html',
    'komatsu-6301-inquiry.html',
    'kubota-6326-inquiry.html',
    'toyota-7203-faq.html',
    'denso-6902-investors.html',
    'suzuki-7269-catalog.html',
    'shimano-7309-contact.html',
    'aisin-7259-investors.html',
    'kawasaki-7012-annual.html',
    'capcom-9697-alt.html',
    'shiseido-4911-alt.html',
    'mitsuikinzoku-5706-alt.html',
    'kanze-contact.html',
    'bunraku-contact.html',
    'rakugo-contact.html',
    'ntj-goiken-contact.html',
    'bnfw-works-contact.html',
    'bones-contact.html',
    'atlus-contact.html',
    'ldh-contact.html',
    'helloproject-lineup-contact.html',
    'tado-contact.html',
    'sarutahiko-contact.html',
    'tsukannon-contact.html',
    'toba-aquarium-contact.html',
    'toga-contact.html',
    'masumida-contact.html',
    'tsushima-contact.html',
    'tenman-contact.html',
    'miwa-contact.html',
    'toyokawainari-contact.html',
    'nittaiji-contact.html',
    'kasadera-contact.html',
    'jimokuji-contact.html',
    'ryusenji-contact.html',
    'ghiblipark-school-contact.html',
    'legoland-contact.html',
    'nagoyaaqua-contact.html',
    'inuyama-contact.html',
    'hilton-nagoya-contact.html',
    'nagoyatokyu-contact.html',
    'prince-nagoya-contact.html',
    'kanko-nagoya-contact.html',
    'yasukuni-dantai-contact.html',
    'tokyodaijingu-yoyaku-contact.html',
    'hie-kojin-contact.html',
    'kanda-coverage-contact.html',
    'sensoji-gokito-contact.html',
    'zojoji-contact.html',
    'tokyotower-contact.html',
    'skytree-media-contact.html',
    'imperialhotel-contact.html',
    'newotani-banquet-contact.html',
    'palacehotel-contact.html',
    'ritz-tokyo-rfp-contact.html',
  ];
  it.each(inScopeFixtures)('%s fills the in-scope fields', async (file) => {
    expect(await planFor(file)).toEqual(expectedFor(file));
  });

  // PBI-211: the corpus fixtures carry their real-page radio groups again
  // (formmailer-anketo-gender.html shape). One field per name; each group
  // pins its option count and its rule category. Non-gender groups stay
  // unclassified and never reach a plan row, so the classified results above
  // stay unchanged. Gender groups that resolve are pinned here as gender and
  // by the fill expectations above.
  const radioGroups: Array<[CorpusName, Record<string, [number, Category]>]> = [
    ['richell-anketo-rating.html', {
      field_2953447: [5, 'unknown'], field_2953448: [5, 'unknown'], field_2953449: [5, 'unknown'],
      field_2953450: [5, 'unknown'], field_2953452: [10, 'unknown'], field_2953453: [10, 'unknown'],
    }],
    ['kosodate-contact.html', { 'wpforms[fields][42]': [3, 'unknown'] }],
    ['library-theater-apply.html', { field_6426354: [2, 'unknown'] }],
    ['gis-intl-admission.html', {
      'desired-enrollment': [5, 'unknown'], 'desired-grade': [7, 'unknown'], 'dormitory-accommodation': [3, 'unknown'],
      'japanese-proficiency': [3, 'unknown'], 'jlpt-level': [6, 'unknown'], 'studied-japanese': [2, 'unknown'],
    }],
    ['bst-inquire.html', {
      'student[field_attributes][234537]': [2, 'unknown'],
      'student[gender]': [2, 'gender'],
    }],
    ['isi-contact.html', { Residence_in_Japan: [2, 'unknown'], Preferred_Study_Duration: [3, 'unknown'] }],
    ['kigakuen-briefing.html', { field_5969379: [1, 'unknown'], field_5969384: [2, 'gender'], field_5969388: [2, 'unknown'] }],
  ];
  it('restored radio groups are one field per name with pinned categories', async () => {
    for (const [file, groups] of radioGroups) {
      document.body.innerHTML = new DOMParser().parseFromString(corpusEntry(file).html, 'text/html').body.innerHTML;
      const radios = scanFields(document.body).filter((f) => f.meta.tag === 'radio');
      expect(radios.map((r) => r.meta.name)).toEqual(Object.keys(groups));
      for (const r of radios) expect(r.meta.options.length).toBe(groups[r.meta.name]![0]);
      const items = await classifyAll(radios.map((r) => r.meta), null, {
        englishPage: isEnglishPageText(document.body.textContent ?? ''),
      });
      expect(items.map((i) => i.cls.category)).toEqual(radios.map((r) => groups[r.meta.name]![1]));
    }
  });
});
