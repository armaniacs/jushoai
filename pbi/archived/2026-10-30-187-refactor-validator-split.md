# PBI: 検証器の責務分担宣言

## ユーザーストーリー
開発者として、空title/description検査の重複を解消したい、なぜならbuild側required検査とvalidator空検査が二重エラーを吐き、文言修正が2箇所要るため

## 優先度
- 順位: 7 / 9
- RICEスコア: 40（Reach=5 / Impact=1 / Confidence=80% / Effort=0.1人月）
- 根拠: エラー文の単一出所化。依存なし

## BDD受け入れシナリオ
Scenario: 空titleが単一エラーになる
  Given 空titleのガイドがある
  When ビルドする
  Then エラーは1箇所から出る

Scenario: import経路が正典のみになる
  Given diffShapeを使う箇所がある
  When 参照する
  Then 正典モジュールから直接参照する

## 受け入れ基準
- [ ] 存在検査と内容空検査の分担が宣言されている
- [ ] 再exportが削除されている
- [ ] テストのimportが正典に移っている

## テスト戦略
- E2E: 対象外
- 統合: `make site` が緑であること
- 単体: fixture単位のテスト

## 見積もり
- 0.1人月

## Definition of Done
- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み
