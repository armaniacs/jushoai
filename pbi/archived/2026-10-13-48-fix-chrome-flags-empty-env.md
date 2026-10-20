# PBI: chrome-flags の空文字環境変数でも --no-sandbox が付く問題の修正

## ユーザーストーリー
E2E実行者として、空文字の環境変数（`CI=''` / `E2E_NO_SANDBOX=''`）ではブラウザサンドボックスを無効化したくない、なぜならローカル実行で意図せずセキュリティを弱めるのを防ぎたいから。

## 優先度（順位・RICE・根拠・依存）
- 順位: 2位 / 9件
- RICE スコア: 960
  - Reach: 30/月
  - Impact: 2
  - Confidence: 80%
  - Effort: 0.05人週
- 根拠: セキュリティを弱める側への倒れ方の GO-TO cat_stabilization のため、#2 に次ぐ優先。
- 依存: なし（#4 / #5 の前提となるPBI）

## BDD受け入れシナリオ

```gherkin
Scenario: ハッピー ― CI が空文字なら --no-sandbox を付けない
  Given E2E実行者がローカル環境でテストを実行している
  And 環境変数 CI が空文字（CI=''）に設定されている
  When Chrome 起動フラグを組み立てる
  Then --no-sandbox は含まれない
  And --disable-dev-shm-usage と --disable-gpu は含まれる

Scenario: 境界 ― E2E_NO_SANDBOX が空文字でも --no-sandbox を付けない
  Given E2E実行者がローカル環境でテストを実行している
  And 環境変数 E2E_NO_SANDBOX が空文字（E2E_NO_SANDBOX=''）に設定されている
  When Chrome 起動フラグを組み立てる
  Then --no-sandbox は含まれない

Scenario: 境界 ― CI='1' では --no-sandbox を付ける
  Given CI環境でテストを実行している
  And 環境変数 CI が '1' に設定されている
  When Chrome 起動フラグを組み立てる
  Then --no-sandbox が含まれる
```

## 受け入れ基準
- [x] `CI=''` のとき `chromeLaunchArgs` の戻り値に `--no-sandbox` が含まれない
- [x] `E2E_NO_SANDBOX=''` のとき `chromeLaunchArgs` の戻り値に `--no-sandbox` が含まれない
- [x] `CI='1'` のとき `chromeLaunchArgs` の戻り値に `--no-sandbox` が含まれる
- [x] `HEADLESS` の判定は従来どおり `==='1'` の厳密比較のままである
- [x] 既存の正常系（空envでは `--disable-dev-shm-usage` / `--disable-gpu` のみ）が壊れない

## テスト戦略

### E2Eテスト
- 対象外（ブラウザ起動を伴わない純粋関数の修正のため、E2E追加なし）

### 統合テスト
- 対象外（外部連携なし）

### 単体テスト
- `tests/e2e/chrome-flags.test.ts` に境界値ケースを追加・更新する
  - `CI: ''` → `--no-sandbox` なし
  - `E2E_NO_SANDBOX: ''` → `--no-sandbox` なし
  - `CI: '1'` → `--no-sandbox` あり（既存ケースで担保、維持すること）
  - `HEADLESS` の厳密比較（`'1'` のみ有効）との一貫性を確認する

## 見積もり
0.05人週（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] `npx vitest run tests/e2e/chrome-flags.test.ts` がグリーンである
- [ ] コードレビュー完了
- [x] リファクタリング完了（グリーン後）
- [x] ドキュメント更新不要であることを確認済み（フラグ組み立て仕様の変更なし）

## 実装者向け注記
- 対象: `tests/e2e/chrome-flags.ts` と `tests/e2e/chrome-flags.test.ts`
- 現状の問題点:
  - `tests/e2e/chrome-flags.ts:16` が `env.CI !== undefined` で判定しているため、`CI=''` や `E2E_NO_SANDBOX=''` の空設定でもサンドボックス無効化（`--no-sandbox` 付与）される
  - `HEADLESS` は `==='1'` の厳密比較であり、判定方式に不整合がある
  - ローカル実行で意図せずブラウザサンドボックスを弱めるリスクがある
- 修正方向: truthy判定または明示値 `'1'` のみ受容する（例 `if (env.CI || env.E2E_NO_SANDBOX === '1')`）
- 期待挙動:
  - `CI=''` → `--no-sandbox` なし
  - `E2E_NO_SANDBOX=''` → `--no-sandbox` なし
  - `CI='1'` → `--no-sandbox` あり
- 落とし穴:
  - `tests/e2e/chrome-flags.test.ts:23-25` の `treats a set-but-empty CI as set` テストは現状の誤った挙動を固定化しているため、修正時に期待値を更新すること
  - `HEADLESS` 側の判定は変えないこと（本PBIの範囲外）

## 実施記録（2026-10-13、自律タスククローザーによる実装）

- 実装コミット `0b33737`: `env.CI !== undefined` → `if (env.CI || env.E2E_NO_SANDBOX === '1')` に修正（CI は truthy、`E2E_NO_SANDBOX` は厳密 `'1'`、`HEADLESS` は `==='1'` 維持）。誤挙動を固定していた `treats a set-but-empty CI as set` を反転し、`E2E_NO_SANDBOX: ''` のなしケースを追加。
- 検証: `npx vitest run tests/e2e/chrome-flags.test.ts` 7/7、`npx tsc --noEmit` exit 0（当該ファイル由来のエラーなし）。
- ユーザーの作業として残る項目: コードレビュー
