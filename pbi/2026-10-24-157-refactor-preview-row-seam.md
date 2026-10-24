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

- [ ] renderRow / renderSelect の内部 seam が file 内に存在する
- [ ] abbrev/assist の twin block が1実装に収まっている
- [ ] opt-in 候補が PreviewRow.candidates（または同等の1構造）にまとまっている
- [ ] PreviewOptions / PreviewHandle の interface 重みが減る方向に変わっている
- [ ] textContent のみ・checkbox 挙動がそのまま維持されている
- [ ] 既存テストが緑維持

## テスト戦略

- 単体: renderRow/renderSelect が twin なしで同一振る舞いを出すことを確認する
- 回帰: preview 系の既存テスト一式（preview-abbrev を含む）を緑維持で確認する

## 見積もり

- 0.20人月

## Definition of Done

- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] `make check` が通る
