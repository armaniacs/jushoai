# PBI: Edge・Firefox ストア自動提出（wxt submit 横展開）

## ユーザーストーリー
リリース担当者として、タグ push を起点に Edge アドオンと Firefox AMO へも自動提出・自動公開したい、なぜなら Chrome だけ自動化しても残り2ストアの手動作業が残るためだ

## ビジネス価値
- PBI-01（Chrome＋wxt submit 基盤）の効果を3ストアに拡大し、リリース作業を「タグを打つだけ」にする
- 測定方法: `v*` タグ push → Chrome／Edge／Firefox の3提出が1ワークフローで走り、各ストアの提出成功を Actions ログで確認できること

## BDD受け入れシナリオ

```gherkin
Scenario: タグpushでEdgeとFirefoxへ自動提出し自動公開される
  Given PBI-01 の wxt submit 基盤が main にある
  And Edge・Firefox 用の Secrets が environment release に登録されている
  When vX（package.json 一致）に push する
  Then Edge アドオンに審査提出され審査通過後に自動公開される
  And Firefox AMO の listed チャンネルに審査提出され審査通過後に自動公開される

Scenario: 片ストアの失敗は他ストアを巻き込まず再実行できる
  Given 3ストア提出のうち1ストア（例: Firefox）のみ失敗した
  When 原因（Secrets 不足・審査リジェクト・version 競合等）を解消して再実行する
  Then 成功済みストアへの二重提出にならず、失敗分だけ回復できる
  And 失敗理由が Actions ログで判別できる
```

## 受け入れ基準
- [x] Edge は Chromium 成果物（Chrome と同一 zip）を流用し、Edge API（product-id／client-id／api-key）で提出する
- [x] Firefox は `dist/jushoai-<version>-firefox.zip`＋`dist/jushoai-<version>-sources.zip`（AMO レビュー用）を添えて listed チャンネルに提出する。拡張 ID は `jushoai@armaniacs.github.io`
- [x] 両ストアとも審査通過後は自動公開（`--edge-skip-submit-review`／`--firefox-skip-submit-review` は付けない）
- [x] 3ストアの失敗が切り分けられる（1ストア失敗で全体ログが読めなくならない。再実行手順あり）
- [x] Secrets は `environment: release` に閉じ込め、ログに漏れない

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 初回は両ストアとも `--dry-run` で認証のみ確認し、ログで認証成功を見る（実提出は審査に触るため）

### 統合テスト
- Edge: Chrome zip パスが `--edge-zip` として解決できること
- Firefox: firefox zip＋sources zip が `--firefox-zip`／`--firefox-sources-zip` として解決できること、`--firefox-channel listed` であること
- `publish-extension status` 系での提出状態参照手順の確認

### 単体テスト
- workflow YAML の静的検査（3ストア分のフラグ・Secrets 参照・channel 値の目視／パース検査）
- Firefox の `browser_specific_settings.gecko.id` と提出 ID の一致確認

## 実装アプローチ
- **Outside-In**: dry-run 疎通（E2E相当）→ zip パス解決（統合）→ YAML 静的検査（単体）の順に失敗を確認してから実装
- **Red-Green-Refactor**: Edge→Firefox の順に1ストアずつ緑化する
- **リファクタリング**: 緑化後に Chrome／Edge の zip 重複指定を整理する

## 見積もり
3pt（要チームでの見積もり）

## 技術的考慮事項
- 依存関係: PBI-01（Chrome＋wxt submit 基盤）に依存する。PBI-01 のマージ後に着手すること
- テスタビリティ: 実提出は取り消せないため、初回検証は `--dry-run` に限定する
- 非機能要件: AMO の sources zip は `wxt.config.ts` の `zip.excludeSources` 設定で生成されるものを使う（レビュー再現用に余計な成果物を混ぜない）

## 実装者向け注記

### 現状コードの確認
（着手前に必ず実行すること）
```bash
grep -rn "submit\|publish-extension\|edge\|firefox.*zip\|sources" .github/ wxt.config.ts package.json Makefile
grep -rn "gecko" wxt.config.ts src/
```
- 確認済み（2026-10-13）: `gecko.id` は `jushoai@armaniacs.github.io`（`wxt.config.ts`）。`release.yml` は `make zip`＋`make zip-firefox` で `dist/jushoai-<version>-{chrome,firefox,sources}.zip` を GitHub Release に添付するのみで、ストア提出は未実装
- 参考記事: https://zenn.dev/eetann/articles/2022-07-25-crx-with-github-actions （Chrome のみの手順。Edge の Partner Center API キー発行・Firefox の AMO JWT 発行は記事範囲外のため各ストアの現行ドキュメントで補う）

### 実装手順
1. dry-run 疎通を定義する（E2E相当）: PBI-01 の提出ステップに Edge・Firefox の `--dry-run` を足し、両ストアの認証のみ通ることを確認する
2. zip 解決を固定する（統合）: Edge は Chrome zip を `--edge-zip` に再利用、Firefox は firefox zip＋sources zip を `--firefox-zip`／`--firefox-sources-zip` に渡す。channel は `listed`
3. 本番提出を開通する（実装）: `--dry-run` を外し、Edge（product-id／client-id／api-key）と Firefox（extension-id／jwt-issuer／jwt-secret）を Secrets 参照で渡す。自動公開のため skip-submit-review 系は付けない
4. 失敗分離を決める: 1ストア失敗時に他ストアの成否がログで判別でき、失敗分だけ再実行できる順序（直列／継続実行条件）にする

### 落とし穴
- Edge と Chrome は同じ Chromium zip でよいが、誤って firefox zip を Edge に渡さないこと（成果物の取り違え注意）
- Firefox AMO は sources zip 必須。`excludeSources` を緩めすぎると審査用ソースが膨らみ、締めすぎると再現ビルドできず差し戻される
- Firefox のメモリ状態（鍵キャッシュ等は background の event page 前提）と混同しないこと。本PBIの Secrets は GitHub Environments 側の話
- ストアごとに審査期間・リジェクト理由が異なる。初回は小さめのバージョン上げで3ストアの素通しを確認する

## Definition of Done
- [x] 全BDDシナリオが確認できる（dry-run ログ＋本番手順のレビュー）
- [x] E2E/統合/単体の各確認が実行され結果が記録される
- [x] コードレビュー完了
- [x] リファクタリング完了（グリーン後）
- [x] ドキュメント更新済み（Secrets 登録手順・再実行手順・Edge／Firefox 固有の注意）
