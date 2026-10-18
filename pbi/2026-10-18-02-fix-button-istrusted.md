# PBI: フォームボタンにisTrusted検査を付ける

## ユーザーストーリー

開発者として、フォームボタンのclickハンドラにisTrusted検査を入れたい。現状の安全性はclosed Shadow DOMの単一層に依存し将来のmode変更で崩れるため。

## 優先度

- 順位: 2位 / 20件
- RICEスコア: 1000（Reach=100 / Impact=0.25 / Confidence=80% / Effort=0.02人月）
- 根拠: 単一層依存を1行で二重化。依存なし。
- 出典: checking-team Red Team Low、plans/2026-10-18-1430-review-1018a.md

## BDD受け入れシナリオ

```gherkin
Scenario: 信頼できるクリックで解析フローが動く
  Given フォームボタンが表示されている
  When ユーザーがボタンをクリックする
  Then 解析フローが開始される

Scenario: 合成clickでは発火しない
  Given フォームボタンが表示されている
  When 合成イベントでclickを発火させる
  Then 解析フローは開始されない
```

## 受け入れ基準

- [x] 両ハンドラ（button / badge）先頭にisTrusted検査がある
- [x] 通常操作（実クリック）で解析フローが動きデグレがない
- [x] 合成clickではハンドラ本体が発火しない
- [x] 既存テストが緑維持

## テスト戦略

- 単体: 信頼/合成イベントでの発火有無の分岐を網羅する
- 統合: ボタン押下→分類→プレビューの一連を確認する
- 回帰: 既存テストで通常操作のデグレがないことを確認する

## 見積もり

- 0.02人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
