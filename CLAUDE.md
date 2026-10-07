# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

日本式フォーム（姓名・フリガナ・分割された住所）を補完する Chrome 拡張機能（Manifest V3）。フィールド分類はルール主体で、判定できない欄だけ AI で補助する（プロバイダはユーザーが選べる）。プロファイルの値は外部に送信しない（AI を使う設定にした場合のみ、欄のメタデータが選択したプロバイダに送られる）。

設計の一次情報は `docs/superpowers/specs/2026-10-03-jushoai-design.md` と `docs/superpowers/specs/2026-10-04-cloud-llm-providers-design.md`、実装手順は `docs/superpowers/plans/2026-10-03-jushoai.md` と `docs/superpowers/plans/2026-10-04-cloud-llm-providers.md`。コードを書く前に読むこと。

## コマンド

スタックは WXT + TypeScript + Vitest（jsdom）。

`make help` で一覧を表示する。`make check` が typecheck + test + build を通しで実行する。

```bash
make install                                  # 依存の取得
make dev                                      # 開発ビルド
make build                                    # dist/chrome-mv3 に出力
make typecheck                                # tsc --noEmit
make test                                     # 全テスト
make site                                     # ドキュメントサイトを site-dist に生成して検査
make site-serve                               # site-dist を 127.0.0.1:4173 で配信
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
- **AI プロバイダは設定で 1 つ選ぶ。** `none`（初期値）/ `built-in` / `openai` / `gemini`。background の `handleMessage`（`src/llm/handle-message.ts`）が設定に応じて `FieldClassifier` を選び、クラウドは `src/ai/http-classifiers.ts` が `fetch` する。API キーは `src/ai/secret-store.ts` の AES-GCM エンベロープで保存し、background だけが復号する（Content Script と設定ページには「保存済みか」だけ渡す）。通信先の host 権限は `optional_host_permissions` で、設定ページの保存時に要求する。ベース URL は `src/ai/settings.ts` の `validateBaseUrl` で検証する（https のみ、http は localhost / 127.0.0.1 のみ、内部アドレス拒否）。
- **OpenAI 互換は 400/422 で互換リクエストに 1 回だけ再試行する。** temperature なし・`json_object` の形式で、成功したプロバイダは background の `compat` に記録して次回から最初から使う。401/403 を返したプロバイダは `authFailed` に記録する。どちらもメモリ上にあり、設定が変わると消える。
- **ドキュメントサイトは `site/` の自作ビルド。** `site/lib/` の純粋関数（front matter、Markdown 変換、日英の対応検査、レイアウト、ランディング、ビルド、検査）を `node site/build.ts` が実行する（Node の組み込みの型除去を使うため、消去可能な構文だけを使い、相対 import に `.ts` を付ける）。日英のキーと H2 の数が違うとビルドが失敗する。ガイドの事実は README と設計書、コードにあるものだけを使う。型検査は `site/tsconfig.json` で別に行い、ルートの `tsconfig.json` からは外している。

## テスト方針

- 分類・整形・計画のずれは、再現する fixture を `tests/core/` に先に追加して失敗させてから直す。fixture は `tests/helpers.ts` の `makeMeta` で作る。
- 正規表現のテストが落ちたら、期待値ではなく正規表現を直す。
- Gemini Nano の実精度とページ上の挙動は自動化できないため、`samples/` のサンプルフォームで手動確認する（手順は実装計画の Task 11）。
- 対象 URL を持つ PBI を作るときは `samples/` への fixture 追加と `tests/integration/samples.test.ts` へのケース追加を必須とする。手順は `make addurl URL=<url>` から始める。この1コマンドが `tests/target-url.md` への登録・取得・雛形生成・テスト配線まで行うので、人は最小再現まで削って期待値を埋めるだけ。台帳だけ追って後で一括する場合は `node scripts/sync-target-urls.mjs`、単発の取り込みは `node scripts/add-fixture.mjs <url> [fixture名]`、JS 描画のページは保存した HTML から `node scripts/scaffold-fixture.mjs <source.html> [fixture名]` で雛形を作る。radio は name 単位で1欄に束ね、性別・年代のみ分類してそれ以外は未分類のまま置く。checkbox は対象外（skip 固定）、hidden は送信用等のため除外、submit・button 系は操作要素のため除外、text・email・tel・search と select 以外の型は走査対象外として除外する。

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
