# PBI: refineWithDrops の3責務を純粋関数に分離する

## ユーザーストーリー
開発者として、分割・除外・住所絞り込みを別々に変えられるようにしたい、なぜなら現在は refineWithDrops の1関数に4処理が同居し、次の条件追加が90行の末尾に足され続ける構造だから

## 優先度
- 順位: 2 / 5
- RICEスコア: 9.3（Reach=4 / Impact=2 / Confidence=70% / Effort=0.6人週）
- 根拠: 分割・絞り条件の追加は分類改善の常連（PBI-09/12型）。順序不変の切出しで確信度高（Effort 0.6 はチーム見積もり前の仮置きで、確定時に再計算する）

## 出どころ
- 発掘報告書 `.superpowers/sdd/backlog-discovery-2026-11-10.md` テーマ2
- `src/core/classify-rules.ts:506-523`（refineWithDrops 本体と at() ナローイング）
- `src/core/classify-rules.ts:529-574`（splitBy と2系統の grouping 分岐）
- `src/core/classify-rules.ts:581-597`（PBI-09 の leftover unknown 化。第3の grouping 走査）
- `src/core/classify-rules.ts:603-615`（PBI-12 の住所絞り込み。第4の走査）
- `src/core/classify-rules.ts:487-504`（SPLIT_POLICIES 表。label/partOrder の2系統が既に分岐）

## BDD受け入れシナリオ
Scenario: 分離しても順序と意味論が変わらない
  Given 分離の前後
  When 分割・除外・絞り込みの各ケースを実行する
  Then 分類結果がすべて同一になる

Scenario: 各責務が単体で検証できる
  Given dropLeftovers と narrowAddress の純粋関数
  When 境界値を与える
  Then mock なしの単体テストで振る舞いが固定される

## 受け入れ基準
- [ ] (c) leftover unknown 化が dropLeftovers、(d) 住所絞り込みが narrowAddress の純粋関数に切り出される
- [ ] (a) 分割retag・(b) drop は splitBy 所有のまま残す
- [ ] refineClassifications は split→leftover→narrow の順序固定の合成になり、意味論は不変
- [ ] 既存テスト・pin 無変更で緑、make check が exit 0

## テスト戦略
- 既存テストが回帰網になる。新規テストは切り出した2関数の単体テストのみ
- 検証: make check

## 見積もり
0.6人週（要チームでの見積もり）

## 技術的考慮事項
- T1（PBI-218）とはファイルが近いが変更理由が別（分割 vs 値解決）のため別 PBI。順序制約はない
- pin 更新が必要になったら意味論変更疑いで停止し、原因を特定してから進める（黙って pin を更新しない）
- 切り出した関数の try/catch・ガードの移設は旧所在から新所在の移設表を PR に添付して明示する（ガードの欠落は欠陥扱い）

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録）
