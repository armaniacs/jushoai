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

  it('12fc22bc297429.html fills the in-scope fields', async () => {
    expect(await planFor('12fc22bc297429.html')).toEqual(expectedFor('12fc22bc297429.html'));
  });
  it('2dd1c663300469.html fills the in-scope fields', async () => {
    expect(await planFor('2dd1c663300469.html')).toEqual(expectedFor('2dd1c663300469.html'));
  });
  it('registration.html fills the in-scope fields', async () => {
    expect(await planFor('registration.html')).toEqual(expectedFor('registration.html'));
  });
  it('forum.html fills the in-scope fields', async () => {
    expect(await planFor('forum.html')).toEqual(expectedFor('forum.html'));
  });
  it('richell-anketo-rating.html fills the in-scope fields', async () => {
    expect(await planFor('richell-anketo-rating.html')).toEqual(expectedFor('richell-anketo-rating.html'));
  });
  it('kosodate-contact.html fills the in-scope fields', async () => {
    expect(await planFor('kosodate-contact.html')).toEqual(expectedFor('kosodate-contact.html'));
  });
  it('library-theater-apply.html fills the in-scope fields', async () => {
    expect(await planFor('library-theater-apply.html')).toEqual(expectedFor('library-theater-apply.html'));
  });
  it('nishimachi-inquiry.html fills the in-scope fields', async () => {
    expect(await planFor('nishimachi-inquiry.html')).toEqual(expectedFor('nishimachi-inquiry.html'));
  });
  it('gis-intl-admission.html fills the in-scope fields', async () => {
    expect(await planFor('gis-intl-admission.html')).toEqual(expectedFor('gis-intl-admission.html'));
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
  it('bst-inquire.html fills the in-scope fields', async () => {
    expect(await planFor('bst-inquire.html')).toEqual(expectedFor('bst-inquire.html'));
  });
  it('isi-contact.html fills the in-scope fields', async () => {
    expect(await planFor('isi-contact.html')).toEqual(expectedFor('isi-contact.html'));
  });
  it('ois-contact.html fills the in-scope fields', async () => {
    expect(await planFor('ois-contact.html')).toEqual(expectedFor('ois-contact.html'));
  });
  it('kigakuen-briefing.html fills the in-scope fields', async () => {
    expect(await planFor('kigakuen-briefing.html')).toEqual(expectedFor('kigakuen-briefing.html'));
  });
  it('seedome-openschool.html fills the in-scope fields', async () => {
    expect(await planFor('seedome-openschool.html')).toEqual(expectedFor('seedome-openschool.html'));
  });
  it('ff-csr.html fills the in-scope fields', async () => {
    expect(await planFor('ff-csr.html')).toEqual(expectedFor('ff-csr.html'));
  });
  it('otsuka-opinion-form.html fills the in-scope fields', async () => {
    expect(await planFor('otsuka-opinion-form.html')).toEqual(expectedFor('otsuka-opinion-form.html'));
  });
  it('mitsuihome-sonota-form.html fills the in-scope fields', async () => {
    expect(await planFor('mitsuihome-sonota-form.html')).toEqual(expectedFor('mitsuihome-sonota-form.html'));
  });
  it('mitsui-reform-catalog-form.html fills the in-scope fields', async () => {
    expect(await planFor('mitsui-reform-catalog-form.html')).toEqual(expectedFor('mitsui-reform-catalog-form.html'));
  });
  it('tokyu-land-contact-form.html fills the in-scope fields', async () => {
    expect(await planFor('tokyu-land-contact-form.html')).toEqual(expectedFor('tokyu-land-contact-form.html'));
  });
  it('kobe-city-contact-form.html fills the in-scope fields', async () => {
    expect(await planFor('kobe-city-contact-form.html')).toEqual(expectedFor('kobe-city-contact-form.html'));
  });
  it('epson-csr-form.html fills the in-scope fields', async () => {
    expect(await planFor('epson-csr-form.html')).toEqual(expectedFor('epson-csr-form.html'));
  });
  it('ricoh-risb-form.html fills the in-scope fields', async () => {
    expect(await planFor('ricoh-risb-form.html')).toEqual(expectedFor('ricoh-risb-form.html'));
  });
  it('kikkoman-website-form.html fills the in-scope fields', async () => {
    expect(await planFor('kikkoman-website-form.html')).toEqual(expectedFor('kikkoman-website-form.html'));
  });
  it('smp-regist-inquiry-form.html fills the in-scope fields', async () => {
    expect(await planFor('smp-regist-inquiry-form.html')).toEqual(expectedFor('smp-regist-inquiry-form.html'));
  });
  it('toshiba-gx-contact-form.html fills the in-scope fields', async () => {
    expect(await planFor('toshiba-gx-contact-form.html')).toEqual(expectedFor('toshiba-gx-contact-form.html'));
  });
  it('ff-webmaster-form.html fills the in-scope fields', async () => {
    expect(await planFor('ff-webmaster-form.html')).toEqual(expectedFor('ff-webmaster-form.html'));
  });
  it('ff-procurement-form.html fills the in-scope fields', async () => {
    expect(await planFor('ff-procurement-form.html')).toEqual(expectedFor('ff-procurement-form.html'));
  });
  it('ff-compliance-hotline-form.html fills the in-scope fields', async () => {
    expect(await planFor('ff-compliance-hotline-form.html')).toEqual(expectedFor('ff-compliance-hotline-form.html'));
  });
  it('tokyu-land-kojin-form.html fills the in-scope fields', async () => {
    expect(await planFor('tokyu-land-kojin-form.html')).toEqual(expectedFor('tokyu-land-kojin-form.html'));
  });
  it('tokyu-land-tenant-form.html fills the in-scope fields', async () => {
    expect(await planFor('tokyu-land-tenant-form.html')).toEqual(expectedFor('tokyu-land-tenant-form.html'));
  });
  it('benesse-inquiry-form.html fills the in-scope fields', async () => {
    expect(await planFor('benesse-inquiry-form.html')).toEqual(expectedFor('benesse-inquiry-form.html'));
  });
  it('mitsui-chintai-inquiry-form.html fills the in-scope fields', async () => {
    expect(await planFor('mitsui-chintai-inquiry-form.html')).toEqual(expectedFor('mitsui-chintai-inquiry-form.html'));
  });
  it('epson-ir-form.html fills the in-scope fields', async () => {
    expect(await planFor('epson-ir-form.html')).toEqual(expectedFor('epson-ir-form.html'));
  });
  it('ricoh-vulnerability-form.html fills the in-scope fields', async () => {
    expect(await planFor('ricoh-vulnerability-form.html')).toEqual(expectedFor('ricoh-vulnerability-form.html'));
  });
  it('brother-inquiry-form.html fills the in-scope fields', async () => {
    expect(await planFor('brother-inquiry-form.html')).toEqual(expectedFor('brother-inquiry-form.html'));
  });
  it('kikkoman-media-form.html fills the in-scope fields', async () => {
    expect(await planFor('kikkoman-media-form.html')).toEqual(expectedFor('kikkoman-media-form.html'));
  });
  it('kikkoman-works-form.html fills the in-scope fields', async () => {
    expect(await planFor('kikkoman-works-form.html')).toEqual(expectedFor('kikkoman-works-form.html'));
  });
  it('aeon-voice-form.html fills the in-scope fields', async () => {
    expect(await planFor('aeon-voice-form.html')).toEqual(expectedFor('aeon-voice-form.html'));
  });
  it('auhikari-callback-form.html fills the in-scope fields', async () => {
    expect(await planFor('auhikari-callback-form.html')).toEqual(expectedFor('auhikari-callback-form.html'));
  });
  it('hamamatsu-kocho-form.html fills the in-scope fields', async () => {
    expect(await planFor('hamamatsu-kocho-form.html')).toEqual(expectedFor('hamamatsu-kocho-form.html'));
  });
  it('okayama-inquiry-form.html fills the in-scope fields', async () => {
    expect(await planFor('okayama-inquiry-form.html')).toEqual(expectedFor('okayama-inquiry-form.html'));
  });
  it('fukuoka-teian-form.html fills the in-scope fields', async () => {
    expect(await planFor('fukuoka-teian-form.html')).toEqual(expectedFor('fukuoka-teian-form.html'));
  });
  it('tokyo-steel-contact-form.html fills the in-scope fields', async () => {
    expect(await planFor('tokyo-steel-contact-form.html')).toEqual(expectedFor('tokyo-steel-contact-form.html'));
  });
  it('taiheiyo-cement-contact-form.html fills the in-scope fields', async () => {
    expect(await planFor('taiheiyo-cement-contact-form.html')).toEqual(expectedFor('taiheiyo-cement-contact-form.html'));
  });
  it('ngk-contact-form.html fills the in-scope fields', async () => {
    expect(await planFor('ngk-contact-form.html')).toEqual(expectedFor('ngk-contact-form.html'));
  });
  it('lixil-inquiry-form.html fills the in-scope fields', async () => {
    expect(await planFor('lixil-inquiry-form.html')).toEqual(expectedFor('lixil-inquiry-form.html'));
  });
  it('sapporo-iken-form.html fills the in-scope fields', async () => {
    expect(await planFor('sapporo-iken-form.html')).toEqual(expectedFor('sapporo-iken-form.html'));
  });
  it('kubota-engine-contact-form.html fills the in-scope fields', async () => {
    expect(await planFor('kubota-engine-contact-form.html')).toEqual(expectedFor('kubota-engine-contact-form.html'));
  });
  it('mailform.html fills the in-scope fields', async () => {
    expect(await planFor('mailform.html')).toEqual(expectedFor('mailform.html'));
  });
  it('opinion-html.html fills the in-scope fields', async () => {
    expect(await planFor('opinion-html.html')).toEqual(expectedFor('opinion-html.html'));
  });
  it('arakawa-mailform.html fills the in-scope fields', async () => {
    expect(await planFor('arakawa-mailform.html')).toEqual(expectedFor('arakawa-mailform.html'));
  });
  it('2000033.html fills the in-scope fields', async () => {
    expect(await planFor('2000033.html')).toEqual(expectedFor('2000033.html'));
  });
  it('tosyo-00001-html.html fills the in-scope fields', async () => {
    expect(await planFor('tosyo-00001-html.html')).toEqual(expectedFor('tosyo-00001-html.html'));
  });
  it('azbil-kikubari-form.html fills the in-scope fields', async () => {
    expect(await planFor('azbil-kikubari-form.html')).toEqual(expectedFor('azbil-kikubari-form.html'));
  });
  it('keyence-inquiry-form.html fills the in-scope fields', async () => {
    expect(await planFor('keyence-inquiry-form.html')).toEqual(expectedFor('keyence-inquiry-form.html'));
  });
  it('sysmex-contact-form.html fills the in-scope fields', async () => {
    expect(await planFor('sysmex-contact-form.html')).toEqual(expectedFor('sysmex-contact-form.html'));
  });
  it('lasertec-inquiry-form.html fills the in-scope fields', async () => {
    expect(await planFor('lasertec-inquiry-form.html')).toEqual(expectedFor('lasertec-inquiry-form.html'));
  });
  it('toyoda-gosei-form.html fills the in-scope fields', async () => {
    expect(await planFor('toyoda-gosei-form.html')).toEqual(expectedFor('toyoda-gosei-form.html'));
  });
  it('mitsubishi-materials-form.html fills the in-scope fields', async () => {
    expect(await planFor('mitsubishi-materials-form.html')).toEqual(expectedFor('mitsubishi-materials-form.html'));
  });
  it('yoshinoya-store-form.html fills the in-scope fields', async () => {
    expect(await planFor('yoshinoya-store-form.html')).toEqual(expectedFor('yoshinoya-store-form.html'));
  });
  it('tonami-luggage-form.html fills the in-scope fields', async () => {
    expect(await planFor('tonami-luggage-form.html')).toEqual(expectedFor('tonami-luggage-form.html'));
  });
  it('contact.html fills the in-scope fields', async () => {
    expect(await planFor('contact.html')).toEqual(expectedFor('contact.html'));
  });
  it('inquiry-html.html fills the in-scope fields', async () => {
    expect(await planFor('inquiry-html.html')).toEqual(expectedFor('inquiry-html.html'));
  });
  it('index-asp.html fills the in-scope fields', async () => {
    expect(await planFor('index-asp.html')).toEqual(expectedFor('index-asp.html'));
  });
  it('6932.html fills the in-scope fields', async () => {
    expect(await planFor('6932.html')).toEqual(expectedFor('6932.html'));
  });
  it('kit-contact-form.html fills the in-scope fields', async () => {
    expect(await planFor('kit-contact-form.html')).toEqual(expectedFor('kit-contact-form.html'));
  });
  it('shimane-inquiry-form.html fills the in-scope fields', async () => {
    expect(await planFor('shimane-inquiry-form.html')).toEqual(expectedFor('shimane-inquiry-form.html'));
  });
  it('aoyama-campus-inquiry.html fills the in-scope fields', async () => {
    expect(await planFor('aoyama-campus-inquiry.html')).toEqual(expectedFor('aoyama-campus-inquiry.html'));
  });
  it('aoyama-sagamihara-career.html fills the in-scope fields', async () => {
    expect(await planFor('aoyama-sagamihara-career.html')).toEqual(expectedFor('aoyama-sagamihara-career.html'));
  });
  it('smp-openhouse-inquiry.html fills the in-scope fields', async () => {
    expect(await planFor('smp-openhouse-inquiry.html')).toEqual(expectedFor('smp-openhouse-inquiry.html'));
  });
  it('sumitomo-latour-inquiry.html fills the in-scope fields', async () => {
    expect(await planFor('sumitomo-latour-inquiry.html')).toEqual(expectedFor('sumitomo-latour-inquiry.html'));
  });
  it('sumifu-step-otoiawase.html fills the in-scope fields', async () => {
    expect(await planFor('sumifu-step-otoiawase.html')).toEqual(expectedFor('sumifu-step-otoiawase.html'));
  });
  it('proud-procedure-form.html fills the in-scope fields', async () => {
    expect(await planFor('proud-procedure-form.html')).toEqual(expectedFor('proud-procedure-form.html'));
  });
  it('tokyu-branz-owner-form.html fills the in-scope fields', async () => {
    expect(await planFor('tokyu-branz-owner-form.html')).toEqual(expectedFor('tokyu-branz-owner-form.html'));
  });
  it('tokyu-commercial-form.html fills the in-scope fields', async () => {
    expect(await planFor('tokyu-commercial-form.html')).toEqual(expectedFor('tokyu-commercial-form.html'));
  });
  it('tokyu-cre-form.html fills the in-scope fields', async () => {
    expect(await planFor('tokyu-cre-form.html')).toEqual(expectedFor('tokyu-cre-form.html'));
  });
  it('brillia-support-contact.html fills the in-scope fields', async () => {
    expect(await planFor('brillia-support-contact.html')).toEqual(expectedFor('brillia-support-contact.html'));
  });
  it('hulic-develop-plan.html fills the in-scope fields', async () => {
    expect(await planFor('hulic-develop-plan.html')).toEqual(expectedFor('hulic-develop-plan.html'));
  });
  it('mori-webcas-contact.html fills the in-scope fields', async () => {
    expect(await planFor('mori-webcas-contact.html')).toEqual(expectedFor('mori-webcas-contact.html'));
  });
  it('openhouse-customer-contact.html fills the in-scope fields', async () => {
    expect(await planFor('openhouse-customer-contact.html')).toEqual(expectedFor('openhouse-customer-contact.html'));
  });
  it('anabuki-general-contact.html fills the in-scope fields', async () => {
    expect(await planFor('anabuki-general-contact.html')).toEqual(expectedFor('anabuki-general-contact.html'));
  });
  it('anabuki-landuse-contact.html fills the in-scope fields', async () => {
    expect(await planFor('anabuki-landuse-contact.html')).toEqual(expectedFor('anabuki-landuse-contact.html'));
  });
  it('haseko-contact-input.html fills the in-scope fields', async () => {
    expect(await planFor('haseko-contact-input.html')).toEqual(expectedFor('haseko-contact-input.html'));
  });
  it('toshin-shiryo-form.html fills the in-scope fields', async () => {
    expect(await planFor('toshin-shiryo-form.html')).toEqual(expectedFor('toshin-shiryo-form.html'));
  });
  it('toshin-mendan-form.html fills the in-scope fields', async () => {
    expect(await planFor('toshin-mendan-form.html')).toEqual(expectedFor('toshin-mendan-form.html'));
  });
  it('yotsuya-nyujuku-form.html fills the in-scope fields', async () => {
    expect(await planFor('yotsuya-nyujuku-form.html')).toEqual(expectedFor('yotsuya-nyujuku-form.html'));
  });
  it('kumon-annai-form.html fills the in-scope fields', async () => {
    expect(await planFor('kumon-annai-form.html')).toEqual(expectedFor('kumon-annai-form.html'));
  });
  it('manavis-shiryo-form.html fills the in-scope fields', async () => {
    expect(await planFor('manavis-shiryo-form.html')).toEqual(expectedFor('manavis-shiryo-form.html'));
  });
  it('eikoh-shiryo-form.html fills the in-scope fields', async () => {
    expect(await planFor('eikoh-shiryo-form.html')).toEqual(expectedFor('eikoh-shiryo-form.html'));
  });
  it('cigr-ir-contact.html fills the in-scope fields', async () => {
    expect(await planFor('cigr-ir-contact.html')).toEqual(expectedFor('cigr-ir-contact.html'));
  });
  it('shozemi-contact-form.html fills the in-scope fields', async () => {
    expect(await planFor('shozemi-contact-form.html')).toEqual(expectedFor('shozemi-contact-form.html'));
  });
  it('waseda-ac-form.html fills the in-scope fields', async () => {
    expect(await planFor('waseda-ac-form.html')).toEqual(expectedFor('waseda-ac-form.html'));
  });
  it('morijuku-contact-form.html fills the in-scope fields', async () => {
    expect(await planFor('morijuku-contact-form.html')).toEqual(expectedFor('morijuku-contact-form.html'));
  });
});
