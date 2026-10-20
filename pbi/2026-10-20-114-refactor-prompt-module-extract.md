# PBI: 共有 prompt 構築を llm/prompt.ts に切り出す

## ユーザーストーリー

開発者として、SYSTEM_PROMPT と buildPrompt・parseLlmOutput を llm/classifier.ts から llm/prompt.ts に切り出したい、なぜなら classifier が「Prompt API ラッパー」と「クラウド経路と共有する prompt 構築」の二役で、CLAUDE.md の「llm/ が Prompt API の薄いラッパー」という記述と実態が乖離しており、新規クラウドプロバイダを追加する保守担当者が prompt 構築の所在を予測できないため。

## 優先度

- 順位: 4位 / 4件
- RICEスコア: 10（Reach=2 / Impact=0.5 / Confidence=80% / Effort=0.08人月）
- 根拠: 境界の名前と実態を一致させる。import 2箇所の書き換えで済むが効果はナビゲーション性で確信度は中。

## BDD受け入れシナリオ

```gherkin
Scenario: prompt 構築が独立モジュールになる
  Given classifier.ts に SYSTEM_PROMPT と buildPrompt・parseLlmOutput がある
  When llm/prompt.ts に切り出す
  Then classifier.ts は Prompt API セッションのラッパーに専念する

Scenario: クラウド経路が prompt.ts から引く
  Given http-classifiers.ts が classifier.ts から prompt 構築を引いている
  When import 元を prompt.ts に変える
  Then 挙動が変わらず、CLAUDE.md の記述と実態が一致する
```

## 受け入れ基準

- [x] src/llm/prompt.ts に SYSTEM_PROMPT・buildPrompt・buildSchema・parseLlmOutput が移ること
- [x] llm/classifier.ts と ai/http-classifiers.ts の import が prompt.ts を向くこと
- [x] CLAUDE.md の llm/ 記述が実態（prompt.ts が prompt 構築と出力解析、classifier.ts が Prompt API ラッパー）と一致すること
- [x] `make check` が通る

## テスト戦略

- 回帰: `make check` green（移動のみで期待値は変えない）

## 見積もり

- 0.08人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
