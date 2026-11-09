# PBI: options の2面 footer 複製を一本化し blank 分岐を型で表す

## ユーザーストーリー
開発者として、設定画面の保存・取込 footer を1箇所で変えられるようにしたい、なぜなら現在はプロファイル面と住所面に同一形が2手書きされ、片面の変更がもう片面に波及しない構造だから

## 優先度
- 順位: 3 / 5
- RICEスコア: 8.0（Reach=2 / Impact=1.5 / Confidence=80% / Effort=0.3人週）
- 根拠: 設定画面のみの到達だが工数小・確実。Quick Win。仕様判断は分離する前提

## 出どころ
- 発掘報告書 `.superpowers/sdd/backlog-discovery-2026-11-10.md` テーマ4
- `src/entrypoints/options/main.ts:161-167`（profile 面 footer）
- `src/entrypoints/options/main.ts:205-210`（address 面 footer。同一形の複製）
- `src/entrypoints/options/main.ts:226-251`（applyTrialSampleTo* の prefecture/label/gender 特例3つ）
- `src/core/import-targets.ts:20-28`（BLANK_KEYS 定義と prefecture divergence 注記）

## BDD受け入れシナリオ
Scenario: footer が一本化される
  Given 両面の footer
  When 文言・disabled 条件を変える
  Then 1関数の変更で両面に反映される

Scenario: blank 判定の分岐が型で読める
  Given trial と import の空判定
  When コードを読む
  Then prefecture を含めるかは引数（includePrefecture）で分かり、コメント考古学が要らない

## 受け入れ基準
- [ ] footer（保存 + 取り込む + 通知）が renderCardFooter 1関数に束ねられる
- [ ] blank 判定は統一せず、分岐を isBlankAddress の引数（includePrefecture）として型で表現する。呼び出し側（trial=true / import=false）が選ぶ
- [ ] prefecture の仕様統一自体は本 PBI の範囲外（別途ユーザー判断の PBI に分離）
- [ ] make check が exit 0

## テスト戦略
- 既存テストが回帰網になる。footer の描画差分は options 系テストで固定する
- 検証: make check

## 見積もり
0.3人週（要チームでの見積もり）

## 技術的考慮事項
- 「分岐の所在をコメントから型に移す」だけに留める。仕様判断（統一するかどうか）は別 PBI
- Quick Win として T1/T2 より先行できる。依存関係はない

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録）
