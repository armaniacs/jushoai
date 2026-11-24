# PBI: 親子 select を順に注入する

## ユーザーストーリー
学校の申込み形を使う人として、小学校の 3 段 select に値が入ってほしい、なぜなら 親を選ばないと子が空のままで手が止まるから

## 優先度
- 順位: 5 / 6
- RICEスコア: 30 (Reach=30 / Impact=2 / Confidence=50% / Effort=1.0人週)
- 根拠: 人物分離の後。JSF の ajax 待ちがあり工数が重い。依存は 266 と 269

## BDD受け入れシナリオ

```gherkin
Scenario: 親から子へ順に入る
  Given 都道府県と市区と学校の 3 段がある
  When  親を入れて子の生成を待つ
  Then  子の option が出て値が選ばれる

Scenario: 子が無い時は止まる
  Given 子の option が出ない
  When  計画を作る
  Then  誤った値を入れず警告に置く
```

## 受け入れ基準
- [ ] 親の change 後に子の生成を待つ流れがある
- [ ] 入力済みの select は上書きしない
- [ ] 一致 option が無い時は警告に置く
- [ ] `make check` が緑

## テスト戦略
- E2E: 実ブラウザでの JSF 連動を手で確認
- 統合: fixture では子の option あり形で plan まで
- 単体: option 照合の表記ゆれ

## 見積もり
1.0人週（要チームでの見積もり）

## Definition of Done
- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み
```
## 出どころ

- `tmp/adachi/` の `shussinTodofukenCd` 系と `mojarra.ab` 連動

## 設計メモ (PBI-273 のなぜなぜ分析 2026-11-23 から引継ぎ)

- 絞り込み2欄 (shussinTodofukenCd / shussinShikuchosonCd) は cascade-filter-own で confident unknown に停泊済み (pin 固定は PBI-273 の fbc007d)。値を入れるなら 出身地=現住所 の仮定を含むため、値源 (プロファイル住所 / 手選択のまま) を本 PBI で明示判断する。転居家族では学校一覧が根幹から違うものになる
- 親の change で mojarra.ab が子の option を生成する。親fill単独でも子の一覧が出る価値はあるが、待ち機構なしでは子と孫は warn-no-option に落ちる
- 都道府県 option には 海外（日本人学校・在外教育施設） と その他（２段目も選択してください） の特殊code (value 48/99) がある。機械照合の対象から手選択に残す判断も含める
- 塾コンボ (hidden select + 検索補助窓) と出身3連動は手選択という案内の要否も本 PBI で判断する (検索補助窓の停泊自体は PBI-273 で実装済み)
