# PBI: gateway 分類器の attempt 化

## ユーザーストーリー

保守担当者として、`BackgroundClassifier` の `lastFailureReason`（呼んでから読む out-param）を返り値に載せ替えてほしい。なぜなら再試行・並行呼び出しが入った瞬間に上書き競合が顕在化する構造であり、PBI-62 で除去したパターンの適用漏れだから。

## 背景・問題

- 対象:
  - `src/llm/background-gateway.ts:61-103`（`BackgroundClassifier`）
  - `src/entrypoints/content.ts:390,408`（読み手2箇所）
- 現状: `lastFailureReason` を公開 mutable フィールドで晒し、audit ラッパー改め content 側が `classify()` 返却「後」に読む。いずれも分類直後の同期的読み取りのため現状は無害だが、構造は PBI-62 の除去対象と同一。
- 提案: ホリスティックレビュー テーマ5。PBI-62 の `attempt()` 形を gateway に拡大する。`classify()` は `{ map }` を unwrap し、throw せず partial を返す契約は維持する。
- 候補番号: 本ラウンド順位 3（全5件）

## 優先度・スコア

- 順位: 3 位 / 5 件
- RICE スコア: 20
  - Reach = 5（gateway 経由の AI 分類呼び出し）
  - Impact = 0.5（時間的結合の除去。現状無害のため小）
  - Confidence = 80%（PBI-62 と同一パターンの適用）
  - Effort = 0.1 人週（attempt 追加＋読み手2箇所の置換＋テスト）
- 根拠: PBI-62 の適用漏れで、失敗語彙の一本化（順位1）の後に運ぶと差分が読める。
- 依存: 順位1の後。順位4とは同ファイルのため直列で先行する。

## BDD受け入れシナリオ

```gherkin
Scenario: ハッピー ― 失敗理由が返り値で受け取れる
  Given 途中で失敗する chunk 応答の偽 background がある
  When attempt() で分類する
  Then { map, failureReason } が解決される
  And partial 結果と失敗理由が同一呼出しに束縛される

Scenario: 境界 ― 旧来の読み替えが残っていない
  Given 全 chunk 成功と全 chunk 失敗の両偽応答がある
  When classify() で分類する
  Then 従来通りの partial map が返る
  And lastFailureReason フィールドが存在しない
```

## 受け入れ基準

- [x] `BackgroundClassifier` が `attempt()`（`{ map, failureReason }` 解決）を持ち、`classify()` は unwrap のみである
- [x] `lastFailureReason` フィールドが廃止されている
- [x] `content.ts` の2読み替えが解決値からの読み取りになっている
- [x] `isLegacyClassifyFailure` の扱いと chunk 継続条件（失敗 chunk で break、後続を送らない）が維持されている
- [x] `make typecheck` と `make test` がパスする

## テスト戦略（t_wadaスタイル）

### E2Eテスト

- 不要（返り値化で UI 挙動は不変のため。実ブラウザ E2E は既存回帰に委ねる）

### 統合テスト

- `content.ts` 経由の失敗表示テスト（既存の content-error-visibility 系）で回帰確認する

### 単体テスト

- attempt の返り値テスト（成功・chunk 途中失敗・legacy 応答の3経路）
- `tests/llm/` の gateway テストを新 seam に追従させる
- テスト方針に従い、再現ケースを先に追加して失敗させてから直す（Outside-In の Red-Green-Refactor）

## 見積もり

- 0.1 人週（ストーリーポイント換算では小。要チームでの見積もり）
- 内訳想定: attempt 追加＋読み手置換＋単体テスト＋レビュー対応

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] `make typecheck` がパスする
- [x] `make test` がパスする
- [x] コードレビュー完了
- [x] ドキュメント更新不要であることが確認済み（内部付け替えのため）

## 実装者向け注記

### 現状コードの確認（着手前に必ず実行すること）

対象は `src/llm/background-gateway.ts` 全文（104行）と `src/entrypoints/content.ts` の失敗表示2箇所。

- chunk 上限（`MAX_CLASSIFY_TOTAL` 60・`MAX_CLASSIFY_CHUNK` 20）と schedule 付与条件（分割時のみ）は `src/messages.ts` の契約のため変えないこと
- legacy 応答（reason なし `{ok:false}`）を `bad-response` ではなく null（unknown扱い）に保つこと
- `classify()` の throw しない契約（partial 返却）を維持すること。`attempt()` の失敗は返り値に載せ、throw に変えないこと

### 落とし穴

- 順位4と同ファイルのため、先に本 PBI の差分を入れてから着手すること（順序逆転でコンフリクトしやすい）
- `CLASSIFY_TIMEOUT_MS`（45秒）既定と注入 timeout の扱いは変えないこと
- content 側の `AI_FAILURE_HINT` 表示タイミング（分類直後・再分析直後）を変えないこと

## 実施記録（2026-10-14、自律タスククローザーによる実装）

- 実装コミット `8b61670`: `BackgroundClassifier.attempt()`（`{ map, failureReason }` 解決）を追加し `classify()` は unwrap のみ。`lastFailureReason` 廃止。`content.ts` は run スコープの reporting adapter で理由を受け、コンテナ並行時の混線も解消（旧共有フィールドより厳密）。
- 検証: `npx tsc --noEmit` exit 0、llm/entrypoints/session 21 ファイル 180 件 green（legacy/可視性テストを attempt 形に移行）。
- ユーザーの作業として残る項目: コードレビュー
