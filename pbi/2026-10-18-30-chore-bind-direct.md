# PBI: BY_DESIGN_RESULTS.hasの間接化を除去する

## ユーザーストーリー

開発者として、1回しか使わない束縛で読む側が一瞬考える冗長をなくしたい、なぜなら`BY_DESIGN_RESULTS.has.bind(...)`を`byDesign`に束縛するのは1回しか使わず、読む側が「他でも使うのか」と一瞬考えてしまう冗長だから。

## 優先度

- 順位: 30位 / 40件
- RICEスコア: 30（Reach=3 / Impact=0.25 / Confidence=80% / Effort=0.02人月）
- 根拠: 振る舞いを変えない1行の可読性chore。依存なし。
- 出典: checking-team Refactoring Low
- 対象: src/dom/fill-plan.ts:85-86

## BDD受け入れシナリオ

```gherkin
Scenario: 集計時にBY_DESIGN_RESULTSへ直接問い合わせる
  Given 適用結果の一覧がある
  When 未適用件数を数えるとき
  Then BY_DESIGN_RESULTS.hasで直接判定され、中間の束縛変数を経由しない

Scenario: 集計語彙の単一所有が維持される
  Given 仕様上の除外結果の一覧がある
  When 将来BY_DESIGN_RESULTSの要素が増減するとき
  Then 判定箇所はBY_DESIGN_RESULTSだけを見ればよく、集計語彙の所有は分散しない
```

## 受け入れ基準

- [x] `byDesign`の中間束縛がなく`BY_DESIGN_RESULTS.has(...)`で直接判定されること
- [x] 集計結果（filled・unapplied・total・byResult）の値が変わらないこと
- [x] 変更範囲が対象コード（fill-plan.tsのsummarizeFillOutcomes周辺）に収まる

## テスト戦略

- 単体: 除外結果・それ以外の結果が混在する一覧で集計値が不変であることを確認する
- 回帰: 既存のfill-plan関連テストが緑維持であることを確認する

## 見積もり

- 0.02人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] `make check` が通る（2026-10-18最終検証でEXIT:0を確認。作成時の一過性失敗は解消済み）
