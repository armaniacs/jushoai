import { describe, it, expect } from 'vitest';
import { evalMetricsFor, reportLine, aggregate, type EvalMetrics } from '../../src/eval/metrics';
import { scanFields } from '../../src/dom/scan-fields';

// Auto-collects every sample fixture (PBI-136): a fixture added via
// `make addurl` joins the corpus without a list edit, so the eval stays
// linked to the samples.test.ts procedure with no second registry.
const corpus = import.meta.glob('../../samples/*.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const fixtureName = (path: string) => path.split('/').pop()!;

async function metricsFor(html: string): Promise<EvalMetrics> {
  document.body.innerHTML = new DOMParser().parseFromString(html, 'text/html').body.innerHTML;
  return evalMetricsFor(scanFields(document.body).map((f) => f.meta));
}

describe('sample corpus metrics (local, no network)', () => {
  it('measures every fixture and prints one short line per fixture', async () => {
    const names = Object.keys(corpus).map(fixtureName);
    expect(names.length).toBeGreaterThan(0);
    const rows: EvalMetrics[] = [];
    for (const [path, html] of Object.entries(corpus)) {
      const m = await metricsFor(html);
      rows.push(m);
      console.log(reportLine(fixtureName(path), m));
    }
    const agg = aggregate(rows);
    console.log(`[JushoAI eval] aggregate fixtures=${agg.fixtures} fields=${agg.total} ruleHits=${agg.ruleHits} llmFallbacks=${agg.llmFallbacks} fillable=${agg.fillable}`);
    expect(agg.fixtures).toBe(names.length);
    expect(agg.total).toBeGreaterThan(0);
    // Snapshot of the rule pipeline composition: these move only when fixtures
    // or the pipeline change. A drift here means the trace diverged from the
    // hand-rolled composition it replaced, so re-run `make eval` and update
    // together with the fixture set if this fails after adding a fixture.
    const sum = (pick: (m: EvalMetrics) => number) => rows.reduce((acc, m) => acc + pick(m), 0);
    // PBI-160: registration.html の company_kana 欄が companyNameKana に載り
    // ruleHits +1・llmFallbacks -1（fillable 不変）。141→142 相当の前回 pin 値は
    // registration.html 追加前のもので、同 fixture 分（ruleHits 14・fallbacks 5・
    // fillable 8）を加えた 155/32/97 が親作業時点の正当な基準値。
    // PBI-203: forum.html（kosodatehiroba.com/form/forum、ruleHits 7・fallbacks 2・
    // fillable 5。参加者名が FULL_NAME に載り 6/3/4 → 7/2/5）を make addurl で
    // 加えた 163/33/102 が正当な基準値。
    // PBI-208: radio・海外フォームの 5 fixture（richell-anketo-rating 0/1/0、
    // kosodate-contact 4/4/4、library-theater-apply 15/3/9、nishimachi-inquiry
    // 16/3/8、gis-intl-admission 6/2/4。library-theater 分の refineChanged +6）
    // を make addurl で加えた 204/46/127 が正当な基準値。
    expect(agg.ruleHits).toBe(204);
    expect(agg.llmFallbacks).toBe(46);
    expect(agg.fillable).toBe(127);
    expect(sum((m) => m.refineChanged)).toBe(28);
    expect(sum((m) => m.refineDropped)).toBe(0);
  });

  it('keeps page content out of every report line', async () => {
    const lines: string[] = [];
    for (const [path, html] of Object.entries(corpus)) {
      const m = await metricsFor(html);
      lines.push(reportLine(fixtureName(path), m));
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
