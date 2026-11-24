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
- [ ] `.github/dependabot.yml` で `github-actions` と `npm` を週次監視する（npm 側は lockfile のミラー方針と衝突しないか確認し、衝突するなら security updates のみに絞る判断を記録）
- [ ] `check.yml` に `npm audit --omit=dev --audit-level=high`（registry は公式を明示）と、dev 依存は警告のみで走る監査ステップがある
- [ ] `npm audit signatures` がミラー経由で使えるか検証し、使えない場合は AGENTS.md の依存解決の節に限界として記す
- [ ] 例外（受容する advisory）を置く場所と期限付きの書式を決める
- [ ] `make check` に組み込むかどうかの判断を記録（オフライン実行を壊さないこと）

## テスト戦略
- E2E: なし
- 統合: 既知 advisory 入りの版を一時的に入れたブランチで CI が赤になることを 1 回確認
- 単体: なし

## 見積もり
0.3人週（要チームでの見積もり）

## Definition of Done
- [ ] 全BDDシナリオが確認手順として実施済み
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（AGENTS.md 依存解決の節）

## 出どころ
- 2026-11-24 正式版準備の棚卸し。`.github/dependabot.yml` 不在、`check.yml` に audit なし

## 引継ぎ
- 未着手（2026-11-24）。着手前に `docs/superpowers/plans/2026-11-24-ga-readiness-handoff.md` の該当節を読む（調査済みの事実・落とし穴・検証手順）
