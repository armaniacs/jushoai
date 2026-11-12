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

  // T2: MS Forms (Tokyo OpenRoaming) minimal reproduction. The live page
  // renders client-side, so the fixture transcribes the reported questions
  // with the real placeholders. Rules fill 1, 2, 3, 5, 6; 4 (job title) has
  // no rule vocabulary yet (T3 owns it).
  it('ms-forms-openroaming pins the current rule classification', async () => {
    const { html } = corpusEntry('responsepage-aspx.html');
    document.body.innerHTML = new DOMParser().parseFromString(html, 'text/html').body.innerHTML;
    const fields = scanFields(document.body);
    expect(fields.map((f) => f.meta.name)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7']);
    const items = await classifyAll(fields.map((f) => f.meta), null, {
      englishPage: isEnglishPageText(document.body.textContent ?? ''),
    });
    expect(items.map((i) => i.cls.category)).toEqual([
      'fullName', 'company', 'companyDepartment', 'unknown', 'email', 'tel', 'unknown',
    ]);
    expect(items.map((i) => i.cls.confidence)).toEqual([0.7, 0.7, 0.7, 0, 0.7, 0.7, 0]);
    expect(items.map((i) => i.cls.source)).toEqual(['rule', 'rule', 'rule', 'rule', 'rule', 'rule', 'rule']);
    expect(await planFor('responsepage-aspx.html')).toEqual(expectedFor('responsepage-aspx.html'));
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
    'kobe-city-contact-form.html',
    'epson-csr-form.html',
    'ricoh-risb-form.html',
    'kikkoman-website-form.html',
    'smp-regist-inquiry-form.html',
    'toshiba-gx-contact-form.html',
    'ff-webmaster-form.html',
    'ff-procurement-form.html',
    'ff-compliance-hotline-form.html',
    'tokyu-land-kojin-form.html',
    'tokyu-land-tenant-form.html',
    'benesse-inquiry-form.html',
    'mitsui-chintai-inquiry-form.html',
    'epson-ir-form.html',
    'ricoh-vulnerability-form.html',
    'brother-inquiry-form.html',
    'kikkoman-media-form.html',
    'kikkoman-works-form.html',
    'aeon-voice-form.html',
    'auhikari-callback-form.html',
    'hamamatsu-kocho-form.html',
    'okayama-inquiry-form.html',
    'fukuoka-teian-form.html',
    'tokyo-steel-contact-form.html',
    'taiheiyo-cement-contact-form.html',
    'ngk-contact-form.html',
    'lixil-inquiry-form.html',
    'sapporo-iken-form.html',
    'kubota-engine-contact-form.html',
    'mailform.html',
    'opinion-html.html',
    'arakawa-mailform.html',
    '2000033.html',
    'tosyo-00001-html.html',
    'azbil-kikubari-form.html',
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
    'haseko-contact-input.html',
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
    'sekisui-mail-form.html',
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
