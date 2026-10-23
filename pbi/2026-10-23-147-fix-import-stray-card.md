# PBI: 取り込み失敗時に未使用の新規カードを残さない（ロールバック）

## ユーザーストーリー
既存プロファイルを持つ人として、取り込める項目がなかったときに空の新規カードが残らないようにしてほしい、なぜなら残ったカードが保存時に「姓を入力してください」等の無関係なエラーを出し、混乱するから

## 優先度
- 順位: 3 / 5
- RICEスコア: 1280（Reach=80 / Impact=1 / Confidence=80% / Effort=0.05人週）
- 根拠: 設定ページの取り込み機能で1枚目に値があるユーザーの一部が踏む。保存をブロックする混乱の原因になるが、リカバリは可能（カード削除）

## 現象（レビュー指摘）
- `src/entrypoints/options/main.ts` 274-280行: `applyImportDraft`がstate書き換えの前に呼ばれ、その後に`result.taken === 0`をチェックしている
- 1枚目のカードに値がある場合、新規カード（label「新規」）が`state.profiles`に挿入された後に`taken === 0`でエラー表示される。空の新規カードがメモリに残る

## BDD受け入れシナリオ
Scenario: 何も取り込めなければカードを増やさない
  Given 1枚目のカードに値があり、フォームに取り込める項目がない
  When フォームから取り込むを実行する
  Then エラーが表示され、カードの構成は変わらない

Scenario: 取り込めたときは新規カードに分岐する
  Given 1枚目のカードに値がある
  When 取り込める項目があるフォームで実行する
  Then 新規カードが作られ、取り込んだ値が入る（既存カードは変わらない）

## 受け入れ基準
- [x] `taken === 0`のときはstateを書き換えない（カードの追加・上書きが起きない） → `applyImportToState`の最初の分岐でガード。options側は取り込み→ガード→state更新の順（`import-apply.test.ts`で固定）
- [x] 取り込めた場合は既存の分岐（新規カードへの分岐）を壊さない → blank/forkの分岐は`applyImportToState`に移設し、挙動は同じ（既存カードはfirstのまま残る）
- [x] テスト: `taken === 0`でカードが増えないことの固定テストを追加する → 3件（失敗時はstate無変更・blank先頭カードへの反映・forkの先頭挿入）

## 実装記録（2026-10-23）

- `src/core/import-apply.ts`: `applyImportToState`（純粋関数）を追加。`taken === 0`ガードを最初の分岐に置き、失敗時はカード構成を一切変えない。blank/forkの分岐もここに集約。
- `src/entrypoints/options/main.ts`: 取り込み→ガード→state更新の順に変更。失敗時にstateを変えずにエラー表示で戻る。
- テスト: `tests/core/import-apply.test.ts`（3件追加、計8件）。
- `make check` exit 0。

## テスト戦略
- 統合: `applyImportDraft`の呼び出し順と`taken === 0`の分岐のテスト
- 単体: カード構成が変わらないことの固定テスト

## 見積もり
1（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] `make check`が緑
- [ ] コードレビュー完了
