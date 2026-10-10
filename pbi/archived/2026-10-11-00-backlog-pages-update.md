# GitHub Pages 更新のバックログ（2026-10-11）

出典: ユーザー要求（YouTube の紹介動画を埋め込む／Chrome ウェブストア登録を案内する）と、`promo/2026-10-10-store-registration/`、`docs/store-listing.md`、`video/README.md`、サイト実装（`site/`）

確定順位に基づき、個別 PBI は連番付きで作成済み。ファイル名の `NN` が着手順。

結果: 01・02 とも実装済みでアーカイブ済み。`make check`（typecheck / 1052 テスト / 両ブラウザ build / manifest 検査 / web-ext lint）と `make site`（26 ページ生成 + 検査）が green。コードレビューはユーザー作業として残る。

## 優先順位表（RICE）

| 順位 | 候補 | PBI ファイル | スコア | 種別 | 根拠 | 依存 |
|---|---|---|---|---|---|---|
| 1 | Chrome ウェブストアからのインストール案内（Pages＋README） | `2026-10-11-01-feat-store-announcement.md` | 270 | feat | サイドロード前提の導線が 1 クリック導入に変わり、導入率に直接効く。公開の事実と URL が確定していて不確実性が低い | なし |
| 2 | ランディングへの紹介動画の埋め込み | `2026-10-11-02-feat-landing-video-embed.md` | 64 | feat | 導入判断の材料として効くが、動画を見るのは訪問者の一部。動画は完成済みで追加は埋め込みだけ | なし（ただし共有ファイルのため 01 の後に実施） |

## 採点の前提

- Reach: 1 か月あたりの Pages 訪問者を 100 とした相対値。ストア導線は全訪問者に効くので 100、動画は見る人に限られるので 60
- Impact: 3=圧倒的 / 2=大きい / 1=中 / 0.5=小 / 0.25=極小
- Confidence: 01 は公開済みの事実と URL が確定しており 0.9。02 は動画の視聴率が未知のため 0.8
- Effort: 人日換算。01 は文言とリンクの置換が中心で 1.0、02 はセクション追加・CSS・テスト更新で 1.5
- 依存関係: なし。ただし両方が `site/i18n/{ja,en}.json`、`site/lib/landing.ts`、`tests/site/landing.test.ts` を触るため、並行ではなく 01 → 02 の順で実装する

## なぜなぜ分析の結論（推定の根拠）

### なぜ動画を埋め込むのか（02 の Impact）

- なぜ → ランディングは静止画のモック（`site/lib/mocks.ts`）だけで、操作の流れが伝わりにくい
- なぜ困るのか → 拡張機能は権限と入力内容への不安が大きく、動きを確かめる前にインストールされない
- なぜ今か → 約 2 分の動画が完成し YouTube に公開済み（`promo/2026-10-10-store-registration/note.md`）。埋め込みの追加コストが小さい
- 解 → 動画は導入判断の材料。Impact=2。ただし離脱を避けるため `loading="lazy"` を必須にする

### なぜ `youtube-nocookie.com` を使うのか（02 の実装方針）

- なぜ気にするのか → この製品の訴求点はプライバシー。ランディングのプライバシー節とプライバシーページが「外部への通信はありません」と述べている
- なぜ矛盾しうるのか → 通常の YouTube 埋め込みは閲覧時点で Google への通信と Cookie を起こす
- なぜ許容できるのか → それは拡張機能ではなくサイト閲覧時の通信。`youtube-nocookie.com` なら再生前の追跡 Cookie を避けられる
- 解 → `https://www.youtube-nocookie.com/embed/Y3y9ofrsyFo` を `loading="lazy"` と `title` 付きで埋め込む。クリックまで iframe を読み込まないファサードは、動画を見せる目的に対してコストが見合わないため採らない。サイト自体の埋め込みをプライバシーページに書くかは別 PBI

### なぜ `utm_source=ext_sidebar` を外すのか（01 の実装方針）

- なぜ付いているのか → 拡張機能のサイドバーからストアへ飛ぶときの計測タグ
- なぜ外すのか → サイトから張ると、サイト経由の流入が「拡張機能サイドバー経由」として計測され、データが濁る
- 解 → `https://chromewebstore.google.com/detail/jushoai/ijlccdbapahelcgpcopgkhdjhkkicbpl` を基本形にし、ja は `?hl=ja`、en は `?hl=en` を付ける

### なぜ Firefox の手順を残すのか（01 のスコープ）

- なぜ問題か → 「はじめに」ガイドは Chrome・Edge・Firefox の 3 経路を 1 節に書いている。ストア案内で書き換えると Firefox の手順が浮く
- なぜ Firefox を残すのか → Firefox 版はビルドと E2E が済んでいるがストアには出しておらず（`built-in` AI 非対応）、GitHub Releases の zip を一時アドオンとして読み込む経路が必要
- 解 → 「インストール」節の中で「Chrome・Edge はストア」「Firefox は Releases の zip」と分岐させる。H2 は増やさず、ja/en の H2 数一致検査（`tests/site/content.test.ts:45`）を壊さない

## スコープ外（別 PBI 候補）

- プライバシーページに、サイト自体が埋め込みで外部と通信することを書く
- Firefox 版のストア公開（アドオン配布）
- 拡張機能内（設定ページ・ポップアップ）のストアリンクの URL 統一
- 過去の設計書・実装計画にある「ストアには公開していない」記述の更新（当時の記録のため触らない）
