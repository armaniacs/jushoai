# PBI: 氏名 id の sei と mei の境界をゆるめる

## ユーザーストーリー
申込み形を使う人として、`SSeiKanji` のような欄にも姓と名が入ってほしい、なぜなら 前の `s` で境界に当たらず unknown に落ち、手入力が残るから

## 優先度
- 順位: 2 / 6
- RICEスコア: 320 (Reach=60 / Impact=2 / Confidence=80% / Effort=0.3人週)
- 根拠: fixture の次。氏名は全形の要で波及が広い。依存は 266 のみ

## BDD受け入れシナリオ

```gherkin
Scenario: SSei と SMei が割れる
  Given 児童氏名の姓と名の欄がある
  When  分類する
  Then  姓は lastName 系、名は firstName 系になる

Scenario: 誤爆しない
  Given sensei のような語を含む欄がある
  When  分類する
  Then  氏名に寄らない
```

## 受け入れ基準
- [x] `SSeiKanji` / `SMeiKanji` / `SSeiKana` が氏名系に分類される
- [x] 偽陽性の回帰 test があり `make check` が緑
- [x] カナ帰属が壊れない

## テスト戦略
- E2E: 追加なし
- 統合: 足立 fixture の期待値を更新
- 単体: `tests/core/` に境界の fixture を追加し先に失敗させる

## 見積もり
0.3人週（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み
```

## 出どころ
- `tmp/adachi/` の `form:SSeiKanji` と現行 `LAST` / `FIRST` の境界条件
