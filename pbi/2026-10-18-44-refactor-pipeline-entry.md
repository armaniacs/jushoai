# PBI: text→categoryの入口seamを一段に束ねる

## 背景

欄文言→categoryの理解に norm・KanaNormビュー・DISPATCH順序・wantsKana・resolveKana・refine・englishPage後段の7箇所巡回が必要。各moduleはshallowでdepthは表順序と正規表現の相互作用に宿る。制約: ルール優先の意味論は変えない（seamを動かし意味は動かさない）。

## ユーザーストーリー

開発者として、分類パイプラインを一段の入口seam＋明示的な段階別正規化契約にし、順序バグの居場所を一箇所にしたい、なぜなら現状は入口の理解に7箇所巡回が必要で、順序バグの居場所が分散しているため。

## 優先度

- 順位: 4位 / 7件
- RICEスコア: 80（Reach=20 / Impact=2 / Confidence=50% / Effort=0.25人月）
- 根拠: 順序バグの居場所を一箇所に集約し、段階別正規化契約を明示する。依存なし（実装はanalyze.tsに触れずclassify-rules/kana/literals内に閉じること）。

## BDD受け入れシナリオ

```gherkin
Scenario: 分類入口が一段のseamで辿れる
  Given 欄文言からcategoryへの理解を辿りたい開発者がいる
  When 分類パイプラインの入口seamを開く
  Then norm・KanaNormビュー・DISPATCH順序・wantsKana・resolveKana・refine・englishPage後段の段階別契約が一段で読み取れる

Scenario: ルール優先の意味論が不変である
  Given 既存の分類fixture一式がある
  When 入口seam経由で分類する
  Then 全fixtureのcategory・confidence・source・kanaKindがseam束ね前と同一になる
```

## 受け入れ基準

- [x] text→categoryの入口seamが一段に束ねられ、段階別正規化契約（norm/KanaNormビュー）が明示されている
- [x] DISPATCH順序・wantsKana・resolveKana・refine・englishPage後段の呼び順序がseam一箇所で読める
- [x] ルール優先の意味論が不変である（seamを動かし意味は動かさない）
- [x] 既存テストの期待値が無変更で緑維持である
- [x] 実装がanalyze.tsに触れずclassify-rules/kana/literals内に閉じている

## テスト戦略

- 単体: 入口seamの段階別契約（正規化ビューの使い回し・順序）が一箇所で検証できる分岐を網羅する
- 回帰: 既存のclassify/kana/refineテスト一式を期待値無変更で緑維持確認する
- 振る舞い不変: 全fixtureの分類結果スナップショットを束ね前後で差分ゼロ確認する

## 見積もり

- 0.25人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
