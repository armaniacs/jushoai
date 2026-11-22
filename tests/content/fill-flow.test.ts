import { describe, expect, it, vi } from 'vitest';
import type { Address, FieldMeta, Item, Profile } from '../../src/core/types';
import { EMPTY_ADDRESS, EMPTY_PROFILE } from '../../src/core/types';
import type { PlanItem } from '../../src/core/planner';
import type { SessionClassifyResult, SessionPanel } from '../../src/content-session';
import type { FillReport, FillSummary, UndoEntry } from '../../src/dom/fill-plan';
import type { FillBundle, FillFlowEnv } from '../../src/content/fill-flow';
import { createFillFlow } from '../../src/content/fill-flow';
import { makeMeta } from '../helpers';

// PBI-178: fake-env table tests for the FillFlow transaction. The order and
// conditions (consent→inject→persist→carryover→feedback→banner＋承認/割当/guest
// 後処理) are pinned here so a reorder fails the suite, not a comment.
const profile1: Profile = {
  ...EMPTY_PROFILE, id: 'p1', label: '自宅', lastName: '山田', firstName: '太郎',
  lastNameKana: 'ヤマダ', firstNameKana: 'タロウ', email: 'taro@example.jp', tel: '0312345678',
};
const address1: Address = {
  ...EMPTY_ADDRESS, id: 'a1', label: '自宅', zip: '1000001',
  prefecture: '東京都', city: '千代田区', street: '千代田1-1',
};

function baseItems(): Item[] {
  return [
    { meta: makeMeta({ id: 'f-last', label: '氏名（姓）' }), cls: { category: 'lastName', confidence: 0.9, source: 'rule' } },
    { meta: makeMeta({ id: 'f-first', label: '氏名（名）' }), cls: { category: 'firstName', confidence: 0.9, source: 'rule' } },
  ];
}

const fullSummary = (filled: number, unapplied: number): FillSummary => ({
  filled,
  unapplied,
  total: filled + unapplied,
  byResult: {
    filled, 'skipped-status': 0, 'missing-target': 0, detached: 0, 'already-filled': 0, 'no-option': 0, error: 0,
  },
});

const reportOf = (summary: FillSummary, undo: UndoEntry[] = []): FillReport => ({
  outcomes: [], byId: new Map(), summary, undo,
});

const panel: SessionPanel = { getApplyPoint: () => ({ x: 1, y: 2 }), getHost: () => ({}) as Element };

function setup(opts: {
  consent?: boolean; persistThrows?: boolean; summary?: { filled: number; unapplied: number };
  undo?: UndoEntry[];
} = {}) {
  const order: string[] = [];
  const ms: FieldMeta[] = baseItems().map((i) => i.meta);
  const env: FillFlowEnv = {
    classify: async (): Promise<SessionClassifyResult> => ({ items: baseItems(), failureReason: null }),
    checkConsent: () => {
      order.push('checkConsent');
      return opts.consent === false ? { ok: false as const, reason: '覆われているため中止' } : { ok: true as const };
    },
    injectPlan: () => {
      order.push('inject');
      return reportOf(fullSummary(opts.summary?.filled ?? 2, opts.summary?.unapplied ?? 0), opts.undo ?? []);
    },
    persistSelection: () => {
      order.push('persist');
      if (opts.persistThrows) throw new Error('write failed');
    },
    openUrl: () => { order.push('openUrl'); },
    feedbackContext: () => {
      order.push('feedbackContext');
      return { pageHref: 'https://example.jp/form', provider: 'none', version: '0.0.0-test' };
    },
    isExcluded: () => false,
    recordCarryover: () => { order.push('recordCarryover'); },
    recordApproval: () => { order.push('recordApproval'); },
    recordAssignment: () => { order.push('recordAssignment'); },
    onApplied: () => { order.push('onApplied'); },
  };
  const bundle: FillBundle = {
    input: {
      profiles: [profile1], addresses: [address1],
      metas: ms, metasById: new Map(ms.map((m) => [m.id, m])),
      englishPage: false, canReanalyze: true,
    },
    env,
  };
  return { flow: createFillFlow(bundle), env, order };
}

describe('FillFlow transaction (PBI-178 fake-env table)', () => {
  it('consent拒否: 何も注入せず理由を返す', async () => {
    const { flow, order } = setup({ consent: false });
    const started = await flow.start();
    expect(started.excluded).toBe(false);
    const result = flow.apply({ sendFeedback: false, panel });
    expect(result).toEqual({ applied: false, reason: '覆われているため中止' });
    expect(order).toEqual(['checkConsent']);
  });

  it('persist失敗: 注入済みで例外が伝播し、後段は止まる', async () => {
    const { flow, order } = setup({ persistThrows: true });
    await flow.start();
    expect(() => flow.apply({ sendFeedback: false, panel })).toThrow('write failed');
    expect(order).toEqual(['checkConsent', 'inject', 'persist']);
  });

  it('部分適用: banner合成＋承認/割当/guest後処理まで順序どおり', async () => {
    const { flow, order } = setup({ summary: { filled: 1, unapplied: 1 } });
    await flow.start();
    // after スナップショットを用意して feedback ありにする（recategorize は同期）。
    flow.recategorize('f-last', 'lastName');
    const result = flow.apply({ sendFeedback: true, panel });
    expect(result).toMatchObject({
      applied: true,
      summary: { filled: 1, unapplied: 1, total: 2 },
      display: { banner: { kind: 'partial', text: '一部のみ適用（1/2件）' } },
    });
    expect(order).toEqual([
      'checkConsent', 'inject', 'persist', 'recordCarryover',
      'feedbackContext', 'openUrl',
      'recordApproval', 'recordAssignment', 'onApplied',
    ]);
  });

  it('undo: applyの履歴を1回だけ戻し、2回目は空', async () => {
    const restore = vi.fn();
    const undo: UndoEntry[] = [
      { fieldId: 'f-last', value: '山田', snapshot: () => '山田', restoreEmpty: restore },
    ];
    const { flow } = setup({ summary: { filled: 1, unapplied: 1 }, undo });
    await flow.start();
    const result = flow.apply({ sendFeedback: false, panel });
    expect(result).toMatchObject({ applied: true, undoCount: 1 });
    expect(flow.undoCount).toBe(1);
    const r = flow.undoLast();
    expect(r?.restored).toEqual(['f-last']);
    expect(restore).toHaveBeenCalledOnce();
    expect(flow.undoCount).toBe(0);
    expect(flow.undoLast()).toBeNull();
  });
});

