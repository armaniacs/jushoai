# Task FIX-A brief — 最終レビューMinor M1/M2/M5 の修正

## 位置づけ
JushoAI `work/pbi-208-round4` 上の修正タスク。`.superpowers/sdd/final-review-SIMP.md` の Minor 指摘 M1/M2/M5 に対応する。いずれも `tests/corpus.ts` の LEDGER prose のみ。

## 必読
- `.superpowers/sdd/final-review-SIMP.md` の M1/M2/M5 行 (要件の正本)
- `AGENTS.md` (テスト方針の節)

## やること (verbatim)
1. M1: `tests/corpus.ts:38` 付近のコメント `fill the same thirteen Drupal-form fields` を実態に合わせよ。`FF_EXPECTED` のキーは12件 (レビューに列挙の12キー。自分でも数えよ)。コメントの `thirteen`→`twelve` に訂正せよ。ついでに `.superpowers/sdd/task-SIMP-T6-report.md` 内の「同一13件」表記も件数を正せ (report のみ・コード外)。
2. M2: `tests/corpus.ts:2708` の `reserve[category_type]/reserve[media_type]/reserve[referrer]/event_type/event_data[] x274` は「束全体×274」にも読める。実態 (単体4キー + `event_data[]`×274) が一意に読める形にせよ。例: `(event_data[] x274)` の括弧化。T4 の `key xN` 規約と矛盾しない形にし、キー・事由の対応を変えるな。
3. M5: `tests/corpus.ts:3221` (jpaa: `mw-wp-form-form-id/mw_wp_form_token/mw-wp-form-form-id/mw_wp_form_token`) と `:3235` (nkanzai: `cx/cof/ie/cx/cof/ie`) の同一行内重複キーを `x2` 記法に寄せよ (例: `mw-wp-form-form-id x2/mw_wp_form_token x2` 等、ファイル内の既存 xN 流儀に合わせる)。キー多重集合を変えるな。
4. 対象は `tests/corpus.ts` と T6 report のみ。expected/pin/fixtures/scripts/src には触らない。

## 検証
- `npx tsc --noEmit` が exit 0
- `npx vitest run tests/integration/samples.test.ts` が全緑
- `make addurl-check` がゼロ
- `make eval` が緑
- M1/M2/M5 の修正前後でキー多重集合が不変であることを diff 目視で自己レビューせよ

## 進め方
- commit は1件にまとめよ。Conventional Commits 日本語。push はするな。

## Report
- `.superpowers/sdd/task-FIX-A-report.md` にフルレポートを書き、戻りは status + commits (full SHA) + 検証結果 + concerns のみ。
