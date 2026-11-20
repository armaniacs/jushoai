# PBI: オフライン時に即ルール継続する

## ユーザーストーリー

モバイル利用者として、圏外時に無駄なfetch＋DoH解決で電池を消費しないでほしい、20秒timeoutでLLM失敗→ルール継続になるだけのため。

## 優先度

- 順位: 13位 / 20件
- RICEスコア: 300（Reach=15 / Impact=0.5 / Confidence=80% / Effort=0.02人月）
- 根拠: 圏外時の無駄なfetchとDoH解決による電池消費を避け、即座にルール分類のみで動作を続ける。依存なし。
- 出典: checking-team Edge Medium、src/ai/http-classifiers.ts:9

## BDD受け入れシナリオ

```gherkin
Scenario: オフライン時は即座にルール分類のみで継続する
  Given navigator.onLine===falseの状態である
  When 分類が実行される
  Then fetchもDoH解決も行わず、即座にルール分類のみで継続する

Scenario: オンライン時は従来通り分類する
  Given navigator.onLine===trueの状態である
  When 分類が実行される
  Then 従来通りLLM分類が試行される
```

## 受け入れ基準

- [x] オフライン時はfetch前に早期リターンしルール分類のみで継続する
- [x] 既存の20秒timeout（HTTP_TIMEOUT_MS）の挙動が維持される
- [x] オンライン時の分類挙動に回帰がない
- [x] 既存テストが緑維持

## テスト戦略

- 単体: オフライン時にfetchが呼ばれず空マップで即継続すること、オンライン時に従来通りfetchされることを確認する
- 統合: classifyAll相当でオフライン時のルール継続を確認する
- E2E: 対象外（ネットワーク状態依存のため単体・統合で担保する）

## 見積もり

- 0.02人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る（2026-10-18最終検証でEXIT:0を確認。作成時の一過性失敗は解消済み）
