# PBI: planner のカテゴリ別値解決を表駆動化する

## ユーザーストーリー
開発者として、新しいプロファイル項目を1箇所の行追加で足せるようにしたい、なぜなら現在は valueForBase の switch・ABBREVIATABLE/ASSISTABLE 集合・assistFor の switch・select/radio 分岐の4箇所編集が必要で足し忘れが起きる構造だから

## 優先度
- 順位: 1 / 5
- RICEスコア: 9.4（Reach=5 / Impact=2 / Confidence=75% / Effort=0.8人週）
- 根拠: 会社系・海外住所など項目追加が継続中（PBI-118/119/160実績）。足し忘れ防止の波及は全フォーム利用者。純粋関数の置換で確信度高

## 出どころ
- 発掘報告書 `.superpowers/sdd/backlog-discovery-2026-11-10.md` テーマ1
- `src/core/planner.ts:118-200`（valueForBase の約30分岐 switch）
- `src/core/planner.ts:210-219`（ABBREVIATABLE / ASSISTABLE の2集合）
- `src/core/planner.ts:225-255`（assistFor の第二 switch）
- `src/core/planner.ts:315-321`（applyAbbrevApprovals の候補選択。abbrev 優先の順序がここだけにいる）
- `src/core/planner.ts:354-376`（select/radio 分岐。isAllowedRadioCategory との二重所有）

## BDD受け入れシナリオ
Scenario: 行追加だけで項目が解決される
  Given カテゴリ行テーブルに新規行を追加する
  When 分類・整形・注入を実行する
  Then 値解決・assist・abbrev・select/radio 可否がテーブルどおりに動く

Scenario: 外部挙動が変わらない
  Given 表化の前後
  When make test と make eval を実行する
  Then 既存の期待値・pin がすべて緑のまま変わらない

## 受け入れ基準
- [ ] valueForBase・assistFor・ABBREVIATABLE・ASSISTABLE が行テーブルの読み出しになる
- [ ] select/radio 可否は行に畳むか、現状の2箇所所有をコメントで明示して残す（無理な一本化はしない）
- [ ] 外部挙動不変（make test・make eval の既存 pin 無変更で緑）
- [ ] make check が exit 0

## テスト戦略
- 既存テストが回帰網になる。新規テストは行テーブルの読み出し経路の固定のみ
- 検証: make check（typecheck + 全テスト + 両ブラウザ build + manifest 検査 + lint）

## 見積もり
0.8人週（要チームでの見積もり）

## 技術的考慮事項
- 行の形は既存の `field-catalog.ts`（PBI-158）の流儀に合わせる（category・read・assist・abbreviatable）
- 2箇所所有の解消は YAGNI で判断する。「変わる理由が同じ」場合だけ一本化する

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録）
