# JushoAI

日本式フォーム（姓名・フリガナ・分割された住所）を補完する Chrome 拡張機能。フィールドの分類はルールで行い、判定できない欄だけ Chrome 内蔵 AI（Gemini Nano）で補助する。値の整形は決定的なコードで行い、個人情報は外部に送信しない。

## 開発

    make install       # 依存の取得
    make dev           # 開発ビルド（Chrome が起動する）
    make build         # dist/chrome-mv3 に出力
    make test          # Vitest
    make typecheck     # tsc --noEmit
    make check         # typecheck + test + build
    make zip           # dist に配布用 zip を作る
    make clean         # 生成物を削除

`make help` で一覧を表示する。

## 使い方

1. 拡張機能の設定ページでプロファイルと住所を登録する
2. フォームの付近に出る「JushoAI で入力」を押す
3. プレビューで内容を確認し、「入力する」を押す

AI 判定を使うには、Chrome の Prompt API とオンデバイスモデルが利用可能である必要がある。利用できない環境ではルール分類のみで動作する。

## 構成

- `src/core/` 分類ルール・値整形・注入値の計画（DOM と LLM に依存しない）
- `src/dom/` フォーム走査と値注入
- `src/llm/` Prompt API のラッパー
- `src/ui/` ボタンとプレビュー（Shadow DOM）
- `samples/` 手動確認用のフォーム
