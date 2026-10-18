# PBI: resolveKana の戻り値契約を統一する

## ユーザーストーリー

開発者として、`resolveKana` の戻り値契約（`void` に寄せるか戻り値を受けるかに統一）を明確にしてほしい。なぜなら現状は in-place 更新なのに純粋関数風の戻り値を持ち、`resolveKana(items);` と書くと何も起きていないように誤読・誤って書き換えられる恐れがあるから。

### 現状の事実（着手前確認済み）

- `src/core/kana.ts:85` — `export function resolveKana(items: Item[]): Item[]` はループ内で `item.cls.category = target` / `item.cls.kanaKind = ...` と in-place 更新し、最後に `return items` を返す（破壊的更新＋戻り値ありの二重契約）。
- `src/core/analyze.ts:48` — 呼び出し側は `resolveKana(items);` と戻り値を捨てている。
- `plans/2026-10-15-2247-review-1014z.md:69` — 「FillOutcome 破棄・resolveKana の in-place/戻り値不整合（DX。別PBI候補）」として記録。現状バグではなく優先度は低い。
- 既存の契約ロック: `tests/core/kana-blind-contract.test.ts`（4件）が緑であることが制約。

## 優先度

- 順位: 10位 / 12件
- RICE スコア: 33（Reach=5 / Impact=0.25 / Confidence=80% / Effort=0.03人月）
- 根拠: 可読性のみで緊急性なし。依存なし。振る舞い変更を伴わないため低優先度でよい。

## BDD受け入れシナリオ

```gherkin
Scenario: 戻り値を捨ててもカナ解決が適用される（void契約に寄せる場合）
  Given 素名カテゴリ（lastName / firstName / fullName）の分類済みアイテムがある
  When 呼び出し側が resolveKana(items); と戻り値を受けずに呼び出す
  Then 引数のアイテムがカナカテゴリ（*Kana＋kanaKind）に更新されている
  And TypeScript シグネチャ上、戻り値を受けようとするとコンパイル時に気づける（void）

Scenario: 戻り値を受けてカナ解決が適用される（純粋関数風に寄せる場合）
  Given 素名カテゴリの分類済みアイテムがある
  When 呼び出し側が const resolved = resolveKana(items); と戻り値を受けて後続処理に使う
  Then resolved にカナ解決が反映されている
  And 呼び出し側に未使用の戻り値・捨てられた戻り値の混在がない（リントまたは目視で統一確認）

Scenario: 振る舞い不変（いずれの選択でも）
  Given kana-blind-contract の fixture と同じ入力
  When 変更前後で classifyAll / resolveKana を実行する
  Then 出力カテゴリと kanaKind が変更前と同一である
```

## 受け入れ基準

- [x] `resolveKana` のシグネチャがいずれかに統一されている（`void` にして in-place を明示する、または呼び出し側で `const resolved = resolveKana(items)` と受けて使う）
- [x] リポジトリ内の全呼び出し箇所が統一後の契約に従っている（混在がない）
- [x] 振る舞い変更なし（入出力の分類結果・`kanaKind` に差分がない）
- [x] `tests/core/kana-blind-contract.test.ts` が緑を維持する
- [x] `make typecheck` と `make test` が通る

## テスト戦略

### E2Eテスト

- 対象外（UI・注入挙動に変更がないため）。

### 統合テスト

- `tests/core/kana-blind-contract.test.ts`（4件）を回帰ゲートとする。変更前後で失敗がないこと。

### 単体テスト

- 既存の kana 関連単体テストが緑であること。
- （`void` を選んだ場合）戻り値に依存したテスト・アサーションが残っていないこと。
- （戻り値を受ける方を選んだ場合）`analyze.ts` の呼び出しが戻り値を使う形に更新され、捨て呼び出しが残っていないこと。

## 見積もり

- 0.03人月（RICE 算定時の Effort）。ストーリーポイント換算では最小サイズ（1pt 未満の軽微なリファクタ）。
- 振る舞い変更なし・テスト追加なし（既存テストの緑維持のみ）の前提。

## Definition of Done

- [x] 上記受け入れ基準のすべてを満たす
- [x] `tests/core/kana-blind-contract.test.ts` が緑
- [x] `make typecheck` が通る
- [x] 差分が `src/core/kana.ts` と `src/core/analyze.ts` の契約統一に必要な最小限に収まる
- [x] コードレビュー完了
