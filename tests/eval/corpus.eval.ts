import { describe, it, expect } from 'vitest';
import { evalMetricsFor, reportLine, aggregate, type EvalMetrics } from '../../src/eval/metrics';
import { scanFields } from '../../src/dom/scan-fields';
// The corpus (name → html + per-fixture expectations) comes from the shared
// ledger module (PBI-216): the glob lives there, once, so this file carries
// no second registry and a fixture added via `make addurl` joins without a
// list edit here.
import { corpus } from '../corpus';

// Per-fixture pin table (PBI-215): one row per corpus fixture. Row values are
// copied from the `make eval` reportLine output, never recomputed by hand.
// Rows move only when fixtures or the pipeline change. A drift names its
// fixture, the aggregate is read as the table's sums, and the row diff in git
// is the composition record.
// 現在の内訳は pin 表を見よ。pin のずれは表の該当 fixture 行を同じコミットで
// 編集する。表の diff が世代記録になる。古い基準値の追記はしない。
// unknowns は total - ruleHits で誘導できるため行に載せない（EvalMetrics には残る）。
interface PinRow {
  ruleHits: number;
  llmFallbacks: number;
  fillable: number;
  refineChanged: number;
  refineDropped: number;
}

const PIN_TABLE: Record<string, PinRow> = {
  '12fc22bc297429.html': { ruleHits: 10, llmFallbacks: 0, fillable: 8, refineChanged: 3, refineDropped: 0 },
  '2dd1c663300469.html': { ruleHits: 11, llmFallbacks: 1, fillable: 7, refineChanged: 0, refineDropped: 0 },
  '2000033.html': { ruleHits: 2, llmFallbacks: 0, fillable: 0, refineChanged: 0, refineDropped: 0 },
  '6932.html': { ruleHits: 13, llmFallbacks: 4, fillable: 5, refineChanged: 1, refineDropped: 0 },
  'aeon-voice-form.html': { ruleHits: 7, llmFallbacks: 2, fillable: 6, refineChanged: 0, refineDropped: 0 },
  'age-decade-select-form.html': { ruleHits: 2, llmFallbacks: 0, fillable: 2, refineChanged: 0, refineDropped: 0 },
  'anabuki-general-contact.html': { ruleHits: 3, llmFallbacks: 5, fillable: 2, refineChanged: 2, refineDropped: 0 },
  'anabuki-landuse-contact.html': { ruleHits: 8, llmFallbacks: 6, fillable: 1, refineChanged: 4, refineDropped: 0 },
  'aoyama-campus-inquiry.html': { ruleHits: 7, llmFallbacks: 4, fillable: 7, refineChanged: 3, refineDropped: 0 },
  'aoyama-sagamihara-career.html': { ruleHits: 5, llmFallbacks: 1, fillable: 4, refineChanged: 0, refineDropped: 0 },
  'apaman-contact.html': { ruleHits: 9, llmFallbacks: 1, fillable: 7, refineChanged: 0, refineDropped: 0 },
  'arakawa-mailform.html': { ruleHits: 4, llmFallbacks: 0, fillable: 3, refineChanged: 0, refineDropped: 0 },
  'auhikari-callback-form.html': { ruleHits: 14, llmFallbacks: 0, fillable: 8, refineChanged: 9, refineDropped: 0 },
  'axis-inquiry-form.html': { ruleHits: 18, llmFallbacks: 4, fillable: 7, refineChanged: 2, refineDropped: 0 },
  'azbil-kikubari-form.html': { ruleHits: 3, llmFallbacks: 29, fillable: 0, refineChanged: 0, refineDropped: 6 },
  'benesse-inquiry-form.html': { ruleHits: 8, llmFallbacks: 4, fillable: 7, refineChanged: 2, refineDropped: 0 },
  'brillia-support-contact.html': { ruleHits: 7, llmFallbacks: 12, fillable: 6, refineChanged: 0, refineDropped: 0 },
  'brother-inquiry-form.html': { ruleHits: 4, llmFallbacks: 12, fillable: 3, refineChanged: 0, refineDropped: 0 },
  'bst-inquire.html': { ruleHits: 14, llmFallbacks: 13, fillable: 10, refineChanged: 0, refineDropped: 0 },
  'cigr-ir-contact.html': { ruleHits: 11, llmFallbacks: 2, fillable: 5, refineChanged: 3, refineDropped: 0 },
  'contact.html': { ruleHits: 11, llmFallbacks: 0, fillable: 6, refineChanged: 0, refineDropped: 0 },
  'demo-ai-ambiguous.html': { ruleHits: 2, llmFallbacks: 8, fillable: 2, refineChanged: 0, refineDropped: 0 },
  'demo-registration.html': { ruleHits: 10, llmFallbacks: 0, fillable: 7, refineChanged: 1, refineDropped: 0 },
  'demo-request-info.html': { ruleHits: 10, llmFallbacks: 0, fillable: 7, refineChanged: 1, refineDropped: 0 },
  'demo-shop-checkout.html': { ruleHits: 10, llmFallbacks: 0, fillable: 7, refineChanged: 1, refineDropped: 0 },
  'eikoh-shiryo-form.html': { ruleHits: 3, llmFallbacks: 2, fillable: 2, refineChanged: 0, refineDropped: 6 },
  'eishinkan-contact-form.html': { ruleHits: 18, llmFallbacks: 9, fillable: 9, refineChanged: 7, refineDropped: 4 },
  'ena-request-form.html': { ruleHits: 16, llmFallbacks: 8, fillable: 10, refineChanged: 3, refineDropped: 4 },
  'epson-csr-form.html': { ruleHits: 2, llmFallbacks: 18, fillable: 0, refineChanged: 0, refineDropped: 0 },
  'epson-ir-form.html': { ruleHits: 2, llmFallbacks: 18, fillable: 0, refineChanged: 0, refineDropped: 0 },
  'fukuoka-teian-form.html': { ruleHits: 9, llmFallbacks: 1, fillable: 5, refineChanged: 0, refineDropped: 0 },
  'fujita-contact.html': { ruleHits: 10, llmFallbacks: 1, fillable: 6, refineChanged: 0, refineDropped: 0 },
  'ff-compliance-hotline-form.html': { ruleHits: 6, llmFallbacks: 1, fillable: 6, refineChanged: 0, refineDropped: 0 },
  'ff-csr.html': { ruleHits: 13, llmFallbacks: 3, fillable: 9, refineChanged: 0, refineDropped: 0 },
  'ff-procurement-form.html': { ruleHits: 13, llmFallbacks: 3, fillable: 9, refineChanged: 0, refineDropped: 0 },
  'ff-webmaster-form.html': { ruleHits: 13, llmFallbacks: 3, fillable: 9, refineChanged: 0, refineDropped: 0 },
  'formmailer-anketo-gender.html': { ruleHits: 2, llmFallbacks: 6, fillable: 0, refineChanged: 0, refineDropped: 0 },
  'formmailer-raijo-age.html': { ruleHits: 16, llmFallbacks: 5, fillable: 10, refineChanged: 6, refineDropped: 0 },
  'forum.html': { ruleHits: 7, llmFallbacks: 2, fillable: 5, refineChanged: 0, refineDropped: 0 },
  'furigana-fieldset-form.html': { ruleHits: 4, llmFallbacks: 0, fillable: 4, refineChanged: 0, refineDropped: 0 },
  'gender-select-form.html': { ruleHits: 2, llmFallbacks: 0, fillable: 1, refineChanged: 0, refineDropped: 0 },
  'gis-intl-admission.html': { ruleHits: 6, llmFallbacks: 8, fillable: 3, refineChanged: 0, refineDropped: 0 },
  'hamamatsu-kocho-form.html': { ruleHits: 6, llmFallbacks: 2, fillable: 5, refineChanged: 0, refineDropped: 0 },
  'haseko-contact-input.html': { ruleHits: 3, llmFallbacks: 4, fillable: 3, refineChanged: 2, refineDropped: 0 },
  'hhp-site-inquiry.html': { ruleHits: 9, llmFallbacks: 6, fillable: 7, refineChanged: 9, refineDropped: 0 },
  'hulic-develop-plan.html': { ruleHits: 9, llmFallbacks: 5, fillable: 7, refineChanged: 4, refineDropped: 0 },
  'ichishin-contact-form.html': { ruleHits: 24, llmFallbacks: 11, fillable: 16, refineChanged: 17, refineDropped: 0 },
  'index-asp.html': { ruleHits: 6, llmFallbacks: 12, fillable: 4, refineChanged: 2, refineDropped: 0 },
  'inquiry-html.html': { ruleHits: 12, llmFallbacks: 0, fillable: 7, refineChanged: 2, refineDropped: 0 },
  'isi-contact.html': { ruleHits: 5, llmFallbacks: 7, fillable: 4, refineChanged: 0, refineDropped: 0 },
  'jiritsu-red-contact-form.html': { ruleHits: 11, llmFallbacks: 1, fillable: 6, refineChanged: 0, refineDropped: 0 },
  'jpaa-contact.html': { ruleHits: 9, llmFallbacks: 2, fillable: 7, refineChanged: 3, refineDropped: 0 },
  'katakana-fieldset-form.html': { ruleHits: 4, llmFallbacks: 0, fillable: 4, refineChanged: 0, refineDropped: 0 },
  'keishin-contact-form.html': { ruleHits: 22, llmFallbacks: 8, fillable: 14, refineChanged: 11, refineDropped: 0 },
  'keyence-inquiry-form.html': { ruleHits: 13, llmFallbacks: 1, fillable: 6, refineChanged: 1, refineDropped: 0 },
  'kigakuen-briefing.html': { ruleHits: 22, llmFallbacks: 10, fillable: 11, refineChanged: 6, refineDropped: 0 },
  'kikkoman-media-form.html': { ruleHits: 3, llmFallbacks: 6, fillable: 3, refineChanged: 3, refineDropped: 0 },
  'kikkoman-website-form.html': { ruleHits: 7, llmFallbacks: 5, fillable: 7, refineChanged: 3, refineDropped: 0 },
  'kikkoman-works-form.html': { ruleHits: 7, llmFallbacks: 4, fillable: 7, refineChanged: 3, refineDropped: 0 },
  'kit-contact-form.html': { ruleHits: 7, llmFallbacks: 2, fillable: 7, refineChanged: 0, refineDropped: 0 },
  'kobe-city-contact-form.html': { ruleHits: 1, llmFallbacks: 8, fillable: 1, refineChanged: 0, refineDropped: 0 },
  'kosodate-contact.html': { ruleHits: 4, llmFallbacks: 5, fillable: 4, refineChanged: 0, refineDropped: 0 },
  'kubota-engine-contact-form.html': { ruleHits: 9, llmFallbacks: 4, fillable: 5, refineChanged: 1, refineDropped: 0 },
  'kumon-annai-form.html': { ruleHits: 10, llmFallbacks: 7, fillable: 8, refineChanged: 7, refineDropped: 0 },
  'lasertec-inquiry-form.html': { ruleHits: 15, llmFallbacks: 2, fillable: 8, refineChanged: 9, refineDropped: 0 },
  'library-theater-apply.html': { ruleHits: 15, llmFallbacks: 4, fillable: 9, refineChanged: 6, refineDropped: 0 },
  'lixil-inquiry-form.html': { ruleHits: 15, llmFallbacks: 5, fillable: 8, refineChanged: 2, refineDropped: 0 },
  'mailform.html': { ruleHits: 4, llmFallbacks: 0, fillable: 4, refineChanged: 0, refineDropped: 0 },
  'manavis-shiryo-form.html': { ruleHits: 18, llmFallbacks: 4, fillable: 12, refineChanged: 3, refineDropped: 0 },
  'meiko-contact-form.html': { ruleHits: 18, llmFallbacks: 4, fillable: 9, refineChanged: 6, refineDropped: 0 },
  'mitsubishi-materials-form.html': { ruleHits: 18, llmFallbacks: 1, fillable: 12, refineChanged: 12, refineDropped: 0 },
  'mitsui-chintai-inquiry-form.html': { ruleHits: 1, llmFallbacks: 0, fillable: 1, refineChanged: 0, refineDropped: 4 },
  'mitsui-reform-catalog-form.html': { ruleHits: 20, llmFallbacks: 9, fillable: 8, refineChanged: 11, refineDropped: 0 },
  'mitsuihome-sonota-form.html': { ruleHits: 10, llmFallbacks: 14, fillable: 6, refineChanged: 6, refineDropped: 0 },
  'mori-webcas-contact.html': { ruleHits: 4, llmFallbacks: 9, fillable: 2, refineChanged: 4, refineDropped: 0 },
  'morijuku-contact-form.html': { ruleHits: 9, llmFallbacks: 1, fillable: 7, refineChanged: 1, refineDropped: 0 },
  'ngk-contact-form.html': { ruleHits: 7, llmFallbacks: 1, fillable: 4, refineChanged: 0, refineDropped: 0 },
  'nishimachi-inquiry.html': { ruleHits: 15, llmFallbacks: 4, fillable: 7, refineChanged: 0, refineDropped: 0 },
  'nkanzai-contact.html': { ruleHits: 3, llmFallbacks: 1, fillable: 3, refineChanged: 0, refineDropped: 0 },
  'nttud-inquiry.html': { ruleHits: 5, llmFallbacks: 2, fillable: 4, refineChanged: 0, refineDropped: 0 },
  'ois-contact.html': { ruleHits: 9, llmFallbacks: 2, fillable: 6, refineChanged: 2, refineDropped: 0 },
  'okayama-inquiry-form.html': { ruleHits: 6, llmFallbacks: 6, fillable: 5, refineChanged: 0, refineDropped: 0 },
  'opinion-html.html': { ruleHits: 4, llmFallbacks: 3, fillable: 2, refineChanged: 0, refineDropped: 0 },
  'openhouse-customer-contact.html': { ruleHits: 11, llmFallbacks: 1, fillable: 7, refineChanged: 0, refineDropped: 0 },
  'otsuka-opinion-form.html': { ruleHits: 6, llmFallbacks: 3, fillable: 5, refineChanged: 3, refineDropped: 0 },
  'overseas-address-form.html': { ruleHits: 8, llmFallbacks: 0, fillable: 1, refineChanged: 0, refineDropped: 0 },
  'overseas-webform-joshibi.html': { ruleHits: 11, llmFallbacks: 2, fillable: 4, refineChanged: 0, refineDropped: 0 },
  'proud-procedure-form.html': { ruleHits: 18, llmFallbacks: 2, fillable: 6, refineChanged: 8, refineDropped: 0 },
  'profile-fields-form.html': { ruleHits: 5, llmFallbacks: 0, fillable: 3, refineChanged: 0, refineDropped: 0 },
  'registration.html': { ruleHits: 15, llmFallbacks: 4, fillable: 8, refineChanged: 0, refineDropped: 0 },
  'reinvent-registration-contact.html': { ruleHits: 4, llmFallbacks: 3, fillable: 2, refineChanged: 0, refineDropped: 0 },
  'richell-anketo-rating.html': { ruleHits: 0, llmFallbacks: 7, fillable: 0, refineChanged: 0, refineDropped: 0 },
  'ricoh-risb-form.html': { ruleHits: 1, llmFallbacks: 6, fillable: 0, refineChanged: 0, refineDropped: 0 },
  'ricoh-vulnerability-form.html': { ruleHits: 0, llmFallbacks: 10, fillable: 0, refineChanged: 0, refineDropped: 0 },
  'rinkai-shiryo-form.html': { ruleHits: 10, llmFallbacks: 5, fillable: 7, refineChanged: 5, refineDropped: 0 },
  'roman-name-form.html': { ruleHits: 3, llmFallbacks: 0, fillable: 2, refineChanged: 0, refineDropped: 0 },
  'sanaru-contact-form.html': { ruleHits: 12, llmFallbacks: 10, fillable: 7, refineChanged: 8, refineDropped: 0 },
  'sapporo-iken-form.html': { ruleHits: 2, llmFallbacks: 1, fillable: 2, refineChanged: 0, refineDropped: 0 },
  'seedome-openschool.html': { ruleHits: 6, llmFallbacks: 1, fillable: 6, refineChanged: 3, refineDropped: 0 },
  'sekisui-catalog-request.html': { ruleHits: 11, llmFallbacks: 20, fillable: 7, refineChanged: 4, refineDropped: 4 },
  'sekisui-inquiry-form.html': { ruleHits: 15, llmFallbacks: 4, fillable: 10, refineChanged: 7, refineDropped: 3 },
  'sekisui-mail-form.html': { ruleHits: 12, llmFallbacks: 2, fillable: 7, refineChanged: 9, refineDropped: 0 },
  'shimane-inquiry-form.html': { ruleHits: 3, llmFallbacks: 2, fillable: 2, refineChanged: 0, refineDropped: 0 },
  'shozemi-contact-form.html': { ruleHits: 12, llmFallbacks: 2, fillable: 7, refineChanged: 1, refineDropped: 0 },
  'single-field-form.html': { ruleHits: 4, llmFallbacks: 2, fillable: 3, refineChanged: 0, refineDropped: 0 },
  'smp-openhouse-inquiry.html': { ruleHits: 9, llmFallbacks: 5, fillable: 5, refineChanged: 5, refineDropped: 0 },
  'smp-regist-inquiry-form.html': { ruleHits: 11, llmFallbacks: 3, fillable: 6, refineChanged: 4, refineDropped: 0 },
  'split-form.html': { ruleHits: 10, llmFallbacks: 0, fillable: 7, refineChanged: 1, refineDropped: 0 },
  'sumifu-step-otoiawase.html': { ruleHits: 9, llmFallbacks: 3, fillable: 6, refineChanged: 3, refineDropped: 0 },
  'sumitomo-latour-inquiry.html': { ruleHits: 14, llmFallbacks: 9, fillable: 6, refineChanged: 0, refineDropped: 0 },
  'sysmex-contact-form.html': { ruleHits: 10, llmFallbacks: 3, fillable: 5, refineChanged: 0, refineDropped: 0 },
  'table-form.html': { ruleHits: 13, llmFallbacks: 0, fillable: 8, refineChanged: 9, refineDropped: 0 },
  'taiheiyo-cement-contact-form.html': { ruleHits: 8, llmFallbacks: 6, fillable: 5, refineChanged: 0, refineDropped: 0 },
  'tokyo-steel-contact-form.html': { ruleHits: 5, llmFallbacks: 3, fillable: 4, refineChanged: 0, refineDropped: 0 },
  'tokyu-branz-owner-form.html': { ruleHits: 8, llmFallbacks: 5, fillable: 4, refineChanged: 3, refineDropped: 0 },
  'tokyu-commercial-form.html': { ruleHits: 11, llmFallbacks: 13, fillable: 3, refineChanged: 4, refineDropped: 0 },
  'tokyu-cre-form.html': { ruleHits: 11, llmFallbacks: 9, fillable: 3, refineChanged: 4, refineDropped: 0 },
  'tokyu-land-contact-form.html': { ruleHits: 8, llmFallbacks: 2, fillable: 4, refineChanged: 0, refineDropped: 0 },
  'tokyu-land-kojin-form.html': { ruleHits: 12, llmFallbacks: 6, fillable: 5, refineChanged: 0, refineDropped: 0 },
  'tokyu-land-tenant-form.html': { ruleHits: 9, llmFallbacks: 8, fillable: 5, refineChanged: 0, refineDropped: 0 },
  'tomas-trial-form.html': { ruleHits: 10, llmFallbacks: 7, fillable: 5, refineChanged: 2, refineDropped: 9 },
  'tonami-luggage-form.html': { ruleHits: 10, llmFallbacks: 2, fillable: 6, refineChanged: 0, refineDropped: 0 },
  'toshiba-gx-contact-form.html': { ruleHits: 11, llmFallbacks: 5, fillable: 6, refineChanged: 0, refineDropped: 0 },
  'toshin-mendan-form.html': { ruleHits: 21, llmFallbacks: 3, fillable: 7, refineChanged: 2, refineDropped: 4 },
  'toshin-shiryo-form.html': { ruleHits: 21, llmFallbacks: 10, fillable: 7, refineChanged: 2, refineDropped: 4 },
  'tosyo-00001-html.html': { ruleHits: 0, llmFallbacks: 0, fillable: 0, refineChanged: 0, refineDropped: 0 },
  'toyoda-gosei-form.html': { ruleHits: 8, llmFallbacks: 3, fillable: 5, refineChanged: 2, refineDropped: 0 },
  'try-gakuin-reserve-form.html': { ruleHits: 9, llmFallbacks: 2, fillable: 6, refineChanged: 3, refineDropped: 0 },
  'wadakohsan-inquiry.html': { ruleHits: 8, llmFallbacks: 2, fillable: 5, refineChanged: 0, refineDropped: 0 },
  'waseda-ac-form.html': { ruleHits: 6, llmFallbacks: 34, fillable: 2, refineChanged: 2, refineDropped: 0 },
  'yamada-holdings-contact.html': { ruleHits: 4, llmFallbacks: 2, fillable: 4, refineChanged: 0, refineDropped: 0 },
  'yoshinoya-store-form.html': { ruleHits: 9, llmFallbacks: 2, fillable: 5, refineChanged: 3, refineDropped: 0 },
  'yotsuya-littleclub-form.html': { ruleHits: 10, llmFallbacks: 21, fillable: 10, refineChanged: 0, refineDropped: 8 },
  'yotsuya-nyujuku-form.html': { ruleHits: 22, llmFallbacks: 3, fillable: 13, refineChanged: 4, refineDropped: 0 },
};

