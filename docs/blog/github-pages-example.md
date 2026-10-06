# GitHub Pages掲載例 (siteへの載せ方)

`site/` は自作ビルドで `site-dist` を作ります。日英のキーとH2の数が違うとビルドが失敗します。ブログ記事を載せるときは、jaとenをペアで作ります。

## 配置

- `site/content/ja/llm-reanalyze.md`
- `site/content/en/llm-reanalyze.md`
- 画像は `site/assets/before-reanalyze.png` と `site/assets/after-reanalyze.png` に置きます

## front matter

両言語で `title, description, order` を付けます。`order` はガイド一覧の順番です。既存の `getting-started.md` などと重ならない番号を選びます。

```md
---
title: 再分析で直る電話番号の例
description: ルール判定の失敗とLLM再分析の成功を対比します。
order: 10
---
```

```md
---
title: Fixing split phone fields with reanalysis
description: Contrast of rule-only failure and LLM reanalysis success.
order: 10
---
```

## 本文の対応ルール

- H2の数と順番をja/enでそろえます。本文の例は `docs/blog/01-for-users-tel-split-fixed.md` を短縮して使います。
- UI名は実装と一致させます。「入力内容の確認」「AI で分析」「キャンセル」「入力する」「AI判定」「文字数を超えるため入力しません」「入力済みのため上書きしません」「AI: OpenAI 互換」。
- 事実はREADMEと設計書とコードにあるものだけにします。モデル名は設定依存と明記し、固有名を断定しません。

最小例 (ja):

```md
# 再分析で直る電話番号の例

## 直し方

1. 「JushoAI で入力」を押します。
2. 「入力内容の確認」で赤字を見ます。
3. 「AI で分析」を押します。
4. 「入力する」を押します。

![再分析前](before-reanalyze.png)
![再分析後](after-reanalyze.png)

## なぜ直るのか

最初は3欄とも電話そのものに見えます。再分析で市外局番・市内局番・加入者番号に割り振ります。
```

最小例 (en、H2は同数):

```md
# Fixing split phone fields with reanalysis

## How to fix

1. Press JushoAI fill button.
2. Check the preview for warnings.
3. Press Reanalyze with LLM.
4. Press Apply.

![Before](before-reanalyze.png)
![After](after-reanalyze.png)

## Why it works

At first all three look like a single phone field. Reanalysis maps them to area, exchange, and subscriber parts.
```

## 検査

```bash
make site
make site-serve
```

`make site` がfront matter、日英対応、H2対応を検査します。通ったら `site-dist` を127.0.0.1:4173で確認します。
