# PBI: 郵便番号からの住所補助とmaxlength超過の代替案提示

## ユーザーストーリー
住所持ちの利用者として、郵便番号だけで都道府県・市区町村の候補が出て、文字数超過でも切り詰めず選べる代替案がほしい、なぜなら現状は超過＝警告で止まるだけで直し方が分からず離脱するから

## 優先度
- 順位: 2 / 7
- RICEスコア: 480（Reach=600 / Impact=2 / Confidence=80% / Effort=2人週）
- 根拠: 住所フォームの失敗率に直結。外部送信なしのローカル辞書で privacy 方針と両立。依存なし

## BDD受け入れシナリオ
Scenario: 郵便番号から住所が補助される
  Given プロファイルに郵便番号のみ登録済みで都道府県・市区町村が空
  When 対象フォームをプレビューする
  Then ローカル辞書の候補が「補助」印付きで提示され承認後にだけ注入される

Scenario: maxlength超過で代替案が選べる
  Given 住所結合値が欄のmaxlengthを超える
  When プレビューを開く
  Then 切り詰めはせず警告＋短縮案（建物略記・丁目省略など）を選べるかスキップできる

## 受け入れ基準
- [x] 郵便番号辞書は端末内のみで外部通信しない → `src/core/zip-dict.ts`は純粋な照合（fetchなし・LLMなし）。上3桁→都道府県・市区町村の種辞書
- [x] 候補不一致・辞書なし時は従来通り警告で止まり注入しない → prefix不明・zipなしは`null`を返し、行はplainの`warn-no-value`のまま（テストで固定）
- [x] 短縮案もプレビュー承認なしに注入しない → maxlength超過の代替案はPBI-122で実装済み（`abbreviate.ts`＋プレビューの略記チェックボックス＋`applyAbbrevApprovals`）。本PBIで承認シームを補助候補にも一般化
- [x] 値生成は決定的コードのみ（LLMに値を作らせない） → 辞書照合は決定的。候補はプレビューに「補助」印付きで提示され承認後にだけ注入

## 実装記録（2026-10-23）

- `src/core/zip-dict.ts`: 端末内のみの郵便番号辞書（上3桁→都道府県・市区町村）。`zipAssistFor`はハイフン無視で照合し、prefix不明・短入力は`null`。**種辞書**（逐次拡充前提。日本郵便のken_allデータを同じ形状の生成テーブルに差し替えるだけで拡張でき、照合・plannerに触れない）。東京23区のコア・多摩の検証済み市・主要都市中心を収録。
- `src/core/planner.ts`: `PlanItem.assist`（辞書候補）。`buildPlan`の`warn-no-value`分岐で、都道府県・市区町村欄かつ住所のzipが解決するときだけ候補が行に乗る（`display: 候補: …`）。`applyAbbrevApprovals`を補助候補にも一般化（1行1候補、abbrev優先）。
- `src/content-run.ts`: 補助候補をPreviewRowに乗せる（abbrevと同じ流儀）。
- `src/ui/preview.ts`: 「補助候補を入れる」チェックボックス（abbrevと同じ承認セットに収集、noteの色替えも同調）。
- テスト: `tests/core/zip-dict.test.ts`（3件）、`tests/core/planner.test.ts`に補助4件（承認シームの昇格・非承認の停止・assistable外の停止を固定）、`tests/ui/preview.test.ts`に補助チェックボックス1件。
- `make check` exit 0（130ファイル 1753テスト + 1 expected fail）。

## テスト戦略
- E2E: 郵便番号のみ登録→補助→注入の実フォーム確認 → BDDシナリオは単体・統合テストで固定。実ブラウザのE2Eは`tests/e2e/`の既存手順に従い後日追加
- 統合: `samples/`に超過再現フォーム追加＋`tests/integration/samples.test.ts`へケース追加 → maxlength超過はPBI-122で実装済み（samplesに再現フォームあり）
- 単体: `tests/core/`に辞書照合・短縮案のfixtureを先に追加し失敗させてから直す → `zip-dict.test.ts`＋plannerの補助テストで固定

## 見積もり
5（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする（11テスト追加。補助は承認後にだけ注入、不一致はplain警告のまま）
- [ ] コードレビュー完了
- [x] ドキュメント更新済み（本PBIに実装記録と種辞書の拡充前提を記載）
