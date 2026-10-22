import { classifyField, refineClassifications } from './classify-rules';
import { buildPlan } from './planner';
import type { PlanItem, PlanStatus } from './planner';
import type { Address, FieldMeta, Profile } from './types';

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

export function planOneField(
  meta: FieldMeta,
  profile: Profile,
  address: Address | null,
  today?: Date,
): FillOnePlan {
  if (meta.readOnly || meta.disabled) return { ok: false, reason: 'inactive' };
  // classifyField returns null for an unclassifiable field — the same null
  // the analyze pipeline treats as the unknown class.
  const cls = classifyField(meta);
  if (!cls) return { ok: false, reason: 'unknown' };
  // Refine on a one-element list: sibling corrections (tel1/2/3, fullName
  // split) cannot apply to a single field, and that is the intended scope.
  const refined = refineClassifications([{ meta, cls }])[0];
  if (!refined) return { ok: false, reason: 'unknown' };
  if (refined.cls.category === 'unknown') return { ok: false, reason: 'unknown' };
  const [plan] = buildPlan([refined], { profile, address, today });
  if (!plan) return { ok: false, reason: 'unknown' };
  if (plan.status !== 'ok') return { ok: false, reason: plan.status };
  return { ok: true, plan };
}
