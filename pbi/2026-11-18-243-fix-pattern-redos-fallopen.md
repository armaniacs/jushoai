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
- 方式は (a)+(b) の両方。(a) だけでも BDD シナリオ 1 は満たせるが、構造 lint が通す低次数の多項式後退（しきい値未満の無上限量記号 × 長い値）を (b) の長さ上限が蓋をする。ただし (b) が効くのは値長軸だけなので、無上限量記号の連結（値が短くても次数で爆発する）は (b) では防げず、lint 側のカウントで捕まえる（下記レビュー修正）。(b) 単独では `(a|aa)+`（8 文字）を検出できずシナリオ 1 を満たせないため、lint が必須だった。
- (a) 構造 lint: `src/core/planner.ts` の `hasCatastrophicShape`。1 パス走査でエスケープと文字クラス本体を不透明扱いし、2 形を危険と判定する。(i) 量記号が「1 スパンを複数通りにマッチし得る group 本体（量記号・`|`・範囲付き有界量記号 `{n,m}`/`{n,}` のいずれかを含む）」の直後に来た。ちょうど `{n}` は 1 通りしかマッチしないため無害。`(a{1,2})+` はフィボナッチ爆発する。(ii) group を要しない pattern 全体の無上限量記号（`*` `+` `{n,}`）の連結。`MAX_UNBOUNDED_QUANTIFIERS = 6` を超えたら危険（通常 pattern は多くて 2-3）。判定は `valuePatternFor` が null を返す形で fall open（検査 skip、ブラウザのネイティブ検査に委ねる）。`(?:` は marker を本体に混ぜない（構文として skip。`(?:X)` ≡ X なので `\d{3}(?:-\d{4})?` を誤検出しない）。名前付き group `(?<name>...)` は marker を本体に含むため、量化されていれば危険側に倒れる。
- (b) 長さ上限: pattern 長 200 超または検査対象値長 1000 超で fall open（`MAX_PATTERN_ATTRIBUTE_LENGTH` / `MAX_PATTERN_CHECK_VALUE_LENGTH`）。corpus の実 pattern 最長は約 70 文字で、通常フォームでは発火しない。
- warn-pattern の PlanStatus 意味論とガイドは変更していない（ドキュメントは PBI-235 の担当）。
- fixture 先行（tests/core/planner.test.ts の `value pattern fall-open (PBI-243)` describe、6 面）: crafted pattern（`(a|aa)+` × 40 個の a + b。実装前は 48 秒でタイムアウト = 凍結の再現、実装後は即時完了・warn なし）、通常 pattern（`\d{3}-\d{4}` で warn 継続）、pattern 長 200 ちょうど（検査続行）/ 201（skip）、値長 1000 ちょうど（検査続行）/ 1001（skip）。RED 3 失敗 → 実装後 6/6 GREEN。
- `make check` 緑。`npm run eval` の pin 311 行は全行不変（pinDiff 実測照合パス。corpus に構造 lint の発火対象 pattern は存在しないことを実測で確認）。

### レビュー修正（2026-11-18 checking-round の指摘対応）
- Important 1（無上限量記号の連結が fall-open から漏れる）: 旧「実装記録」にあった「(b) の長さ上限が連結型の後退を蓋をする」という根拠は誤りだった。爆発は pattern の次数 × 短い値で決まり値長上限では防げない（実測: `a*`×10 + `b` の 21 文字が 30 文字の値で 3 秒時点でも停止せず、次数 6 は 54ms / 次数 8 は 1.7 秒）。`hasCatastrophicShape` に pattern 全体の無上限量記号（`*` `+` `{n,}`。エスケープと文字クラス内のものは数えない）のカウントを追加し、`MAX_UNBOUNDED_QUANTIFIERS = 6` を超えたら fall open。
- Important 2（`(?:` marker の誤検知）: marker の `?` が group 本体に混入し、本体が何であれ量化された非捕捉 group がすべて危険扱いになっていた（`\d{3}(?:-\d{4})?` が warn を失う）。`(?:` を構文として skip し、併せて本体の危険判定で「ちょうど `{n}`」を無害側に修正した。名前付き group は marker を含むまま危険側。
- fixture 追加（同 describe に 3 面、計 9 面）: 無上限量記号 10 連結・group なし（`a*`×10 + `b` に 30 文字の値。RED は凍結そのもので、同期凍結はテストランナーのタイムアウトで中断できないため 3 秒強制 kill の子プロセス probe で RED を確認。実装後は即時完了）、しきい値境界（6 個は検査続行 warn-pattern / 7 個は fall open。RED: 7 個側が現行コードで warn-pattern になり約 1 秒でアサーション失敗）、郵便番号 `(?:` pattern（`\d{3}(?:-\d{4})?`。RED: 現行コードで warn が消え約 1 秒でアサーション失敗 / GREEN: warn-pattern 継続）。
- 検証: planner tests 76/76 GREEN（ファイル全体 574ms、凍結 fixture も即時）、`npm run eval` pin 全行不変、`make check` 緑。
