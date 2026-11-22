# PBI: save-side の保存失敗処理をヘルパーに統合する

## ユーザーストーリー
options の保存フローを触る保守者として、保存失敗時の UI 処理が 1 箇所にまとまっていてほしい、なぜなら 同形の catch 後処理 (warn + 容量不足文言 + render) が 2 箇所にあり、文言や警告の追加をすると 2 箇所同時更新になるから

## 優先度
- 順位: 2 / 6
- RICE スコア: 38 (Reach=2 / Impact=1 / Confidence=95% / Effort=0.05人週)
- 根拠: 2026-11-21 DRY/KISS 調査 (D2)。同ファイル内の 4 行 × 2 箇所の完全同形。小さいが即効

## 出どころ
- DRY/KISS 調査 2026-11-21 (D2)。ラウンド台帳 `pbi/2026-11-21-01-backlog-drykiss-round.md`
- 現状確認 (2026-11-21): src/entrypoints/options/save-side.ts:118-123 と :183-188 — `try { await deps.saveData(...) } catch (e) { console.warn('[JushoAI] save failed', e); deps.ui.showError(['保存に失敗しました。容量不足の可能性があります。']); deps.ui.render(); }` の完全同形

## ビジネス価値
- 容量不足文言・警告経路の変更が 1 箇所で完結する。測定: `grep -c "保存に失敗しました" src/entrypoints/options/save-side.ts` が 1 件 (文言定義点のみ)

## BDD受け入れシナリオ

```gherkin
Scenario: 保存失敗時の処理が 1 箇所で定義される
  Given 保存フローのヘルパーが存在する
  When  保存が拒否される
  Then  console.warn と容量不足文言の showError と render がヘルパー内で 1 回だけ定義されており、2 呼び出し箇所から使われている

Scenario: 失敗してもフォームの状態は壊れない
  Given 既存の保存失敗 pin (tests/entrypoints 配下) が存在する
  When  ヘルパー統合後の保存が失敗する
  Then  既存 pin が無変更で緑である (エラー表示・フォーム状態の意味論不変)
```

## 受け入れ基準
- [x] save-side.ts 内に保存 + 失敗処理のローカルヘルパーが追加されている (`persistWithUiError`・save-side.ts:98-111。パラメータは `Pick<SaveSideDeps,'saveData'> & { ui: Pick<SaveSideUi,'showError'|'render'> }` の最小構造形で、両 deps 型を構造的に満たす)
- [x] 2 箇所の catch がヘルパー呼び出しに置換されている (save-side.ts:137 と :195。console.warn・容量不足文言・render の重複が消え、完了判定 `grep -c "保存に失敗しました"` = 1)
- [x] 挙動不変 (既存の保存系 pin 28/28 が無変更で緑。失敗時の warn 文言・showError 配列・render 順・return 意味論、成功時の setState → toast 順はすべてレビューがバイト単位で同一と検証)
- [x] `make check` 緑 (189 ファイル 3186 passed + 1 expected fail・web-ext errors 0)

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 追加なし

### 統合テスト
- 既存の保存失敗 pin (tests/entrypoints/save-side 系) が緑

### 単体テスト
- 追加なし (同形統合で pin が既に両経路をカバー)。ヘルパー抽出で pin が新規に必要になる場合のみ追加

## 実装アプローチ
- **Outside-In**: 2 箇所の catch の差分 (ペイロード構築) を呼び出し側に残し、共通の「保存 + 失敗処理」を括る
- **Red-Green-Refactor**: 既存 pin で GREEN 維持のまま抽出
- **リファクタリング**: ヘルパー名は保存の意味を示す (例: `saveWithUiError`)

## 見積もり
0.05人週（要チームでの見積もり）

## 技術的考慮事項
- 依存関係: なし
- テスタビリティ: deps 注入の既存構造をそのまま使う
- 非機能要件: 挙動不変

## 実装者向け注記

### 現状コードの確認
（2026-11-21 作成時に現存確認済み。着手時に再確認すること）
```bash
grep -n -B 4 "保存に失敗しました" src/entrypoints/options/save-side.ts
```

### 実装手順
1. 2 箇所の catch ブロックを並べ、差分を確認する (saveData に渡すペイロード構築だけが差分の見込み)
2. ペイロード構築は呼び出し側に残し、`await deps.saveData(payload)` 以降の共通処理をヘルパーに括る
3. 既存 pin を実行し緑を確認、make check

### 落とし穴
- 2 箇所の buildSave / 直接配列の形の違いを無理に統一しない (統一対象は失敗処理のみ)
- deps.ui の型 (showError が配列を受け取る) を維持する

## Definition of Done
- [x] 全 BDD シナリオが自動テストとして実装されパスする (既存保存失敗 pin)
- [x] テストカバレッジが基準を満たす (既存網)
- [ ] コードレビュー完了（GitHub PR での approve を必須とする）
- [x] リファクタリング完了（グリーン後・重複 catch の除去まで）
- [x] ロールバック手段の検討（挙動不変。revert で完結）
- [x] ドキュメント更新済み（本 PBI の実装記録）

## 実装記録（2026-11-22・単一タスクラウンド）

- **実装** (415e285): save-side.ts:98-111 に `persistWithUiError` を抽出 (module 外 export なし)。パラメータは最小 Pick 構造 (`saveData` + `ui.showError` + `ui.render`) で、saveOne 系 deps と SaveBothDeps の両方を構造的に満たす (showError は少数引数関数が多数引数型に割当可能なため)。戻り値 boolean: 失敗時は warn + 容量不足文言 + render を実施して false、成功時は true。
- **置換**: 2 箇所 (save-side.ts:137 / :195) の try/catch を `if (!(await persistWithUiError(payload, deps))) return;` に。ペイロード構築 (`spec.buildSave(decision.own, other)` / 直接オブジェクト) は呼び出し側に残す。loadData の fallback try/catch は対象外 (意図が違うため触らない)。
- **測定**: `grep -c "保存に失敗しました" src/entrypoints/options/save-side.ts` = 1 (ヘルパー定義点のみ)。
- **レビュー**: 単一タスクラウンドのためタスクレビューを最終ゲートとして兼用 (Approved + Ready to merge: Yes)。挙動同一性 (warn 文言・showError 配列・render 順・return 意味論・成功パスの位置) をバイト単位で検証、Pick パラメータの割当可能性 (showError の引数数差) も確認済み。
- **受容**: save-side.ts:195 が 112 文字 (max-len ルールなし・lint clean の化粧的指摘) — 次にこのファイルを触る機会があれば payload を折返す。
- **検証**: `make check` 緑 (189 ファイル 3186 passed + 1 expected fail)・`make eval` 3 passed・`make check` を controller が再実行して確認。
