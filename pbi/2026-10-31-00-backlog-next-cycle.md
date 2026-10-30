# バックログ: 普及強化後の残る領域（後続サイクル・2026-10-31）

出どころ: `docs/superpowers/specs/2026-10-30-promotion-strengthen-design.md` の「残る領域（後続サイクル）」。9候補を並列調査 → RICE で採点。実装済み 3 件は起票せず除外、6 件を PBI 化（204〜209）。

## やらないこと（宣言）

- ショートカット起動
- CSV入出力
- キーボード操作

## 確定順位（着手順）

| 順位 | PBI | 候補 | RICE | 根拠 |
|---|---|---|---|---|
| 1 | `2026-10-31-204-fix-e2e-driver-stability.md` | E2E 環境の安定化（ChromeDriver/Chrome 版数整合 + CI Chrome job 修正） | 69（R=10 / I=3 / C=80% / E=0.35人週） | CI gate が RED（main の chrome e2e が失敗中 → 本物の回帰が隠れる）。ローカルの e2e も版数不一致で不能。blocker 解除型 |
| 2 | `2026-10-31-205-fix-privacy-article-dns-rebinding.md` | 記事: DNS rebinding 注意書き | 50（R=2 / I=0.5 / C=100% / E=0.02人週） | privacy.md:32・safety.md:49 にある注意が記事にない。1文。206 と同時に 1 コミットで |
| 2 | `2026-10-31-206-fix-privacy-article-audit-retention.md` | 記事: 監査ログ保持期間 | 50（R=2 / I=0.5 / C=100% / E=0.02人週） | privacy.md:60 の保持期間が記事にない。1文。同点なので 205 と同時に 1 コミットで |
| 4 | `2026-10-31-207-feat-pr-template.md` | PR テンプレート | 16（R=2 / I=0.5 / C=80% / E=0.05人週） | PR #18/#19 で守っている4節構成を `.github/PULL_REQUEST_TEMPLATE.md` 1枚に固定。日本語のみ |
| 5 | `2026-10-31-208-feat-samples-corpus-growth.md` | samples corpus の拡充 | 8（R=10 / I=1 / C=80% / E=1人週） | 継続作業の初回トランチ 5 fixture 程度。open-ended。単独では挙動不変の間接価値 |
| 6 | `2026-10-31-209-feat-dark-mode.md` | ダークモード（content UI の auto-follow） | 6.4（R=0.4 / I=1 / C=80% / E=0.5人週） | cosmetic polish。options/popup は dark対応済み。手動切替はスコープ外（必要になれば別 PBI） |

## 除外（実装済みのため起票せず）

| 候補 | 判定 |
|---|---|
| コンテキストメニュー | 単欄版が PBI-137 で実装済み（2026-10-23、`contextMenus` 権限込み、tests/context-menu.test.ts 3件）。全体版メニューは未実装だがフローティングボタン + ポップアップ + Alt+J で代替可。全体版が必要なら別途起票（PBI-202 の tab 宛メッセージ配線確認が前提） |
| プレビューでのプロファイル切替 | 実装済み（2026-10-05 profiles 設計）。プレビューにセレクトあり（profiles.length>1 のときのみ、src/ui/preview.ts:230-232）、同期 replan（fill-flow.ts:245-250）、サイト別割当て（PBI-141）も済。残余は E2E シナリオ未整備のみ → PBI-141 系の E2E に吸着 |
| CI への E2E 組み込み | 実装済み（9194c00、v0.1.26 時代）。check.yml に e2e job（chrome/firefox matrix、HEADLESS=1）。Chrome 側の失敗は 204 に吸収 |

## 調査で判明した補足

- CI `check.yml` の実測（2026-10-30T08:51 の main 実行）: check -> success、e2e (firefox) -> success、e2e (chrome) -> **failure**。失敗原因は `ElementClickInterceptedError`（浮遊要素がクリックを横取り、初回向けガイドの浮遊表示が推定）。ローカルは ChromeDriver 154.0.8037.92 vs Chrome 156.0.8078.76 の版数不一致（Selenium Manager が stale キャッシュにフォールバック）。
- PR テンプレは日本語のみ（実 PR 運用どおり）。ダークモードは auto-follow のみ。corpus は pin 更新の手動運用維持、radio/checkbox 対象外政策は崩さない。
- release.yml（tag v* → make check + zip + 3ストア提出）が存在するため、リリース実行時は 204 の E2E gate 整備が前提になる。
