# Firefox 対応 設計

## 目的

Chrome / Edge 向けの拡張機能を Firefox（デスクトップ、MV3）でも動かす。ルール分類・プレビュー・注入・クラウド AI は共通コードで動かし、ブラウザ差は最小の層に閉じ込める。

## スコープ

- Firefox 128 以上（MV3 の `optional_host_permissions` に必要な最低バージョン）。
- AI は Firefox ではクラウドプロバイダ（`none` / `openai` / `gemini`）のみ。Prompt API（`built-in`）は提供しない。
- ローカル AI（Firefox の ML 系 API など）は対象外。

## 設計

### ブラウザ API の抽象化

- `chrome.*` をそのまま使う。Firefox の MV3 は `chrome.*` を Promise 付きでサポートするため、置き換えは不要。既存のユニットテストの `chrome` スタブも変えずに済む。
- ビルドターゲットの差は `import.meta.env.FIREFOX` だけに閉じ込める。

### マニフェスト

- `wxt.config.ts` に Firefox 用の `browser_specific_settings.gecko`（`id`、`strict_min_version: "128.0"`）を追加する。Chrome ビルドには出力しない。
- 背景処理は WXT が Firefox では `background.scripts`（event page）に変換する。`service_worker` は出力されない。
- 背景コードは event page の再起動を前提にし、メモリ上の状態（`authFailed` / `compat` / 鍵キャッシュ）が失われても動くことを保つ。

### AI プロバイダ

- ビルドターゲットで分岐する（実行時の `LanguageModel` 検出ではなく、`import.meta.env.FIREFOX` 相当）。Firefox では設定ページの選択肢から `built-in` を外す。
- ストレージに `built-in` が保存されていた場合、Firefox では `none` として扱う。
- 設定ページの Ollama 案内は、拡張オリジンをブラウザ別に出し分ける（`chrome-extension://<id>` / `moz-extension://<uuid>`）。Firefox は UUID がインストールごとに変わることを併記する。
- コンテンツスクリプトの `built-in` ダウンロード導線は Firefox では出さない。

### 実機で確認する項目

- IndexedDB + WebCrypto（`extractable: false` の AES-GCM 鍵）による API キーの保存と復号。
- closed Shadow DOM の UI と、ネイティブ setter 経由の値注入（`input` / `change` / `blur`）。
- `optional_host_permissions` の要求（設定ページの保存時、ユーザー操作内）。

## テスト

1. **ユニット（Vitest）**: `browser` を差し替えたテストを追加する。Firefox ターゲットで `built-in` が選択肢に出ないこと、保存済み `built-in` が `none` に落ちること、オリジン案内の出し分けを検証する。既存テストは回帰として全件通す。
2. **ビルド検査**: `make build-firefox` の出力 manifest を検査するテスト。gecko id、`background.scripts` の有無、`service_worker` が無いこと、Chrome ビルドが変わらないことを確認する。あわせて `web-ext lint` を通す。
3. **E2E（実 Firefox）**: `tests/e2e/` に置く。Selenium + geckodriver で拡張を一時インストールし、`samples/` のフォームで「ボタン押下 → プレビュー → 注入」を検証する。入力済み欄の非上書きと `maxlength` 超過の警告も含める。`make e2e-firefox` として `make check` とは別ターゲットにする。
4. `make check` は Chrome に加えて Firefox ビルドと manifest 検査まで含める。

## ドキュメント

- README（日英）、`site/` のガイド、`CLAUDE.md` に Firefox の対応状況と制約（built-in 不可、最低バージョン）を追記する。
- AMO 提出用に、ソースからのビルド手順を README に記載する。
