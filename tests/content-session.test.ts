import { describe, expect, it, vi } from 'vitest';
import type { Address, FieldMeta, Item, Profile } from '../src/core/types';
import { EMPTY_ADDRESS, EMPTY_PROFILE } from '../src/core/types';
import { createFillSession, decideDisplay, type SessionEnv } from '../src/content-session';
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
} = {}) {
  const ms = metas();
  const classify = vi.fn(async (_m: FieldMeta[], o?: { force?: boolean }) =>
    (o?.force && opts.reItems ? opts.reItems : baseItems()));
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
    expect(started).toEqual({ excluded: true });
    expect(env.injectPlan).not.toHaveBeenCalled();
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
    expect(session.apply(false, panel, 'AI通信に失敗したためルールのみで表示: 再試行できます')).toMatchObject({
      applied: true,
      display: { banner: 'AI通信に失敗したためルールのみで表示: 再試行できます。一部のみ適用（1/2件）' },
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
    const rows = await session.reanalyze();
    expect(rows?.length).toBeGreaterThan(0);
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
