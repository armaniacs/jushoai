# Task 5 report: PBI-282 のうち今できる部分（統合調査 + ゲート一覧 + 版方針 + 試用表現の見直し）

brief: `.superpowers/sdd/ga-readiness-task-5-brief.md`。範囲どおり、統合の実行・マージ・push・版上げはしていない。

## 実施内容

1. 統合の事前調査（読み取りのみ）
   - `git merge-base --is-ancestor` で 4 本の連鎖を確定。`git log --oneline main..<branch> | wc -l` で規模を記録。`git merge-tree`（worktree 非破壊）で衝突試算し、衝突記号 0 件を確認。結果は PBI-282 の「実装記録」に記載。
   - 推奨 PR 順序は台帳 272 と handoff 282 節どおり（最上位 1 本にまとめ可能。判断はユーザーに残す）。
2. `docs/release.md` 末尾に「1.0 リリースゲート」と「版方針」を追加（受け入れ基準 3 / 4 件目）。未完了項目は未チェックのまま載せ、PBI 待ちを明記。保存形式の詳細は PBI-283 と境界を明示。
3. 「試用」相当の表現を見直し（受け入れ基準 5 件目）。store-listing・README・サイト日英に版の位置づけを示す表現はなし（`v1beta` は API 版名、`お試し` は操作案内）。変更なしで PBI に記録。
4. 台帳の「コードレビューのみ残」系を整理し一覧を PBI に記載（レビュー実施・アーカイブ判断はしない）。
5. PBI-282 の受け入れ基準 3 / 4 / 5 件目を `[x]` にし（統合実行と 1.0.0 版付けは `[ ]` のまま）、「実装記録」と「引継ぎ（残作業）」節を追加。

## 実行コマンドと結果

- `git merge-base --is-ancestor ...` x4: すべて Yes（adachi → role → emergency → user-docs-reorg → ga-readiness）。
- `git log --oneline main..<branch> | wc -l`: 3 / 8 / 26 / 34 / 44。
- `git merge-tree <merge-base> main work/ga-readiness`: 衝突記号 0 件（自動合流できる見込み）。
- `grep` による試用表現の走査: store-listing 該当なし、README は操作案内の 1 行のみ、サイトは `v1beta`（API 版名）と `お試し`（操作案内）のみ。
- `iconv -f UTF-8 -t CP932` で編集後の 2 件の .md を確認: 変換可（下の検証節を参照）。
- サイトは触っていないため `make site` は不要。worktree の変更は意図した 3 件のみ（下を参照）。

## 残課題

- 統合の実行（PR 作成・マージ、push）と版付けはユーザー判断待ち（PBI-282 の「引継ぎ（残作業）」に記載）。
- 「コードレビューのみ残」系（holistic-round / pbi55-round / arch-round2）と未実施 PBI 群（266-271 / 247-258 / 261-264 / 129 / 202）の扱いは統括側で線引きが必要。
- ゲート一覧の各項目の完了確認は版付け時に行う（276 / 283 は未着手）。
