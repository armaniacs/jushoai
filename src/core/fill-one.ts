import { classifyField, refineClassifications } from './classify-rules';
import { buildPlan } from './planner';
import type { PlanItem, PlanStatus } from './planner';
import type { Address, FieldMeta, Profile } from './types';
import { applyMapping } from './domain-mapping';
import type { MappingEntry } from './domain-mapping';

// One-field resolution (PBI-137): rule classification only — no LLM, no
// egress gate — and the same planner guards as the full preview. An unknown
// field never fills and guides to the full preview instead (BDD: 未分類の欄は
// 入力しない); the planner's warn statuses keep the no-fill contract.
export type FillOneReason = 'unknown' | 'inactive' | Exclude<PlanStatus, 'ok'>;

export type FillOnePlan =
  | { ok: true; plan: PlanItem }
  | { ok: false; reason: FillOneReason };

// Single owner of the fill-one reason labels: the blocked-notice panel reads
// from here, so a wording change touches one table. The planner-status labels
// correspond to the preview's STATUS_NOTE wording.
export const FILL_ONE_REASON_LABELS: Record<FillOneReason, string> = {
  unknown: '分類できませんでした',
  inactive: '入力できない欄です',
  filled: '入力済みのため上書きしません',
  'warn-maxlength': '文字数を超えるため入力しません',
  'warn-no-option': '一致する選択肢がないため入力しません',
  'warn-no-value': 'プロファイルに値がないため入力しません',
};

export function fillOneReasonLabel(reason: string): string {
  return (FILL_ONE_REASON_LABELS as Record<string, string>)[reason] ?? reason;
}

export interface FillOneOpts {
  // PBI-138: the taught correction layer, so a fill-one matches the full
  // preview's classification for the same field.
  mappings?: { entries: MappingEntry[]; domain: string };
  // PBI-142: the earlier page's approved values, same fallback as the preview.
  carryover?: Record<string, string>;
}

export function planOneField(
  meta: FieldMeta,
  profile: Profile,
  address: Address | null,
  today?: Date,
  opts?: FillOneOpts,
): FillOnePlan {
  if (meta.readOnly || meta.disabled) return { ok: false, reason: 'inactive' };
  // classifyField returns null for an unclassifiable field — the same null
  // the analyze pipeline treats as the unknown class. The null becomes the
  // unknown class here so the taught mapping (PBI-138) can still correct it,
  // exactly like the full preview's classification path.
  const cls = classifyField(meta) ?? { category: 'unknown' as const, confidence: 0, source: 'rule' as const };
  // Refine on a one-element list: sibling corrections (tel1/2/3, fullName
  // split) cannot apply to a single field, and that is the intended scope.
  const refined = refineClassifications([{ meta, cls }])[0];
  if (!refined) return { ok: false, reason: 'unknown' };
  const mapped = opts?.mappings ? applyMapping([refined], opts.mappings.entries, opts.mappings.domain)[0]! : refined;
  if (mapped.cls.category === 'unknown') return { ok: false, reason: 'unknown' };
  const [plan] = buildPlan([mapped], { profile, address, today, carryover: opts?.carryover });
  if (!plan) return { ok: false, reason: 'unknown' };
  if (plan.status !== 'ok') return { ok: false, reason: plan.status };
  return { ok: true, plan };
}
