// PBI-224: サイト内検索窓の除外。label空 × name in {q, query, keyword, kw, s}
// × text/search の欄は送付対象外（confident unknown）かつ fill 対象外にする。
// 派生名（companyEmail 等）は完全一致リストのため除外しない。
import { describe, it, expect } from 'vitest';
import { classifyField, isConfident } from '../../src/core/classify-rules';
import { sendSet } from '../../src/core/pending-split';
import { buildPlan } from '../../src/core/planner';
import { EMPTY_ADDRESS, EMPTY_PROFILE } from '../../src/core/types';
import { makeMeta } from '../helpers';

const SEARCH_NAMES = ['q', 'query', 'keyword', 'kw', 's'];

describe('search-box exclusion (PBI-224)', () => {
  it.each(SEARCH_NAMES)('labels name=%s as confident unknown (no LLM send, no fill)', (name) => {
    for (const type of ['text', 'search']) {
      const meta = makeMeta({ id: `f-${name}-${type}`, name, type });
      const cls = classifyField(meta);
      expect(cls?.category, `${name}/${type}`).toBe('unknown');
      expect(isConfident(cls), `${name}/${type} confident`).toBe(true);
    }
  });

  it('keeps the search box out of the LLM send set and the fill plan', () => {
    const metas = SEARCH_NAMES.map((name, i) => makeMeta({ id: `s${i}`, name, type: i % 2 ? 'search' : 'text' }));
    expect(sendSet(metas)).toEqual([]);
    const items = metas.map((meta) => ({
      meta,
      cls: classifyField(meta) ?? { category: 'unknown' as const, confidence: 0, source: 'rule' as const },
    }));
    const plan = buildPlan(items, { profile: EMPTY_PROFILE, address: EMPTY_ADDRESS });
    expect(plan).toEqual([]);
  });

  // PBI-229 で更新：companyEmail は email ゲートが拾うため email になる。
  // 検索窓除外の対象でないこと（本テストの意図）は不変。
  it('does not exclude derived names such as companyEmail (email since PBI-229)', () => {
    expect(classifyField(makeMeta({ name: 'companyEmail' }))).toMatchObject({
      category: 'email',
      source: 'rule',
    });
  });

  it('does not exclude a labeled search box', () => {
    // ラベル付きは対象外（従来どおり。PBI-224の適用範囲外）。
    expect(classifyField(makeMeta({ name: 's', type: 'search', label: 'サイト内検索' }))).toBeNull();
  });

  it('leaves an inquiry textarea-equivalent field as unknown as before', () => {
    expect(classifyField(makeMeta({ label: 'お問い合わせ内容' }))).toBeNull();
  });
});
