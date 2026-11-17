# PBI: pattern 属性 ReDoS の fall-open 化

## ユーザーストーリー
悪意あるページを開く可能性のある利用者として、ページが用意した pattern 属性を拡張が無防備に解釈しないようにしてほしい、なぜなら PBI-210 の pattern 適合警告がページ支配下の pattern 属性を `^(?:...)$` の RegExp にコンパイルして buildPlan 時に `.test()` を実行するため、ネスト量子化を含む crafted pattern で content script のメインスレッドが長時間凍結し得る（トリガはバナー押下のみでプレビュー承認は不要）から

## 優先度
- 順位: 13 / 14
- RICEスコア: 16（Reach=1 / Impact=2 / Confidence=80% / Effort=0.1人週）
- 根拠: 影響は単一タブの UX 凍結にとどまる。ただし「信頼境界の外側から来る正規表現を無防備に解釈する」入力バリデーションの観点で修正推奨

## 出どころ
- checking-team 2026-11-18 ラウンド・Blue Team Leader。`plans/2026-11-18-0530-review-main-v0.1.29.md`
- 場所: src/core/planner.ts:82-93（valuePatternFor の new RegExp）・:100-104、呼び出し planner.ts:515。kana.ts の decodedPattern は文字列検査のみでコンパイルしない（規律の前例）

## BDD受け入れシナリオ
Scenario: 破滅的構造の pattern で検査を飛ばす
  Given ページの pattern 属性がネスト量子化を含む crafted 値（例: `(a|aa)+` 系）である
  When  buildPlan で pattern 適合の判定に到達する
  Then  RegExp 検査をスキップし（fall open）、ページ側のブラウザ妥当性検査に委ねる。タブは凍結しない

Scenario: 通常の pattern は検査が続く
  Given ページの pattern 属性が単純な値（`\d{3}-\d{4}` 等）である
  When  buildPlan で判定する
  Then  PBI-210 どおりの warn-pattern 判定が続く

## 受け入れ基準
- [ ] 破滅的構造（ネスト量子化など）を検出する構造 lint を追加し、該当 pattern は検査をスキップする（fall open。同期 RegExp にタイムアウトは持たせられないため「怪しければ検査しない」）
- [ ] または検査対象値長と pattern 長に上限を設け、超過時は fall open する（(a) と (b) のいずれか、または両方）
- [ ] 境界ケースの fixture を tests/core/ に先に追加して RED から直す
- [ ] `make check` が緑

## 実装手順
- fixture 先行: crafted pattern の fixture で「検査を飛ばす」挙動を固定する
- 構造 lint（ネスト量子化の検出）または長さ上限を実装する
- PBI-210 の実装記録と既存 warn-pattern テストが回帰網であることを確認する

## テスト戦略
- fixture 先行: crafted pattern・通常 pattern・長さ上限境界の 3 面
- 検出精度は過剰にしない（false positive で検査を飛ばしすぎても害は小さいが、通常フォームで warn が消えるのは望まない）

## 見積もり
0.1人週（要チームでの見積もり）

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録）
