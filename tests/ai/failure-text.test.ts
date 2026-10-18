import { describe, it, expect } from 'vitest';
import { AI_FAILURE_TEXT, hintForButton, noticeForTest } from '../../src/ai/failure-text';
import type { ClassifyFailure, TestFailure } from '../../src/messages';

// 単一対応表の正準キー集合。共有の7キーが両型の共通部分で、truncated は
// classify-only（PBI-25: gateway の60件打ち切り信号）のため ClassifyFailure
// にだけ含まれる。messages.ts に新規 reason を追加したら、このリストと
// AI_FAILURE_TEXT の両方を更新すること（片方だけだと下のテストが失敗する）。
const SHARED_FAILURE_KEYS = [
  'not-configured',
  'permission',
  'auth',
  'network',
  'rejected',
  'bad-response',
  'unavailable',
] as const satisfies readonly TestFailure[];
const CLASSIFY_ONLY_KEYS = ['truncated'] as const satisfies readonly ClassifyFailure[];
const ALL_CLASSIFY_KEYS = [...SHARED_FAILURE_KEYS, ...CLASSIFY_ONLY_KEYS] as const;

describe('AI_FAILURE_TEXT (PBI-19 single table)', () => {
  it('covers every ClassifyFailure key with no extras', () => {
    expect(Object.keys(AI_FAILURE_TEXT).sort()).toEqual([...ALL_CLASSIFY_KEYS].sort());
  });

  it('hintForButton covers every ClassifyFailure key and returns the table hint', () => {
    for (const reason of ALL_CLASSIFY_KEYS) {
      const text = hintForButton(reason);
      expect(text).toBe(AI_FAILURE_TEXT[reason].hint);
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it('noticeForTest covers every TestFailure key and returns the table notice', () => {
    for (const reason of SHARED_FAILURE_KEYS) {
      const text = noticeForTest(reason);
      expect(text).toBe(AI_FAILURE_TEXT[reason].notice);
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it('keeps button hint and settings notice as separate usages of one entry', () => {
    // 両画面が同一エントリ由来であること（1箇所編集で両画面に反映される構造）。
    for (const reason of SHARED_FAILURE_KEYS) {
      const entry = AI_FAILURE_TEXT[reason];
      expect(hintForButton(reason)).toBe(entry.hint);
      expect(noticeForTest(reason)).toBe(entry.notice);
    }
  });
});
