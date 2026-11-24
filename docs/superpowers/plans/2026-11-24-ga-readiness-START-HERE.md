# 引継ぎ: 正式版 (1.0) 準備ラウンド（まずこのファイルだけ読む）

作成: 2026-11-24。このファイルだけで状況・ルール・次の一手が分かるように書いている。詳細は末尾の「参照先」。

## 1. 何をしているか

JushoAI（日本式フォームの住所・氏名・フリガナを補完する Chrome / Firefox 拡張、WXT + TypeScript + Vitest）を、0.1.40 の次に正式版 1.0.0 として出す準備をしている。プロジェクト全体を見直して 17 件の PBI（PBI-274〜290）を起票し、早く終わるものから実装している。

結論: 利用者向けの機能はほぼそろっている。足りないのは正式版としての約束（脆弱性の報告窓口、保存データの互換性、配布経路の保護）。

## 2. 現在地

- リポジトリ: `/Users/yaar/Playground/JushoAI`
- ブランチ: `work/ga-readiness`（HEAD d5b82ab、未 push）。`work/user-docs-reorg`（74e3d89）から分岐。未マージの作業ブランチ 4 本（adachi-label-extraction / role-profile-select / emergency-contact-tel / user-docs-reorg）は一直線に積まれていて、`work/user-docs-reorg` が全部を含む
- ローカルタグ `pre01-0.1.40`（74e3d89、未 push）
- `package.json` の version は 0.1.39

### 完了

| PBI | 内容 | コミット | レビュー |
|---|---|---|---|
| 275 | `SECURITY.md`、Issue テンプレートと安全ガイド（日英）への非公開報告の案内 | 01d373a、記録 d5b82ab | Approved、指摘なし |
| 281 | `tests/build/manifest-guard.build.ts`（権限・CSP・動的コード実行の後退検査） | 597fd68 | Approved、Critical/Important なし |

- 275 の GitHub 側設定（private vulnerability reporting の有効化）はユーザーが実施済み。応答目安（受付 7 日、方針連絡 30 日）はユーザーが確定済み
- 275 で未確認が 1 点: ログアウト状態で `https://github.com/armaniacs/jushoai/security/advisories/new` が開くこと（ユーザーに確認を依頼済み。開けば 275 を閉じられる）
- 281 の残り 2 点（小）: (a) JS 走査で対象ファイル数が 0 でないことを assert する、(b) 外部 URL の `import(` の検査を足す（実装指示書から漏れていた）。場所は `tests/build/manifest-guard.build.ts`
- 281 の CSP 判断: `content_security_policy` は未指定のままブラウザ既定に任せ、指定された場合の後退だけを止める（Firefox MV3 の既定 CSP を上書きすると挙動が変わるため）。PBI に記録済み

### 未着手（着手順）

| 順位 | PBI | 内容 | 原本ファイル（`pbi/` 配下） |
|---|---|---|---|
| 2 | 277 | Dependabot と npm audit を導入 | `2026-11-24-277-sec-dependency-monitoring.md` |
| 3 | 274 | release の build と submit を別 job に分離 | `2026-11-24-274-sec-release-job-split.md` |
| 5 | 282 | 未マージブランチの統合とリリースゲート一覧（統合部分は先に着手可。版付けは必須 PBI の完了後） | `2026-11-24-282-chore-ga-release-gate.md` |
| 6 | 276 | 統合後の main で脆弱性の再スキャン（282 の統合に依存） | `2026-11-24-276-sec-pre-ga-vuln-rescan.md` |
| 7 | 283 | 保存形式の版番号と互換性の約束 | `2026-11-24-283-feat-storage-compat-contract.md` |
| 8 | 280 | 脅威モデルと端末保存データの明示 | `2026-11-24-280-sec-threat-model-doc.md` |
| 9 | 284 | バックアップの導線 | `2026-11-24-284-feat-data-loss-guard.md` |
| 10 | 278 | SHA256SUMS と来歴証明（274 と同時実施を推奨） | `2026-11-24-278-sec-release-provenance.md` |
| 11 | 285 | キーボードと読み上げの通し監査 | `2026-11-24-285-chore-a11y-keyboard-audit.md` |
| 12 | 286 | 郵便番号補助の全国化 | `2026-11-24-286-feat-zip-dict-nationwide.md` |

- 将来構想（着手しない）: 287 / 288 / 289 / 290、および 279（ストアのアカウント保護。ユーザー判断で相当先）
- 1.0 必須は 275 / 277 / 274 / 281 / 282 / 276 / 283。1.0 推奨は 280 / 284 / 278 / 285。順位表の全体は `pbi/2026-11-24-00-backlog-ga-readiness-round.md`

