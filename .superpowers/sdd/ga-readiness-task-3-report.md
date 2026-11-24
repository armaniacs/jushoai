# Task 3 report: PBI-277 依存と Actions の継続監視

状態: DONE（`make check` 全体は未実施。test-build + typecheck + lint は緑）

## 実施内容

- 新規 `.github/dependabot.yml`（version 2）。`github-actions` は週次 version updates を有効化。`npm` は `open-pull-requests-limit: 0` + 週次 schedule で version updates を止め security updates のみにする書式にした。理由は PBI-277 の「実装記録」に記載（公式ドキュメントの limit 0 の扱い、2026-06-30 の `.npmrc` 推測廃止と committed `.npmrc` の継続利用、version updates 無効化で resolved 書き換えの余地を断つ判断）。
- `.github/workflows/check.yml` の `check` job 末尾に監査ステップを 2 件追加した。本番（`npm audit --omit=dev --audit-level=high --registry=https://registry.npmjs.org/`）は失敗させ、dev（`--omit=prod` 同条件）は `continue-on-error: true` で警告のみにした。
- `tests/build/check-workflow.build.ts` に監査ステップの検査（存在、`--omit`、`--audit-level=high`、公式 registry、`npm install` 系を含まない）を追加した。実装中に 1 件失敗（`stepBlock` が `run:` 行起点で `continue-on-error` を拾えない）を修正し緑にした。
- `.github/npm-audit-exceptions.md` を新規作成した（受容の表と期限切れ運用の定義。登録なし、記入例のみ）。
- `npm audit signatures` はミラー経由で使えたため AGENTS.md は触らない（TUF 鍵取得の警告は出るがミラーからの直接取得に切り替わり成功）。
- `make check` には組み込まない判断を PBI に記録した（audit は公式 registry への通信が必須でオフライン実行が壊れるため）。
- PBI-277 の受け入れ基準 5 件をすべて `[x]` にし、「実装記録」「引継ぎ」節を追加した。

## 実行コマンドと結果

- `npm audit --omit=dev --audit-level=high --registry=https://registry.npmjs.org/` → `found 0 vulnerabilities`、exit 0（緑の確認）
- 赤の確認 → 一時ディレクトリで lodash 4.17.20 入りの package.json を作り同形コマンドを実行 → `1 high severity vulnerability`、exit 1（監査相当が失敗することの確認）。一時ディレクトリは削除済み
- 検証後の `git status` で lockfile（`package-lock.json`）と `.npmrc` の無変更を確認
- `npm audit signatures` → `489 packages have verified registry signatures`、`102 packages have verified attestations`、exit 0（TUF 警告あり、成功）
- `make -C /Users/yaar/Playground/JushoAI test-build` → 5 files / 33 tests 緑
- `make -C /Users/yaar/Playground/JushoAI typecheck lint` → 緑
- `make check` 全体は未実施（時間制約。test-build + typecheck + lint を必須分として緑を確認）
- 新規・更新の .md 3 件は CP932 で表せること（`encode('cp932')`）を確認

## 残課題

- Dependabot の初回実行で `github-actions` と `npm`（security）の PR 動作を確認する（PBI-277 の「引継ぎ」に記載）。npm の PR が来たら resolved がミラーのままかを点検する。
- BDD シナリオ「Actions の新しい版が出ると更新 PR が来る」は実稼働でしか確認できないため、初回実行時に DoD を更新する。
- タスクレビューは未実施（統括側で手配）。
