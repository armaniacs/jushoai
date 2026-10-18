import { describe, it, expect } from 'vitest';
import { AI_FAILURE_TEXT, hintForButton, noticeForTest } from '../../src/ai/failure-text';
import type { ClassifyFailure, TestFailure } from '../../src/messages';

// 単一対応表の正準キー集合。ClassifyFailure / TestFailure は同一リテラル集合の
// 別名なので、ここに列挙した7キーが両型の全キーであることをアサートする。
// messages.ts に新規 reason を追加したら、このリストと AI_FAILURE_TEXT の
// 両方を更新すること（片方だけだと下のテストが失敗する）。
const ALL_FAILURE_KEYS = [
  'not-configured',
  'permission',
  'auth',
  'network',
  'rejected',
  'bad-response',
  'unavailable',
] as const satisfies readonly (ClassifyFailure & TestFailure)[];

describe('AI_FAILURE_TEXT (PBI-19 single table)', () => {
  it('covers every ClassifyFailure/TestFailure key with no extras', () => {
    expect(Object.keys(AI_FAILURE_TEXT).sort()).toEqual([...ALL_FAILURE_KEYS].sort());
  });

  it('hintForButton covers every key and returns the table hint', () => {
    for (const reason of ALL_FAILURE_KEYS) {
      const text = hintForButton(reason);
      expect(text).toBe(AI_FAILURE_TEXT[reason].hint);
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it('noticeForTest covers every key and returns the table notice', () => {
    for (const reason of ALL_FAILURE_KEYS) {
      const text = noticeForTest(reason);
      expect(text).toBe(AI_FAILURE_TEXT[reason].notice);
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it('keeps button hint and settings notice as separate usages of one entry', () => {
    // 両画面が同一エントリ由来であること（1箇所編集で両画面に反映される構造）。
    for (const reason of ALL_FAILURE_KEYS) {
      const entry = AI_FAILURE_TEXT[reason];
      expect(hintForButton(reason)).toBe(entry.hint);
      expect(noticeForTest(reason)).toBe(entry.notice);
    }
  });
});
