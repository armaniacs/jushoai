# Task 16 report: 0.2.0 リリースゲートの確認（合否の記録まで。直しなし）

状態: DONE_WITH_CONCERNS（7 項目を確認し記録した。ゲートの `[ ]` は付けていない。直しはしていない）

対象: `docs/release.md` の「0.2.0 リリースゲート」7 項目。版付けの可否判断の材料を作る。

## 実行コマンドと結果

- `make -C /Users/yaar/Playground/JushoAI check`: exit 0。web-ext lint の警告 2 件は想定内（Firefox の `strict_min_version` と data_collection_permissions の版注記。Task 既知）。
- `make -C /Users/yaar/Playground/JushoAI site`: exit 0。`built 32 pages`、`site check passed`。
- `make -C /Users/yaar/Playground/JushoAI eval`（pin 除外の本体）: exit 0。1 ファイル 3 件通過。
- `npm run --prefix /Users/yaar/Playground/JushoAI eval-pin`: exit 0。1 ファイル 1 件通過（pin 緑）。
- `make -C /Users/yaar/Playground/JushoAI e2e-chrome`（HEADLESS なし。実機 Chrome）: make は Error 1。28 件中 27 件通過、1 件失敗。失敗は `translucent banner` の色トークン（期待 `rgba(36, 87, 214, 0.9)`、実際 `rgba(28, 45, 100, 0.9)`）。Task 8/9 と同じ既知の失敗で、本ラウンドの差分外。
- `FIREFOX_BIN="/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox" HEADLESS=1 make -C /Users/yaar/Playground/JushoAI e2e-firefox`: 25/25 通過（2 ファイル）。実機は Firefox Developer Edition。brief は実機なしを想定したが、同機で実行できた。
- `make check-all` の一括実行: 未実施。check・site・両ブラウザ E2E を個別に流したため、一括の緑は未確認。
- 未マージ確認: `git fetch origin` 済み。`git merge-base --is-ancestor <branch> origin/main` を 5 本に実行。旧 4 本は Yes、ga-readiness のみ No（後述）。

## 項目ごとの合否

1. `make check-all` が緑: 未達。内訳は check 緑・site 緑・e2e-chrome 27/28（既知の 1 件失敗）・e2e-firefox 25/25 緑。一括実行はしていない。版付け時は check-all の一括再実行と chrome の既知失敗の再確認が要る。
2. `make eval` の pin が緑: 合格。eval 本体と eval-pin がともに緑。PBI-286 との関係はなし（286 は辞書実データ生成の残であり、pin の対象外）。
3. PBI-276 の完了: 合格。受け入れ基準は 5 件とも `[x]`。新規指摘 0 件、前回 4 件は修正 3・受容 1（TOCTOU 残余は緩和済みで修正 PBI なし）。結果要約は CHANGELOG の 0.2.0 節 `Security` に掲載済み。DoD の確認欄は未記入（下の 4 と同じ扱い）。
4. 1.0 必須 PBI（274/275/277/281/283）の完了: 条件付き合格。受け入れ基準は 274 が 1 件残し（CI dry-run はユーザー作業として残る）、275/277/281/283 は `[x]`。5 件とも DoD の BDD・コードレビュー・文書の確認欄は未記入のまま。タスクレビューは各 Task の review で Approved（Critical/Important なし）だが、PBI 本文の DoD には反映されていない。版付け時に DoD の扱い（記入か結論の明記）を決めること。
5. ストア掲載文とプライバシー文書の整合: 合格。`docs/store-listing.md`・サイト privacy 日英・`wxt.config.ts` の権限を現行で再確認し、不一致なし。権限は storage・contextMenus、content script の matches は `<all_urls>`、optional_host_permissions は https・localhost・127.0.0.1、Firefox の gecko id と data_collection_permissions（必須 none・任意 websiteContent）は申告どおり。送信項目（欄のメタデータのみ、値は送らない）と 7 日監査ログ・暗号化保存の記述は日英で一致。Firefox の内蔵 AI 除外の注記は `selectableProviders` と一致。不一致がないため文書修正なし。
6. CHANGELOG に `0.2.0` 節: 合格。`## [0.2.0] - 2026-11-24` があり、末尾リンクに `[0.2.0]`（v0.1.39 との compare）がある。276 要約は `Security` に 1 段落で掲載済み。注意: タグが後日になる場合は節の日付を直すこと（Task 15 の記録どおり）。
7. 未マージの作業ブランチなし: 条件付き合格。旧 4 本（adachi-label-extraction、role-profile-select、emergency-contact-tel、user-docs-reorg）は `origin/main` の祖先であり統合済み。`work/ga-readiness` のみ未マージ（Task 15 以降の版付け準備コミットが origin/main の先にある）。これは版付け PR の対象そのものであり、残置ではない。ブランチ削除はしていない（版付け後の整理に残す）。

## 残課題（版付け時に片付けること。直しはこのタスクの範囲外）

- e2e-chrome の既知失敗 1 件の再確認と、check-all の一括緑の取得。
- 274 の CI dry-run（`gh workflow run release.yml --ref <ブランチ名> -f dry_run=true`）。push 後にユーザー作業として実行する（PBI-274 の引継ぎどおり）。
- 5 件の PBI の DoD 確認欄の扱い（記入か結論の明記）。タスクレビュー Approved は各 review にある。
- CHANGELOG の 0.2.0 節の日付とタグ日の一致確認（タグが後日の場合）。
- 版付け PR のマージ後、旧ブランチと ga-readiness の整理（削除は版付け後に判断）。

## 検証

- 上の件数と exit は各コマンドの実測。やっていないこと（一括 check-all、274 dry-run、DoD 記入、ブランチ削除）は未実施と明記した。
- 文書の文字種: 変更した .md 3 件は SHIFT-JIS で表せる文字だけを使う（絵文字・範囲外文字なし）。
