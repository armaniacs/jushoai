import { describe, expect, it } from 'vitest';
import { buildPlan } from '../../src/core/planner';
import type { Address, FieldMeta, Profile, RunContext } from '../../src/core/types';
import { EMPTY_ADDRESS, EMPTY_PROFILE } from '../../src/core/types';
import { buildRunEnv } from '../../src/content/run-env';
import { createFillFlow } from '../../src/content/fill-flow';
import type { SessionPanel } from '../../src/content-session';
import { makeMeta } from '../helpers';

// PBI-221: run() 内で組み立てていた bundle.env の等価テスト。fixture 要件
// (tel3分割・zip2分割・fullName2欄・入力済み混在・呼び順) を固定する。
// tel/zip/fullName は同一ラベル + 同一 nearby の exact-size グループで
// refine 分割される (SPLIT_POLICIES の label 系)。

const TEL_LABEL = '電話番号';
const ZIP_LABEL = '郵便番号';
const NAME_LABEL = '氏名';

function fixtureMetas(): FieldMeta[] {
  return [
    makeMeta({ id: 't1', label: TEL_LABEL, type: 'tel' }),
    makeMeta({ id: 't2', label: TEL_LABEL, type: 'tel' }),
    makeMeta({ id: 't3', label: TEL_LABEL, type: 'tel' }),
    makeMeta({ id: 'z1', label: ZIP_LABEL, type: 'text' }),
    makeMeta({ id: 'z2', label: ZIP_LABEL, type: 'text' }),
    makeMeta({ id: 'n1', label: NAME_LABEL, type: 'text' }),
    makeMeta({ id: 'n2', label: NAME_LABEL, type: 'text' }),
  ];
}

const profile: Profile = {
  ...EMPTY_PROFILE, id: 'p1', label: '自宅', lastName: '山田', firstName: '太郎',
  lastNameKana: 'ヤマダ', firstNameKana: 'タロウ', email: 'taro@example.jp', tel: '09012345678',
};
const address: Address = {
  ...EMPTY_ADDRESS, id: 'a1', label: '自宅', zip: '1000001',
  prefecture: '東京都', city: '千代田区', street: '千代田1-1',
};

import type { GuestValues } from '../../src/core/guest';

const guestValues: GuestValues = { profile: { lastName: '客' }, address: {} };

const panel: SessionPanel = { getApplyPoint: () => ({ x: 1, y: 2 }), getHost: () => ({}) as Element };

function fakeControl(value = '') {
  return { el: { isConnected: true, value } as unknown as HTMLInputElement };
}

// buildRunEnv の inject 配線 (targetsFromControls + fillPlan) を固定するための
// fill。setter discipline 自体は dom/fill の責務なのでここでは値代入のみ。
function fakeFillField(el: unknown, value: string): void {
  (el as { value: string }).value = value;
}

describe('buildRunEnv: fixture 等価 (tel3・zip2・fullName2)', () => {
  it('classify が refine 分割と等価 (tel1/2/3・zip1/2・lastName/firstName)', async () => {
    const metas = fixtureMetas();
    const bundle = buildRunEnv({
      profiles: [profile], addresses: [address],
      assignedProfileId: null, carryover: {}, metas,
      metasById: new Map(metas.map((m) => [m.id, m])),
      englishPage: false, canReanalyze: false,
      run: { ruled: [], unconfident: [], pending: [], taughtIds: new Set<string>(), nonConfidentCount: 0 },
      activeMappings: [], host: 'example.jp',
      effectiveClassifier: null, activeGuest: null,
      controlsById: new Map(metas.map((m) => [m.id, fakeControl()])),
      pageHref: 'https://example.jp/form', provider: 'none', version: '0.0.0-test',
      isExcluded: () => false,
      checkConsent: () => ({ ok: true as const }),
      getSelection: () => ({ profileId: 'p1', addressId: 'a1' }),
    });
    const res = await bundle.env.classify(metas, {});
    expect(res.items.map((i) => i.meta.id)).toEqual(['t1', 't2', 't3', 'z1', 'z2', 'n1', 'n2']);
    expect(res.items.map((i) => i.cls.category)).toEqual([
      'tel1', 'tel2', 'tel3', 'zip1', 'zip2', 'lastName', 'firstName',
    ]);
  });

  it('input が解決済み session 値と等価 (profile/address・carryover・run パススルー)', async () => {
    const metas = fixtureMetas();
    const metasById = new Map(metas.map((m) => [m.id, m]));
    const carryover = { '触れた欄': '値' };
    const run: RunContext = { ruled: [], unconfident: [], pending: [], taughtIds: new Set<string>(), nonConfidentCount: 0 };
    const bundle = buildRunEnv({
      profiles: [profile], addresses: [address],
      lastProfileId: 'p1', lastAddressId: 'a1',
      assignedProfileId: null, carryover, metas, metasById,
      englishPage: false, canReanalyze: true,
      run, activeMappings: [], host: 'example.jp',
      effectiveClassifier: null, activeGuest: null,
      controlsById: new Map(metas.map((m) => [m.id, fakeControl()])),
      pageHref: 'https://example.jp/form', provider: 'none', version: '0.0.0-test',
      isExcluded: () => false,
      checkConsent: () => ({ ok: true as const }),
      getSelection: () => ({ profileId: 'p1', addressId: 'a1' }),
    });
    expect(bundle.input.profiles).toEqual([profile]);
    expect(bundle.input.addresses).toEqual([address]);
    expect(bundle.input.carryover).toBe(carryover);
    expect(bundle.input.metas).toBe(metas);
    expect(bundle.input.metasById).toBe(metasById);
    expect(bundle.input.englishPage).toBe(false);
    expect(bundle.input.canReanalyze).toBe(true);
    expect(bundle.input.run).toBe(run);
    expect(bundle.input.assignedProfileId).toBeNull();
    // premade パススルー: opts.run が classify に届く (PBI-181 の first-class 継承)。
    const res = await bundle.env.classify(metas, { run });
    expect(res.failureReason).toBeNull();
  });
});

