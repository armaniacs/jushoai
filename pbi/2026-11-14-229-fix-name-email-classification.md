# PBI: name属性のemail読み（ラベルなしemail欄）

## ユーザーストーリー
JushoAI利用者として、ラベルがなくてもメール欄にメールアドレスが入ってほしい、なぜなら kasadera-contact.html の `item_mail_1` のように取りこぼされているから

## ビジネス価値
- unknown削減とfillable増：nameに mail/email を含むラベルなし欄が email 確定になる
- PBI-225（name=company）のemail版。同じ「name完全一致系」パターンの一般化
- 測定方法：対象fixtureの ruleHits増・fillable増。`npm run eval` のpin差分で確認

## BDD受け入れシナリオ

```gherkin
Scenario: ラベルなし・name=item_mail_1 はメールと読む
  Given label空・type=text・name="item_mail_1" の欄がある
  When ルール分類する
  Then email として確定する（LLMに回さない）

Scenario: 確認用メ欄も同じ値が入る
  Given 同一フォームに確認用メール欄がある
  When プランを組み立てる
  Then 既存の確認欄流用ルールと矛盾しない（同じ値が入る）
```

## 受け入れ基準
- [x] `item_mail_1` 型（接尾辞 `_1`・`_2` 等の番号付きを含む）のラベルなし欄が email 確定になる
- [x] 誤読防止：`mail` を含んでもメール欄でないもの（例：mail magazine購読のチェックボックス等の非テキスト欄）は対象外。text/tel/email型のみ
- [x] `npm run eval` が全パスし、pin更新は該当fixture行のみ
- [x] `make check` が緑のまま

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- なし（samples.test.ts の既存ケースが回帰網になる）

### 統合テスト
- `tests/eval/corpus.eval.ts` のpin更新分が一致する

### 単体テスト
- `tests/core/` に `makeMeta` fixture を先に追加して失敗させてから直す
- 番号付き変形（item_mail_2 等）、type=email との重複、非テキスト型の除外

## 見積もり
2 （小規模・PBI-225と同型）

## 技術的考慮事項
- 依存関係: PBI-225のname完全一致ゲートの隣に置く。EXCLUDE・検索窓ゲートとの順序をテストで固定する
- テスタビリティ: makeMeta fixture で再現可能

## 実装者向け注記

### 現状コードの確認（Phase 0済み・2026-11-14）
```bash
grep -n "isCompanyByName\|isSearchBox" src/core/classify-rules.ts
```
- name属性を見るのは検索窓ゲート（PBI-224）と会社名ゲート（PBI-225）のみ。email版は未実装
- email分類は `m.type === 'email'`（0.9）とラベル語彙（413行目の `/e-?mail|メール/`）のみ。ラベルなしtype=textの `*mail*` 名は未対応
- 確認用メール欄（mailconf 等）は既存の流用で同じ値が入る挙動のため、新ゲートはそれと矛盾しないこと

### 実装手順
1. `tests/core/` に失敗するfixtureを先に追加（AGENTS.mdのテスト方針）
2. `src/core/classify-rules.ts` に name ベースのemailゲートを追加（PBI-225と同型：label空条件・完全一致系リスト）
3. 対象名の範囲は `mail`/`email` を含むもの。確認系（conf/confirm/check/kakunin/mcon/reissue 等の派生）は既存流用と矛盾しないことをテストで固定する
4. `npm run eval` でpin差分を確認し、該当fixture行だけ更新する

### 落とし穴
- 部分一致にするとメルマガ購読チェック等の非テキスト欄を読む危険がある。text/tel/email型に限定する
- corpus.ts をスクリプトで触る場合は行末 `',` を考慮し、`grep -c ",," tests/corpus.ts` が0であることを確認する

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] `make check` が緑
- [x] pin更新は該当行のみで、他行の差分なし

## 実装記録
- branch feat/samples-311-new-fields の Batch1 で検証・完成（commit a7547eb、レビュー承認）。単体 tests/core/name-email.test.ts、eval pin は該当行のみ更新。旧227から229へ改番（commit 9d59d9f で表記も統一）
