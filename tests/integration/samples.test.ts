import { describe, it, expect } from 'vitest';
import { classifyAll } from '../../src/core/analyze';
import { buildPlan } from '../../src/core/planner';
import type { Address, Profile } from '../../src/core/types';
import { detectForms } from '../../src/dom/detect-forms';
import { scanFields } from '../../src/dom/scan-fields';
import furigana from '../../samples/furigana-fieldset-form.html?raw';
import katakana from '../../samples/katakana-fieldset-form.html?raw';
import profileFields from '../../samples/profile-fields-form.html?raw';
import single from '../../samples/single-field-form.html?raw';
import split from '../../samples/split-form.html?raw';
import table from '../../samples/table-form.html?raw';
import roman from '../../samples/roman-name-form.html?raw';
import gender from '../../samples/gender-select-form.html?raw';
import decade from '../../samples/age-decade-select-form.html?raw';
import abroad from '../../samples/overseas-address-form.html?raw';
import joshibi from '../../samples/overseas-webform-joshibi.html?raw';
import anketo from '../../samples/formmailer-anketo-gender.html?raw';
import raijo from '../../samples/formmailer-raijo-age.html?raw';

const SAMPLES: Record<string, string> = {
  'table-form.html': table,
  'split-form.html': split,
  'single-field-form.html': single,
  'roman-name-form.html': roman,
  'gender-select-form.html': gender,
  'age-decade-select-form.html': decade,
  'overseas-address-form.html': abroad,
  'overseas-webform-joshibi.html': joshibi,
  'formmailer-anketo-gender.html': anketo,
  'formmailer-raijo-age.html': raijo,
  'furigana-fieldset-form.html': furigana,
  'katakana-fieldset-form.html': katakana,
  'profile-fields-form.html': profileFields,
};

const profile: Profile = {
  id: 'p1', label: 'メイン',
  lastName: '山田', firstName: '太郎', lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
  lastNameRomaji: 'Yamada', firstNameRomaji: 'Taro',
  gender: '女性',
  birthday: '1990-05-07', school: '都立日比谷高校', department: '普通科',
  email: 'yamada@example.com', tel: '09012345678',
};
const address: Address = {
  id: 'a', label: 'home', zip: '1000001', prefecture: '東京都', city: '千代田区',
  street: '千代田1-1', building: '千代田ビル101',
  country: 'United States', address1: '#123 Central Apartment',
  address2: '25-15 M.G.Peterson Ave', address3: 'Long Island City',
  address4: 'NEW YORK', postalCode: '11375',
};

async function planFor(file: string, today?: Date): Promise<Record<string, string>> {
  const html = SAMPLES[file]!;
  document.body.innerHTML = new DOMParser().parseFromString(html, 'text/html').body.innerHTML;
  const fields = scanFields(document.body);
  const items = await classifyAll(fields.map((f) => f.meta), null);
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

  it('anchors the table-form button on the last name field', () => {
    document.body.innerHTML = new DOMParser().parseFromString(table, 'text/html').body.innerHTML;
    const forms = detectForms(document);
    expect(forms).toHaveLength(1);
    expect(forms[0]!.anchor.el.getAttribute('name')).toBe('n1');
  });
});
