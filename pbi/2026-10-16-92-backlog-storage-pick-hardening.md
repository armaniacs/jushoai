# PBI: storage pick hardening（backlog・将来対応）

## ユーザーストーリー

将来の開発者として、Profile / Address に非 string 型フィールドを追加するときに、
`migrateData` の余剰キー素通しと `coerceStrings` の string 前提でデータを壊さないよう、
着手条件付きの backlog として対策方針を残しておきたい。
現スキーマは全 string のため今回は PBI 化のみとし、実装は行わない。

## 優先度

- 順位: 11位 / 12件
- RICE スコア: 25（Reach=5 / Impact=1 / Confidence=50% / Effort=0.1人月）
- 根拠: 発動条件が将来（非 string 型追加時）であり緊急性が低い。依存なし。
- 着手条件: Profile / Address に boolean / number 等の非 string 型フィールドを追加するとき。
  それまでは着手しない（現状は実害なし）。

## 背景（事実確認済み）

- `plans/2026-10-15-2247-review-1014z.md` の Data Integrity Low 指摘:
  「migrateData の余剰キー素通し・coerceStrings の陳腐化余地（現状維持で合意）」。
- `src/storage.ts:78-84` の `coerceStrings` は `{ ...template, ...(isObject(value) ? value : {}) }` で
  余剰キーをそのまま素通しし、`typeof out[k] !== 'string'` の検査のみで既定値に戻す。
  コメントにも `The key set itself is left alone (whitelisting is out of scope)` と明記。
- 将来対応の候補（今回は実装しない）:
  (a) 将来的に `Object.keys(template)` ではなく許可リスト再構築（pick）に変える。
  (b) boolean / number 型フィールド追加時に `coerceStrings` を見直す旨のコメント1行。
- なぜ必要か: 現状は実害なしだが、型追加の瞬間に正規値が既定値に潰される・
  余剰キーが混入し続ける構造のため、スキーマ拡張時のデータ破損防止に備える。

## BDD受け入れシナリオ

### シナリオ1: 着手条件が来るまでは何も変えない

- Given Profile / Address に非 string 型フィールドが存在しない
- When 本 PBI の着手条件を評価する
- Then 実装（pick 化・コメント追加）は行わず、本 PBI は backlog のまま残る

### シナリオ2: 非 string 型フィールド追加時に pick 化の着手条件が発動する

- Given Profile / Address に boolean / number 型フィールドの追加計画が発生した
- When 開発者が本 PBI を着手する
- Then `coerceStrings` を `Object.keys(template)` への上書きではなく
  許可リスト再構築（pick）に変える対応が開始できる状態になる

### シナリオ3: 型追加時に coerceStrings の見直しが漏れない

- Given 非 string 型フィールドの追加作業が始まった
- When 保存データの読み込み境界（migrate / coerce）を確認する
- Then `coerceStrings` の string 前提（`typeof !== 'string'` で既定値化）を見直し、
  新しい型の正規値が既定値に潰されないことが確認できる

## 受け入れ基準

- [x] 本 PBI が backlog として記録され、着手条件（Profile / Address への非 string 型追加時）が明記されている
- [x] 将来対応の2方針（pick への変更 / `coerceStrings` 見直しコメント1行）が記載されている
- [x] 現スキーマは全 string で実害なしのため「今回は実装しない」ことが明記されている
- [x] 他ファイルの実装変更を含まない（PBI 新規作成のみ）

## テスト戦略

- 今回は実装しないためテストコードの追加・変更はなし。
- 着手時（将来）のテスト方針のみ記載する:
  - 余剰キーを含む保存データを与え、復元結果に余剰キーが残らないことの単体テスト。
  - 非 string 型フィールド（例: boolean / number）に正規値・不正値を与え、
    正規値は保持・不正値は既定値に戻ることの単体テスト。
  - 既存の storage / migration 関連テストの回帰実行。

## 見積もり

- Effort: 0.1人月（RICE の Effort 値。発動時の pick 化＋コメント＋テストを含む目安）
- 今回の作業: PBI 作成のみ（実装コストなし）

## Definition of Done

- [x] `pbi/2026-10-16-92-backlog-storage-pick-hardening.md` が新規作成されている
- [x] 本ファイル以外のファイルに変更がない
- [x] 優先度（11位/12件、RICE 25 と内訳・根拠）が記載されている
- [x] 着手条件（非 string 型追加時）と「今回は実装しない」制約が記載されている
