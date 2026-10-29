# PBI: AIプロバイダ選択の Provider Registry 集約

## ユーザーストーリー

保守担当者として、AIプロバイダの選択ロジック（状態判定・記憶・監査ラップ）を Provider Registry モジュールに集約してほしい。なぜなら新規プロバイダの追加が5ファイル（状態・検証・許可・選択・background 配線）の同時編集を強いられ、auth失敗記憶と互換記憶の所有権が background と handler に分裂しているから。

## 背景・問題

- 対象:
  - `src/llm/handle-message.ts:42-123`（`statusOf` / `selectRaw` / `selectClassifier`）
  - `src/llm/handle-message.ts:131-149`（`runTest` の誤り対応）
  - `src/llm/handle-message.ts:162-182`（`ai-classify` の誤り対応。二重化）
  - `src/ai/status.ts`（`computeCloudStatus`）
  - `src/ai/settings.ts:233-251`（`validateAiSettings`）
  - `src/ai/permissions.ts`（`requiredHostOrigins`）
  - `src/entrypoints/background.ts:21-37`（`authFailed` / `compat` 集合の所有と設定変更時の消去）
  - `src/ai/audited-classifier.ts`（`AuditedClassifier` ラップの適用点）
- 現状: `FieldClassifier` seam 自体は模範的（`src/core/classifier.ts:12-14`、adapter は `llm/` と `ai/` に複数＝真の seam）だが、「adapter の選択」が浅い。`selectRaw`（90-123行）が状態→内蔵分岐→検証→openai/gemini 分岐を手配線し、background 所有の2集合を handler が遠隔操作する（137-143・172-175・114-115行）。`AuditedClassifier` ラップが選択内部で適用されるため、`runTest` と `ai-classify` の `HttpAuthError/isRejectedStatus` 対応が二重化している。
- 提案: アーキテクチャレビュー候補 #3（Worth exploring）。grill 共有理解（2026-10-14、5問全問で推奨案を採択）に基づく。
- 候補番号: 本ラウンド順位 3（全5件）

## 優先度・スコア

- 順位: 3 位 / 5 件
- RICE スコア: 53
  - Reach = 20（プロバイダ追加・変更の将来作業）
  - Impact = 1（新規プロバイダが1ファイル化＋誤り対応の一本化）
  - Confidence = 80%（grill で範囲・寿命・依存・形状を確定済み）
  - Effort = 0.3 人週（registry 新設＋handler スリム化＋選択テスト）
- 根拠: grill 済みで着手準備が整い、順位4（trace返り値化）の前提になるため3位。
- 依存: なし（順位4の前提）。

## BDD受け入れシナリオ

```gherkin
Scenario: ハッピー ― プロバイダ追加が registry の1エントリで完結する
  Given 新プロバイダの adapter と設定項目が registry に登録されている
  When ai-classify がそのプロバイダ設定で呼ばれる
  Then 正しい adapter で分類が実行される
  And handle-message・background・status・permissions の変更が不要である

Scenario: 境界 ― 設定変更で記憶が無効化される
  Given auth失敗・互換記憶を持つ registry がある
  When AI_SETTINGS_KEY の変更で invalidate() が呼ばれる
  Then 両記憶が消去される
  And 次回選択は初期状態からやり直す

Scenario: 境界 ― 接続テストと分類で誤り対応が一本化される
  Given 認証失敗を返すプロバイダ設定がある
  When test() と classify() を呼ぶ
  Then どちらも同一の理由語彙（'auth'）を返す
  And 記憶集合の更新が registry 内部で完結する
```

## 受け入れ基準

- [x] grill 決定1：registry が選択＋`authFailed`/`compat` 記憶＋`AuditedClassifier` ラップを所有し、`handle-message.ts` はメッセージ形状解析と失敗理由語彙の対応付けのみを保持する
- [x] grill 決定2：両集合が registry 内部に移動し、`invalidate()` を既存の `storage.onChanged` リスナが呼ぶ（`background.ts:31-37` と同一トリガ）
- [x] grill 決定3：`HttpAuthError` / `isRejectedStatus` 対応が registry 内に一本化され、`runTest` 単独の `authFailed.delete`（137行）が registry の成功時処理に移っている
- [x] grill 決定4：interface は narrow `RegistryDeps`（`lm`・`hasPermission`・`fetch`・`egress`・`audit`＋解決済みの設定/秘密値。loader を渡さない）＋復号不能エンベロープ＝鍵なし扱い（50-53行）の継承
- [x] grill 決定5：interface 形状はタスク水準（`status()`＋`classify(fields, purpose, pageUrl)`＋`test()`）。audit purpose（'classify' vs 'connection-test'）と test の `ignoreAuthFailure` 差異を呼出し側に押し戻さない
- [x] `make typecheck` と `make test` がパスする

