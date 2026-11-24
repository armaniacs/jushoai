# PBI: Safari（macOS / iOS）向けの配布可否を調べる

## ユーザーストーリー
Mac と iPhone を使う利用者として、Safari でも JushoAI を使いたい、なぜなら iPhone では Safari 以外の拡張がほぼ使えず、日本のスマートフォン利用者の多くが対象外になっているから

## 区分
将来機能 / 1.0 後（調査のみ）

## 優先度
- 順位: 16 / 17
- RICEスコア: 2 (Reach=30 / Impact=2 / Confidence=30% / Effort=8人週)
- 根拠: Reach は大きいが、Xcode でのラップ、App Store 審査、Apple Developer Program の費用、`chrome.*` API 差分の吸収が要り、Confidence が低い。まず調査 PBI として差分と費用を見積もる
- 着手条件: 289 の結果でモバイル需要が確認できたら

## BDD受け入れシナリオ

```gherkin
Scenario: 調査結果で採否を決められる
  Given Safari Web Extension への変換を試した
  When  保守者が調査報告を読む
  Then  動かない API、必要な費用と作業、審査上の論点が一覧になっており、採否を判断できる

Scenario: 採用しない場合も理由が残る
  Given 調査の結果、採用しないと決めた
  When  後で同じ要望が来る
  Then  台帳の判断記録と再開条件を参照できる
```

## 受け入れ基準
- [ ] `xcrun safari-web-extension-converter` で dist から変換し、ビルドが通るか確認
- [ ] `chrome.*` の使用箇所のうち Safari で動かないものを列挙
- [ ] 費用・審査・保守負担を見積もり、採否と再開条件を記録

## テスト戦略
- E2E: なし（調査）
- 統合: なし
- 単体: なし

## 見積もり
調査 1人週、実装は調査結果次第で 8人週程度（要チームでの見積もり）

## Definition of Done
- [ ] 調査報告が作成され、採否が記録されている
- [ ] コードレビュー完了（コード変更がある場合）
- [ ] ドキュメント更新済み

## 出どころ
- 2026-11-24 正式版準備の棚卸し
- 依存: 289
