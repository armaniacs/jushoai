# バックログ: checking-team レビューラウンド（2026-11-18）

出どころ: checking-team 標準レビュー（9 観点・main HEAD fce24bc vs タグ v0.1.29 = 0.1.30〜0.1.37 の変更）。レポートは `plans/2026-11-18-0530-review-main-v0.1.29.md`。総合 95/100（S）。指摘 High 1 / Medium 14 / Low 16 のうち High+Medium を 14 件の PBI 化（231〜244）し、Low は本台帳に記録のみ。テストは各 PBI の BDD と fixture 先行方針に組み込む（Wave 3 の Test Experts は起動しない判断をレポートに記載）。

## 確定順位（着手順）

| 順位 | PBI | 候補 | RICE | 根拠 |
|---|---|---|---|---|
| 1 | `2026-11-18-231-chore-eval-pin-generator.md` | pin 表更新の機械化（make eval-pin） | 95（R=10 / I=0.5 / C=95% / E=0.05人週） | corpus を更新する開発者全員の手写しと列順不一致を消す。DX Advocate |
| 2 | `2026-11-18-232-refactor-company-vocabulary-single.md` | classify-rules の会社語彙一本化と文脈除外の集約 | 90（R=5 / I=1 / C=90% / E=0.05人週） | 次回語彙追加時に jobTitle ガードが置き去りになる潜在誤分類。等価リファクタ |
| 3 | `2026-11-18-233-fix-mail-word-boundary.md` | isEmailByName の mail 部分一致の締め直し | 68（R=2 / I=2 / C=85% / E=0.05人週） | mailing 系 name が email 確定になり誤注入が確定ルート。fixture 先行 |
| 4 | `2026-11-18-234-fix-register-autoclose-race.md` | 登録処理中の自動クローズ競合の解消 | 54（R=3 / I=1 / C=90% / E=0.05人週） | 保存失敗のエラー表示が detach 前提で消失。copy.js が禁じる disabled パターンも同時に直す |
| 5 | `2026-11-18-235-docs-warn-pattern-note.md` | ガイド注記表に warn-pattern 行を追加 | 50（R=2 / I=0.5 / C=100% / E=0.02人週） | PBI-210 の文言が利用者文書に未反映。ja/en 1 行ずつ |
| 6 | `2026-11-18-236-chore-lockfile-mirror-doc.md` | lockfile ミラー前提の文書化 | 45（R=2 / I=0.5 / C=90% / E=0.02人週） | 非公式ミラー npm.flatt.tech 全行固定が未文書化。Supply Chain |
| 7 | `2026-11-18-237-fix-dialog-a11y.md` | 非表示・クイック登録ダイアログの a11y | 41（R=3 / I=3 / C=90% / E=0.2人週） | レビュー唯一の High。フォーカス移動・告知・Esc・復帰・タイマー延長。RICE 順位は下がるが High 旗のため 234 完了後に前倒しを推奨 |
| 8 | `2026-11-18-238-fix-dismiss-dialog-dark-token.md` | dismiss-dialog をテーマトークンへ移行 | 38（R=4 / I=0.5 / C=95% / E=0.05人週） | 第 3 のスタイリング経路を解消しダークモード不整合をなくす |
| 9 | `2026-11-18-239-fix-exclusion-path-boundary.md` | isExcludedUrl のパス境界 | 36（R=2 / I=2 / C=90% / E=0.1人週） | 「このページだけ」が兄弟パスまで除外する fail-open |
| 10 | `2026-11-18-240-fix-chunk-total-timeout.md` | チャンク実行の run 合計タイムアウト予算の復元 | 36（R=2 / I=2 / C=90% / E=0.1人週） | PBI-33 の不変条件がリファクタで失効。非リトライ失敗後の打ち切りも同時に |
| 11 | `2026-11-18-241-fix-exclusion-writer-race.md` | 除外リストの複数ライター競合 | 34（R=4 / I=2 / C=85% / E=0.2人週） | オプション保存がクイック登録を黙って巻き戻す。Red Team + Data Integrity の統合指摘 |
| 12 | `2026-11-18-242-docs-banner-register-flow.md` | バナー X → クイック登録フローの文書化 | 20（R=2 / I=0.5 / C=100% / E=0.05人週） | 最短経路と prefix 自動範囲の開示。Docs + Compliance の統合指摘 |
| 13 | `2026-11-18-243-fix-pattern-redos-fallopen.md` | pattern 属性 ReDoS の fall-open 化 | 16（R=1 / I=2 / C=80% / E=0.1人週） | ページ支配下の正規表現の無防備解釈。単一タブ凍結にとどまる |
| 14 | `2026-11-18-244-feat-exclusion-undo-hint.md` | 永続登録の解除導線（undo ヒントまたは即時 undo） | 16（R=2 / I=1 / C=80% / E=0.1人週） | 不可逆操作が可逆操作と同列に見える。Ethics 指摘 |

## Low 指摘（PBI 化せず・記録のみ）

レポート「Low 指摘」節の 16 項目をここに参照として引き継ぐ（`plans/2026-11-18-0530-review-main-v0.1.29.md`）。着手条件: 対応ファイルを開く候補（E2E 基盤系・planner 系・messages 系の次の PBI）が来たときに、当該 Low を同梱するか判断する。

## 良好点の確認（抑制のため記録）

- egress ゲートの fail-closed・Wire の privacy 契約（WIRE_EXCLUDED_KEYS）・Shadow DOM closed + textContent 原則は新規 UI でも維持
- 保存データの読み込み互換（jobTitle バックフィル・mig- 安定 ID のシード不変性）を Legacy Bridge が全数確認
- options/main.ts は 541→492 行で解消方向。site/lib の責務分割と validate-guides のパリティ検査は模範的

## やらないこと（宣言）

- Wave 3（Test Experts）の即時テスト作成: 各 PBI の BDD と fixture 先行方針に組み込むため（プロジェクトのテスト規律に同じ）
- dismiss-dialog の分割（UX 指摘への System Architect の調整判断）: バナー起点の 1 クリックフローという目的から統合を維持し、同一ダイアログ内の a11y・トークン整備で解消する
- core/analyze.ts の移転: System Architect が侵食と判定しなかったため、次に analyze を開くときまで置く

## 最終レビュー（2026-11-18・全ブランチ）

- 14 件すべて実装・タスクレビュー完了後、全ブランチ最終レビュー（base 4eaac59..HEAD 43 コミット）を実施。「Ready to merge: With fixes」（Critical 1・Important 1・修正波割当て 2）
- Critical（fragment 付き exact 登録で undo が黙って無効化される）: PBI-239 の fragment 正形 2 種の残置と PBI-244 の完全一致削除の縫い目。修正波（fadcc40）で normalizeExclusionEntry を単一正形化（fragment 除去）+ 統合 fixture（RED 3 → GREEN）で解消。再レビュー「Ready to merge: Yes」
- 修正波は planner の最悪値表記（C(n+k-1, k-1) の算数記録・56d212a）と overlay.ts のタスク ID 参照除去（15b612d）も含む
- マージ後のフォローアップ: INDEX 節のアーカイブ、PBI-238 の OS 切替手動確認、等価 fixture（default port/userinfo/bare-origin）、officeLegendEligible 第 4 述語の集約、overlay.ts の PBI-209 由来タスク ID コメントの除去、タスク ID コメント運用の AGENTS.md 明文化
