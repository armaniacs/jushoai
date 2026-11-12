# Task R4-11a brief — JSIC大分類20区分×各10社の候補200 URLリスト

## 位置づけ
JushoAI samples corpus 拡充 (PBI-208) 第4トランチの続き。`work/pbi-208-round4` 上のタスク。
実行中の R4-8b・R4-9b と並行する姉妹タスク。対象は日本標準産業分類 (JSIC) の大分類20区分 (A〜T) とし、区分ごとに企業・団体を10件ずつ選ぶ (計200候補)。このタスクは候補リスト作りだけに限定し、addurl 取り込みは後続タスク (R4-11b以降) が行う。

## 対象区分 (verbatim・ユーザー指定。各区分10件)
A 農業、林業 / B 漁業 / C 鉱業、採石業、砂利採取業 / D 建設業 / E 製造業 / F 電気・ガス・熱供給・水道業 / G 情報通信業 / H 運輸業、郵便業 / I 卸売業、小売業 / J 金融業、保険業 / K 不動産業、物品賃貸業 / L 学術研究、専門・技術サービス業 / M 宿泊業、飲食サービス業 / N 生活関連サービス業、娯楽業 / O 教育、学習支援業 / P 医療、福祉 / Q 複合サービス事業 (郵便局・農協など) / R サービス業 (他に分類されないもの) / S 公務 / T 分類不能の産業

各区分の代表的企業・団体 (JA・漁協・電力・ガス・鉄道・郵便・銀行・保険・ホテル・病院・大学・自治体など) の公式サイトから、問い合わせ/資料請求/申込/予約などの実フォームを持つ静的ページを選ぶ。E・G・I・K・O など取込済みが多い区分は、既存との重複を避けて未収の業態・企業を優先せよ。A・B・C・Q・S・T など実フォームが乏しい区分は無理をせず、試行して除外理由を記録せよ (10件の試行ノルマは区分ごとに満たすこと)。

## 必読
- `pbi/2026-10-31-208-feat-samples-corpus-growth.md` (選定/除外基準)
- `AGENTS.md` (テスト方針・運用の節)
- `tests/target-url.md` (既存116件と重複させないこと)
- `.superpowers/sdd/task-R4-1-attempts.md`、`.superpowers/sdd/task-R4-4a-attempts.md`、`.superpowers/sdd/task-R4-5a-attempts.md`、`.superpowers/sdd/task-R4-6a-attempts.md`、`.superpowers/sdd/task-R4-7a-attempts.md`、`.superpowers/sdd/task-R4-8a-attempts.md`、`.superpowers/sdd/task-R4-9a-attempts.md` (試行済みと重複させないこと。件数が多いためスクリプト照合を推奨)

## やること (verbatim)
1. 20区分×各10件 = 200 URL以上の候補をリスト化する。既存分 (tests/target-url.md) および試行済み (上記7ファイル) といずれも重複させない (URL正規化照合)。
2. 各候補を curl で事前確認し、実フォームの有無を判定する。判定基準 (PBI-208 precedent): JS描画のみ・ログイン必須・フォームなし・到達不能は除外。除外したURLは理由を記録する。
3. 結果を `.superpowers/sdd/task-R4-11a-attempts.md` に試行ログとして書く。形式は R4-1 のログに倣う (連番・URL・区分コード・企業名・判定・除外理由 or フォーム概要)。有望分には取込優先順位を付ける (P1: 欄構成が豊か・即取込推奨 / P2: 有望だが欄が小さい・機構が特殊 / P3: 予備)。
4. 有望URLは `tests/target-url.md` にはまだ書かない (R4-11b以降が `make addurl URL=<url>` で登録する)。

## 出力
- `.superpowers/sdd/task-R4-11a-attempts.md` (200件以上の試行ログ。区分ごとの内訳集計つき)
- 上記以外のファイル変更はしない (src/・samples/・tests/ に触らない)

## 検証
- 候補が200 URL以上あり、各区分10件以上あること
- 既存・試行済みとの重複がないこと
- 除外理由が PBI-208 の基準に沿っていること

## 進め方 (失敗対策・並行作業)
- 同一ブランチ上で R4-8b・R4-9b が並行実行中の可能性がある。commit は必ず path限定 (`git add -f .superpowers/sdd/task-R4-11a-*` のみ) にし、他タスクのファイルに触れないこと。commit がロックで失敗したら少し待って retry せよ。
- 区分ごとに (20件≒2区分分を目安に) attempts ファイルを追記して `git commit` すること。commit message は Conventional Commits 日本語。
- ネットワーク検索・curl が使えない環境なら NEEDS_CONTEXT で即報告し、作業を捏造しないこと。

## Report
- `.superpowers/sdd/task-R4-11a-report.md` にフルレポートを書き、戻りは status (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED) + commits (full SHA) + 候補件数・有望件数 (区分別内訳つき) + concerns のみ。