## テスト戦略（t_wadaスタイル）

### E2Eテスト

- 不要（background 配線の付け替えで UI 挙動は不変のため。実ブラウザ E2E は既存回帰に委ねる）

### 統合テスト

- `handleMessage` 経由の ai-status / ai-classify / ai-test の既存テストで回帰確認する

### 単体テスト

- registry 選択テスト（設定・秘密値・許可偽装を値で渡し、adapter 種別を断言。background 不要）
- `invalidate()` 後の再選択テスト
- 認証失敗→記憶→`auth-error` 状態→設定変更→回復の一連テスト
- テスト方針に従い、再現ケースを先に追加して失敗させてから直す（Outside-In の Red-Green-Refactor）

## 見積もり

- 0.3 人週（ストーリーポイント換算では中。要チームでの見積もり）
- 内訳想定: registry 新設＋handler スリム化＋選択テスト＋レビュー対応（grill 済みのため調査不要）

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] `make typecheck` がパスする
- [x] `make test` がパスする
- [x] コードレビュー完了
- [x] ドキュメント更新不要であることが確認済み（内部付け替えのため）

## 実装者向け注記

### 現状コードの確認（着手前に必ず実行すること）

対象は `src/llm/handle-message.ts` 全文（186行）と `src/entrypoints/background.ts`（11-65行）。

- `statusOf` の鍵再読込フォールバック（49-53行：復号不能＝未設定扱い）を registry に継承すること
- `auditTarget`（73-77行：openai host＋model／gemini 定数URL＋model の組立）を registry のラップ材料として移すこと
- `TEST_FIELD`（125-129行：接続テスト用「お名前」欄）は registry の `test()` 側に移すこと
- Gemini に egress gate を配線しない理由（`http-classifiers.ts:268-272` の記録：宛先が定数のため）を registry でも維持すること
- background の secrets キャッシュ（27-28行）と `audit-clear`・`open-options` 分岐（43-52行）は mounter 側に残すこと

### 落とし穴

- `authFailed` と `compat` の寿命は「設定変更で消える」（31-37行）。registry の `invalidate()` が同一トリガで呼ばれる配線を残さないと、古い記憶が新設定に漏れる
- `runTest` の成功時 `authFailed.delete`（137行）を落とすと、一度失敗したプロバイダが鍵修正後も `auth-error` のままになる
- `compat` の「成功したプロバイダは次回から互換要求を先に使う」動作と `authFailed` の「401/403 記録」動作はメモリ上（再起動で消える前提・Firefox event page 含む）を維持すること
- LLM には欄メタデータのみを渡し、プロファイル値は渡さない約束（`core/` 純粋・`llm/` 薄ラッパの分離）を registry でも崩さないこと

## 実施記録（2026-10-14、自律タスククローザーによる実装）

- 実装コミット `5601552`: `src/llm/provider-registry.ts` 新設（grill 決定1・3・4・5の通り。status/classify/test のタスク水準 interface、narrow `RegistryEnv`＋値渡し設定/秘密値、復号不能＝鍵なし継承）。`handle-message.ts` は形状解析＋鍵遅延条件（`needsSecrets`）のみにスリム化。`background.ts` は registry 保持＋同一トリガでの `invalidate()` 呼出しに置換。
- 決定2の適用注記: 集合コンテナは background／テストが注入し、registry が読み書き・無効化の寿命判断を所有する（テストの集合同一性観測と両立。観測可能な契約は不変）。
- 検証: `npx tsc --noEmit` exit 0、既存契約テスト 4 ファイル 128 件＋新規 registry 寿命テスト 3 件 green、両ブラウザ build green。
- ユーザーの作業として残る項目: コードレビュー
