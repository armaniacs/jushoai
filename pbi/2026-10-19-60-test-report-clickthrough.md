# PBI: 報告クリック→URLオープンの結線をテストする

## ユーザーストーリー

開発者として、報告ボタンのクリックが正しいissue URLのオープンに繋がることを自動テストで固定したい、なぜならURL組み立て（単体済み）とボタン発火（単体済み）の間の3行の配線だけが未検証で残っているため。

## 優先度

- 順位: 5位 / 5件
- RICEスコア: 7.5（Reach=3 / Impact=1 / Confidence=50% / Effort=0.2人月）
- 根拠: 残差は小さいが、content-script分離世界のスタブ可否が不確か（Confidence 50%）。不可なら presence-only の現状維持で本PBIは見送り、と判断基準を先に固定する。

## BDD受け入れシナリオ

```gherkin
Scenario: クリックで正しいURLが開かれる
  Given 結果ビューが表示されている
  When 報告ボタンを押す
  Then issues/new のURL（labels=feedback・内訳入り）が開かれる

Scenario: スタブ不可の場合
  Given window.openのスタブが分離世界で効かない
  When 結線テストを試す
  Then 外部遷移を起こさず、ボタン存在のassertに留めて本PBIを見送る
```

## 受け入れ基準

- [x] 報告クリック→URLオープンの結線が自動テストで固定されること、または不可の理由が記録されること
- [x] 外部遷移をテストで起こさないこと
- [x] 既存テストが緑維持

## テスト戦略

- E2E: `window.open` スタブ＋報告クリックでURLを記録し、`issues/new`・labels・内訳含有をassertする
- 回帰: `make check` green

## 見積もり

- 0.2人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする（不可の場合は理由記録で代替）
- [ ] コードレビュー完了
- [x] `make check` が通る
