import { describe, it, expect } from 'vitest';
import { buildExclusionCandidates } from '../../src/core/exclusion-prefix';

describe('buildExclusionCandidates', () => {
  it('スライドURLから2候補を作る', () => {
    const result = buildExclusionCandidates('https://docs.google.com/presentation/d/abc/edit');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.exact).toBe('https://docs.google.com/presentation/d/abc/edit');
    expect(result.prefix).toBe('https://docs.google.com/presentation/');
  });

  it('クエリとハッシュは exact に残し prefix からは落とす', () => {
    const result = buildExclusionCandidates('https://example.com/form?a=1#top');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.prefix).toBe('https://example.com/form/');
  });

  it('ルート直下は origin だけになる', () => {
    const result = buildExclusionCandidates('https://example.com');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.prefix).toBe('https://example.com/');
  });

  it('http 以外は既存の理由で失敗する', () => {
    const result = buildExclusionCandidates('chrome://extensions');
    expect(result.ok).toBe(false);
  });
});
