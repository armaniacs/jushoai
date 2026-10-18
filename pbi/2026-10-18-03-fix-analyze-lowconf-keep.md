# PBI: 低信頼度ルール結果を破棄せず保持する

## ユーザーストーリー

フォーム利用者として、LLMが使えない時もルール分類の結果をプレビューに出してほしい、現状は信頼度0.6未満がLLMなしだと消失し正当な分割まで不発になるため。

## 優先度

- 順位: 3位 / 20件
- RICEスコア: 800（Reach=50 / Impact=2 / Confidence=80% / Effort=0.10人月）
- 根拠: ルール単独契約の回復。PBI-05の前提。
- 出典: checking-team System Architect Medium plans/2026-10-18-1430-review-1018a.md、src/core/analyze.ts:27-47

## BDD受け入れシナリオ

```gherkin
Scenario: LLMなしでも低信頼度ルール結果が残る
  Given classifierがnullでラベルなしtel欄がある
  When classifyAllで分類する
  Then 信頼度0.5のtel分類が保持されプレビュー対象になる

Scenario: unknownは計画に誤注入されない
  Given 分類結果にunknownが混ざっている
  When buildPlanで計画を作る
  Then unknown欄は除外され誤った値注入が起きない
```

## 受け入れ基準

- [x] classifier=nullでも低信頼度ルール結果（例: ラベルなしtel 0.5）が破棄されず保持される
- [x] `unknown` カテゴリは `buildPlan` で除外され誤注入しない
- [x] 兄弟欄補正（電話3欄→tel1/2/3、郵便番号2欄→zip1/2等）に回帰がない
- [x] tests/core/analyze.test.ts に再現fixtureが追加されている
- [x] 既存テストが緑維持（期待値の意味変更は更新する）

## テスト戦略

- 単体: `classifyAll` の保持分岐・unknown扱い・兄弟欄補正の分岐を網羅する
- 統合: 分類→計画→プレビュー表示の一連でLLMなし経路を確認する
- 回帰: `tests/core/analyze.test.ts` のfixtureで既存の緑を維持する

## 見積もり

- 0.10人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] `make check` が通る