// pin と実測のずれを指標単位で列挙する（fixture 名は呼び出し側で載せる）。
const pinDiff = (pin: PinRow, m: EvalMetrics): string[] => {
  const pairs: Array<[string, number, number]> = [
    ['ruleHits', pin.ruleHits, m.ruleHits],
    ['llmFallbacks', pin.llmFallbacks, m.llmFallbacks],
    ['fillable', pin.fillable, m.fillable],
    ['refineChanged', pin.refineChanged, m.refineChanged],
    ['refineDropped', pin.refineDropped, m.refineDropped],
  ];
  return pairs.filter(([, p, a]) => p !== a).map(([key, p, a]) => `${key} pin=${p} 実測=${a}`);
};

async function metricsFor(html: string): Promise<EvalMetrics> {
  document.body.innerHTML = new DOMParser().parseFromString(html, 'text/html').body.innerHTML;
  return evalMetricsFor(scanFields(document.body).map((f) => f.meta));
}

describe('sample corpus metrics (local, no network)', () => {
  it('measures every fixture, prints one short line per fixture, and pins each row', async () => {
    const names = Object.keys(corpus);
    expect(names.length).toBeGreaterThan(0);
    const rows: EvalMetrics[] = [];
    const measured = new Map<string, EvalMetrics>();
    for (const [name, entry] of Object.entries(corpus)) {
      const m = await metricsFor(entry.html);
      rows.push(m);
      measured.set(name, m);
      console.log(reportLine(name, m));
    }
    const agg = aggregate(rows);
    console.log(`[JushoAI eval] aggregate fixtures=${agg.fixtures} fields=${agg.total} ruleHits=${agg.ruleHits} llmFallbacks=${agg.llmFallbacks} fillable=${agg.fillable}`);
    expect(agg.fixtures).toBe(names.length);
    expect(agg.total).toBeGreaterThan(0);

    // pin 表と corpus の一致と、1 行 = 1 fixture の実測照合。ずれは fixture 名で名指す。
    const problems: string[] = [];
    for (const [name, m] of measured) {
      const pin = PIN_TABLE[name];
      const diff = pin ? pinDiff(pin, m) : ['pin 表に行がありません。make eval の fixture 行から 1 行追加する'];
      if (diff.length > 0) problems.push(`${name}: ${diff.join(', ')}`);
    }
    for (const name of Object.keys(PIN_TABLE)) {
      if (!measured.has(name)) {
        problems.push(`${name}: pin 表の行が corpus にありません（fixture を削除したなら行も削除する）`);
      }
    }
    expect(problems, 'pin 表と corpus または実測がずれています。pin 更新か意図しない分類の変化かを fixture に戻って確認する').toEqual([]);

    // 集計は pin 表の合計として読む。magic number は pin 表の行にしか置かない。
    const pinRows = Object.values(PIN_TABLE);
    const pinSum = (pick: (r: PinRow) => number) => pinRows.reduce((acc, r) => acc + pick(r), 0);
    const rowSum = (pick: (m: EvalMetrics) => number) => rows.reduce((acc, m) => acc + pick(m), 0);
    // pinDiff の一致検査が先に失敗するため、この 5 つは失敗としては論理的に到達しない。pin 表の合計としての誘導と文書化の役割
    expect(agg.ruleHits, 'pin 表の合計と実測がずれています').toBe(pinSum((r) => r.ruleHits));
    expect(agg.llmFallbacks, 'pin 表の合計と実測がずれています').toBe(pinSum((r) => r.llmFallbacks));
    expect(agg.fillable, 'pin 表の合計と実測がずれています').toBe(pinSum((r) => r.fillable));
    expect(rowSum((m) => m.refineChanged), 'pin 表の合計と実測がずれています').toBe(pinSum((r) => r.refineChanged));
    expect(rowSum((m) => m.refineDropped), 'pin 表の合計と実測がずれています').toBe(pinSum((r) => r.refineDropped));
  });

  it('keeps page content out of every report line', async () => {
    const lines: string[] = [];
    for (const [name, entry] of Object.entries(corpus)) {
      const m = await metricsFor(entry.html);
      lines.push(reportLine(name, m));
    }
    const report = lines.join('\n');
    // Fixture file names are fine; page-controlled strings (labels, values,
    // field ids from the real forms) must never enter a line.
    for (const forbidden of ['山田', '太郎', '千代田', 'formAttendee', 'field_46']) {
      expect(report, forbidden).not.toContain(forbidden);
    }
    for (const line of lines) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(200);
    }
  });

  it('never reaches the network: metrics run rule-only', async () => {
    // evalMetricsFor uses the rule-only pipeline (classifyRulePipelineWithTrace)
    // and buildPlan only — no classifier, no fetch. The assertion pins the rule
    // fallback count as measurable without an LLM: every fixture reports a
    // fallback count without any network dependency by construction.
    const m = await metricsFor('<input name="last_name"><input type="tel" name="xyz">');
    expect(m.total).toBe(2);
    expect(m.llmFallbacks).toBe(1);
  });
});
