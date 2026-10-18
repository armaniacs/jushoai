import type { ClassifyFailure, TestFailure } from '../messages';

// AI失敗文言の単一対応表（PBI-19）。
// content.ts のボタン hint と options の ai-section.ts の接続テスト notice が
// 別々の Record を二重所有していたドリフトをなくし、reason ごとの文言を
// 1エントリに隣接させた。両画面は必ず下の用途別ラッパー経由で参照する。
// ClassifyFailure と TestFailure は同一リテラル集合の別名なので、
// キーは両者の和集合（共有の7キー＋classify-only の truncated）で受ける。
export interface AiFailureText {
  /** content.ts のボタン表示用（短いヒント。ルールのみ動作の旨を添える） */
  hint: string;
  /** ai-section.ts の接続テスト結果 notice 用（詳しい対処案内） */
  notice: string;
}

export const AI_FAILURE_TEXT: Record<ClassifyFailure | TestFailure, AiFailureText> = {
  'not-configured': {
    hint: 'AI未設定のためルールのみで表示',
    notice: '設定が完了していません。保存してから試してください。',
  },
  permission: {
    hint: 'AI通信が未許可のためルールのみで表示: 設定で許可してください',
    notice: '通信が許可されていません。保存し直して許可してください。',
  },
  auth: {
    hint: 'AI認証に失敗したためルールのみで表示: APIキーを確認してください',
    notice:
      '認証に失敗しました。まず API キーを確認してください。Ollama などローカルのサーバーの場合は、OLLAMA_ORIGINS の設定（拡張機能のオリジンの許可）を確認してください。',
  },
  unavailable: {
    hint: '内蔵AIが未準備のためルールのみで表示',
    notice: 'ブラウザ内蔵 AI がまだ使えません。モデルのダウンロード状況を確認してください。',
  },
  network: {
    hint: 'AI通信に失敗したためルールのみで表示: 再試行できます',
    notice: '接続に失敗しました。URL・モデル名・ネットワークを確認してください。',
  },
  rejected: {
    hint: 'AIが要求を拒否したためルールのみで表示: モデル設定を確認してください',
    notice:
      'サーバーがリクエストを拒否しました。モデル名と、モデルが JSON 形式の出力に対応しているかを確認してください。',
  },
  'bad-response': {
    hint: 'AI応答を解釈できずルールのみで表示',
    notice: '応答を解釈できませんでした。モデルが JSON 形式の出力に対応しているか確認してください。',
  },
  // PBI-25: classify-only (TestFailure には含まれない)。60件打ち切りを
  // failureReason→showError 経路に乗せるための文言。接続テストでは出ない。
  truncated: {
    hint: '入力欄が60件を超えたため61件目以降はルールのみで表示',
    notice: '入力欄が60件を超えています。61件目以降はAI分類の対象外となり、ルールのみで分類されます。',
  },
};

// content.ts のボタン用。ClassifyFailure を受け、同一対応表の hint を返す。
export function hintForButton(reason: ClassifyFailure): string {
  return AI_FAILURE_TEXT[reason].hint;
}

// ai-section.ts の接続テスト notice 用。TestFailure を受け、同一対応表の notice を返す。
export function noticeForTest(reason: TestFailure): string {
  return AI_FAILURE_TEXT[reason].notice;
}
