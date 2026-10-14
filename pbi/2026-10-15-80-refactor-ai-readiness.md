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

## BDD受け入れシナリオ

```gherkin
Scenario: ハッピー — 偽 adapter で組合せが判定できる
  Given 設定・偽 LM・偽許可・browser identity がある
  When readiness に問う
  Then 統一状態＋ガイダンスが返る（global mock 不要）

Scenario: 境界 — Firefox の内蔵 AI が未提供として扱われる
  Given Firefox identity＋built-in 設定がある
  When readiness に問う
  Then 未提供の状態になり、選択肢にも出ない
```

## 受け入れ基準

- [ ] readiness の単一 interface が存在し、5モジュールが内部 seam になっている
- [ ] `AiStatus`／`AiState` の2語彙が統一されている
- [ ] `isFirefox` のスレッド渡しが呼出し側から消えている
- [ ] button・guide・設定の gating 呼出しが新 interface に載っている
- [ ] `make typecheck` と `make test` がパスする

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

- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] `make typecheck` がパスする
- [ ] `make test` がパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新不要であることが確認済み（内部付け替えのため）

## 実装者向け注記

### 現状コードの確認（着手前に必ず実行すること）

対象は上記5箇所。`selectableProviders` の Firefox 分岐（build 時 `import.meta.env.FIREFOX`）、`LM_OPTIONS` の同一性要件（availability と create に同一 spec）、`queryFor` の Firefox 向け `data_collection` 付加、`computeCloudStatus` の判定順序を確認すること。

### 落とし穴

- Provider Registry の選択ロジックには手を出さないこと（readiness＝前段の質問のみ）
- `checkAiStatus` の例外→`unavailable` フォールバックを維持すること
- `startDownload` の gesture 未検証メモを維持すること（振る舞いを変えない）
- 2語彙の統一は表示文（`Record` 型の網羅保証）に波及するため、表示テストの更新範囲を見積もること
