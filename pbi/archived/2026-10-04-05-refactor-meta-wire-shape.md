# PBI: メタデータ wire 形状の一元化（許可リストの 3 重定義を解消）

## 優先度

| 項目 | 値 |
|---|---|
| 実行順位 | 5 / 6 |
| RICE スコア | 3.5（Reach 7 × Impact 1 × Confidence 1.0 / Effort 2） |
| 根拠 | プライバシー契約（送る 8 項目）の 3 重定義がコードで確定。1 箇所の漏れが送信漏れ（精度低下）か過剰送信（プライバシー後退）になる |
| 依存 | PBI 03 の後（`src/messages.ts` の競合回避）。バッチ 2 で実装 |

## ユーザーストーリー

保守担当者として、クラウドに送る欄メタデータの許可リスト（id・type・name・htmlId・label・placeholder・nearby・maxLength）が 1 箇所に定義されてほしい。項目追加・上限変更が 3 箇所の同時修正を強制され、漏れると送信の過不足が静かに起きるのを防ぎたいから。

## 背景（現状）

クラウドに送る 8 項目（設計書 `docs/superpowers/specs/2026-10-04-cloud-llm-providers-design.md` の「送信するデータ」）が 3 箇所で別々に定義されている:

- `src/llm/background-gateway.ts:50-59` — `toWire`（Content Script が送る側）
- `src/messages.ts:36-58` — `sanitizeField`（background が受け取る側。text 200 文字クランプ・`tag: 'input'` 強制）
- `src/llm/classifier.ts:22-34` — `buildPrompt`（prompt に載せる側。80 文字 clip）

2 画面検証（送信側・受信側）自体は防御の重ね掛けとして正しい。統合するのは項目リストであって、検証の責務ではない。

## BDD 受け入れシナリオ

```gherkin
Scenario: 送る鍵と受け入れる鍵が一致する
  Given Content Script が toWireMeta で欄メタデータを変換する
  When background が parseRequest でその配列を検証する
  Then 送った 8 項目がすべて受け入れられる（parity）

Scenario: 許可リスト外の値は現行どおり通らない
  Given 欄メタデータに value（現在値）・autocomplete・pattern・options が入っている
  When parseRequest が検証する
  Then それらは破棄され、value は空文字・autocomplete は空文字・options は空配列になる（既存挙動の維持）
```

## 受け入れ基準

- [x] 許可リスト（8 項目）が `src/messages.ts` に 1 箇所で定義される（`META_WIRE_KEYS` 仮称 + `MetaWire` 型 + `toWireMeta`）
- [x] `src/llm/background-gateway.ts` の `toWire` が `toWireMeta` に置き換わる
- [x] `src/messages.ts` の `sanitizeField` が `MetaWire` 型を構築し、鍵リストの型リンクが生まれる（項目追加時に sanitizeField がコンパイルエラーになる）
- [x] `src/llm/classifier.ts` の `buildPrompt` が `MetaWire` を消費し、80 文字 clip は prompt 専用に残る
- [x] `sanitizeField` の 200 文字クランプ・`tag: 'input'` 強制は不変（受信側検証の維持）
- [x] プロファイル値・欄の現在値（`value`）・`autocomplete`・`pattern`・`options` が wire に含まれないことをテストで pin
- [x] 既存 `tests/messages.test.ts`・`tests/llm/classifier.test.ts`・`tests/llm/background-gateway.test.ts` が green
- [x] `npx tsc --noEmit` green

## テスト戦略

- `tests/messages.test.ts` に parity テストを追加: `toWireMeta` の出力鍵と `parseRequest` 経由の sanitize 結果鍵が一致すること。`makeMeta`（`tests/helpers.ts`）で fixture を作る。
- fixture 先行: wire のずれは `tests/messages.test.ts` に fixture（value・autocomplete・options 入りの欄）を先に追加して現行の破棄挙動を pin してから統合する。
- 既存テストが無修正で green であることを挙動不変の証拠にする。

## 見積もり

2 ストーリーポイント

## 技術的考慮事項

- 依存関係: PBI 03 の後（messages.ts 競合）
- テスタビリティ: messages.ts・gateway・buildPrompt はすべて純粋関数でモック不要
- 非機能要件: プライバシー契約（8 項目）の単一源。parity テストが契約の自動検証になる

## 実装者向け注記

### 実装手順

1. `src/messages.ts` に定義を追加:
   ```ts
   export const META_WIRE_KEYS = ['id', 'type', 'name', 'htmlId', 'label', 'placeholder', 'nearby', 'maxLength'] as const;
   export type MetaWire = Pick<FieldMeta, (typeof META_WIRE_KEYS)[number]>;
   export function toWireMeta(f: FieldMeta): MetaWire { /* 8 項目を詰める */ }
   ```
2. `src/messages.ts` の `sanitizeField` が `MetaWire` 型のオブジェクトを構築して全文 `FieldMeta` に展開する形に替える（クランプ・強制は不変）
3. `src/llm/background-gateway.ts` のローカル `toWire` を削除し `toWireMeta` を import して使う
4. `src/llm/classifier.ts` の `buildPrompt` を `toWireMeta` → prompt 用 clip（80 文字）の 2 段に替える
5. `tests/messages.test.ts` に parity テスト追加 → `npx vitest run tests/` → `npx tsc --noEmit`

### 落とし穴

- `src/messages.ts` から `src/llm/classifier.ts` へ import を作らない。向きは classifier → messages（gateway がすでに messages を import しているのと同じ向き）
- `sanitizeField` の構築を `META_WIRE_KEYS` の反復で機械化しない。`MetaWire` 型のオブジェクトリテラルで構築すれば、項目追加時にコンパイルエラーで気づける
- `buildPrompt` の clip 対象は文字列鍵のみ（`maxLength` は数値のまま）

## Definition of Done

- [x] 上記受け入れ基準をすべて満たす
- [x] parity テストが green（許可リストの自動検証）
- [x] 既存テストが無修正で green（挙動不変の証拠）
- [x] コミット済み（refactor: 欄メタデータの wire 形状を messages.ts に一元化）
