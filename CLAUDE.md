# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

日本式フォーム（姓名・フリガナ・分割された住所）を補完する Chrome 拡張機能（Manifest V3）。フィールド分類はルール主体で、判定できない欄だけ Chrome 内蔵 AI（Prompt API / Gemini Nano）で補助する。個人情報は外部に送信しない。

設計の一次情報は `docs/superpowers/specs/2026-10-03-jushoai-design.md`、実装手順は `docs/superpowers/plans/2026-10-03-jushoai.md`。コードを書く前に両方を読むこと。

## コマンド

スタックは WXT + TypeScript + Vitest（jsdom）。

`make help` で一覧を表示する。`make check` が typecheck + test + build を通しで実行する。

```bash
make install                                  # 依存の取得
make dev                                      # 開発ビルド
make build                                    # dist/chrome-mv3 に出力
make typecheck                                # tsc --noEmit
make test                                     # 全テスト
npx vitest run tests/core/planner.test.ts     # 単一ファイル
npx vitest run -t "formats kana by kind"      # テスト名で絞り込み
```

## アーキテクチャ

複数ファイルを読まないと分かりにくい設計上の約束事:

- **LLM は分類だけを行い、値は作らない。** 入力欄の分類（姓/名/カナ/郵便番号/住所分割など）はルール（`core/classify-rules.ts`）が先に判定し、信頼度が `ACCEPT_THRESHOLD` 未満の欄だけ LLM に回す。分割・カナ変換・半角化・ハイフン判定は `core/` の決定的なコードで行う。LLM にはフィールドのメタデータだけを渡し、プロファイルの値は渡さない。
- **`core/` は DOM にも LLM にも依存しない純粋関数。** `dom/` が走査と注入、`llm/` が Prompt API の薄いラッパー。LLM は `FieldClassifier` インターフェースの背後にあり、利用不可・出力不正・例外のいずれでもルール分類のみで動作を続ける（`analyze.ts` の `classifyAll`）。
- **分類は 2 段階。** `classifyField` が欄単体で分類し、`refineClassifications` が同一フォーム内の兄弟欄を見て補正する（電話 3 欄 → `tel1/2/3`、郵便番号 2 欄 → `zip1/2`、`fullName` が 2 欄 → 姓/名、`addressFull` を都道府県・市区町村欄の有無で `addressNoPref` / `street` に絞る）。
- **注入は必ずプレビュー経由。** ボタン押下 → 分類 → `planner.buildPlan` → プレビュー承認 → `fillField` の順。入力済み欄は上書きせず、`maxlength` 超過は切り詰めず警告して注入しない。
- **値注入はネイティブ setter 経由。** `fillField` は prototype の `value` setter を呼んでから `input` / `change` / `blur` を発火する。React/Vue の値トラッカーを迂回するための実装で、`el.value = ...` に置き換えない。
- **UI は Shadow DOM（closed）。** ページ由来の文字列（label など）は必ず `textContent` で入れ、`innerHTML` を使わない。
- **Prompt API は Service Worker（`src/entrypoints/background.ts`）から呼ぶ。** Content Script は runtime メッセージ（`src/llm/background-gateway.ts`、`src/messages.ts`）経由で状態確認・分類・ダウンロードを依頼する。Chrome（Gemini Nano）と Edge（Phi-mini）は同じ `LanguageModel` API 形状。Phi-mini は文脈が小さいため 1 リクエスト 20 欄までに分割する。

## テスト方針

- 分類・整形・計画のずれは、再現する fixture を `tests/core/` に先に追加して失敗させてから直す。fixture は `tests/helpers.ts` の `makeMeta` で作る。
- 正規表現のテストが落ちたら、期待値ではなく正規表現を直す。
- Gemini Nano の実精度とページ上の挙動は自動化できないため、`samples/` のサンプルフォームで手動確認する（手順は実装計画の Task 11）。
