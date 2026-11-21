# PBI: run()のプレビュー配線をbindPreviewに抽出する

## ユーザーストーリー

開発者として、entrypointの `run()` からプレビュー配線を抽出したい、なぜなら10項目のenvリテラル＋8コールバック配線は単体テスト不能で、プレビュー仕様変更のたびにこの関数だけが膨らむため（適用順序自体はsession所有済みで触らない）。

## 優先度

- 順位: 4位 / 4件
- RICEスコア: 6.25（Reach=5 / Impact=1 / Confidence=50% / Effort=0.4人月）
- 根拠: 効果は大きいが、テスト不能コードの移動は振る舞いdriftの確信度が低い（Confidence 50%）。E2Eで緑を確認してから閉じる。

## BDD受け入れシナリオ

```gherkin
Scenario: 骨格だけが残る
  Given content.tsのrunを読む開発者がいる
  When 全体像を追う
  Then 分類→束ね→表示の骨格だけが見え、配線の詳細は別モジュールにある

Scenario: 振る舞いが変わらない
  Given 抽出前後のrunがある
  When E2E（fill flow・部分適用・除外）を回す
  Then 全件緑で、適用・再分析・バナー・報告ボタンの動きが同一
```

## 受け入れ基準

- [x] `bindPreview`（名称は同等でも可）が配線（onApply/onReanalyze/onProfileChange/onAddressChange）を持つ別モジュールとして存在すること
- [x] `run()` に残るのは分類→束ね→表示の骨格のみであること
- [x] `preview.close()`＋`openPreview = null` の組の分散が解消されること
- [x] E2E Chrome 7/7 green
- [x] 既存テストが緑維持

## テスト戦略

- E2E: fill flow・部分適用・除外ページの既存シナリオを回帰ゲートにする
- 単体: 抽出後の配線ヘルパーがあれば最小の呼び出しテストを付ける（E2Eが主）
- 回帰: `make check` green

## 見積もり

- 0.4人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
