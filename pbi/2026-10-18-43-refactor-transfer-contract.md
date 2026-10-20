# PBI: cap・timeout・chunk数の転送契約を一元化する

## 背景

送信側の60件/20件上限（`src/llm/background-gateway.ts:12,90-92` の `MAX_CLASSIFY_TOTAL`・`MAX_CLASSIFY_CHUNK`）と受信側の30件backstop（`src/messages.ts:11` の `MAX_CLASSIFY_FIELDS`）、45s/60s/5sタイムアウト（`src/llm/background-gateway.ts:6-11`）がコメントの順序制約だけで結合し、seamを跨いで数値が漏れている。不変条件（chunk < backstop ≦ total、per-chunk ≦ 残budget ≦ total）はどこにも語られず、崩れは実行時reject（`parseRequest` のnull、`sendWithTimeout` のtimeout）でのみ発覚する。

## ユーザーストーリー

開発者として、cap・budget・chunk形状と不変条件を両端がimportする1モジュールにし、ずれを実行時ではなく静的に検出したい、なぜなら現状は数値が両端に分散してコメント順序制約だけで結合し、不変条件の崩れが実行時rejectでしか発覚しないため。

## 優先度

- 順位: 3位 / 7件
- RICEスコア: 100（Reach=10 / Impact=1 / Confidence=80% / Effort=0.08人月）
- 根拠: 転送契約のずれを実行時ではなく静的に検出できるようにする。PBI-42・46と同ファイル群（`background-gateway.ts`・`messages.ts`）のため実装は直列（42→43→46の順で後述）。

## BDD受け入れシナリオ

```gherkin
Scenario: cap・budget・chunk形状が単一モジュールに集約される
  Given 転送契約を変更したい開発者がいる
  When cap・timeout・chunk数の定義を探す
  Then 両端がimportする1モジュールに数値と不変条件があり、そこだけ変えれば送受信両端に反映される

Scenario: 不変条件の崩れが静的に検出される
  Given chunk < backstop ≦ total と per-chunk ≦ 残budget ≦ total の不変条件がある
  When いずれかの数値を不変条件を破る値に変える
  Then 実行時rejectを待たずに型・テスト・ビルドのいずれかで検出される
```

## 受け入れ基準

- [x] cap（total 60件・backstop 30件・chunk 20件）とtimeout（45s/60s/5s）が両端importの単一モジュールに所有されている
- [x] `src/llm/background-gateway.ts:6-15` の定数部が当該モジュールを参照している
- [x] `src/messages.ts:11-12` の上限・backstop部が当該モジュールを参照している
- [x] chunk < backstop ≦ total 等の不変条件がコードまたはテストで表明されている
- [x] 既存テストが緑維持

## テスト戦略

- 単体: 集約モジュールの不変条件（chunk < backstop ≦ total、budget関係）を表明する
- 単体: 送受信両端が同一モジュールの値を参照することを確認する
- 回帰: 既存のgateway/messagesテスト一式を緑維持で確認する

## 見積もり

- 0.08人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