describe('buildRunEnv: 入力済み混在', () => {
  it('入力済み欄は already-filled で残し他は filled', async () => {
    const metas = fixtureMetas();
    const bundle = buildRunEnv({
      profiles: [profile], addresses: [address],
      assignedProfileId: null, carryover: {}, metas,
      metasById: new Map(metas.map((m) => [m.id, m])),
      englishPage: false, canReanalyze: false,
      run: { ruled: [], unconfident: [], pending: [], taughtIds: new Set<string>(), nonConfidentCount: 0 },
      activeMappings: [], host: 'example.jp',
      effectiveClassifier: null, activeGuest: null,
      // z1 だけ入力済み (値を保持): 注入せず already-filled。
      controlsById: new Map(metas.map((m) => [m.id, fakeControl(m.id === 'z1' ? '100' : '')])),
      fillField: fakeFillField,
      pageHref: 'https://example.jp/form', provider: 'none', version: '0.0.0-test',
      isExcluded: () => false,
      checkConsent: () => ({ ok: true as const }),
      getSelection: () => ({ profileId: 'p1', addressId: 'a1' }),
    });
    const res = await bundle.env.classify(metas, {});
    const plan = buildPlan(res.items, { profile, address });
    expect(plan.length).toBe(7);
    const report = bundle.env.injectPlan(plan);
    expect(report.byId.get('z1')).toBe('already-filled');
    for (const id of ['t1', 't2', 't3', 'z2', 'n1', 'n2']) {
      expect(report.byId.get(id)).toBe('filled');
    }
  });
});