### 次にやること

1. PBI-277 から着手する。事実と落とし穴は同ディレクトリの `2026-11-24-ga-readiness-handoff.md` の「277」節にある（Dependabot の npm 更新が lockfile のミラー方針とぶつかる点が要点）
2. 274 と 278 は同じ `release.yml` を触るので同時に進める
3. 全体の最後に、ブランチ全体のレビューを `git merge-base main HEAD` から HEAD の範囲で 1 回行う（まだ実行していない）。そのとき、281 の Minor 2 点と各 report の Minor を拾う

## 3. 守るルール（ユーザー指示と AGENTS.md の要点）

- 応答・説明・コミットメッセージは日本語。コード・識別子・コード内コメントは英語。絵文字は使わない
- コードコメントは非自明な WHY だけ。タスク ID（PBI-XXX）、変更履歴、WHAT は書かない。docs も最新仕様のスナップショットだけを書く
- ドキュメント（.md）は SHIFT-JIS（CP932）で表せる文字だけを使う（EM DASH、`≤` `≥` `≈`、`•`、アクセント付きラテン文字などを使わない）
- コミットは Conventional Commits。`git add -A` / `git add .` は使わず、対象ファイルを個別に add する。push、マージ、タグの push はユーザーの指示があるまでしない
- 実装は「サブエージェント駆動」。タスクごとにサブエージェントへ委譲して実装・検証させ、タスクレビュー（spec 適合 + 品質）を通してから次へ進む。メインが自力で一気に書かない。brief・report・review は `.superpowers/sdd/` に置く（既存例: `ga-readiness-task-1-brief.md` / `-report.md` / `-review.md`）。進捗台帳は `.superpowers/sdd/ga-readiness-progress.md`（git 管理外）
- Bash は `cd` と `;` `&&` の連結を避け、絶対パスで単独実行する。git は `git -C <abs>`、make は `make -C <abs>`。`rm -rf` と `~/Secrets` 参照は deny。長い処理はスクリプトを書いてから単独で実行する
- Edit の前に必ず Read する。フォーマッタ hook が走るので、同じファイルを続けて Edit する前は再度 Read する
- `.env` や認証情報ファイルは読まない・出力しない。シークレットはリポジトリに置かない
- 依存解決は非公式ミラー `https://npm.flatt.tech/`（`.npmrc` と `package-lock.json`）に固定する方針。lockfile も `.npmrc` も通常は書き換えない
- ブラウザ拡張の既存方針は変えない: UI は日本語専用、プロファイルの値は外部に送らない、注入は必ずプレビュー経由

## 4. 検証コマンド

- `make -C /Users/yaar/Playground/JushoAI check`: typecheck + lint + test + 両ブラウザの build + manifest 検査 + web-ext lint（1 回で流れる）
- `make -C /Users/yaar/Playground/JushoAI test-build`: manifest・ワークフローの検査（`tests/build/*.build.ts`）。release.yml / check.yml を変えたら `tests/build/release-workflow.build.ts` と `check-workflow.build.ts` も直す
- `make -C /Users/yaar/Playground/JushoAI site`: ドキュメントサイトの生成と検査（日英の H2 数・キー・リンクが一致しないと失敗）
- `make -C /Users/yaar/Playground/JushoAI check-all`: check + site + 両ブラウザの E2E（リリース前）
- 281 の実績: `make test-build`（36 件）、typecheck、lint は通過。275 の実績: `make site` と `tests/site`（133 件）は通過。`make check` 全体はこのラウンドではまだ一度も流していない

## 5. 注意点

- 本番タグ `v*` を push すると `release.yml` がストアへ提出する。ドライラン以外でタグを push しない。バージョンは `package.json` と一致が必須
- 未追跡の `.hex-skills/` はこのラウンドと無関係。コミットしない
- 「先に確認が要る判断」はこれまで次のとおり決まっている: 279 は将来構想に移す（ユーザー判断）、281 の CSP は未指定のまま、275 の応答日数は 7 / 30 日で確定。これらを蒸し返さない

## 6. 参照先

- `pbi/2026-11-24-00-backlog-ga-readiness-round.md`: ラウンド台帳（機能充足の評価表、順位と RICE、段取り、確認済みの良い点、やらないこと）
- `docs/superpowers/plans/2026-11-24-ga-readiness-handoff.md`: PBI ごとの事実と落とし穴（調査済みの箇所と検証手順）
- 各 PBI の末尾の「実装記録」「引継ぎ」節
- `AGENTS.md`: プロジェクトの規約と設計の約束事（実装前に必読）
- `docs/release.md`: リリース手順
