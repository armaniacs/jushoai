# PBI: gateway 呼び出し定型の一本化

## ユーザーストーリー

保守担当者として、background 呼び出し4関数の同一骨格（try→送信→parse→フォールバック）を単一 helper に集約してほしい。なぜなら5つ目の呼び出しが来たら5コピー目が生まれ、timeout 既定やフォールバック方針の変更が4箇所に飛び火するから。

## 背景・問題

- 対象: `src/llm/background-gateway.ts:26-59`（`getAiStatusViaBackground`／`testAiViaBackground`／`requestDownloadViaBackground`／`clearAuditViaBackground`）
- 現状: `sendWithTimeout`（:16-24）は共通化済みだが、その上の try→parse→フォールバック骨格が4反復（`download` のみ parse が inline 述語）。
- 提案: ホリスティックレビュー テーマ4。呼び側のシグネチャ（timeout 引数・戻り値の null フォールバック）は変えず、内部だけ `callBackground(msg, ms, parse)` に一本化する。`chrome.*` 直結の seam 化は WXT idiom 上 YAGNI のため対象外と明示する。
- 候補番号: 本ラウンド順位 4（全5件）

## 優先度・スコア

- 順位: 4 位 / 5 件
- RICE スコア: 80
  - Reach = 10（background 呼び出しの将来追加）
  - Impact = 0.5（timeout・フォールバック方針の単一ソース化）
  - Confidence = 80%（同一ファイルの純粋抜き出し）
  - Effort = 0.05 人週（helper 抽出＋既存テスト回帰のみ）
- 根拠: スコア自体は順位3級だが、順位3と同ファイルのため直列で後に回した。
- 依存: 順位3の後（同ファイル競合回避）。

## BDD受け入れシナリオ

```gherkin
Scenario: ハッピー — 4呼び出しが単一 helper を通る
  Given 正常応答・異常応答・stall の偽 background がある
  When 4関数を各条件で呼ぶ
  Then 従来通りの parse 結果・フォールバック・timeout 拒否になる
  And try/send/parse の骨格が1実装のみである

Scenario: 境界 — timeout 引数の上書きが保たれる
  Given 既定外 timeout を指定する呼び出しがある
  When stall 応答に対して呼ぶ
  Then 指定 timeout で拒否される
```

## 受け入れ基準

- [ ] 4関数の骨格が `callBackground`（仮称）1実装に統合されている
- [ ] 各関数の公開シグネチャ（timeout 引数・戻り値のフォールバック値）が変わっていない
- [ ] `download` の inline 述語（`started === true`）が parse 位置に移っている
- [ ] 既存の gateway テスト（`tests/llm/background-gateway.test.ts`、`gateway-legacy-reason` 等）がすべてパスする
- [ ] `make typecheck` と `make test` がパスする

## テスト戦略（t_wadaスタイル）

### E2Eテスト

- 不要（内部付け替えのため）

### 統合テスト

- 不要（background との連携挙動は不変のため）

### 単体テスト

- 新規テストは不要（既存 gateway テストが全条件を覆っている）
- timeout 上書きの境界テストがなければ1件足すのは可

## 見積もり

- 0.05 人週（ストーリーポイント換算では最小単位。要チームでの見積もり）
- 内訳想定: helper 抽出＋既存テスト回帰＋レビュー対応のみ

## Definition of Done

- [ ] 全BDDシナリオが自動テストとして実装されパスする（既存契約の green をもって充足）
- [ ] `make typecheck` がパスする
- [ ] `make test` がパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新不要であることが確認済み（内部付け替えのため）

## 実装者向け注記

### 現状コードの確認（着手前に必ず実行すること）

対象は `src/llm/background-gateway.ts` の26〜59行。

- `UNKNOWN_STATUS`（`{ status: 'unavailable', provider: 'none' }`）のフォールバック値を変えないこと
- `clearAudit` の `?.ok === true` 判定を parse 位置に移すこと
- `STATUS_TIMEOUT_MS` 5秒／`TEST_TIMEOUT_MS` 30秒／`DOWNLOAD_TIMEOUT_MS` 120秒／`CLEAR_TIMEOUT_MS` 10秒の既定を変えないこと

### 落とし穴

- 順位3と同ファイルのため、先に順位3の差分を取り込んでから着手すること
- `chrome.*` 直結の抽象化（platform seam）は本 PBI の範囲外。手を出さないこと
