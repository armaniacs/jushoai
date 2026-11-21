# PBI: store 層を1つの module に寄せ、エラーモードを interface に

## 背景

store 層の4モジュールが同じ形（KEY 定数 → load → parse → upsert（load→mutate→save）→ cap トリム）を手打ちしている:

- `src/approval-store.ts:21-39 と `src/assignment-store.ts:18-37`（upsert+cap が値型以外完全同型）
- `src/mapping-store.ts:22-38 と `src/exclusions-store.ts:7-14`

PBI-148 の既知限界コメントが3ファイルにコピーされており（approval-store.ts:21-25、mapping-store.ts:22-26、assignment-store.ts:18-22）、並行性の知識が3重化。より深い問題は**エラーモードが interface に無い**こと:

- `src/storage.ts:18-50` は PBI-23 で「raw な rejection は呼び出し側が識別も表示もできない」という理由で StorageSaveError/StorageReadError を導入した（呼び出し側 `src/transfer.ts:144-152` が表示に使う）
- 4ストアは chrome.storage の生 rejection をそのまま投げ、content script の全呼び出し箇所が失敗を握りつぶす: `src/entrypoints/content.ts:356`（`void saveLastUsed(sel)`）、`:404-410,419-425`（`void (async () => …)()` IIFE 内で**未処理 rejection**）、`:426-430`（`void upsertAssignment`）

プロファイル保存は型付きエラーで「うるさく」なったのに、学習状態（承認・mapping・assignment）の書き込みは静かに失われる ― 同じ storage seam で基準が割れている。

## ユーザーストーリー

開発者として、key → load/save/upsert/parse/cap を所有する1つの store module（型付きエラーモード内蔵）に寄せ、4ストアを adapter に下げたい、なぜならエラーが握りつぶされて学習状態が静かに失われ、並行性の知識が3重化しているため。

## 優先度

- 順位: 4位 / 10件
- RICEスコア: 32（Reach=8 / Impact=2 / Confidence=50% / Effort=0.25人月）
- 根拠: エラーモードと PBI-148 の並行性対応が1実装に集中し（locality）、4ストア × 8呼び出し箇所 × 4テストファイル（同じ chrome.storage fake を各々組んでいる）で回収される（leverage）。ストアの書き込み失敗は現在「誰も handling しない」のでテスト自体が存在しない ― 統合後は1箇所で検証できる。書き換え面は広め。候補159（バッチ読み）と同じ面に触るため直列153→159。
- 対象: src/approval-store.ts、src/assignment-store.ts、src/mapping-store.ts、src/exclusions-store.ts、src/storage.ts:18-50、src/entrypoints/content.ts:356,404-430

## BDD受け入れシナリオ

```gherkin
Scenario: ストアの書き込み失敗が識別できる
  Given 型付きエラーモード内蔵の store module がある
  When upsert が失敗する
  Then 生 rejection ではなく型付きエラーが返り、呼び出し側が握りつぶさず識別できる

Scenario: 4ストアが同一 module の背後に収まる
  Given key・max・parse を供給する 4つの adapter がある
  When 同一 store module 経由で動作する
  Then load/upsert/cap の振る舞いに既存からの差分がない
```

## 受け入れ基準

- [x] key → load/save/upsert/parse/cap を所有する1つの store module が存在する
- [x] 4ストア（approval/assignment/mapping/exclusions）が key・max・parse を供給する adapter に下がっている
- [x] content script の未処理 rejection（content.ts:356,404-430）が解消されている
- [x] ストアの書き込み失敗のテストが追加されパスする
- [x] 既存テストが緑維持

## テスト戦略

- 単体: store module の書き込み失敗が型付きエラーで返ることを確認する
- 回帰: 4ストアの既存テスト一式を緑維持で確認する

## 見積もり

- 0.25人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
