# Task FIX-B brief — 最終レビューMinor M3/M4 の修正 (照合の厳格化)

## 位置づけ
JushoAI `work/pbi-208-round4` 上の修正タスク。`.superpowers/sdd/final-review-SIMP.md` の Minor 指摘 M3/M4 に対応する。いずれも `scripts/` の照合の緩さであり、レビューは「対応不要」としているが、ユーザー指示により厳格化する。既存テスト・smoke が通る範囲で行え。通らなければ無理をせず現状維持 + 理由報告とせよ。

## 必読
- `.superpowers/sdd/final-review-SIMP.md` の M3/M4 行 (要件の正本)
- `.superpowers/sdd/task-SIMP-T2-report.md` (concerns #3)、`.superpowers/sdd/task-SIMP-T8-report.md` (concerns #2、#4)。現状の緩さの経緯
- `scripts/add-fixture.mjs`、`scripts/sync-target-urls.mjs`、`tests/scripts/` の該当テスト

## やること (verbatim)
1. M3: `'${file}'` 含有照合を、理論上の誤検出 (別リストの同名) が起きない厳密さに上げよ。例: 配列要素形 `'${file}',` またはレガシー形 `it('${file} fills` のいずれかへの限定。現行 registry 121件での smoke (wired/missing/no-op) が維持されること。
2. M4: `stampRegistry` の `parsed.url === url` を、旧 `m[1].trim().slice(2) === url` と同等の厳しさに戻せ (例: `- ` 直後単一空白のみ許容)。registry 全行 `- url` 均一のため実効差はないはずで、テストで確認せよ。
3. 対象は `scripts/` と `tests/scripts/` のみ。fixtures、LEDGER、pin、samples.test.ts、src には触らない。
4. 厳格化で既存テスト・smoke のいずれかが落ちる場合は、その厳格化を revert して現状維持とし、理由を report に記録せよ (無理な修正はしない)。

## 検証
- `npx vitest run tests/scripts/` が全緑
- `npx vitest run tests/integration/samples.test.ts` が全緑
- `make addurl-check` がゼロ
- 生成経路の非破壊検証 (T2f/T8 と同水準: dry-run・再適用 no-op・121/121 wired)。実ネットワーク走行は不要

## 進め方
- commit は1件にまとめよ。Conventional Commits 日本語。push はするな。

## Report
- `.superpowers/sdd/task-FIX-B-report.md` にフルレポートを書き、戻りは status + commits (full SHA) + 検証結果 + concerns のみ。現状維持に倒した場合はその判断と根拠を明記せよ。
