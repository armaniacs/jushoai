# PBI: showDismissDialog の 4 責務を関数内セクションに分解する

## ユーザーストーリー
除外ダイアログを触る保守者として、登録フロー UI・dismiss 操作・成功表示・自動クローズの 4 責務が関数内で明確なセクション (helpers) に分かれていてほしい、なぜなら 約 287 行の 1 関数では pin (234/237/241/244) の当該箇所を探すのに全体を読む必要があり、除外まわりの pin が最も密集しているから

## 優先度
- 順位: 4 / 6
- RICE スコア: 14 (Reach=3 / Impact=2 / Confidence=70% / Effort=0.3人週) — **着手条件発火型**
- 根拠: 2026-11-21 DRY/KISS 調査 (K1)。pin が最も密集するファイルでの可読性価値は高いが、除外 PBI 波 (227-244) が収束しており単独着手の緊急性はない。PBI-253 (dismiss-flow 抽出・着手条件発火型) の発火時に関数内分解を同時に行うのが最も安全 (配線と内部を 1 回で)

## 出どころ
- DRY/KISS 調査 2026-11-21 (K1)。ラウンド台帳 `pbi/2026-11-21-01-backlog-drykiss-round.md`
- 現状確認 (2026-11-21): src/ui/dismiss-dialog.ts:43 の showDismissDialog が 43 行目からファイル末尾 (330 行) までの 1 関数。登録 UI・dismiss 操作・成功表示 (undo ボタン)・自動クローズ状態機械が同居

## ビジネス価値
- pin の当該箇所がセクション関数名から見つかる。測定: 次に除外系 pin を触る PBI の diff が該当セクションに収まる

## BDD受け入れシナリオ

```gherkin
Scenario: 責務ごとのセクションが存在する
  Given dismiss-dialog.ts が分解されている
  When  PBI-234 (自動クローズ競合) の pin を読む場所を探す
  Then  自動クローズ状態機械のセクション関数が特定でき、pin がその近傍に置かれている

Scenario: 既存 pin は全て無変更で緑である
  Given 分解を行う
  When  tests/ui/dismiss-dialog.test.ts と tests/integration/exclusion-undo.test.ts を走らせる
  Then  全 pin が無変更で緑 (表示遷移・フォーカス・単一ハンドルの意味論不変)
```

## 受け入れ基準
- [ ] **着手条件**: PBI-253 (dismiss-flow 抽出) の着手時。253 の deps 組み立て抽出と同時に本分解を行う (1 回で触る)
- [ ] showDismissDialog が 4 責務のセクション関数 (例: buildRegisterView / bindDismissActions / buildSuccessView / wireAutoClose) に分解され、本体は配線のみになっている
- [ ] 既存 pin 全部が無変更で緑 (単一ハンドル規律・busy 再武装・role=alert 生存・close-on-success の意味論不変)
- [ ] `make check` 緑

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 追加なし (既存 e2e が回帰網)

### 統合テスト
- tests/integration/exclusion-undo.test.ts (実ダイアログ + 実チェーン) が緑

### 単体テスト
- 既存 tests/ui/dismiss-dialog.test.ts (40+ pin) が無変更で緑。分解で新 pin は不要 (既存 pin が全責務を既にカバー)

## 実装アプローチ
- **Outside-In**: pin の場所から逆算し、セクション関数の切り目を決める
- **Red-Green-Refactor**: 既存 pin が GREEN のまま移動 (挙動不変)
- **リファクタリング**: 関数内 helpers 化 (module 外へ export しない)

## 見積もり
0.3人週（要チームでの見積もり・253 と同時のため 253 側と合算）

## 技術的考慮事項
- 依存関係: PBI-253 と同時 (着手条件)。253 単独ではやらない
- テスタビリティ: 既存 pin 網が分解の安全網
- 非機能要件: 単一ハンドル規律 (2026-11-14 設計書)・close-on-success (244)・restoreFocus 契約は不変

## 実装者向け注記

### 現状コードの確認
（2026-11-21 作成時に現存確認済み。着手時に再確認すること）
```bash
grep -n "function showDismissDialog" src/ui/dismiss-dialog.ts
grep -c "PBI-" src/ui/dismiss-dialog.ts || true
wc -l src/ui/dismiss-dialog.ts
```

### 実装手順
1. PBI-253 の deps 組み立て抽出と並行して、dismiss-dialog.ts の 4 責務の境界を pin の分布から決める
2. 関数内 helpers (buildRegisterView / bindDismissActions / buildSuccessView / wireAutoClose 相当) に移動 — module 外 export はしない
3. 状態 (busy・engaged フラグ・ハンドル) は 1 箇所に留め、helpers はクロージャか引数で受ける
4. 既存 pin 全実行 → make check

### 落とし穴
- busy 中の自動クローズ抑制・解除後の再武装 (PBI-234) は 2 つのセクション (登録フローと自動クローズ) に跨る状態 — 分解時に状態の所有を 1 箇所に保つこと
- close-on-success の挙動変更 (PBI-244 実装記録参照) の意図を壊さない
- フォーカス規律 (undo ボタンでなくダイアログ箱 tabindex=-1) を helpers 間で動かさない
- 253 との同時着手で diff が大きくなる — 253 (配線) → 本 PBI (内部) の順で 2 コミットに分ける

## Definition of Done
- [x] 全 BDD シナリオが自動テストとして実装されパスする (既存 pin 全部無変更)
- [x] テストカバレッジが基準を満たす (既存 pin 網)
- [ ] コードレビュー完了（GitHub PR での approve を必須とする）
- [x] リファクタリング完了（グリーン後・4 セクション化まで）
- [x] ロールバック手段の検討（挙動不変の関数内移動。revert で完結）
- [x] ドキュメント更新済み（本 PBI の実装記録）
