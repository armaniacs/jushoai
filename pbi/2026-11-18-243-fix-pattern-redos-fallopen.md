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
- [x] 破滅的構造（ネスト量子化など）を検出する構造 lint を追加し、該当 pattern は検査をスキップする（fall open。同期 RegExp にタイムアウトは持たせられないため「怪しければ検査しない」）
- [x] または検査対象値長と pattern 長に上限を設け、超過時は fall open する（(a) と (b) のいずれか、または両方）
- [x] 境界ケースの fixture を tests/core/ に先に追加して RED から直す
- [x] `make check` が緑

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
- [x] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み（本 PBI に実装記録）

## 実装記録
- 方式は (a)+(b) の両方。(a) だけでも BDD シナリオ 1 は満たせるが、構造 lint が見えない多項式時間の後退（長い値 × 中程度に曖昧な pattern）を (b) の長さ上限が蓋をする。(b) 単独では `(a|aa)+`（8 文字）を検出できずシナリオ 1 を満たせないため、lint が必須だった。
- (a) 構造 lint: `src/core/planner.ts` の `hasCatastrophicShape`。1 パス走査でエスケープと文字クラス本体を不透明扱いし、「量記号が、本体に量記号か `|` を含む group の直後に来た」ら危険と判定する。本体の有界量記号（`(a{1,2})+` はフィボナッチ爆発する）も数える。判定は `valuePatternFor` が null を返す形で fall open（検査 skip、ブラウザのネイティブ検査に委ねる）。
- (b) 長さ上限: pattern 長 200 超または検査対象値長 1000 超で fall open（`MAX_PATTERN_ATTRIBUTE_LENGTH` / `MAX_PATTERN_CHECK_VALUE_LENGTH`）。corpus の実 pattern 最長は約 70 文字で、通常フォームでは発火しない。
- warn-pattern の PlanStatus 意味論とガイドは変更していない（ドキュメントは PBI-235 の担当）。
- fixture 先行（tests/core/planner.test.ts の `value pattern fall-open (PBI-243)` describe、6 面）: crafted pattern（`(a|aa)+` × 40 個の a + b。実装前は 48 秒でタイムアウト = 凍結の再現、実装後は即時完了・warn なし）、通常 pattern（`\d{3}-\d{4}` で warn 継続）、pattern 長 200 ちょうど（検査続行）/ 201（skip）、値長 1000 ちょうど（検査続行）/ 1001（skip）。RED 3 失敗 → 実装後 6/6 GREEN。
- `make check` 緑。`npm run eval` の pin 311 行は全行不変（pinDiff 実測照合パス。corpus に構造 lint の発火対象 pattern は存在しないことを実測で確認）。
