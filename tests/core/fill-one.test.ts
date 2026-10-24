import { describe, it, expect } from 'vitest';
import { planOneField, fillOneReasonLabel } from '../../src/core/fill-one';
import { classifyAll } from '../../src/core/analyze';
import { buildPlan } from '../../src/core/planner';
import { EMPTY_PROFILE, EMPTY_ADDRESS } from '../../src/core/types';
import { makeMeta } from '../helpers';

describe('planOneField', () => {
  it('resolves a classified field into an ok plan with the profile value', () => {
    const r = planOneField(
      makeMeta({ id: 'a', name: 'last_name' }),
      { ...EMPTY_PROFILE, lastName: '山田' },
      null,
    );
    expect(r.ok).toBe(true);
    expect(r.ok && r.plan).toMatchObject({ fieldId: 'a', category: 'lastName', status: 'ok' });
  });

  it('rejects an unknown field and guides away from injection', () => {
    const r = planOneField(makeMeta({ id: 'a', name: 'xyz' }), { ...EMPTY_PROFILE, lastName: '山田' }, null);
    expect(r).toEqual({ ok: false, reason: 'unknown' });
  });

  it('rejects readonly and disabled fields as inactive', () => {
    expect(planOneField(makeMeta({ id: 'a', name: 'last_name', readOnly: true }), EMPTY_PROFILE, null))
      .toEqual({ ok: false, reason: 'inactive' });
    expect(planOneField(makeMeta({ id: 'a', name: 'last_name', disabled: true }), EMPTY_PROFILE, null))
      .toEqual({ ok: false, reason: 'inactive' });
  });

  it('keeps the planner warn statuses as no-fill reasons', () => {
    // maxlength超過の欄は従来通り警告して注入しない
    const r = planOneField(
      makeMeta({ id: 'a', name: 'last_name', maxLength: 1 }),
      { ...EMPTY_PROFILE, lastName: '山田' },
      null,
    );
    expect(r).toEqual({ ok: false, reason: 'warn-maxlength' });
  });

  it('reports a missing profile value as warn-no-value', () => {
    const r = planOneField(makeMeta({ id: 'a', name: 'last_name' }), { ...EMPTY_PROFILE, lastName: '' }, null);
    expect(r).toEqual({ ok: false, reason: 'warn-no-value' });
  });

  it('honors the taught mapping so fill-one matches the full preview', () => {
    // rule classification alone cannot read 'xyz' as an email.
    const noMapping = planOneField(makeMeta({ id: 'a', name: 'xyz' }), EMPTY_PROFILE, null);
    expect(noMapping).toEqual({ ok: false, reason: 'unknown' });
    const mapped = planOneField(
      makeMeta({ id: 'a', name: 'xyz' }),
      { ...EMPTY_PROFILE, email: 'taro@example.jp' },
      null,
      undefined,
      { mappings: { entries: [{ domain: 'e.com', fieldKey: 'xyz', category: 'email' as const }], domain: 'e.com' } },
    );
    expect(mapped.ok).toBe(true);
    expect(mapped.ok && mapped.plan).toMatchObject({ category: 'email', status: 'ok' });
  });

  it('falls back to the carryover for an empty profile value', () => {
    const r = planOneField(
      makeMeta({ id: 'a', name: 'last_name' }),
      { ...EMPTY_PROFILE, lastName: '' },
      null,
      undefined,
      { carryover: { last_name: '鈴木' } },
    );
    expect(r.ok).toBe(true);
    expect(r.ok && r.plan.value).toBe('鈴木');
  });

  it('plans the same kana attribution and value as the full preview for a kana field', async () => {
    // PBI-150: label「フリガナ」は kana-blind 契約で classifyField が 'fullName'
    // を返す。kana 帰属は resolveKana が持つため、入口がパイプラインを迂回すると
    // 漢字氏名が plan になり、フルプレビューと同じ欄で異なる値が注入される。
    const profile = {
      ...EMPTY_PROFILE,
      lastName: '山田', firstName: '太郎',
      lastNameKana: 'ヤマダ', firstNameKana: 'タロウ',
    };
    const meta = makeMeta({ id: 'a', label: 'フリガナ' });
    const r = planOneField(meta, profile, null);
    // フルプレビュー（classifyAll → buildPlan）と同一の分類・値。
    const items = await classifyAll([meta], null);
    const [full] = buildPlan(items, { profile, address: null });
    expect(r.ok).toBe(true);
    expect(r.ok && full).toBeTruthy();
    if (r.ok && full) {
      expect(r.plan.category).toBe(full.category);
      expect(r.plan.value).toBe(full.value);
    }
    expect(r.ok && r.plan).toMatchObject({ category: 'fullNameKana', status: 'ok' });
    expect(r.ok && r.plan.value).toBe('ヤマダ タロウ');
  });
});

describe('fillOneReasonLabel', () => {
  it('labels every fill-one reason from one table', () => {
    expect(fillOneReasonLabel('unknown')).toBe('分類できませんでした');
    expect(fillOneReasonLabel('inactive')).toBe('入力できない欄です');
    expect(fillOneReasonLabel('warn-no-value')).toBe('プロファイルに値がないため入力しません');
    expect(fillOneReasonLabel('something-else')).toBe('something-else');
  });
});
