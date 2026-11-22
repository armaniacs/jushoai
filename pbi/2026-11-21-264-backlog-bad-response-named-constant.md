# PBI: 'bad-response' の fold 先既定を名前付き定数にする

## ユーザーストーリー
失敗語彙を読む保守者として、fold 先の既定値が名前付き定数になっていてほしい、なぜなら 'bad-response' リテラルが src 内 19 箇所にあり、「語彙外の文字列を折り畳む既定」という意図が検索で掴めず、既定を変える判断があったときに全箇所を grep で追うことになるから

## 優先度
- 順位: 6 / 6 (backlog)
- RICE スコア: 9 (Reach=1 / Impact=0.5 / Confidence=90% / Effort=0.05人週)
- 根拠: 2026-11-21 DRY/KISS 調査 (D4)。型保護があるため実害は小さい (語彙 union 外のリテラルは typecheck が落とす) — 純粋に可読性・意図の検索可能性の改善。任意扱い

## 出どころ
- DRY/KISS 調査 2026-11-21 (D4)。ラウンド台帳 `pbi/2026-11-21-01-backlog-drykiss-round.md`
- 現状確認 (2026-11-21): `'bad-response'` リテラルが src 内 19 箇所。fold 定義点は src/core/classifier-failures.ts (asClassifyFailure / decodeErrorToClassifyFailure) と src/llm/classify-transport.ts:103 / src/llm/provider-registry.ts (throw 経路) 等に分散

## ビジネス価値
- 「既定への折り畳み」の意図が grep で掴める。測定: fold 定義点の 'bad-response' が名前付き定数に置換され、定義点の検索が 1 箇所で完結

## BDD受け入れシナリオ

```gherkin
Scenario: fold 先既定が名前を持つ
  Given classifier-failures.ts に fold 先既定の名前付き定数が存在する
  When  asClassifyFailure の既定を返す箇所を読む
  Then  リテラルではなく定数を返しており、定数の WHY コメントが意図を説明する

Scenario: 語彙の値集合は不変である
  Given 置換を行う
  When  tests/llm/failure-priority.test.ts と make eval を走らせる
  Then  pin が無変更で緑 (値・順序・優先順は不変)
```

## 受け入れ基準
- [x] classifier-failures.ts に fold 先既定の名前付き定数 (例: `FALLBACK_CLASSIFY_FAILURE = 'bad-response'`) が追加されている (WHY コメント: 語彙外の文字列を折り畳む既定)
- [x] **fold 定義点のみ**置換する (asClassifyFailure / decodeErrorToClassifyFailure / provider-registry の throw 経路 / classify-transport の failureReason)。表示・テスト側のリテラルは型保護があるため置換不要 — 全 19 箇所を機械置換しない
- [x] 挙動不変 (tests/llm/failure-priority.test.ts 緑 + `make eval` 3 passed)
- [x] `make check` 緑

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 追加なし

### 統合テスト
- 既存の失敗語彙 pin (failure-priority / classify-transport mapping pin) が緑

### 単体テスト
- 追加なし (定数化は値不変)

## 実装アプローチ
- **Outside-In**: fold の定義点 (既定を「選ぶ」箇所) から逆算し、定数の置換範囲を決める
- **Red-Green-Refactor**: なし (値不変)
- **リファクタリング**: 定数は語彙 module (classifier-failures.ts) に置き、consumers が import する

## 見積もり
0.05人週（要チームでの見積もり）

## 技術的考慮事項
- 依存関係: なし
- テスタビリティ: 値不変のため既存 pin がそのまま安全網
- 非機能要件: 失敗語彙の wire 運搬は不変

## 実装者向け注記

### 現状コードの確認
（2026-11-21 作成時に現存確認済み。着手時に再確認すること）
```bash
grep -rn "'bad-response'" src/ --include="*.ts" | wc -l
grep -n "bad-response" src/core/classifier-failures.ts
```

### 実装手順
1. 19 箇所を分類する: fold 定義点 (既定を返す箇所) / 語彙テスト・文言 (bad-response の説明) / 比較 (reason === 'bad-response')
2. classifier-failures.ts に `FALLBACK_CLASSIFY_FAILURE` を追加 (WHY コメント付き)
3. fold 定義点のみ置換。比較・文言・テスト側はリテラルのまま (置換による意味の希釈を避ける)
4. make check + make eval

### 落とし穴
- 全 19 箇所を機械置換しないこと — 語彙の説明文やテスト期待値まで定数にすると grep での追跡性が逆に下がる
- 定数名は「既定」の意味を示すこと (BAD_RESPONSE だけだと語彙の 1 員に見える)
- failureReasonOf (http-classifiers.ts:132) の戻り値型は語彙 union — 定数化の際に型注釈を壊さない

## Definition of Done
- [x] BDD シナリオが自動テスト (既存 pin) として検証される
- [x] テストカバレッジが基準を満たす (既存網)
- [ ] コードレビュー完了（GitHub PR での approve を必須とする）
- [x] リファクタリング完了（fold 定義点の置換まで）
- [x] ロールバック手段の検討（値不変。revert で完結）
- [x] ドキュメント更新済み（本 PBI の実装記録に置換範囲の判断を残す）
