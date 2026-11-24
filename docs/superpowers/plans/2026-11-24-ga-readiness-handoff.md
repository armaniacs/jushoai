# 正式版 (1.0) 準備ラウンド 引継ぎメモ

台帳: `pbi/2026-11-24-00-backlog-ga-readiness-round.md`。各 PBI の要件は PBI 本文が原本で、このメモは着手時に調べ直さずに済む事実と落とし穴だけを置く。

## 進め方

- ブランチ `work/ga-readiness`（`work/user-docs-reorg` 74e3d89 から分岐）。未マージの作業ブランチ（adachi-label-extraction / role-profile-select / emergency-contact-tel / user-docs-reorg）は一直線に積まれており、`work/user-docs-reorg` が全部を含む
- 実装は AGENTS.md のとおりサブエージェント駆動。brief / report / 進捗は `.superpowers/sdd/ga-readiness-*`。進捗台帳は `.superpowers/sdd/ga-readiness-progress.md`（git 管理外。失われたら `git log` と各 PBI の「実装記録」節から復元する）
- 1 PBI ごとに: brief を書く → 実装 → タスクレビュー → PBI の受け入れ基準と「実装記録」節を更新

## 状況（2026-11-24 時点）

| PBI | 状況 | 次の一手 |
|---|---|---|
| 275 SECURITY.md | 完了（01d373a、タスクレビュー Approved・指摘なし） | ユーザー作業: private vulnerability reporting の有効化、応答日数（7 日 / 30 日）の確認 |
| 281 manifest 検査 | 完了（597fd68、タスクレビュー Approved・Critical/Important なし） | 残り 2 点（小）: `tests/build/manifest-guard.build.ts` の JS 走査で対象ファイル数が 0 でないことを assert する、外部 URL の `import(` 検査を足す |
| 277 / 274 / 278 / 282 / 276 / 283 / 280 / 284 / 285 / 286 | 未着手 | 下の各節 |
| 279 / 287-290 | 将来構想。着手しない | - |

## 277 依存の継続監視

- `.github/workflows/check.yml` の構造は `tests/build/check-workflow.build.ts` が検査している。ステップを足したら同 test も更新する
- `.npmrc` の `registry` は非公式ミラー `https://npm.flatt.tech/`。`npm audit` はミラーの audit エンドポイント対応が不明なので `--registry=https://registry.npmjs.org/` を明示して試す。lockfile は書き換えない（AGENTS.md「依存解決と npm ミラー」）
- 落とし穴: Dependabot の npm 更新 PR は lockfile の `resolved` を公式 registry に書き換える可能性が高く、ミラー継続方針とぶつかる。まず `github-actions` だけを有効にし、npm は「security updates のみ」か「見送り」を判断して PBI に記録する
- Actions は全て SHA 固定 + `# vN` コメントの書式。Dependabot はこの書式を更新できる

## 274 release の build / submit 分離（278 と同時に）

- 対象: `.github/workflows/release.yml`。構造は `tests/build/release-workflow.build.ts` が検査しているので、job 分割に合わせて test を先に直す（TDD: 期待する job 構成を先に書いて赤にする）
- 現状: 1 job の中で `npm ci --ignore-scripts` → `npx wxt prepare` → `make check` → `make zip` / `make zip-firefox` → `npx wxt submit`（secrets は submit step の env のみ）→ `gh release create`
- 落とし穴: submit job で `npm ci` をすると依存コードが資格情報のある job で動き、分離の意味が薄れる。`wxt submit` の実体は `publish-browser-extension`。submit job では作業ディレクトリを分け、固定版の `publish-browser-extension` だけを `--ignore-scripts` で入れて直接呼ぶ案を第一候補にする（CLI 引数と env 名は同パッケージの README で確認）
- 受け渡しは `actions/upload-artifact` / `download-artifact`（SHA 固定）。build job で `sha256sum dist/*.zip > SHA256SUMS` を作り、submit job で `sha256sum -c` する。これが 278 の SHA256SUMS をそのまま兼ねる
- 278 の来歴証明は build job に `actions/attest-build-provenance`（SHA 固定）、権限 `id-token: write` と `attestations: write` は build job にだけ付ける
- 検証はドライラン用のタグを使う。本番タグ `v*` はストア提出が走るので打たない

## 282 リリースゲート

- PR 順序は台帳 `pbi/00-INDEX.md` の 272 / 273 の記述どおり（adachi → role → emergency → user-docs-reorg → ga-readiness）。一直線なので最上位ブランチの PR 1 本にまとめるかはユーザー判断
- バージョンは `package.json` の `version`（現在 0.1.39）。`release.yml` はタグと package.json の一致を検査する
- ローカルタグ `pre01-0.1.40` が 74e3d89 にある（push していない）
- ゲート一覧と semver 方針の置き場所は `docs/release.md`

## 276 再スキャン

- 前回結果: `JushoAI_VULNHUNT_RESULTS_2026-10-10-051858/`、`JushoAI_VULNHUNT_RESULTS_2026-10-23-222746/`（sources zip から除外済み。`wxt.config.ts` の `excludeSources`）
- 使えるスキル: `vulnhunt`（全体スキャン）と `vulnhunt-fix-verify`（前回指摘の判定）、または `claude-security`
- 282 の統合後の main が対象。重点対象は PBI 本文の受け入れ基準 1 行目

## 283 保存形式の互換性

- 読み込み境界: `src/storage.ts` の `migrateData`（195 行付近）と `LegacyStoredData`、`kv-store.ts` の spec の `parse`
- JSON エクスポート / インポート: `src/transfer.ts` と `src/entrypoints/options/transfer-section.ts`
- 過去版の fixture は架空の値で作る。過去版の形は `git show v0.1.20:src/storage.ts` などで型を確認できる

## 280 脅威モデル

- 事実: プロファイル・住所は `chrome.storage.local` に平文。API キーのみ `src/ai/secret-store.ts` の AES-GCM エンベロープ。監査ログ `src/ai/audit-log.ts` は送信内容と応答を 7 日保持
- サイトは日英の H2 数が一致しないとビルドが落ちる。節を足すときは ja / en を同時に

## 284 / 285 / 286

- 284: 設定ページのエクスポートは `src/entrypoints/options/transfer-section.ts`。options の E2E は `tests/e2e/`
- 285: 既存の宣言は `pbi/2026-10-31-00-backlog-next-cycle.md`。ダイアログの a11y は PBI-237（アーカイブ済み）で直した経緯がある
- 286: `src/core/zip-dict.ts` は seed。生成スクリプトは `scripts/` に置く。content script のバンドルに入るのでサイズ予算を先に決める
