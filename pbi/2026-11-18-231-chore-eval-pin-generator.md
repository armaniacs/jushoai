# PBI: pin 表更新の機械化（make eval-pin）

## ユーザーストーリー
samples corpus の pin を更新する開発者として、`make eval` の出力から pin 表の行を機械的に再生成したい、なぜなら reportLine の列順（7 項目）と PIN_TABLE の p() 引数（5 項目・別順）が食い違っており、311 行表への手写しは列の入れ間違いがテストでしか検出されず、修正ループが長くなるから

## 優先度
- 順位: 1 / 14
- RICEスコア: 95（Reach=10 / Impact=0.5 / Confidence=95% / Effort=0.05人週）
- 根拠: corpus を更新する開発者全員が毎回踏む手順の機械化。pinDiff が fixture 名でずれを名指しするため「壊れて分からない」ことはないが、更新コストだけが残る

## 出どころ
- checking-team 2026-11-18 ラウンド・DX Advocate。`plans/2026-11-18-0530-review-main-v0.1.29.md`
- 場所: tests/eval/corpus.eval.ts:34-337（PIN_TABLE）、src/eval/metrics.ts:61-63（reportLine は `fields/ruleHits/llmFallbacks/unknowns/refineChanged/refineDropped/fillable` の別順）

## BDD受け入れシナリオ
Scenario: pin 行が機械生成される
  Given 分類ルールを変更して `make eval` の pin 差分が出ている
  When  開発者が `make eval-pin` を実行する
  Then  変更のあった fixture の `'<fixture名>': p(...)` 行が stdout に出力され、そのまま PIN_TABLE に貼り付けられる

Scenario: 生成行が pin 照合を通る
  Given 生成された行を PIN_TABLE に置き換えた
  When  `npx vitest run tests/eval/corpus.eval.ts` を実行する
  Then  pin 照合が緑になる（列の入れ間違いが構造的に起きない）

## 受け入れ基準
- [x] `make eval-pin`（または同等の npm script）が、pin 差分のある fixture の行を p() 形式で stdout に再生成する
- [x] 生成ロジックは metrics の集計結果から直接 p() 引数を組み立て、reportLine の文字列を解析しない（列順の二重管理を残さない）
- [x] 既存の pinDiff 失敗メッセージに `make eval-pin` の案内を 1 行足す
- [x] `make check` が緑

## 実装手順
- src/eval/metrics.ts（または tests/eval/）に「集計 rows → p() 行」の整形関数を追加する
- Makefile に `eval-pin` ターゲットを足し、pin 差分 fixture 名を引数に取れる形にする
- pinDiff の失敗メッセージに案内 1 行を追加する

## テスト戦略
- 整形関数の単体テストを tests/eval/ に追加（rows → p() 行の対応を固定）
- 意図的に pin を崩した状態で `make eval-pin` の出力が正しい行になることを手動確認

## 見積もり
0.05人週（要チームでの見積もり）

## Definition of Done
- [x] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み（本 PBI に実装記録）

## 実装記録

- `src/eval/metrics.ts` に `PinRow`・`p()`・`pinLine()` を追加。`p()` と `PinRow` は tests/eval/corpus.eval.ts から移動し、pin 行の引数順（ruleHits, llmFallbacks, fillable, refineChanged, refineDropped）の定義を 1 箇所にした。`pinLine` は metrics オブジェクトの名前付きフィールドから `p()` を通じて行を組み立て、reportLine の文字列は解析しない
- `tests/eval/pin.eval.ts` を新設。環境変数 `EVAL_PIN_FIXTURES`（空白/カンマ区切りの fixture 名）で絞り込み、空なら全 fixture の行を出力する。行は `process.stdout.write` で stdout にそのまま出す（vitest の console 収集を迂回し、貼り付け可能な形を保つ）。corpus にない fixture 名はテスト失敗で名指しする
- `package.json` に `eval-pin` スクリプト、Makefile に `eval-pin` ターゲット（`FIXTURE=` 変数で絞り込み）を追加。`.PHONY` を更新
- tests/eval/corpus.eval.ts は pinDiff 失敗メッセージ（expect の文言）に `make eval-pin` の案内 1 行を足したのみ。PIN_TABLE の行は 1 行も変更していない
- テスト: tests/eval/metrics.test.ts に `pinLine` の単体テスト 2 件（p() 引数順を異なる 5 値で固定、全ゼロ行と unknowns/total 非載せを固定）。TDD で先にテストを追加し RED（`pinLine is not a function` で 2 件失敗）を確認してから実装して GREEN
- 手動確認: `contact.html` の pin を意図的に崩すと eval が `contact.html: ruleHits pin=10 実測=11` と fixture 名付きで失敗し、失敗メッセージに案内 1 行が載る。`make eval-pin FIXTURE=contact.html` は正しい行 `'contact.html': p(11, 0, 6, 0, 0),` を出力し（元の表の行と一致）、行を戻せば pin 照合が緑になることを確認
- `make check` 緑（typecheck + 全テスト + 両ブラウザ build + manifest 検査 + web-ext lint）
