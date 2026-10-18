// 転送契約 (PBI-43): ai-classify の送受信両端が共有する cap・timeout・chunk 形状の
// 単一所有モジュール。送信側 (background-gateway) と受信側 (messages) は数値を
// ここから import するだけで、自前リテラルを持たない。値を変えるときはこの
// ファイルだけを変えれば両端に反映される。
//
// 不変条件:
//   - chunk < backstop ≤ total (20 < 30 ≤ 60): 整形済み送信チャンクが受信側
//     backstop に引っかからないこと (= decodeRequest の null reject を静的に回避)
//   - per-chunk timeout ≤ 残 budget ≤ total timeout (45s ≤ 60s):
//     各チャンク送信は Math.min(timeoutMs, remaining) で残 budget に clamp され、
//     逐次実行全体が total timeout に収まる (= sendWithTimeout の timeout を静的に回避)
//   - status timeout (5s) は分類実行と独立した軽量往復のため total とは無関係
//
// 崩れは実行時 reject を待たずに検出する: 下の load 時表明が import 失敗として
// テスト・ビルドを落とし、tests/llm/transfer-contract.test.ts が回帰網になる。
// 値を変えたら `make check` 必須（単体テストだけでは両ブラウザビルド・manifest
// 検査までの不変条件を確認できない）。
//
// 変更手順: 値を変える → `make check`（EXIT:0を確認）→ 契約テストの更新が必要なら同時に行う。

export const TRANSFER_TOTAL_CAP = 60;
export const TRANSFER_BACKSTOP_CAP = 30;
export const TRANSFER_CHUNK_SIZE = 20;

export const TRANSFER_CHUNK_TIMEOUT_MS = 45_000;
export const TRANSFER_TOTAL_TIMEOUT_MS = 60_000;
export const TRANSFER_STATUS_TIMEOUT_MS = 5_000;

// 不変条件の表明: 破れた値に変えるとこのモジュールの import 自体が例外となり、
// 実行時 reject を待たずテスト・ビルドで検出される。
if (!(TRANSFER_CHUNK_SIZE < TRANSFER_BACKSTOP_CAP && TRANSFER_BACKSTOP_CAP <= TRANSFER_TOTAL_CAP)) {
  throw new Error(
    `[JushoAI] broken transfer contract: require chunk (${TRANSFER_CHUNK_SIZE}) < backstop (${TRANSFER_BACKSTOP_CAP}) <= total (${TRANSFER_TOTAL_CAP})`,
  );
}
if (!(TRANSFER_CHUNK_TIMEOUT_MS <= TRANSFER_TOTAL_TIMEOUT_MS)) {
  throw new Error(
    `[JushoAI] broken transfer contract: require per-chunk timeout (${TRANSFER_CHUNK_TIMEOUT_MS}) <= total timeout (${TRANSFER_TOTAL_TIMEOUT_MS})`,
  );
}
