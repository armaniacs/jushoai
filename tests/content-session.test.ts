import { describe, expect, it, vi } from 'vitest';
import type { Address, Category, FieldMeta, Item, Profile } from '../src/core/types';
import { EMPTY_ADDRESS, EMPTY_PROFILE } from '../src/core/types';
import {
  classifyWithReason, createFillSession, decideDisplay,
  type SessionClassifyResult, type SessionEnv,
} from '../src/content-session';
import type { FieldClassifier } from '../src/core/classifier';
import type { ClassifyFailure } from '../src/messages';
import { hintForButton } from '../src/ai/failure-text';
import type { FillSummary } from '../src/dom/fill-plan';
import { makeMeta } from './helpers';

const profile1: Profile = {
  ...EMPTY_PROFILE, id: 'p1', label: '自宅', lastName: '山田', firstName: '太郎',
  lastNameKana: 'ヤマダ', firstNameKana: 'タロウ', email: 'taro@example.jp', tel: '0312345678',
};
const profile2: Profile = {
  ...EMPTY_PROFILE, id: 'p2', label: '実家', lastName: '鈴木', firstName: '一郎',
  lastNameKana: 'スズキ', firstNameKana: 'イチロウ', email: 'ichiro@example.jp', tel: '0398765432',
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

function metas(): FieldMeta[] {
  return baseItems().map((i) => i.meta);
}

function metasById(list: FieldMeta[]): Map<string, FieldMeta> {
  return new Map(list.map((m) => [m.id, m]));
}

const fullSummary = (filled: number, unapplied: number): FillSummary => ({
  filled,
  unapplied,
  total: filled + unapplied,
  byResult: {
    filled, 'skipped-status': 0, 'missing-target': 0, detached: 0, 'already-filled': 0, 'no-option': 0, error: 0,
  },
});

const panel = { getApplyPoint: () => ({ x: 1, y: 2 }), getHost: () => ({}) as Element };

function setup(opts: {
  excluded?: boolean; consent?: boolean; reItems?: Item[]; canReanalyze?: boolean;
  lastProfileId?: string; lastAddressId?: string; summary?: { filled: number; unapplied: number };
  failReason?: ClassifyFailure | null;
} = {}) {
  const ms = metas();
  const classify = vi.fn(async (_m: FieldMeta[], o?: { force?: boolean }): Promise<SessionClassifyResult> =>
    ({ items: (o?.force && opts.reItems ? opts.reItems : baseItems()), failureReason: opts.failReason ?? null }));
  const env: SessionEnv = {
    classify,
    checkConsent: () => (opts.consent === false
      ? { ok: false as const, reason: '覆われているため中止' }
      : { ok: true as const }),
    injectPlan: vi.fn((): FillSummary => fullSummary(opts.summary?.filled ?? 2, opts.summary?.unapplied ?? 0)),
    persistSelection: vi.fn(),
    openUrl: vi.fn(),
    feedbackContext: () => ({ pageHref: 'https://example.jp/form', provider: 'none', version: '0.0.0-test' }),
    isExcluded: () => opts.excluded === true,
  };
  const session = createFillSession({
    profiles: [profile1, profile2],
    addresses: [address1],
    lastProfileId: opts.lastProfileId,
    lastAddressId: opts.lastAddressId,
    metas: ms,
    metasById: metasById(ms),
    englishPage: false,
    canReanalyze: opts.canReanalyze ?? true,
  }, env);
  return { session, env, classify };
}

describe('fill session: start and replan', () => {
  it('resolves the last-used selection and returns preview rows', async () => {
    const { session } = setup({ lastProfileId: 'p2', lastAddressId: 'a1' });
    const started = await session.start();
    expect(started).toMatchObject({ excluded: false });
    expect(session.selectedProfileId).toBe('p2');
    expect(session.selectedAddressId).toBe('a1');
    if (!started.excluded) expect(started.rows.length).toBeGreaterThan(0);
  });

  it('falls back to the first profile and address without stored selection', async () => {
    const { session } = setup();
    await session.start();
    expect(session.selectedProfileId).toBe('p1');
    expect(session.selectedAddressId).toBe('a1');
  });

  it('relinks the address when the profile changes', async () => {
    const { session } = setup();
    await session.start();
    const rows = session.selectProfile('p2');
    expect(session.selectedProfileId).toBe('p2');
    expect(session.selectedAddressId).toBe('a1');
    expect(rows.length).toBeGreaterThan(0);
    expect(session.selectAddress('a1').length).toBeGreaterThan(0);
  });

  it('does not open a panel when an exclusion landed mid-classify', async () => {
    const { session, env, classify } = setup({ excluded: true });
    const started = await session.start();
    expect(classify).toHaveBeenCalledOnce();
    expect(started).toEqual({ excluded: true, failureReason: null });
    expect(env.injectPlan).not.toHaveBeenCalled();
  });

  it('carries the failure reason even when an exclusion landed mid-classify', async () => {
    const { session } = setup({ excluded: true, failReason: 'auth' });
    const started = await session.start();
    expect(started).toEqual({ excluded: true, failureReason: 'auth' });
  });
});

describe('fill session: apply', () => {
  it('injects the plan and persists the selection on consent', async () => {
    const { session, env } = setup();
    await session.start();
    const result = session.apply(false, panel);
    expect(result).toMatchObject({ applied: true });
    expect(env.persistSelection).toHaveBeenCalledWith({ profileId: 'p1', addressId: 'a1' });
    expect(env.injectPlan).toHaveBeenCalledOnce();
    expect(env.openUrl).not.toHaveBeenCalled();
  });

  it('injects before persisting and returns the fill summary', async () => {
    const { session, env } = setup({ summary: { filled: 1, unapplied: 1 } });
    await session.start();
    const order: string[] = [];
    vi.mocked(env.injectPlan).mockImplementation(() => { order.push('inject'); return fullSummary(1, 1); });
    vi.mocked(env.persistSelection).mockImplementation(() => { order.push('persist'); });
    const result = session.apply(false, panel);
    expect(order).toEqual(['inject', 'persist']);
    expect(result).toMatchObject({ applied: true, summary: { filled: 1, unapplied: 1, total: 2 } });
  });

  it('composes the display decision with and without a failure hint', async () => {
    const { session } = setup({ summary: { filled: 1, unapplied: 1 } });
    await session.start();
    expect(session.apply(false, panel)).toMatchObject({
      applied: true,
      display: { banner: '一部のみ適用（1/2件）' },
    });
  });

  it('composes the banner from the session-owned reason without caller threading', async () => {
    const { session } = setup({ summary: { filled: 1, unapplied: 1 }, failReason: 'network' });
    await session.start();
    // No hint argument: the session binds the seam reason internally.
    expect(session.apply(false, panel)).toMatchObject({
      applied: true,
      display: { banner: `${hintForButton('network')}。一部のみ適用（1/2件）` },
    });
  });

  it('stays silent on full application', () => {
    expect(decideDisplay(fullSummary(2, 0))).toEqual({ banner: null });
  });

  it('leaves the session open for retry when consent fails', async () => {
    const { session, env } = setup({ consent: false });
    await session.start();
    const blocked = session.apply(false, panel);
    expect(blocked).toEqual({ applied: false, reason: '覆われているため中止' });
    expect(env.injectPlan).not.toHaveBeenCalled();
    expect(env.persistSelection).not.toHaveBeenCalled();
  });

  it('opens a feedback report only after a reanalysis with opt-in', async () => {
    const reItems: Item[] = [
      { meta: makeMeta({ id: 'f-last', label: '氏名（姓）' }), cls: { category: 'lastName', confidence: 0.5, source: 'llm' } },
      { meta: makeMeta({ id: 'f-first', label: '氏名（名）' }), cls: { category: 'firstName', confidence: 0.5, source: 'llm' } },
    ];
    const { session, env } = setup({ reItems });
    await session.start();
    const res = await session.reanalyze();
    expect(res?.rows.length).toBeGreaterThan(0);
    session.apply(true, panel);
    expect(env.openUrl).toHaveBeenCalledOnce();
    expect(vi.mocked(env.openUrl).mock.calls[0]![0]).toContain('https://github.com/');
  });

  it('skips reanalysis without a classifier and sends no report', async () => {
    const { session, env } = setup({ canReanalyze: false });
    await session.start();
    expect(await session.reanalyze()).toBeNull();
    session.apply(true, panel);
    expect(env.openUrl).not.toHaveBeenCalled();
  });
});

describe('classifyWithReason: session-owned seam binding (PBI-42/45)', () => {
  const stubClassifier = (outcome: { map: Map<string, 'email'>; failureReason: ClassifyFailure | null }): FieldClassifier => ({
    classify: async () => outcome.map,
    attempt: async () => ({ map: outcome.map, failureReason: outcome.failureReason }),
  });

  it('stays rule-only with a null classifier and reports no reason', async () => {
    const ms = metas();
    const got = await classifyWithReason(null, ms, {});
    expect(got.failureReason).toBeNull();
    expect(got.items).toHaveLength(ms.length);
    expect(got.items.every((i) => i.cls.source === 'rule')).toBe(true);
  });

  it('forwards only sub-threshold fields to the attempt seam (ACCEPT_THRESHOLD不変)', async () => {
    const confident = makeMeta({ id: 'c-conf', label: '氏名（姓）' });
    const pending = makeMeta({ id: 'p-pend', label: 'xxx-unknown-field-zzz' });
    const attempt = vi.fn(async (_fields: FieldMeta[]): Promise<{ map: Map<string, Category>; failureReason: null }> => ({ map: new Map(), failureReason: null }));
    const classifier: FieldClassifier = { classify: async () => new Map(), attempt };
    const got = await classifyWithReason(classifier, [confident, pending], {});
    expect(attempt).toHaveBeenCalledOnce();
    expect(attempt.mock.calls[0]![0].map((m) => m.id).sort()).toEqual(['p-pend']);
    expect(got.failureReason).toBeNull();
  });

  it('binds the attempt reason to the return value without a caller closure', async () => {
    const pending = makeMeta({ id: 'p-pend', label: 'xxx-unknown-field-zzz' });
    const got = await classifyWithReason(
      stubClassifier({ map: new Map([['p-pend', 'email']]), failureReason: 'network' }),
      [pending],
      {},
    );
    expect(got.failureReason).toBe('network');
    expect(got.items.find((i) => i.meta.id === 'p-pend')?.cls).toMatchObject({ category: 'email', source: 'llm' });
  });

  it('degrades to rule-only with a null reason when the attempt throws', async () => {
    const pending = makeMeta({ id: 'p-pend', label: 'xxx-unknown-field-zzz' });
    const throwing: FieldClassifier = {
      classify: async () => { throw new Error('down'); },
      attempt: async () => { throw new Error('down'); },
    };
    const got = await classifyWithReason(throwing, [pending], {});
    expect(got.failureReason).toBeNull();
    expect(got.items).toHaveLength(1);
  });

  it('keeps the error-tagged partial map without throwing (PBI-48 non-throwing contract)', async () => {
    const pending = makeMeta({ id: 'p-pend', label: 'xxx-unknown-field-zzz' });
    // A traced failure carries both the partial map and the error; the seam's
    // classify returns the map instead of rethrowing, unlike a raw classifier.
    const errorTagged: FieldClassifier = {
      classify: async () => { throw new Error('must not be called through the seam'); },
      attempt: async () => ({ map: new Map([['p-pend', 'email' as const]]), failureReason: 'network' }),
    };
    const got = await classifyWithReason(errorTagged, [pending], {});
    expect(got.failureReason).toBe('network');
    expect(got.items.find((i) => i.meta.id === 'p-pend')?.cls).toMatchObject({ category: 'email', source: 'llm' });
  });

  it('folds an out-of-vocabulary reason to bad-response (review #5)', async () => {
    const pending = makeMeta({ id: 'p-pend', label: 'xxx-unknown-field-zzz' });
    // A future adapter handing back a non-vocabulary string must not crash the
    // hint lookup (AI_FAILURE_TEXT[reason].hint) downstream.
    const exotic: FieldClassifier = {
      classify: async () => new Map(),
      attempt: async () => ({ map: new Map(), failureReason: 'future-reason' }),
    };
    const got = await classifyWithReason(exotic, [pending], {});
    expect(got.failureReason).toBe('bad-response');
  });
});

describe('fill session: aggregated apply ordering (PBI-45)', () => {
  it('runs consent→inject→persist→feedback in one session-owned order', async () => {
    const order: string[] = [];
    const ms = metas();
    const env: SessionEnv = {
      classify: async () => { order.push('classify'); return { items: baseItems(), failureReason: 'network' }; },
      checkConsent: () => { order.push('checkConsent'); return { ok: true as const }; },
      injectPlan: () => { order.push('inject'); return fullSummary(1, 1); },
      persistSelection: () => { order.push('persist'); },
      openUrl: () => { order.push('openUrl'); },
      feedbackContext: () => { order.push('feedbackContext'); return { pageHref: 'https://example.jp/form', provider: 'none', version: '0.0.0-test' }; },
      isExcluded: () => false,
    };
    const session = createFillSession({
      profiles: [profile1, profile2], addresses: [address1],
      metas: ms, metasById: metasById(ms), englishPage: false, canReanalyze: true,
    }, env);
    await session.start();
    await session.reanalyze();
    order.length = 0;
    const result = session.apply(true, panel);
    expect(result).toMatchObject({ applied: true });
    expect(order).toEqual(['checkConsent', 'inject', 'persist', 'feedbackContext', 'openUrl']);
  });

  it('sends no feedback and persists nothing when consent fails', async () => {
    const order: string[] = [];
    const ms = metas();
    const env: SessionEnv = {
      classify: async () => ({ items: baseItems(), failureReason: null }),
      checkConsent: () => { order.push('checkConsent'); return { ok: false as const, reason: '覆われているため中止' }; },
      injectPlan: () => { order.push('inject'); return fullSummary(2, 0); },
      persistSelection: () => { order.push('persist'); },
      openUrl: () => { order.push('openUrl'); },
      feedbackContext: () => ({ pageHref: 'https://example.jp/form', provider: 'none', version: '0.0.0-test' }),
      isExcluded: () => false,
    };
    const session = createFillSession({
      profiles: [profile1, profile2], addresses: [address1],
      metas: ms, metasById: metasById(ms), englishPage: false, canReanalyze: true,
    }, env);
    await session.start();
    expect(session.apply(true, panel)).toEqual({ applied: false, reason: '覆われているため中止' });
    expect(order).toEqual(['checkConsent']);
  });

  it('keeps the stored reason across retries until a newer run overwrites it', async () => {
    const { session } = setup({ summary: { filled: 1, unapplied: 1 }, failReason: 'network' });
    await session.start();
    const first = session.apply(false, panel);
    const second = session.apply(false, panel);
    // apply() never clears the reason: a retry shows the same hint.
    expect(second).toEqual(first);
    expect(second).toMatchObject({
      display: { banner: `${hintForButton('network')}。一部のみ適用（1/2件）` },
    });
  });

  it('lets the latest run overwrite the stored reason', async () => {
    let reason: ClassifyFailure | null = 'network';
    const ms = metas();
    const env: SessionEnv = {
      classify: async () => ({ items: baseItems(), failureReason: reason }),
      checkConsent: () => ({ ok: true as const }),
      injectPlan: () => fullSummary(1, 1),
      persistSelection: () => {},
      openUrl: () => {},
      feedbackContext: () => ({ pageHref: 'https://example.jp/form', provider: 'none', version: '0.0.0-test' }),
      isExcluded: () => false,
    };
    const session = createFillSession({
      profiles: [profile1, profile2], addresses: [address1],
      metas: ms, metasById: metasById(ms), englishPage: false, canReanalyze: true,
    }, env);
    await session.start();
    expect((await session.start()).failureReason).toBe('network');
    reason = null;
    const res = await session.reanalyze();
    expect(res?.failureReason).toBeNull();
    // The newer (successful) run clears the hint from the banner composition.
    expect(session.apply(false, panel)).toMatchObject({
      display: { banner: '一部のみ適用（1/2件）' },
    });
  });
});
