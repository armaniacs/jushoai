import { describe, it, expect } from 'vitest';
import { evalMetricsFor, reportLine, aggregate } from '../../src/eval/metrics';
import { makeMeta } from '../helpers';

describe('evalMetricsFor', () => {
  it('counts rule hits, unknowns and totals', () => {
    const m = evalMetricsFor([
      makeMeta({ id: 'a', name: 'last_name' }),
      makeMeta({ id: 'b', name: 'xyz' }),
      makeMeta({ id: 'c', label: '備考' }),
    ]);
    expect(m.total).toBe(3);
    expect(m.ruleHits).toBe(1);
    expect(m.unknowns).toBe(2);
  });

  it('counts non-confident rule results as LLM fallbacks without calling the LLM', () => {
    const m = evalMetricsFor([
      makeMeta({ id: 'a', type: 'tel' }),
      makeMeta({ id: 'b', autocomplete: 'family-name' }),
    ]);
    expect(m.llmFallbacks).toBe(1);
    expect(m.total).toBe(2);
  });

  it('counts split retags as refine changes', () => {
    const m = evalMetricsFor([
      makeMeta({ id: 'a', type: 'tel', label: '電話番号' }),
      makeMeta({ id: 'b', type: 'tel', label: '電話番号' }),
      makeMeta({ id: 'c', type: 'tel', label: '電話番号' }),
    ]);
    expect(m.refineChanged).toBe(3);
    expect(m.ruleHits).toBe(3);
  });

  it('leaves single fields alone so refineChanged stays 0', () => {
    const m = evalMetricsFor([makeMeta({ id: 'a', type: 'tel', label: '電話番号' })]);
    expect(m.refineChanged).toBe(0);
    expect(m.refineDropped).toBe(0);
  });

  it('counts ok plan rows as fillable with the synthetic profile', () => {
    const m = evalMetricsFor([makeMeta({ id: 'a', name: 'last_name' })]);
    expect(m.fillable).toBe(1);
  });

  it('keeps no address fillable for name-only forms', () => {
    const m = evalMetricsFor([makeMeta({ id: 'a', label: '都道府県' })]);
    expect(m.fillable).toBe(0);
  });
});

describe('reportLine', () => {
  it('carries fixture names and counts only, within a fixed byte budget', () => {
    const m = evalMetricsFor([makeMeta({ id: 'a', name: 'last_name' })]);
    const line = reportLine('some-fixture.html', m);
    expect(line).toMatch(/^\[JushoAI eval\] fixture=some-fixture\.html fields=1 ruleHits=1 llmFallbacks=0 unknowns=0 refineChanged=0 refineDropped=0 fillable=1$/);
    expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(200);
  });

  it('never contains page content or profile values', () => {
    const m = evalMetricsFor([makeMeta({ id: 'a', name: 'last_name', label: '氏名のラベル', placeholder: '山田 太郎' })]);
    const line = reportLine('x.html', m);
    expect(line).not.toContain('氏名のラベル');
    expect(line).not.toContain('山田');
    expect(line).not.toContain('太郎');
  });
});

describe('aggregate', () => {
  it('sums counts across fixtures', () => {
    const rows = [
      evalMetricsFor([makeMeta({ id: 'a', name: 'last_name' })]),
      evalMetricsFor([makeMeta({ id: 'b', type: 'tel' })]),
    ];
    const agg = aggregate(rows);
    expect(agg.fixtures).toBe(2);
    expect(agg.total).toBe(2);
    expect(agg.ruleHits).toBe(2);
    expect(agg.llmFallbacks).toBe(1);
  });

  it('returns zeros for an empty corpus', () => {
    expect(aggregate([])).toEqual({ fixtures: 0, total: 0, ruleHits: 0, llmFallbacks: 0, fillable: 0 });
  });
});
