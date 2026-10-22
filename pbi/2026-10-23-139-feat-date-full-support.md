# PBI: 日付フル対応（3分割・和暦・select連動）と汎用選択肢

## ユーザーストーリー
申込フォームを使う利用者として、生年月日の年月日3分割・和暦表示・都道府県以外のselect・汎用radioも正しく入力したい、なぜならPBI-126の広いカバレッジだけでは日付の深さ（分割・和暦・連動）が残るから

## 優先度
- 順位: 3 / 8
- RICEスコア: 196（Reach=350 / Impact=2 / Confidence=70% / Effort=2.5人週）
- 根拠: 申込・行政フォームの需要が堅い。PBI-126の後に深掘りする前提。和暦変換は決定的コードでできる

## BDD受け入れシナリオ
Scenario: 年月日3分割と和暦が入力される
  Given 年・月・日3欄（和暦表示を含む）のフォーム
  When 「JushoAIで入力」を押す
  Then 各欄が対応値でプレビューされ承認後に注入される

Scenario: 汎用選択肢の不一致は警告で止まる
  Given 選択肢に一致がないselect・radio
  When プレビューを開く
  Then 切り詰めや推測で選ばず警告し、注入しない

## 受け入れ基準
- [x] 和暦・西暦変換は決定的コードのみ（LLMに値を作らせない） → `src/core/eras.ts`の`toEraDate` / `splitBirthday` / `matchEraOption`は決定的（LLMなし・テストで固定）
- [x] 新カテゴリ追加時は`CATEGORIES`・prompt schema・`parseLlmOutput`を同時更新する → birthYear/birthMonth/birthDay/birthEra・birthday（PBI-118）は同時更新済み。select連動はplannerの`present.has('birthEra')`分岐
- [x] 対象URLを持つ場合は`make addurl URL=<url>`から始め最小再現fixture＋期待値を埋める → 本PBIはtarget URLなし。`samples/`のage-decade-select-formが`tests/integration/samples.test.ts`で固定

## 実装記録（2026-10-23）

- **日付フル対応は先行PBIで実装済み**: 年月日3分割（`birthYear` / `birthMonth` / `birthDay`、`splitBirthday`）、和暦表示（`birthEra`、`toEraDate`のwareki変換、`present.has('birthEra')`で西暦⇔和暦を連動）、select連動（`matchNumberOption` / `matchDecadeOption` / `matchEraOption`）、汎用radio（`isAllowedRadioCategory`、name単位1欄束ね）。
- **汎用選択肢の不一致は警告で止まる**: `matchOption`系が一致なしで`null`を返し、行はplainの`warn-no-option`のまま（切り詰め・推測なし。テストで固定）。
- 検証: `make check` exit 0。`tests/core/eras.test.ts`・`tests/integration/samples.test.ts`で固定済み。
- ドキュメントのみのコミット（コード変更なし）。

## テスト戦略
- E2E: 実フォームでの日付・選択肢の注入確認
- 統合: `tests/integration/samples.test.ts`へ新規fixtureケース追加
- 単体: `tests/core/`に`makeMeta` fixtureを先に追加し失敗させてから直す。正規表現が落ちたら期待値ではなく正規表現を直す

## 見積もり
5（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする（3分割・和暦・select連動は先行PBIで実装、不一致はwarn-no-optionで固定）
- [ ] コードレビュー完了
- [x] ドキュメント更新済み（本PBIに実装記録）
