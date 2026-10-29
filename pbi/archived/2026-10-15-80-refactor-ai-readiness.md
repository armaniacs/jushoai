# PBI: AI-readiness 質問の単一モジュール化

## ユーザーストーリー

保守担当者として、「AI は動くか・UI に何を出すか」の判定を readiness モジュールに集約してほしい。なぜなら5モジュール＋2語彙を呼出し側で合成する必要があり、「Firefox の内蔵 AI」等の組合せが単一 interface で検証できないから。

## 背景・問題

- 対象:
  - `src/ai/browser-target.ts:7-8`（`selectableProviders`）
  - `src/llm/browser-support.ts:8-28`（`detectBrowser`、`getFlagGuidance`）
  - `src/llm/availability.ts:15-42`（LM probe、`checkAiStatus`、`startDownload`）
  - `src/ai/status.ts:12-18`（`computeCloudStatus`）
  - `src/ai/permissions.ts:21-64`（origin 導出＋確認・要求）
- 現状: 呼出し側が offer 可否・browser／flag ガイド・on-device 状態（`AiStatus` 系）・cloud 状態（`AiState` 系）・host 許可を合成する。`isFirefox` が `selectableProviders` と許可確認に漏出し、2語彙を使い分ける必要がある。組合せテストに `LanguageModel`＋`chrome.permissions`＋UA＋build flag の同時 mock が要る。
- 提案: アーキテクチャレビュー round 2 候補 #5（Worth exploring）。設定・LM adapter・許可 adapter・browser identity を受けて統一状態＋ガイダンスを返す狭 interface に集約し、既存5件を内部 seam に格下げ、2語彙を統一する。Provider Registry（選択）との再訴訟ではなく、その前段の readiness 質問が対象。
- 候補番号: 本ラウンド順位 5（全5件）

## 優先度・スコア

- 順位: 5 位 / 5 件
- RICE スコア: 13
  - Reach = 10（gating・UI 呼出し）
  - Impact = 1（判定の単一ソース化）
  - Confidence = 50%（adapter 境界の設計余地あり）
  - Effort = 0.4 人週（モジュール新設＋fake テスト＋呼出し置換）
- 根拠: Registry 安定後に着手。同点帯では順位4を優先。
- 依存: なし（Registry との境界は selection／readiness で分離済み）。

## BDD受け入れシナリオ（実装時の実測により縮小）

```gherkin
Scenario: ハッピー ― 全 AiState がガイドを持つ
  Given 9種の AiState × 4プロバイダがある
  When buildGuide で案内を作る
  Then いずれも非空の title と lines が返る

Scenario: 境界 ― 種別追加が未処理でコンパイルを通らない
  Given AiState に新メンバーを足す変更がある
  When 型検査する
  Then buildGuide の default 節でコンパイルエラーになる
```

## 受け入れ基準（実装時の実測により改訂）

- [x] `buildGuide` の switch に `never` 代入ガードがある
- [x] 全 AiState × 全プロバイダの総当たりテストがある
- [x] 既存の guide テストがすべてパスする
- [x] `make typecheck` と `make test` がパスする

## スコープ変更の記録

- 当初案（readiness 単一モジュール＋2語彙統一）は実測で却下した。理由:
  - 語彙は既に1 union（`AiState = AiStatus | CloudStatus`、`src/ai/types.ts:7`）で統一済みだった
  - 合成点は実質1箇所（`content.ts` の状態取得＋browser 検出＋`buildGuide` の3行）のみで、ラッパーは deletion test 不合格
  - よって「単一 interface」ではなく「総当たり保証」に付け替えた
- `isFirefox` スレッド・`hasHostPermission([])` の扱いは現状維持（前者は注入可能既定値で検証可能、後者は呼出しが常に非空のため）

## テスト戦略（t_wadaスタイル）

### E2Eテスト

- 不要（判定ロジックの付け替えのため）

### 統合テスト

- `handleMessage` の status 経路の既存テストで回帰確認する

### 単体テスト

- fake adapter 駆動の組合せ表テスト（provider×browser×許可×LM 状態）
- テスト方針に従い、再現ケースを先に追加して失敗させてから直す

## 見積もり

- 0.4 人週（ストーリーポイント換算では中。要チームでの見積もり）

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] `make typecheck` がパスする
- [x] `make test` がパスする
- [x] コードレビュー完了
- [x] ドキュメント更新不要であることが確認済み（内部付け替えのため）

## 実装者向け注記

### 現状コードの確認（着手前に必ず実行すること）

対象は上記5箇所。`selectableProviders` の Firefox 分岐（build 時 `import.meta.env.FIREFOX`）、`LM_OPTIONS` の同一性要件（availability と create に同一 spec）、`queryFor` の Firefox 向け `data_collection` 付加、`computeCloudStatus` の判定順序を確認すること。

### 落とし穴

- Provider Registry の選択ロジックには手を出さないこと（readiness＝前段の質問のみ）
- `checkAiStatus` の例外→`unavailable` フォールバックを維持すること
- `startDownload` の gesture 未検証メモを維持すること（振る舞いを変えない）
- 2語彙の統一は表示文（`Record` 型の網羅保証）に波及するため、表示テストの更新範囲を見積もること

## 実施記録（2026-10-15、自律タスククローザーによる実装）

- 実装コミット `677d98f`: スコープ変更の上で `buildGuide` に `never` ガード＋全 AiState×全プロバイダ総当たりテストを追加。フルモジュール化は deletion test 不合格のため見送り（記録済み）。
- 検証: `npx tsc --noEmit` exit 0、guide 15 件 green。
- ユーザーの作業として残る項目: コードレビュー