describe('buildRunEnv: 呼び順', () => {
  it('apply 取引が consent→inject→persist→carryover→feedback→承認/割当/guest の順', async () => {
    const order: string[] = [];
    const metas = fixtureMetas();
    const bundle = buildRunEnv({
      profiles: [profile], addresses: [address],
      assignedProfileId: null, carryover: {}, metas,
      metasById: new Map(metas.map((m) => [m.id, m])),
      englishPage: false, canReanalyze: true,
      run: { ruled: [], unconfident: [], pending: [], taughtIds: new Set<string>(), nonConfidentCount: 0 },
      activeMappings: [], host: 'example.jp',
      effectiveClassifier: null, activeGuest: guestValues,
      controlsById: new Map(metas.map((m) => [m.id, fakeControl()])),
      pageHref: 'https://example.jp/form', provider: 'none', version: '0.0.0-test',
      isExcluded: () => false,
      checkConsent: () => { order.push('checkConsent'); return { ok: true as const }; },
      fillField: fakeFillField,
      persist: (what, write) => { order.push(`persist:${what}`); void write(); },
      saveLastUsed: async () => { order.push('persist-selection'); },
      upsertApproval: async () => { order.push('recordApproval'); },
      upsertAssignment: async () => { order.push('recordAssignment'); },
      mergeCarryover: () => { order.push('recordCarryover'); },
      consumeGuest: () => { order.push('onApplied'); },
      openUrl: () => { order.push('openUrl'); },
      getSelection: () => ({ profileId: 'p1', addressId: 'a1' }),
    });
    // feedbackContext は buildRunEnv の純粋組み立てなので順序観測用に巻く。
    const innerFeedback = bundle.env.feedbackContext;
    bundle.env.feedbackContext = () => { order.push('feedbackContext'); return innerFeedback(); };
    const innerInject = bundle.env.injectPlan;
    bundle.env.injectPlan = (plan) => { order.push('inject'); return innerInject(plan); };

    const flow = createFillFlow(bundle);
    const started = await flow.start();
    expect(started.excluded).toBe(false);
    // after スナップショットを用意して feedback ありにする (fill-flow と同型)。
    flow.recategorize('n1', 'lastName');
    const result = flow.apply({ sendFeedback: true, panel });
    expect(result.applied).toBe(true);
    expect(order).toEqual([
      'checkConsent', 'inject',
      'persist:最終使用状態', 'persist-selection',
      'recordCarryover', 'feedbackContext', 'openUrl',
      'persist:サイトごとの承認', 'recordApproval',
      'persist:サイトごとの割当て', 'recordAssignment',
      'onApplied',
    ]);
  });

  it('onApplied は snapshot した guest だけを消費する', async () => {
    const consumed: unknown[] = [];
    const guest = guestValues;
    const metas = fixtureMetas();
    const bundle = buildRunEnv({
      profiles: [profile], addresses: [address],
      assignedProfileId: null, carryover: {}, metas,
      metasById: new Map(metas.map((m) => [m.id, m])),
      englishPage: false, canReanalyze: false,
      run: { ruled: [], unconfident: [], pending: [], taughtIds: new Set<string>(), nonConfidentCount: 0 },
      activeMappings: [], host: 'example.jp',
      effectiveClassifier: null, activeGuest: guest,
      controlsById: new Map(metas.map((m) => [m.id, fakeControl()])),
      pageHref: 'https://example.jp/form', provider: 'none', version: '0.0.0-test',
      isExcluded: () => false,
      checkConsent: () => ({ ok: true as const }),
      consumeGuest: (snapshot) => { consumed.push(snapshot); },
      getSelection: () => ({ profileId: 'p1', addressId: 'a1' }),
    });
    bundle.env.onApplied?.();
    expect(consumed).toEqual([guest]);
  });
});

describe('buildRunEnv: 遅延読み (旧 feedbackCtx と等価)', () => {
  // 旧実装は location.href を呼出時に読む遅延クロージャだった。preview
  // 表示中の SPA 遷移でも呼出時点の href/host が使われることを固定する。
  it('feedbackContext・承認・割当・classify が呼出時点の href/host を使う', async () => {
    const { hostOf } = await import('../../src/core/domain-mapping');
    let currentHref = 'https://before.example/form';
    const metas = [
      makeMeta({ id: 'm1', label: 'メール', type: 'email', name: 'mail-field' }),
    ];
    const writes: Array<() => Promise<void>> = [];
    let approvedDomain: string | undefined;
    let assignedHost: string | undefined;
    const bundle = buildRunEnv({
      profiles: [profile], addresses: [address],
      assignedProfileId: null, carryover: {}, metas,
      metasById: new Map(metas.map((m) => [m.id, m])),
      englishPage: false, canReanalyze: false,
      run: { ruled: [], unconfident: [], pending: [], taughtIds: new Set<string>(), nonConfidentCount: 0 },
      activeMappings: [
        { domain: 'after.example', fieldKey: 'mail-field', category: 'tel1' },
      ],
      host: 'before.example',
      effectiveClassifier: null, activeGuest: null,
      controlsById: new Map(metas.map((m) => [m.id, fakeControl()])),
      pageHref: 'https://before.example/form', provider: 'none', version: '0.0.0-test',
      getPageHref: () => currentHref,
      getHost: () => hostOf(currentHref),
      isExcluded: () => false,
      checkConsent: () => ({ ok: true as const }),
      persist: (_what, write) => { writes.push(write); },
      upsertApproval: async (record) => { approvedDomain = record.domain; },
      upsertAssignment: async (host) => { assignedHost = host; },
      getSelection: () => ({ profileId: 'p1', addressId: 'a1' }),
    });
    // preview 表示中の SPA 遷移を再現: 組み立て後に href が変わる。
    // 遷移前は after 側の mapping が当たらない (rule 分類のまま)。
    expect((await bundle.env.classify(metas, {})).items[0]!.cls.category).not.toBe('tel1');
    currentHref = 'https://after.example/other';
    expect(bundle.env.feedbackContext().pageHref).toBe('https://after.example/other');
    // classify は呼出時点の host で mapping を当てる (after 側が勝つ)。
    const res = await bundle.env.classify(metas, {});
    expect(res.items[0]!.cls.category).toBe('tel1');
    bundle.env.recordApproval!([]);
    await writes[0]!();
    expect(approvedDomain).toBe('after.example');
    bundle.env.recordAssignment!('p1');
    await writes[1]!();
    expect(assignedHost).toBe('after.example');
  });
});
