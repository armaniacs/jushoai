# Task R4-4a brief — 東証5000番台以降の企業の候補100 URLリスト

## 位置づけ
JushoAI samples corpus 拡充 (PBI-208) 第4トランチの続き。`work/pbi-208-round4` 上のタスク。
R4-1〜R4-3 (候補183・取込25件・pin更新済み) の後続。今回は対象を東証の証券コード5000番以降 (5000〜9999) の上場企業に絞って同様の規模で収集する。このタスクは候補リスト作りだけに限定し、addurl 取り込みは後続タスク (R4-4b以降) が行う。

## 必読
- `pbi/2026-10-31-208-feat-samples-corpus-growth.md` (選定/除外基準)
- `AGENTS.md` (テスト方針・運用の節)
- `tests/target-url.md` (既存44件と重複させないこと)
- `.superpowers/sdd/task-R4-1-attempts.md` (R4-1の試行済みURLと重複させないこと。有望28・除外155いずれとも重複禁止)

## やること (verbatim)
1. 証券コード5000番以降 (5000〜9999) の東証上場企業から、問い合わせ/応募/資料請求などの実フォームを持ちそうな静的ページ候補を100 URL以上リスト化する。既存44件 (tests/target-url.md) および R4-1 試行済み183件といずれも重複させない。
2. 各候補を curl で事前確認し、実フォームの有無を判定する。判定基準 (PBI-208 precedent): JS描画のみ・ログイン必須・フォームなし・到達不能は除外。除外したURLは理由を記録する。
3. 結果を `.superpowers/sdd/task-R4-4a-attempts.md` に試行ログとして書く。形式は R4-1 のログに倣う (連番・URL・判定・除外理由 or フォーム概要)。有望分には取込優先順位を付ける (P1: 欄構成が豊か・即取込推奨 / P2: 有望だが欄が小さい・コード化項目 / P3: 予備)。
4. 有望URLは `tests/target-url.md` にはまだ書かない (R4-4b以降が `make addurl URL=<url>` で登録する)。

## 出力
- `.superpowers/sdd/task-R4-4a-attempts.md` (100件以上の試行ログ)
- 上記以外のファイル変更はしない (src/・samples/・tests/ に触らない)

## 検証
- 候補が100 URL以上あること
- tests/target-url.md の44件および R4-1 の183件との重複がないこと
- 除外理由が PBI-208 の基準に沿っていること

## 進め方 (失敗対策)
- 20件ごとに attempts ファイルを追記して `git commit` すること。commit message は Conventional Commits 日本語。
- ネットワーク検索・curl が使えない環境なら NEEDS_CONTEXT で即報告し、作業を捏造しないこと。

## Report
- `.superpowers/sdd/task-R4-4a-report.md` にフルレポートを書き、戻りは status (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED) + commits (full SHA) + 候補件数・有望件数 + concerns のみ。
