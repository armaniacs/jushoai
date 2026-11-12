# Task R4-5a brief — 政令指定都市20市の候補100 URLリスト

## 位置づけ
JushoAI samples corpus 拡充 (PBI-208) 第4トランチの続き。`work/pbi-208-round4` 上のタスク。
R4-1〜R4-3 (候補183・取込25件・pin更新済み、最終レビュー Spec PASS) および実行中の R4-4a (東証5000番台) と並行する姉妹タスク。対象を日本の政令指定都市20市に絞る。このタスクは候補リスト作りだけに限定し、addurl 取り込みは後続タスク (R4-5b以降) が行う。

対象20市: 札幌・仙台・さいたま・千葉・横浜・川崎・相模原・新潟・静岡・浜松・名古屋・京都・大阪・堺・神戸・岡山・広島・北九州・福岡・熊本

## 必読
- `pbi/2026-10-31-208-feat-samples-corpus-growth.md` (選定/除外基準)
- `AGENTS.md` (テスト方針・運用の節)
- `tests/target-url.md` (既存44件+と重複させないこと。神戸市は取込済みのため除外)
- `.superpowers/sdd/task-R4-1-attempts.md` (R4-1の試行済みURLと重複させないこと)

## やること (verbatim)
1. 政令指定都市20市の公式サイトから、問い合わせ/電子申請/施設予約/イベント申込などの実フォームを持つ静的ページ候補を100 URL以上リスト化する。各市からまんべんなく拾い、特定市への偏りを避ける。既存44件 (tests/target-url.md) および R4-1 試行済み183件といずれも重複させない。
2. 各候補を curl で事前確認し、実フォームの有無を判定する。判定基準 (PBI-208 precedent): JS描画のみ・ログイン必須・フォームなし・到達不能は除外。除外したURLは理由を記録する。自治体に多い Struts/電子申請系フォーム (input type=button の JS 送信など) は実フォームでも取込時に手間がかかるため、概要に機構を記録する。
3. 結果を `.superpowers/sdd/task-R4-5a-attempts.md` に試行ログとして書く。形式は R4-1 のログに倣う (連番・URL・判定・除外理由 or フォーム概要)。有望分には取込優先順位を付ける (P1: 欄構成が豊か・即取込推奨 / P2: 有望だが欄が小さい・機構が特殊 / P3: 予備)。
4. 有望URLは `tests/target-url.md` にはまだ書かない (R4-5b以降が `make addurl URL=<url>` で登録する)。

## 出力
- `.superpowers/sdd/task-R4-5a-attempts.md` (100件以上の試行ログ)
- 上記以外のファイル変更はしない (src/・samples/・tests/ に触らない)

## 検証
- 候補が100 URL以上あること
- tests/target-url.md および R4-1 の183件との重複がないこと
- 除外理由が PBI-208 の基準に沿っていること

## 進め方 (失敗対策・並行作業)
- 同一ブランチ上で R4-4a が並行実行中。commit は必ず path限定 (`git add -f .superpowers/sdd/task-R4-5a-*` のみ) にし、他タスクのファイルに触れないこと。commit がロックで失敗したら少し待って retry せよ。
- 20件ごとに attempts ファイルを追記して `git commit` すること。commit message は Conventional Commits 日本語。
- ネットワーク検索・curl が使えない環境なら NEEDS_CONTEXT で即報告し、作業を捏造しないこと。

## Report
- `.superpowers/sdd/task-R4-5a-report.md` にフルレポートを書き、戻りは status (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED) + commits (full SHA) + 候補件数・有望件数 + concerns のみ。
