# PBI: isRecord 5 重定義を共有ガードに統合する

## ユーザーストーリー
parse 境界を触る保守者として、「unknown を Record に狭める」ガードの意味論が 1 箇所で定義されていてほしい、なぜなら 5 ファイルにバイト単位で同一の 2 行定義が散在し、将来この緩め方 (配列を許すか、prototype 汚染をどう見るか) を変えるときに 5 箇所の同時更新が必要になるから

## 優先度
- 順位: 1 / 6
- RICE スコア: 95 (Reach=5 / Impact=1 / Confidence=95% / Effort=0.05人週)
- 根拠: 2026-11-21 DRY/KISS 調査で確認した唯一の「バイト単位の同一定義」重複。機械的な置換で完了し、parse 境界の意味論を単一所有にできる

## 出どころ
- DRY/KISS 調査 2026-11-21 (D1)。ラウンド台帳 `pbi/2026-11-21-01-backlog-drykiss-round.md`
- 現状確認 (2026-11-21): src/messages.ts:103 / src/ai/settings.ts:7 / src/ai/settings-store.ts:17 / src/ai/audit-log.ts:168 / src/ai/first-dial.ts:27 — 5 つとも `typeof v === 'object' && v !== null && !Array.isArray(v)` の完全一致

## ビジネス価値
- 「Record とは何か」の定義が 1 箇所になり、parse 境界の変更が 1 ファイルで完結する。測定: `grep -c "isRecord = " src/` が 0 件 (共有定義のみ)

## BDD受け入れシナリオ

```gherkin
Scenario: ガードの意味論が 1 箇所で定義される
  Given 共有ガード (例: isRecordValue) が core に 1 個だけ存在する
  When  5 ファイルの parse 境界を読む
  Then  すべてが共有ガードを import しており、ローカル定義は存在しない

Scenario: 配列と null を弾く挙動は不変である
  Given 共有ガードに置換前後で同じ入力を与える
  When  オブジェクト・配列・null・プリミティブを渡す
  Then  判定結果は置換前と同一である (配列は弾かれ、null は弾かれ、平オブジェクトのみ通る)
```

## 受け入れ基準
- [ ] core に共有ガードが 1 個追加されている (例: src/core/types.ts の `isRecordValue`。名前は既存 `isRecord` ローカル使用との衝突を避ける)
- [ ] 5 ファイルのローカル定義が削除され、import へ置換されている
- [ ] 挙動不変 (focused vitest: tests/messages.test.ts・tests/ai 配下の関連テストが緑)
- [ ] `make check` 緑

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 追加なし (挙動不変)

### 統合テスト
- 既存の parse 系テスト (messages codec・settings・audit-log・first-dial) が緑

### 単体テスト
- 共有ガードの境界 4 件 (平オブジェクト ✓ / 配列 ✗ / null ✗ / プリミティブ ✗) を 1 describe で追加

## 実装アプローチ
- **Outside-In**: 消費側 (5 ファイル) の import 形を先に決め、共有ガードを core に置く
- **Red-Green-Refactor**: ガード単体テスト RED → 実装 → 5 箇所置換 → GREEN
- **リファクタリング**: 置換は 1 ファイルずつ typecheck で確認

## 見積もり
0.05人週（要チームでの見積もり）

## 技術的考慮事項
- 依存関係: なし (単独着手可)
- テスタビリティ: 純粋関数
- 非機能要件: 挙動不変 (型ガードの置換のみ)

## 実装者向け注記

### 現状コードの確認
（2026-11-21 作成時に現存確認済み。着手時に再確認すること）
```bash
grep -rn "const isRecord = " src/ --include="*.ts"
```

### 実装手順
1. src/core/types.ts に `export function isRecordValue(v: unknown): v is Record<string, unknown>` を追加 (既存 `isRecord` 名との衝突を避けるため Value 接尾)
2. 5 ファイルのローカル定義を削除し import に置換。各ファイル内の呼び出し箇所が多い場合は `const isRecord = isRecordValue;` のローカル別名 1 行を許容 (呼び出し面の diff を最小化)
3. 共有ガードの単体テスト 4 件を追加
4. make check

### 落とし穴
- src/ai/settings.ts の isRecord は normalize 系の呼び出しが密 — 別名 1 行方式なら diff が import 1 行 + 定義削除 2 行に収まる
- verbatimModuleSyntax が有効のため型 import に `type` マーカーが要る場合がある (ガードは値 export なので無関係)
- core/types.ts が肥大化していたら薄い core/guards.ts を選んでもよい (報告に記録)

## Definition of Done
- [x] 全 BDD シナリオが自動テストとして実装されパスする (ガード境界 4 件 + 既存 parse 系 pin)
- [x] テストカバレッジが基準を満たす (既存網 + ガード単体)
- [ ] コードレビュー完了（GitHub PR での approve を必須とする）
- [x] リファクタリング完了（グリーン後・5 箇所のローカル定義除去まで）
- [x] ロールバック手段の検討（挙動不変。revert で完結）
- [x] ドキュメント更新済み（本 PBI の実装記録）
