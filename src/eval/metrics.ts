import { classifyRulePipelineWithTrace } from '../core/classify-rules';
import { buildPlan } from '../core/planner';
import { EMPTY_ADDRESS, EMPTY_PROFILE, type FieldMeta, type Profile } from '../core/types';

// Synthetic fixture values for the fillable metric. They live in code, never
// reach the network (the eval runs rule-only with no classifier), and never
// enter the report: the report carries fixture names and counts only.
const SYNTHETIC_PROFILE: Profile = {
  ...EMPTY_PROFILE,
  lastName: 'サンプル', firstName: '太郎', lastNameKana: 'サンプル', firstNameKana: 'タロウ',
  birthday: '1990-05-07', email: 'sample@example.com', tel: '09012345678',
};

export interface EvalMetrics {
  total: number;
  // Fields the rules classify (not unknown) after resolve + refine.
  ruleHits: number;
  // Fields a non-confident rule result would send to the LLM. Measured
  // without an LLM call: the eval never reaches the network.
  llmFallbacks: number;
  unknowns: number;
  // Fields whose category changed during the sibling refine step.
  refineChanged: number;
  // Fields the refine dropped (oversized ambiguous groups).
  refineDropped: number;
  // Plan rows with status ok, given the synthetic profile and no address.
  fillable: number;
}

export function evalMetricsFor(metas: FieldMeta[]): EvalMetrics {
  // The canonical composition with its trace (classify → resolveKana →
  // refine), the same one classifyRulePipeline runs: the metrics read the
  // trace's intermediate values instead of hand-rolling the composition
  // (PBI-145). pending is the initial classification's non-confident fields,
  // before refine, as before. PBI-186: this detour is legitimate — run does
  // not return a trace, so metrics read WithTrace directly.
  const { items: refined, pending, refineChanged, refineDropped } =
    classifyRulePipelineWithTrace(metas);
  const plan = buildPlan(refined, { profile: SYNTHETIC_PROFILE, address: EMPTY_ADDRESS });
  return {
    total: metas.length,
    ruleHits: refined.filter((i) => i.cls.category !== 'unknown').length,
    llmFallbacks: pending.length,
    unknowns: refined.filter((i) => i.cls.category === 'unknown').length,
    refineChanged,
    refineDropped,
    fillable: plan.filter((p) => p.status === 'ok').length,
  };
}

// One report line per fixture plus the aggregate. Fixed short format keeps
// every line far under any byte budget by construction, and no page content
// (label, placeholder, value, ids) ever enters a line.
export function reportLine(name: string, m: EvalMetrics): string {
  return `[JushoAI eval] fixture=${name} fields=${m.total} ruleHits=${m.ruleHits} llmFallbacks=${m.llmFallbacks} unknowns=${m.unknowns} refineChanged=${m.refineChanged} refineDropped=${m.refineDropped} fillable=${m.fillable}`;
}

export interface AggregateMetrics {
  fixtures: number;
  total: number;
  ruleHits: number;
  llmFallbacks: number;
  fillable: number;
}

export function aggregate(rows: EvalMetrics[]): AggregateMetrics {
  const sum = (pick: (m: EvalMetrics) => number) => rows.reduce((acc, m) => acc + pick(m), 0);
  return {
    fixtures: rows.length,
    total: sum((m) => m.total),
    ruleHits: sum((m) => m.ruleHits),
    llmFallbacks: sum((m) => m.llmFallbacks),
    fillable: sum((m) => m.fillable),
  };
}
