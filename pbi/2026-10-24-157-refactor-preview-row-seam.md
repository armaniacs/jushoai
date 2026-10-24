# PBI: preview.ts の row 描画に内部 seam を切る

## 背景

`src/ui/preview.ts` が PBI ごとに copy-grown しており、row 描画の内部構造が未整理:

- `:283-297`（abbrev checkbox block、PBI-122）と `:300-314`（assist checkbox block、PBI-125 — 同型の約15行を複製）
- `:115-132` と `:134-153`（profile select と address select の twin）
- `:383-439` と `:447-463`（showResult/showUndoResult が title/head/actions 組み立てを重複）
- closure state 7個（`:189-193`、`:233-238`）+ `syncButtons` が8ノードに触れる（`:202-219`）
- `PreviewOptions` 12メンバー（optional callback 3つ）+ `PreviewHandle` 8メンバー

PBI-122（abbrev）→125（assist）→128（synthetic/expand）→138（fix）→132（undo）→143（coverage）と、各 PBI が interface メンバーと row 描画内の bespoke block を1つずつ足してきた。PBI-125 は PBI-122 の block をそのまま写しており、「opt-in 候補の checkbox 行（note の red↔muted 反転、approval set への登録）」という概念が interface に現れず実装に2回出現。`resultMode` の「showResult 後の setRows は黙って無視」（`:250-254`）は convention+guard で守る順序制約で、呼び出し側（bindPreview）が知らねばならない interface の重みが PBI ごとに増え続けている。削除テスト: 行描画の内部 helper を作って削除すれば twin block が2箇所に再出現する。

## ユーザーストーリー

開発者として、preview.ts の file 内に renderRow/renderSelect の内部 seam を切り、opt-in 候補を PreviewRow.candidates にまとめたい、なぜなら次の候補系 PBI が多点変更に触れる構造で、twin block と interface の重みが PBI ごとに増え続けるため。

## 優先度

- 順位: 8位 / 10件
- RICEスコア: 15（Reach=6 / Impact=1 / Confidence=50% / Effort=0.20人月）
- 根拠: 次の候補系 PBI が preview.ts の1点変更になり（locality、PBI-125 は interfaceコメント+PreviewRow+CSS+setRows+abbrevBoxes+syncHasOk の多点に触れた）、`tests/ui/preview-abbrev.test.ts` の twin 検証が1実装のテストに回収される（leverage）。interface はむしろ減らす方向。textContent のみ・checkbox 挙動はそのまま（CLAUDE.md の約束事と矛盾しない構造整理）。hot file のため他 PBI と直列相性確認が必要で確信度50%。依存なし（バッチ1）。
- 対象: src/ui/preview.ts:115-463（file 内整理）、tests/ui/preview-abbrev.test.ts

## BDD受け入れシナリオ

```gherkin
Scenario: opt-in 候補が1つの構造にまとまる
  Given PreviewRow.candidates?: { kind, text }[] の1構造がある
  When abbrev と assist の両方を足す
  Then row 描画は1実装で両方を描き、twin block が消えている

Scenario: select twin が1実装に収まる
  Given renderSelect(caption, options, current, onChange) の内部 seam がある
  When profile select と address select を描く
  Then 同一実装から出力され、振る舞いに差分がない
```

## 受け入れ基準

- [x] renderRow / renderSelect の内部 seam が file 内に存在する
- [x] abbrev/assist の twin block が1実装に収まっている
- [x] opt-in 候補が PreviewRow.candidates（または同等の1構造）にまとまっている
- [x] PreviewOptions / PreviewHandle の interface 重みが減る方向に変わっている
- [x] textContent のみ・checkbox 挙動がそのまま維持されている
- [x] 既存テストが緑維持

## テスト戦略

- 単体: renderRow/renderSelect が twin なしで同一振る舞いを出すことを確認する
- 回帰: preview 系の既存テスト一式（preview-abbrev を含む）を緑維持で確認する

## 見積もり

- 0.20人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] `make check` が通る

## 実装記録（2026-10-24）

- `src/ui/preview.ts`: file 内に内部 seam を切った。`renderRow(row, callbacks)`（モジュールレベル。label/value の grid、AI バッジ、status note、opt-in checkbox、直すボタンの組み立て。twin block の温床を1責務に）と `renderSelect(caption, items, currentId, onChange)`（profile と address の select twin を1実装に。textContent のみ）と `swapToResult(headText, ...rest)` + `doneButton()`（showResult/showUndoResult の title/head/閉じる組み立て）。approval set の収集（`candidateBoxes`）と hasOk 再計算は `RenderRowCallbacks` で setRows 側から注入。
- `PreviewRow.candidates?: { kind, text }[]`: abbrev/assist の文字列2メンバーを1構造にまとめた。kind → checkbox 文言の map（`CANDIDATE_TEXT`）。fieldId は従来どおり候補がある行だけに乗り、fix entry と approval set が同じ presence check を共有する。PreviewRow は 8メンバー → 7メンバー。
- `PreviewHandle` から外部未使用の `setReanalyzing` を削除（busy は reanalyze 経由でのみ動く。唯一の外部利用は preview.test.ts の1件）。8メンバー → 7メンバー。`PreviewOptions` は唯一の呼び出し側（bindPreview）が全 12メンバーを消費するため据え置き（削れるメンバーなし）。
- `src/content-run.ts`: `buildPreviewRows` が candidates を1構造で積む（abbrev → assist の順。`applyAbbrevApprovals` の優先と一致）。
- textContent のみ・checkbox 挙動・resultMode 順序制約（showResult 後の setRows は黙って無視）・Escape/close は変更なし。innerHTML は不使用。
- テスト: `tests/ui/preview-abbrev.test.ts` に1構造の固定2件を追加（両 kind を1 block で描く・どちらの kind でも approval set に乗る）。`tests/ui/preview.test.ts` の busy テスト1件のみ、setReanalyzing を public handle から外す構造変更の根拠で busy の駆動を reanalyze クリック経由に変え、アサーション（aria-busy・live region の内容）はそのまま。
- 検証: `npx vitest run tests/ui/preview-abbrev.test.ts tests/ui/` 16ファイル 159テスト緑 + 変更シームを直接消費する entrypoint テスト3ファイル 18テスト緑 + `npx tsc --noEmit` 0。フルスイート（make check）はこのworktreeでは未実施（PBI の指示どおり preview 系に絞る）。
- なぜなぜ分析: /tmp/whywhy-preview-row-seam.md