describe('FillFlow role selection', () => {
  const childProfile: Profile = {
    ...EMPTY_PROFILE, id: 'p-child', label: '児童', lastName: '鈴木', firstName: '一郎',
  };
  const guardianProfile: Profile = {
    ...EMPTY_PROFILE, id: 'p-guardian', label: '保護者', lastName: '田中', firstName: '花子',
  };

  function roleItems(): Item[] {
    return [
      { meta: makeMeta({ id: 'c-last', label: '児童氏名（姓）' }), cls: { category: 'lastName', confidence: 0.9, source: 'rule' }, role: 'child' },
      { meta: makeMeta({ id: 'g-last', label: '保護者氏名（姓）' }), cls: { category: 'lastName', confidence: 0.9, source: 'rule' }, role: 'guardian' },
    ];
  }

  function roleSetup(opts: { initialRoleProfileIds?: { child?: string; guardian?: string; self?: string } } = {}) {
    const injected: PlanItem[][] = [];
    const ms: FieldMeta[] = roleItems().map((i) => i.meta);
    const env: FillFlowEnv = {
      classify: async (): Promise<SessionClassifyResult> => ({ items: roleItems(), failureReason: null }),
      checkConsent: () => ({ ok: true as const }),
      injectPlan: (plan) => {
        injected.push([...plan]);
        return reportOf(fullSummary(plan.length, 0));
      },
      persistSelection: () => {},
      openUrl: () => {},
      feedbackContext: () => ({ pageHref: 'https://example.jp/form', provider: 'none', version: '0.0.0-test' }),
      isExcluded: () => false,
    };
    const bundle: FillBundle = {
      input: {
        profiles: [profile1, childProfile, guardianProfile], addresses: [address1],
        roleProfileIds: opts.initialRoleProfileIds,
        metas: ms, metasById: new Map(ms.map((m) => [m.id, m])),
        englishPage: false, canReanalyze: true,
      },
      env,
    };
    return { flow: createFillFlow(bundle), injected };
  }

  it('starts on the default profile with no provenance, then a role select re-plans that role only', async () => {
    const { flow, injected } = roleSetup();
    const started = await flow.start();
    if (started.excluded) throw new Error('unexpected exclusion');
    expect(flow.selectedRoleProfileIds).toEqual({});
    for (const r of started.rows) {
      expect('role' in r).toBe(false);
      expect('profileId' in r).toBe(false);
    }
    expect(started.rows.map((r) => r.display)).toEqual(['山田', '山田']);

    const rows = flow.selectRoleProfile('child', 'p-child');
    expect(flow.selectedRoleProfileIds).toEqual({ child: 'p-child' });
    expect(rows.map((r) => r.display)).toEqual(['鈴木', '山田']);
    expect(rows[0]).toMatchObject({ role: 'child', profileId: 'p-child' });
    // 未載の役割は既定プロファイルに倒れる(出どころも既定の id)。
    expect(rows[1]).toMatchObject({ role: 'guardian', profileId: 'p1' });
    // 役割の選択は共通住所に触らない(住所は全役割で同一の方針)。
    expect(flow.selectedAddressId).toBe('a1');
    expect(injected).toEqual([]);
  });

  it('seeds the initial role map from input and applies the merged plan', async () => {
    const { flow, injected } = roleSetup({ initialRoleProfileIds: { child: 'p-child' } });
    await flow.start();
    expect(flow.selectedRoleProfileIds).toEqual({ child: 'p-child' });
    flow.apply({ sendFeedback: false, panel });
    expect(injected).toHaveLength(1);
    const byId = new Map(injected[0]!.map((p) => [p.fieldId, p]));
    expect(byId.get('c-last')).toMatchObject({ value: '鈴木', profileId: 'p-child' });
    expect(byId.get('g-last')).toMatchObject({ value: '山田' });
  });

  it('clears a role selection back to the default profile with null', async () => {
    const { flow } = roleSetup({ initialRoleProfileIds: { child: 'p-child' } });
    await flow.start();
    const cleared = flow.selectRoleProfile('child', null);
    expect(flow.selectedRoleProfileIds).toEqual({});
    expect(cleared.map((r) => r.display)).toEqual(['山田', '山田']);
    expect('role' in cleared[0]!).toBe(false);
  });

  it('drops a stale role id and falls back to the default profile', async () => {
    const { flow } = roleSetup({ initialRoleProfileIds: { child: 'gone' } });
    const started = await flow.start();
    if (started.excluded) throw new Error('unexpected exclusion');
    expect(started.rows.map((r) => r.display)).toEqual(['山田', '山田']);
  });
});
