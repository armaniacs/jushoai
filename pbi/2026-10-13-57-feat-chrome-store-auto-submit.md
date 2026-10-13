# PBI: Chrome Web Store 自動提出（wxt submit 基盤）

## ユーザーストーリー
リリース担当者として、タグ push を起点に Chrome Web Store へ自動提出・自動公開したい、なぜなら手動アップロードと審査申請の手間・バージョン上げ忘れをなくすためだ

## ビジネス価値
- 記事のメリット（手動アップロード省略・審査申請省略・上げ忘れ防止）を Chrome で再現する
- 測定方法: `v*` タグ push → GitHub Release 作成と並行して Chrome 審査提出が走り、Actions ログで提出成功を確認できること

## BDD受け入れシナリオ

```gherkin
Scenario: タグpushでChromeへ自動提出し自動公開される
  Given バージョンXのタグ vX が package.json の version と一致している
  And Chrome 用の Secrets が environment release に登録されている
  When vX に push する
  Then make check と zip が成功する
  And Chrome Web Store に審査提出され審査通過後に自動公開される

Scenario: バージョン不一致やSecrets不足では提出せず失敗を明示する
  Given タグと package.json のバージョンが不一致、または Chrome Secrets が不足している
  When release ワークフローが実行される
  Then ストア提出ステップは実行されずワークフローは失敗として明示される
  And 既存の GitHub Release 作成を汚さない（提出成功と Release 作成の順序が定義されている）
```

## 受け入れ基準
- [ ] `v*` タグ push で `release.yml` が Chrome 提出ステップまで到達する
- [ ] Chrome API v2（サービスアカウント方式）で提出する。v1.1（CLIENT_ID/SECRET/REFRESH_TOKEN）は `--help` 上 Deprecated のため採用しない
- [ ] 審査通過後は自動公開（STAGED_PUBLISH にしない）
- [ ] 現行フロー（tag v*＋package.json 一致検査・make check・make zip・GitHub Release）は維持する。記事の daily-version-action（Y.M.D 自動採番）は導入しない
- [ ] Secrets は `environment: release` に閉じ込め、ログに漏れない（マスク・`persist-credentials: false` 維持）

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 本番タグでの実提出はストア審査に触るため、初回は `--dry-run`（認証のみ・zip未送信）で Actions 上の疎通を確認し、ログで認証成功を見る

### 統合テスト
- `npx wxt submit --help` で利用する `--chrome-*` フラグの存在確認（publish-extension 6.2.0 / WXT 0.21.4 前提）
- `dist/jushoai-<version>-chrome.zip` が提出 zip として解決できること（`make zip` 後のパス解決）
- `publish-extension status` 系での提出状態参照手順の確認

### 単体テスト
- workflow YAML の静的検査（actionlint 相当の目視／パース検査。タグ条件・environment・権限 `contents: write` の維持）
- バージョン一致検査ステップが残っていることの目視確認

## 実装アプローチ
- **Outside-In**: dry-run 疎通（E2E相当）→ zip パス解決（統合）→ YAML 静的検査（単体）の順に失敗を確認してから実装
- **Red-Green-Refactor**: 各レイヤーで失敗→最小実装→緑化
- **リファクタリング**: 緑化後にステップ順序・Secrets 参照の重複を整理

## 見積もり
3pt（要チームでの見積もり）

## 技術的考慮事項
- 依存関係: なし（本PBIが基盤。PBI-02 が本PBIに依存する）
- テスタビリティ: 実提出は取り消せないため、初回検証は `--dry-run` に限定する
- 非機能要件: サービスアカウント秘密鍵は GitHub Environments の Secrets にのみ置き、リポジトリ・ログ・成果物に残さない

## 実装者向け注記

### 現状コードの確認
（着手前に必ず実行すること）
```bash
grep -rn "submit\|publish-extension\|chrome-webstore-upload" src/ .github/ wxt.config.ts package.json
grep -rn "EXTENSION_ID\|CLIENT_ID\|REFRESH_TOKEN" .github/
```
- 確認済み（2026-10-13）: `release.yml` は GitHub Release 止まりでストア提出は未実装。`wxt.config.ts`・`package.json` に submit 設定なし。`npx wxt submit --help` は publish-extension 6.2.0 のフラグ群を返す
- 参考記事: https://zenn.dev/eetann/articles/2022-07-25-crx-with-github-actions （Chrome＋daily-version＋chrome-webstore-upload-cli の7手順。初回は手動登録必須という点は本件でも踏襲＝今回は3ストアとも登録済みを確認済み）

### 実装手順
1. dry-run 疎通を定義する（E2E相当）: `release.yml` の Package 後に Chrome 提出ステップの雛形を置き、`--dry-run` で認証のみ通ることを確認する
2. zip 解決を固定する（統合）: `make zip` が作る `dist/jushoai-<version>-chrome.zip` を `--chrome-zip` に渡す。version は既存の `node -p "require('./package.json').version"` 再利用
3. 本番提出を開通する（実装）: `--dry-run` を外し、Chrome API v2 のサービスアカウント系フラグ（client-email／private-key または access-token）＋ `--chrome-extension-id` ＋ `--chrome-publisher-id` を Secrets 参照で渡す。自動公開のため `STAGED_PUBLISH` は付けない
4. 順序と失敗時を決める: GitHub Release 作成と提出の前後関係を固定し、提出失敗時は Release を汚さない／再実行可能な順序にする

### 落とし穴
- 記事の `chrome-webstore-upload-cli`＋OAuth（CLIENT_ID/SECRET/REFRESH_TOKEN）は現行 `--help` で Deprecated（API v1.1）。新規は Chrome API v2 のサービスアカウント方式を選ぶ
- Chrome は更新のたびに version 引き上げ必須。現行の「タグ＝package.json」検査を残すことが上げ忘れ防止になる。daily-version-action は導入しない
- 保留中の審査がある状態での再提出は `--chrome-cancel-pending` の要否を判断する
- Edge と Chrome で同じ zip を使い回せるが、本PBIでは Chrome のみ配線し Edge 流用は PBI-02 に残す

## 変更記録（2026-10-13・実装時）

- Chrome は API v2＋サービスアカウントの予定だったが、組織ポリシー
  （`iam.disableServiceAccountKeyCreation`）で鍵作成が禁止され、
  組織なしプロジェクトも作れないため、API v1.1＋OAuth
  （CLIENT_ID／CLIENT_SECRET／REFRESH_TOKEN）に変更した。
  別アプリと同一アカウントのダッシュボードのため OAuth 方式に相乗りできる。
  ポリシー解除ができたら v2 への移行を検討する。

## Definition of Done
- [ ] 全BDDシナリオが確認できる（dry-run ログ＋本番手順のレビュー）
- [ ] E2E/統合/単体の各確認が実行され結果が記録される
- [ ] コードレビュー完了
- [ ] リファクタリング完了（グリーン後）
- [ ] ドキュメント更新済み（Secrets 登録手順・再実行手順）
