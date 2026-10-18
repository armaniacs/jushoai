# PBI: パネル初期フォーカスと破棄経路の安全性向上

## ユーザーストーリー

キーボード利用者として、パネルを開いた直後のEnterで意図せずキャンセルを誤爆したくない。また開発者として、描画例外や破棄タイミングでリスナー・タイマーが残り続ける状態をなくしたい。

## 優先度

- 順位: 5位 / 9件
- RICEスコア: 125（Reach=30 / Impact=0.5 / Confidence=50% / Effort=0.06人月）
- 根拠: 誤操作・リークの予防。同一 `panel.ts` のためPBI-95の直後に実施（95→98）。
- 出典: adversarial-code-review 保守担当者指摘 `src/ui/panel.ts:50-52`＋`preview.ts:145-147`（初期focusがDOM順依存で適用に当たらない）、`src/ui/panel.ts:23,37`（render例外でEscape残留・close不能）、`src/ui/button.ts:118-120`（destroyがerrorTimerをclearしない）

## BDD受け入れシナリオ

```gherkin
Scenario: パネルを開くと主操作にフォーカスが当たる
  Given プレビューパネルを開く
  When 初期フォーカス位置を確認する
  Then 主操作（適用系）に当たりキャンセル系には当たらない

Scenario: 描画例外でも後始末が残らない
  Given renderが例外を投げるパネル定義がある
  When 開こうとする
  Then Escape待受け等の残留なくclose不能にならない

Scenario: 破棄後にタイマー由来の再描画が走らない
  Given エラー表示中に破棄するボタンがある
  When 破棄後にタイマー期限が来る
  Then 分離済み要素への再設定は走らない
```

## 受け入れ基準

- [x] 初期フォーカス対象が明示的に固定される（DOM順の偶然に依存しない）
- [x] render例外時にEscape待受けが残留しない
- [x] destroy時にerrorTimerを破棄する
- [x] 見た目・文言に意図しない変更がない

## テスト戦略

- E2E相当: 実ブラウザで開直後のフォーカス位置を確認する
- 統合: 開く→破棄の一連で残留リスナー・タイマーがないことを確認する
- 単体: 例外・空render・破棄タイミングの分岐を網羅する

## 見積もり

- 0.06人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
