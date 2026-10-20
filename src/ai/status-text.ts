import type { AiState } from './types';

// Single owner of the AI-status display vocabulary (PBI-62): the form-button
// badge and the AI guide title read from this one table, so adding a status
// touches one place and a missing key is a compile error (Record<AiState>).
// Wording differs per surface by design — this table only guarantees that
// every status HAS wording everywhere, not that it is identical.
// Deliberately excluded: failure-text.ts (ClassifyFailure|TestFailure) is a
// different vocabulary — it includes non-states (network/rejected/bad-response/
// truncated) and lacks available/downloadable/downloading/unsupported/disabled.
// Unifying those key sets would be over-unification; they stay separate.
export interface StatusText {
  badge: string;
  guideTitle: string;
}

export const STATUS_TEXT: Record<AiState, StatusText> = {
  available: { badge: 'AI 有効', guideTitle: 'AI 判定を利用できます' },
  downloadable: { badge: 'AI 未準備', guideTitle: 'AI モデルが未ダウンロードです' },
  downloading: { badge: 'AI 準備中', guideTitle: 'AI モデルを準備中です' },
  unavailable: { badge: 'AI 無効', guideTitle: '内蔵 AI を利用できません' },
  unsupported: { badge: 'AI 無効', guideTitle: 'このブラウザでは内蔵 AI を使えません' },
  disabled: { badge: 'AI: オフ', guideTitle: 'AI 判定はオフです' },
  'not-configured': { badge: 'AI 未設定', guideTitle: 'AI の設定が未完了です' },
  'permission-missing': { badge: 'AI 権限なし', guideTitle: 'AI への通信が許可されていません' },
  'auth-error': { badge: 'AI 認証エラー', guideTitle: 'AI の認証に失敗しました' },
};
