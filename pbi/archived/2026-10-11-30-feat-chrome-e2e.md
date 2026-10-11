# PBI: Chrome の実ブラウザ E2E を追加する

状態: 未着手（E2E fill flow の Firefox 失敗の事後検証から起票。同意ゲートの host 選択バグはブラウザ非依存で Chrome でも失敗していた）
起票日: 2026-10-11

## ユーザーストーリー

保守担当者として、Chrome でも分割フォームの入力フローが実ブラウザで検証されてほしい。なぜなら、同意ゲートのような注入経路の変更はブラウザを問わず壊れ、Firefox の E2E だけでは Chrome の回帰を見逃すから。

## 優先度

- 順位: 1 / 全候補 2 件
- RICEスコア: 60（Reach=100 / Impact=1.5 / Confidence=80% / Effort=2）
- 根拠: Chrome は主要利用ブラウザ。CDP 経由の拡張 ID 解決が要り Effort=2。Edge と同一ファイルのため直列に実施し、本 PBI を先にする

## BDD受け入れシナリオ

```gherkin
Scenario: Chrome で分割フォームに入力できる
  Given Chrome に拡張機能を読み込ませている
  When  ボタン→プレビュー→適用の順に操作する
  Then  欄に値が注入される

Scenario: Chrome で上書き・maxlength 保護が働く
  Given 入力済み・maxlength 付きの欄がある
  When  適用する
  Then  上書きせず切り詰めず警告して注入しない
```

## 受け入れ基準

- [x] `tests/e2e/chrome.e2e.ts` が Firefox と同等の 3 ケースを通す
- [x] 拡張 ID の解決を CDP（Target.getTargets）で行い、ID を書き写さない
- [x] `make e2e-chrome` で実行できる（既存の `e2e-firefox` とは別ターゲット）
- [x] headless でも headed でも動く（`HEADLESS=1` 対応）
- [x] `make check` が通る

## テスト戦略

- E2E: 実 Chrome＋`--load-extension=dist/chrome-mv3`。Selenium Manager が chromedriver を解決する
- 既存 harness（`startPageServer`・`PROFILE_DATA`・`clickInShadow`）を流用し、ブラウザ固有部だけを分離する

## 見積もり

2pt（要チームでの見積もり）

## Definition of Done

- [x] Chrome の 3 ケースが緑である
- [x] `make check` が通る
- [x] コードレビュー完了
