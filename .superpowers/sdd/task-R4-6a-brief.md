# Task R4-6a brief — 東京23区の区立図書館の候補100 URLリスト

## 位置づけ
JushoAI samples corpus 拡充 (PBI-208) 第4トランチの続き。`work/pbi-208-round4` 上のタスク。
R4-1〜R4-3 (候補183・取込25件・pin更新済み、最終レビュー Spec PASS)、実行中の R4-4a (東証5000番台)・R4-5a (政令指定都市) と並行する姉妹タスク。対象を東京23区の区立図書館に絞る。このタスクは候補リスト作りだけに限定し、addurl 取り込みは後続タスク (R4-6b以降) が行う。

対象23区: 千代田・中央・港・新宿・文京・台東・墨田・江東・品川・目黒・大田・世田谷・渋谷・中野・杉並・豊島・北・荒川・板橋・練馬・足立・葛飾・江戸川

## 必読
- `pbi/2026-10-31-208-feat-samples-corpus-growth.md` (選定/除外基準)
- `AGENTS.md` (テスト方針・運用の節)
- `tests/target-url.md` (既存44件+と重複させないこと)
- `.superpowers/sdd/task-R4-1-attempts.md` (R4-1の試行済みURLと重複させないこと)

## やること (verbatim)
1. 東京23区の区立図書館サイトから、問い合わせ/リクエスト申込/ボランティア応募/団体貸出/見学申込などの実フォームを持つ静的ページ候補を100 URL以上リスト化する。各区からまんべんなく拾い、特定区への偏りを避ける。既存44件 (tests/target-url.md) および R4-1 試行済み183件といずれも重複させない。図書館蔵書検索 (OPAC) の検索窓のみのページはフォームなしとして除外する。
2. 各候補を curl で事前確認し、実フォームの有無を判定する。判定基準 (PBI-208 precedent): JS描画のみ・ログイン必須 (利用者登録・電子申請の認証壁)・フォームなし・到達不能は除外。除外したURLは理由を記録する。自治体に多い電子申請系フォームの機構は概要に記録する。
3. 結果を `.superpowers/sdd/task-R4-6a-attempts.md` に試行ログとして書く。形式は R4-1 のログに倣う (連番・URL・判定・除外理由 or フォーム概要)。有望分には取込優先順位を付ける (P1: 欄構成が豊か・即取込推奨 / P2: 有望だが欄が小さい・機構が特殊 / P3: 予備)。
4. 有望URLは `tests/target-url.md` にはまだ書かない (R4-6b以降が `make addurl URL=<url>` で登録する)。

## 出力
- `.superpowers/sdd/task-R4-6a-attempts.md` (100件以上の試行ログ)
- 上記以外のファイル変更はしない (src/・samples/・tests/ に触らない)

## 検証
- 候補が100 URL以上あること
- tests/target-url.md および R4-1 の183件との重複がないこと
- 除外理由が PBI-208 の基準に沿っていること

## 進め方 (失敗対策・並行作業)
- 同一ブランチ上で R4-4a・R4-5a が並行実行中。commit は必ず path限定 (`git add -f .superpowers/sdd/task-R4-6a-*` のみ) にし、他タスクのファイルに触れないこと。commit がロックで失敗したら少し待って retry せよ。
- 20件ごとに attempts ファイルを追記して `git commit` すること。commit message は Conventional Commits 日本語。
- ネットワーク検索・curl が使えない環境なら NEEDS_CONTEXT で即報告し、作業を捏造しないこと。

## Report
- `.superpowers/sdd/task-R4-6a-report.md` にフルレポートを書き、戻りは status (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED) + commits (full SHA) + 候補件数・有望件数 + concerns のみ。
