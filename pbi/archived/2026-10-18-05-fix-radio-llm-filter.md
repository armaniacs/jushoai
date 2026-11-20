# PBI: LLMフォールバック経路にradio限定ポリシーを適用する

## ユーザーストーリー

フォーム利用者として、性別・年代以外のradioをLLMが誤分類して注入しないようにしてほしい、ルール側の方針がLLM経路で迂回されるため。

## 優先度

- 順位: 5位 / 20件
- RICEスコア: 600（Reach=30 / Impact=2 / Confidence=80% / Effort=0.08人月）
- 根拠: 非対象radio誤注入の遮断。PBI-03の後（同analyze.ts）。
- 出典: checking-team Ethics Medium、src/core/analyze.ts:16-25,34

## BDD受け入れシナリオ

```gherkin
Scenario: 非対象radioのLLM誤分類はunknownに落ちる
  Given 性別・年代以外のradio群がLLMフォールバック対象になっている
  When LLMが分類カテゴリを返す
  Then 非性別radio群の結果はunknownに落ち、注入対象にならない

Scenario: 性別・年代radioはLLM経路でも通る
  Given gender・ageDecade相当のradioがLLMフォールバック対象になっている
  When LLMがgenderまたはageDecadeを返す
  Then その分類は維持され、注入対象として残る
```

## 受け入れ基準

- [x] LLMフォールバック結果に後段フィルタがあり、非対象radioがunknownに落ちる
- [x] 性別・年代（gender / ageDecade）のLLM分類は維持される
- [x] 非対象radioのLLM誤分類を再現するfixtureが追加されている
- [x] 既存テストが緑維持（期待値の意味変更は更新する）
- [x] ルール側のradio限定方針とLLM経路の方針に乖離がない

## テスト戦略

- 単体: LLMフォールバック後段フィルタの分岐（対象/非対象radio）を網羅する
- 統合: classifyAll経由でLLM誤分類がunknownに落ちることを確認する
- 回帰: 性別・年代radioの既存分類が維持されることを確認する

## 見積もり

- 0.08人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
