import { describe, it, expect } from 'vitest';
import { evalMetricsFor, pinLine, type EvalMetrics } from '../../src/eval/metrics';
import { scanFields } from '../../src/dom/scan-fields';
import { corpus } from '../corpus';

// make eval-pin generator (PBI-231): prints paste-ready PIN_TABLE rows built
// from the measured metrics, never from reportLine's text (the two orders
// differ on purpose). EVAL_PIN_FIXTURES (space/comma separated fixture names)
// narrows the run; empty prints every fixture. Rows go through
// process.stdout.write to bypass vitest's console capture, so the lines land
// on stdout verbatim for copy-paste.
async function metricsFor(html: string): Promise<EvalMetrics> {
  document.body.innerHTML = new DOMParser().parseFromString(html, 'text/html').body.innerHTML;
  return evalMetricsFor(scanFields(document.body).map((f) => f.meta));
}

const requested = (process.env.EVAL_PIN_FIXTURES ?? '')
  .split(/[\s,]+/)
  .filter((s) => s.length > 0);

describe('make eval-pin generator (local, no network)', () => {
  it('prints paste-ready PIN_TABLE rows for the requested fixtures', async () => {
    const unknown = requested.filter((n) => !(n in corpus));
    expect(unknown, `corpus にない fixture 名: ${unknown.join(', ')}`).toEqual([]);
    const wanted = new Set(requested);
    for (const [name, entry] of Object.entries(corpus)) {
      if (wanted.size > 0 && !wanted.has(name)) continue;
      const m = await metricsFor(entry.html);
      process.stdout.write(pinLine(name, m) + '\n');
    }
  });
});
