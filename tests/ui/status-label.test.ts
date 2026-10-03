import { describe, it, expect } from 'vitest';
import type { AiStatusInfo } from '../../src/ai/types';
import { badgeLabel } from '../../src/ui/status-label';

const info = (status: AiStatusInfo['status'], provider: AiStatusInfo['provider']): AiStatusInfo => ({ status, provider });

describe('badgeLabel', () => {
  it.each([
    [info('available', 'built-in'), 'AI 有効'],
    [info('available', 'openai'), 'AI: OpenAI 互換'],
    [info('available', 'gemini'), 'AI: Gemini'],
    [info('downloadable', 'built-in'), 'AI 未準備'],
    [info('downloading', 'built-in'), 'AI 準備中'],
    [info('unavailable', 'none'), 'AI 無効'],
    [info('unsupported', 'built-in'), 'AI 無効'],
    [info('disabled', 'none'), 'AI: オフ'],
    [info('not-configured', 'openai'), 'AI 未設定'],
    [info('permission-missing', 'gemini'), 'AI 権限なし'],
    [info('auth-error', 'openai'), 'AI 認証エラー'],
  ])('%j -> %s', (i, expected) => {
    expect(badgeLabel(i)).toBe(expected);
  });
});
