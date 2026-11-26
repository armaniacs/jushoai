# PBI: 依存と Actions の脆弱性を継続監視する

## ユーザーストーリー
保守者として、依存パッケージと GitHub Actions に既知の脆弱性が出たら自動で知りたい、なぜなら正式版はストア経由で自動更新され、古い依存のまま配り続けると利用者全員に影響するから

## 区分
セキュリティ / 1.0 必須

## 優先度
- 順位: 2 / 17
- RICEスコア: 533 (Reach=100 / Impact=2 / Confidence=80% / Effort=0.3人週)
- 根拠: `.github/dependabot.yml` が無く、CI に `npm audit` も無い。Actions は SHA 固定済みなので、更新通知が無いと固定がそのまま陳腐化する。依存なし

## BDD受け入れシナリオ

```gherkin
Scenario: 既知の脆弱性を持つ依存が入ると CI が知らせる
  Given lockfile に高深刻度の advisory を持つ版がある
  When  CI の check job が走る
  Then  監査ステップが失敗し、該当パッケージと advisory が表示される

Scenario: Actions の新しい版が出ると更新 PR が来る
  Given SHA 固定した action に新しい release がある
  When  Dependabot の定期実行が走る
  Then  SHA とバージョンコメントを更新する PR が作られる

Scenario: ミラー固定の lockfile でも監査できる
  Given lockfile の resolved が非公式ミラーを指している
  When  監査ステップを実行する
  Then  advisory の照会は公式 registry に対して行われ、lockfile は書き換わらない
```

## 受け入れ基準
- [x] `.github/dependabot.yml` で `github-actions` と `npm` を週次監視する（npm 側は lockfile のミラー方針と衝突しないか確認し、衝突するなら security updates のみに絞る判断を記録）
- [x] `check.yml` に `npm audit --omit=dev --audit-level=high`（registry は公式を明示）と、dev 依存は警告のみで走る監査ステップがある
- [x] `npm audit signatures` がミラー経由で使えるか検証し、使えない場合は AGENTS.md の依存解決の節に限界として記す
- [x] 例外（受容する advisory）を置く場所と期限付きの書式を決める
- [x] `make check` に組み込むかどうかの判断を記録（オフライン実行を壊さないこと）

## テスト戦略
- E2E: なし
- 統合: 既知 advisory 入りの版を一時的に入れたブランチで CI が赤になることを 1 回確認
- 単体: なし

## 見積もり
0.3人週（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが確認手順として実施済み（シナリオ 1 は Task 3 で lodash 4.17.20 の隔離環境による赤確認。シナリオ 2 は本番実績：Dependabot の Actions 更新 PR #37〜#41 が 2026-11-24 に作成・マージ済み。シナリオ 3 は `npm audit signatures` がミラー経由で成功し、監査ステップは公式 registry 明示）
- [x] コードレビュー完了（Task 3 レビュー Approved。GitHub PR での approve はユーザー作業）
- [x] ドキュメント更新済み（`npm audit signatures` がミラー経由で使えたため AGENTS.md の依存解決の節への限界記載は不要と判断し、触らない。判断は実装記録）

## 出どころ
- 2026-11-24 正式版準備の棚卸し。`.github/dependabot.yml` 不在、`check.yml` に audit なし

## 引継ぎ
- 未着手（2026-11-24）。着手前に `docs/superpowers/plans/2026-11-24-ga-readiness-handoff.md` の該当節を読む（調査済みの事実・落とし穴・検証手順）

## 実装記録（2026-11-24、Task 3）

- Dependabot の npm 監視は version updates を止めて security updates のみにする書式にした（`open-pull-requests-limit: 0` + 週次 schedule）。公式ドキュメントに「version updates を除き security updates だけが必要なら `open-pull-requests-limit` を `0` にする」と明記されており、security updates は limit 0 でも PR が作られる。2026-06-30 の変更で Dependabot は lockfile の resolved から `.npmrc` を推測しなくなり、scope 未設定時は committed `.npmrc`（ミラー指し）を使うため、当面はミラー経由で解決される見込み。ただし更新 PR が resolved を公式に書き換える余地は残るため、version updates は無効の側に倒し、npm の PR が来たら resolved がミラーのままかを点検する運用にする。
- 監査ステップは `check` job の末尾に 2 件追加した。本番（`--omit=dev`）は失敗させ、dev（`--omit=prod`）は `continue-on-error: true` で警告のみにした。registry は両方とも公式を明示した。`tests/build/check-workflow.build.ts` に存在・`--omit`・`--audit-level=high`・公式 registry・lockfile 不変（`npm install` 系を含まない）の検査を足した。
- audit 検証結果：本番監査は緑（`found 0 vulnerabilities`、exit 0）。赤の確認は別の一時ディレクトリで lodash 4.17.20 入りの package.json を作り、同形のコマンド（`--omit=dev --audit-level=high` + 公式 registry）が exit 1 で `1 high severity vulnerability` を出すことを確認した。検証後に一時ディレクトリは削除し、lockfile は無変更（`git status` で確認）。
- `npm audit signatures` はミラー経由で使えた（489 件の署名検証と 102 件の attestation を確認、exit 0）。TUF 鍵の取得失敗の警告が出るがミラーからの直接取得に切り替わり成功するため、AGENTS.md は触らない。
- 例外の置き場所と書式は `.github/npm-audit-exceptions.md` に定めた（受容の表：package / advisory / 受容理由 / 期限 / 再評価手順。期限切れの行は受容を無効として扱い、監査を赤にする仕組みではない旨を明記）。今回は登録なし（記入例のみ）。
- `make check` には組み込まない。audit は公式 registry への通信が必須で、Makefile 側に入れると `make check` のオフライン実行が壊れるため。監査は `check.yml` の独立ステップに留める。
- 残るユーザー作業は「引継ぎ」節に記載する。

## 引継ぎ（2026-11-24、Task 3 から）

- ~~Dependabot の初回実行で `github-actions` の更新 PR と `npm` の security 更新 PR が想定どおりに来るかを確認する。~~ 完了（2026-11-27 確認）: `github-actions` の更新 PR が #37〜#41 の 5 件作成・マージ済み（本番実績）。npm は security 更新の対象 advisory が無いため PR なし（`open-pull-requests-limit: 0` の設計どおり）。
- 継続運用: npm の更新 PR が来たら lockfile の resolved がミラー（`https://npm.flatt.tech/`）のままかを点検し、公式に書き換わっていたら取り込まず方針を再検討する。
