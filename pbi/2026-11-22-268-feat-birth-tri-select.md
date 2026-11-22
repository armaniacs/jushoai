# PBI: 生年月日の年と月と日 select を割る

## ユーザーストーリー
申込み形を使う人として、生年月日の年と月と日の select に値が入ってほしい、なぜなら 3 欄とも unknown では誕生日が空のまま残るから

## 優先度
- 順位: 3 / 6
- RICEスコア: 280 (Reach=80 / Impact=3 / Confidence=70% / Effort=0.6人週)
- 根拠: 誕生日は必須欄で欠けると申込みが進まない。依存は 266 のみ

## BDD受け入れシナリオ

```gherkin
Scenario: 3 欄が年と月と日に割れる
  Given 生年月日の見出しに年と月と日の select が並ぶ
  When  分類する
  Then  年は birthYear、月は birthMonth、日は birthDay になる

Scenario: 単独の誕生日と混ざらない
  Given 誕生日そのものの欄が別にある
  When  分類する
  Then  そちらは birthday のまま残る
```

## 受け入れ基準
- [x] 足立の `form:j_idt253` 系 3 欄が割れる
- [x] option 文言か並び順のどちらで決めたかが code に残る
- [x] 既存の年月日形の回帰が緑
- [x] `make check` が緑

## テスト戦略
- E2E: 追加なし
- 統合: 足立 fixture で plan まで確認
- 単体: 年月日の語が欄に無い形の fixture を足す

## 見積もり
0.6人週（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み
```

## 出どころ
- `tmp/adachi/` の生年月日 3 select と `classify-vocab-birth.ts`
