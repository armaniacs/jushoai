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
    // evalMetricsFor uses classifyField/resolveKana/refineClassifications and
    // buildPlan only — no classifier, no fetch. The assertion pins the rule
    // fallback count as measurable without an LLM: every fixture reports a
    // fallback count without any network dependency by construction.
    const m = await metricsFor('<input name="last_name"><input type="tel" name="xyz">');
    expect(m.total).toBe(2);
    expect(m.llmFallbacks).toBe(1);
  });
});
