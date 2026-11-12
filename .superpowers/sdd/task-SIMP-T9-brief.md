# Task SIMP-T9 brief — S8 doctype統一方針決定+最小正規化

## 位置づけ
JushoAI `work/pbi-208-round4` 上の単純化タスク。code-review-simplify.md の S8 に対応する。S8 は「やる価値があるのは方針決定のみ。横断 churn は不要」とされており、本タスクは調査・決定が主体の小タスクである。

## 必読
- `.superpowers/sdd/code-review-simplify.md` の S8 行 (要件の正本)
- `scripts/scaffold-fixture.mjs` (新規 fixture の雛形がどちらの書式で生成されるか確認せよ)

## やること (verbatim)
1. `samples/*.html` の書式分布を数えよ: `<!doctype html>` あり vs bare `<!--…--><form>` 始まり、`id=""` 空属性の有無、`value=""` の扱い。
2. 統一方針を決定せよ。想定は「bare form を正とし、新規 fixture は scaffolder の既定に従う。既存の少数派 (ff-csr.html 等の full header) は touch 時に寄せる。横断 churn はしない」。`value=""` は scaffolder 既定で無害かつ「空であることの明示」のため残す。`id=""` も scanner が許容するため削らない。
3. scaffolder の既定が方針と食い違う場合のみ、既定を方針に合わせる最小変更を行え (動作・テストを壊さない範囲)。食い違っていなければ scaffolder には触らない。
4. 既存 fixture の正規化は行わない (横断 churn 禁止)。ただし ff-csr.html のヘッダ等、削除がゼロリスクかつ自明なものがあれば最大1–2件まで許容する。迷ったら触らず方針記録に留めよ。

## 検証
- 方針と異なる scaffolder 既定を変更した場合は `tests/scripts/` が全緑であること
- fixture に触れた場合は `npx vitest run tests/integration/samples.test.ts` が全緑かつ期待値無変更
- 何も変えなかった場合は検証不要 (調査報告のみ)。その旨を report に明記

## 進め方
- 変更がある場合のみ commit すること (調査のみなら commit 不要。その場合は report ファイルのみ残し、戻りで明示)。Conventional Commits 日本語。push はするな。

## Report
- `.superpowers/sdd/task-SIMP-T9-report.md` にフルレポート (分布集計・決定した方針・変更の有無と理由) を書き、戻りは status + commits (full SHA または commit なしの旨) + 検証結果 + concerns のみ。
