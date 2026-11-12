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

const p = (
  ruleHits: number,
  llmFallbacks: number,
  fillable: number,
  refineChanged: number,
  refineDropped: number,
): PinRow => ({ ruleHits, llmFallbacks, fillable, refineChanged, refineDropped });

const PIN_TABLE: Record<string, PinRow> = {
  '12fc22bc297429.html': p(10, 0, 8, 3, 0),
  '2dd1c663300469.html': p(11, 1, 7, 0, 0),
  '2000033.html': p(2, 0, 0, 0, 0),
  '6932.html': p(13, 4, 5, 1, 0),
  'aeon-voice-form.html': p(7, 2, 6, 0, 0),
  'age-decade-select-form.html': p(2, 0, 2, 0, 0),
  'anabuki-general-contact.html': p(3, 5, 2, 2, 0),
  'anabuki-landuse-contact.html': p(8, 6, 1, 4, 0),
  'aoyama-campus-inquiry.html': p(7, 4, 7, 3, 0),
  'aoyama-sagamihara-career.html': p(5, 1, 4, 0, 0),
  'apaman-contact.html': p(9, 1, 7, 0, 0),
  'arakawa-mailform.html': p(4, 0, 3, 0, 0),
  'auhikari-callback-form.html': p(14, 0, 8, 9, 0),
  'axis-inquiry-form.html': p(18, 4, 7, 2, 0),
  'azbil-kikubari-form.html': p(3, 29, 0, 0, 6),
  'benesse-inquiry-form.html': p(8, 4, 7, 2, 0),
  'brillia-support-contact.html': p(7, 12, 6, 0, 0),
  'brother-inquiry-form.html': p(4, 12, 3, 0, 0),
  'bst-inquire.html': p(14, 13, 10, 0, 0),
  'cigr-ir-contact.html': p(11, 2, 5, 3, 0),
  'contact.html': p(11, 0, 6, 0, 0),
  'demo-ai-ambiguous.html': p(2, 8, 2, 0, 0),
  'demo-registration.html': p(10, 0, 7, 1, 0),
  'demo-request-info.html': p(10, 0, 7, 1, 0),
  'demo-shop-checkout.html': p(10, 0, 7, 1, 0),
  'eikoh-shiryo-form.html': p(3, 2, 2, 0, 6),
  'eishinkan-contact-form.html': p(18, 9, 9, 7, 4),
  'ena-request-form.html': p(16, 8, 10, 3, 4),
  'epson-csr-form.html': p(2, 18, 0, 0, 0),
  'epson-ir-form.html': p(2, 18, 0, 0, 0),
  'fukuoka-teian-form.html': p(9, 1, 5, 0, 0),
  'fujita-contact.html': p(10, 1, 6, 0, 0),
  'ff-compliance-hotline-form.html': p(6, 1, 6, 0, 0),
  'ff-csr.html': p(13, 3, 9, 0, 0),
  'ff-procurement-form.html': p(13, 3, 9, 0, 0),
  'ff-webmaster-form.html': p(13, 3, 9, 0, 0),
  'formmailer-anketo-gender.html': p(2, 6, 0, 0, 0),
  'formmailer-raijo-age.html': p(16, 5, 10, 6, 0),
  'forum.html': p(7, 2, 5, 0, 0),
  'furigana-fieldset-form.html': p(4, 0, 4, 0, 0),
  'gender-select-form.html': p(2, 0, 1, 0, 0),
  'gis-intl-admission.html': p(6, 8, 3, 0, 0),
  'hamamatsu-kocho-form.html': p(6, 2, 5, 0, 0),
  'haseko-contact-input.html': p(3, 4, 3, 2, 0),
  'hhp-site-inquiry.html': p(9, 6, 7, 9, 0),
  'hulic-develop-plan.html': p(9, 5, 7, 4, 0),
  'ichishin-contact-form.html': p(24, 11, 16, 17, 0),
  'index-asp.html': p(6, 12, 4, 2, 0),
  'inquiry-html.html': p(12, 0, 7, 2, 0),
  'isi-contact.html': p(5, 7, 4, 0, 0),
  'jiritsu-red-contact-form.html': p(11, 1, 6, 0, 0),
  'jpaa-contact.html': p(9, 2, 7, 3, 0),
  'katakana-fieldset-form.html': p(4, 0, 4, 0, 0),
  'keishin-contact-form.html': p(22, 8, 14, 11, 0),
  'keyence-inquiry-form.html': p(13, 1, 6, 1, 0),
  'kigakuen-briefing.html': p(22, 10, 11, 6, 0),
  'kikkoman-media-form.html': p(3, 6, 3, 3, 0),
  'kikkoman-website-form.html': p(7, 5, 7, 3, 0),
  'kikkoman-works-form.html': p(7, 4, 7, 3, 0),
  'kit-contact-form.html': p(7, 2, 7, 0, 0),
  'kobe-city-contact-form.html': p(1, 8, 1, 0, 0),
  'kosodate-contact.html': p(4, 5, 4, 0, 0),
  'kubota-engine-contact-form.html': p(9, 4, 5, 1, 0),
  'kumon-annai-form.html': p(10, 7, 8, 7, 0),
  'lasertec-inquiry-form.html': p(15, 2, 8, 9, 0),
  'library-theater-apply.html': p(15, 4, 9, 6, 0),
  'lixil-inquiry-form.html': p(15, 5, 8, 2, 0),
  'mailform.html': p(4, 0, 4, 0, 0),
  'manavis-shiryo-form.html': p(18, 4, 12, 3, 0),
  'meiko-contact-form.html': p(18, 4, 9, 6, 0),
  'mitsubishi-materials-form.html': p(18, 1, 12, 12, 0),
  'mitsui-chintai-inquiry-form.html': p(1, 0, 1, 0, 4),
  'mitsui-reform-catalog-form.html': p(20, 9, 8, 11, 0),
  'mitsuihome-sonota-form.html': p(10, 14, 6, 6, 0),
  'mori-webcas-contact.html': p(4, 9, 2, 4, 0),
  'morijuku-contact-form.html': p(9, 1, 7, 1, 0),
  'ngk-contact-form.html': p(7, 1, 4, 0, 0),
  'nishimachi-inquiry.html': p(15, 4, 7, 0, 0),
  'nkanzai-contact.html': p(3, 1, 3, 0, 0),
  'nttud-inquiry.html': p(5, 2, 4, 0, 0),
  'ois-contact.html': p(9, 2, 6, 2, 0),
  'okayama-inquiry-form.html': p(6, 6, 5, 0, 0),
  'opinion-html.html': p(4, 3, 2, 0, 0),
  'openhouse-customer-contact.html': p(11, 1, 7, 0, 0),
  'otsuka-opinion-form.html': p(6, 3, 5, 3, 0),
  'overseas-address-form.html': p(8, 0, 1, 0, 0),
  'overseas-webform-joshibi.html': p(11, 2, 4, 0, 0),
  'proud-procedure-form.html': p(18, 2, 6, 8, 0),
  'profile-fields-form.html': p(5, 0, 3, 0, 0),
  'registration.html': p(15, 4, 8, 0, 0),
  'reinvent-registration-contact.html': p(4, 3, 2, 0, 0),
  'richell-anketo-rating.html': p(0, 7, 0, 0, 0),
  'ricoh-risb-form.html': p(1, 6, 0, 0, 0),
  'ricoh-vulnerability-form.html': p(0, 10, 0, 0, 0),
  'rinkai-shiryo-form.html': p(10, 5, 7, 5, 0),
  'roman-name-form.html': p(3, 0, 2, 0, 0),
  'sanaru-contact-form.html': p(12, 10, 7, 8, 0),
  'sapporo-iken-form.html': p(2, 1, 2, 0, 0),
  'seedome-openschool.html': p(6, 1, 6, 3, 0),
  'sekisui-catalog-request.html': p(11, 20, 7, 4, 4),
  'sekisui-inquiry-form.html': p(15, 4, 10, 7, 3),
  'sekisui-mail-form.html': p(12, 2, 7, 9, 0),
  'shimane-inquiry-form.html': p(3, 2, 2, 0, 0),
  'shozemi-contact-form.html': p(12, 2, 7, 1, 0),
  'single-field-form.html': p(4, 2, 3, 0, 0),
  'smp-openhouse-inquiry.html': p(9, 5, 5, 5, 0),
  'smp-regist-inquiry-form.html': p(11, 3, 6, 4, 0),
  'split-form.html': p(10, 0, 7, 1, 0),
  'sumifu-step-otoiawase.html': p(9, 3, 6, 3, 0),
  'sumitomo-latour-inquiry.html': p(14, 9, 6, 0, 0),
  'sysmex-contact-form.html': p(10, 3, 5, 0, 0),
  'table-form.html': p(13, 0, 8, 9, 0),
  'taiheiyo-cement-contact-form.html': p(8, 6, 5, 0, 0),
  'tokyo-steel-contact-form.html': p(5, 3, 4, 0, 0),
  'tokyu-branz-owner-form.html': p(8, 5, 4, 3, 0),
  'tokyu-commercial-form.html': p(11, 13, 3, 4, 0),
  'tokyu-cre-form.html': p(11, 9, 3, 4, 0),
  'tokyu-land-contact-form.html': p(8, 2, 4, 0, 0),
  'tokyu-land-kojin-form.html': p(12, 6, 5, 0, 0),
  'tokyu-land-tenant-form.html': p(9, 8, 5, 0, 0),
  'tomas-trial-form.html': p(10, 7, 5, 2, 9),
  'tonami-luggage-form.html': p(10, 2, 6, 0, 0),
  'toshiba-gx-contact-form.html': p(11, 5, 6, 0, 0),
  'toshin-mendan-form.html': p(21, 3, 7, 2, 4),
  'toshin-shiryo-form.html': p(21, 10, 7, 2, 4),
  'tosyo-00001-html.html': p(0, 0, 0, 0, 0),
  'toyoda-gosei-form.html': p(8, 3, 5, 2, 0),
  'try-gakuin-reserve-form.html': p(9, 2, 6, 3, 0),
  'wadakohsan-inquiry.html': p(8, 2, 5, 0, 0),
  'waseda-ac-form.html': p(6, 34, 2, 2, 0),
  'yamada-holdings-contact.html': p(4, 2, 4, 0, 0),
  'yoshinoya-store-form.html': p(9, 2, 5, 3, 0),
  'yotsuya-littleclub-form.html': p(10, 21, 10, 0, 8),
  'yotsuya-nyujuku-form.html': p(22, 3, 13, 4, 0),
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
