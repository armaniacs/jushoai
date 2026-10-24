# PBI: 学習状態の読み出し束を1つの module に寄せる

## 背景

入口ごとに学習状態の読み出し束を手組みしている:

- `src/entrypoints/content.ts:228+239-241`（`run()` ― loadData+loadLastUsed+loadApprovals+loadAssignments+loadMappings の5キー4モジュール）
- `:182-183`（`fillOne` ― 3キー）

`chrome.storage.local.get` はキー配列を1回で受けられるが、ストアの seam が1キー1読みの shallow なため、N回の IPC と「そのフローが何を要するか」の組み立てが各入口に散らばる。PBI-128→141→138 の流れで新ストアが1つ増えるたびに run()・fillOne・options の全入口を編集した実績があり、次の学習状態ストアも同じ波及をする。

## ユーザーストーリー

開発者として、ストア層の背後にバッチ読み（1回の get([keys...])）を置き、フロー単位の状態束を1つの module で返したい、なぜなら「そのフローが何を要するか」の組み立てが各入口に散らばり、次のストア追加が全入口に波及するため。

## 優先度

- 順位: 10位 / 10件
- RICEスコア: 3.3（Reach=2 / Impact=0.5 / Confidence=50% / Effort=0.15人月）
- 根拠: 束の組み立てが1箇所に集中し（locality）、次のストア追加が全入口に波及しなくなる（leverage）。ただし IPC 削減は副次的（実害は小さく、本質は波及の排除）で価値の確信度が低い。候補153（store module 統合）と同じ面に触るため直列159（153の後に実施）。
- 対象: src/entrypoints/content.ts:182-183,228,239-241、store 層（候補153の成果物の背後）

## BDD受け入れシナリオ

```gherkin
Scenario: フロー単位の状態束が1回の get で返る
  Given バッチ読みを背後に置いた loader がある
  When run() と fillOne が状態を要する
  Then フロー単位の束が1つの module から返り、入口ごとの手組みが消えている

Scenario: 次のストア追加が入口に波及しない
  Given フロー単位の loader に集中している
  When 新しい学習状態ストアを足す
  Then loader の1点変更で済み、run()・fillOne・options の全入口編集が不要になる
```

## 受け入れ基準

- [x] バッチ読み（1回の get([keys...])）がストア層の背後に存在する
- [x] run() と fillOne がフロー単位の1つの module から状態束を受け取っている
- [x] 既存テストが緑維持

## テスト戦略

- 単体: loader がフロー単位の束を返すことを確認する
- 回帰: content.ts 系の既存テスト一式を緑維持で確認する

## 見積もり

- 0.15人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
