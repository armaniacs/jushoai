# PBI: GitHub Pages と README で Chrome ウェブストアからのインストールを案内する

状態: 実装済み（`make check` / `make site` / `npx vitest run tests/site` green。コードレビューはユーザー作業として残す）

## ユーザーストーリー
JushoAI を検討している訪問者として、ストアからそのままインストールしたい、なぜなら zip を展開してデベロッパーモードで読み込む手順は手間で、何を読み込ませるのか不安だから

## 優先度
- 順位: 1 / 2
- RICEスコア: 270（Reach=100 / Impact=3 / Confidence=0.9 / Effort=1.0 人日）
- 根拠: サイドロード前提の導線が 1 クリック導入に変わり、導入率に直接効く。ストア URL と公開の事実が確定していて不確実性が低い。動画埋め込み（02）と同じ `site/i18n/{ja,en}.json` と `site/lib/landing.ts` を触るため、共有ファイルの衝突を避けて先に実施する

## 背景
- 拡張機能は Chrome ウェブストアに公開済み（2026-10-10 登録）: `https://chromewebstore.google.com/detail/jushoai/ijlccdbapahelcgpcopgkhdjhkkicbpl`
- しかしサイトと README は「ストアには公開していません」のまま:
  - `site/i18n/ja.json:79`（インストール手順の 1 番目）、`site/i18n/ja.json:84`（releases ボタン文言）
  - `site/i18n/en.json:79`、`site/i18n/en.json:84`
  - `site/content/ja/getting-started.md:13`、`site/content/ja/getting-started.md:15`
  - `site/content/en/getting-started.md:15`、`site/content/en/getting-started.md:17`
  - `README.md:19`、`README.en.md:19`
- ランディングのインストール節（`site/lib/landing.ts:80-85`）は GitHub Releases のボタン 1 つだけで、ストアへの導線がない
- ストアは Chrome・Edge 向け。Firefox はストアに出しておらず（`src/ai/browser-target.ts` の `selectableProviders` が `built-in` を外す）、GitHub Releases の zip を一時アドオンとして読み込む経路が残る
- ヒーローの eyebrow（`site/i18n/ja.json:11` / `site/i18n/en.json:11`）は「Chromium 系ブラウザ向けの拡張機能（Edge で動作確認）」。ストア公開を反映するなら文言の見直しも候補になる

## スコープ
- 含む: Pages（ランディングと「はじめに」ガイドの日英）、README の日英
- 含まない: 過去の設計書・実装計画（`docs/superpowers/plans/2026-10-04-docs-site.md` など）の「ストアには公開していない」記述は当時の記録なので触らない。Firefox 版のストア申請、CHANGELOG（リリース作業として別途）

## BDD受け入れシナリオ
Scenario: ランディングからストアへ行ける
  Given 訪問者が日本語のランディングを開いている
  When インストール節を見る
  Then Chrome ウェブストアへのリンクがあり、リンク先は https://chromewebstore.google.com/detail/jushoai/ijlccdbapahelcgpcopgkhdjhkkicbpl?hl=ja である
  And リンクは別タブで開き（rel="noopener"）、計測タグ utm_source は付かない

Scenario: はじめにガイドがストア導線と Firefox 導線を分ける
  Given 訪問者が「はじめに」ガイドを開いている
  When インストール節を読む
  Then Chrome・Edge はストアから入れると書かれている
  And Firefox は GitHub Releases の zip を一時アドオンとして読み込む手順が残っている
  And 「ストアには公開していません」という記述は日英どちらにも残っていない

Scenario: 英語ページも同じ事実を伝える
  Given 訪問者が英語のランディングと Getting started を開いている
  When インストールの説明を読む
  Then ストアへのリンクが ?hl=en 付きで示され、「not published in a store」は残っていない

Scenario: ストアを使わない環境の案内が壊れない
  Given Firefox の利用者である
  When README を読む
  Then GitHub Releases から zip を取る手順が引き続き書かれている

## 受け入れ基準
- [x] ランディングのインストール節に Chrome ウェブストアのリンクがあり、ja は `?hl=ja`、en は `?hl=en` で開く
- [x] ランディングのインストール手順（`install.steps`）がストア経由を先に案内し、サイドロード手順は Firefox 用として残る
- [x] `site/content/{ja,en}/getting-started.md` のインストール節がストア（Chrome・Edge）と Firefox（Releases の zip）を分けて書く。H2 の数は ja/en で同数のまま（`tests/site/content.test.ts:45` の検査を壊さない）
- [x] `site/i18n/{ja,en}.json` のキー構造・配列長・型が一致（`tests/site/i18n.test.ts` の `diffShape` が空）
- [x] `README.md` / `README.en.md` の未公開の記述が公開済みに変わり、Firefox の手順は残る
- [x] ストア URL から `utm_source=ext_sidebar` を外す（拡張機能サイドバー経由の計測を汚さない）
- [x] 外部リンクは別タブ・`rel="noopener"`（ガイドは `site/lib/markdown.ts` が自動付与、ランディングは手書き）
- [x] `make site` が green（ja/en の対応検査とリンク検査を含む）
- [x] `npx vitest run tests/site` が green
- [x] `docs/store-listing.md` の記載と矛盾しない（必要なら公開済みの一文を足す）

## テスト戦略（t_wadaスタイル）
- 単体（`tests/site/landing.test.ts`）: ストアリンクが ja/en それぞれ正しい `hl` 付き URL で 1 つだけ出る。`install.steps` にストアの語が入る。外部リンクに `rel="noopener"` が付く。追加した文言が `escapeHtml` を通る（既存の escape テストの mutator に足す）
- 統合（`tests/site/i18n.test.ts` / `tests/site/content.test.ts`）: ja/en のキー形状一致と H2 数一致
- ビルド（`tests/site/build.test.ts`、`make site`）: 生成 HTML にストア URL が含まれ、`check-site` が通る
- 手動: `make site-serve` で ja/en のボタンの見た目と遷移先を確認

## 実装者向け注記
### 現状コードの確認
- ランディングのインストール節は `site/lib/landing.ts:80-85`。文言は `site/i18n/{ja,en}.json` の `install` ブロック（ja: 76-86 / en: 76-86）
- ガイドは `site/content/{ja,en}/getting-started.md` の「インストール」/「Install」節。markdown-it は `html:false`（`site/lib/markdown.ts:34`）なので Markdown リンクだけを使う
- リンクの `target`/`rel` は `site/lib/markdown.ts:64-66` が http(s) に自動付与する。ランディングは手書きなので自分で付ける
- この PBI は走査対象のフォーム URL を持たないため、`samples/` の fixture 追加と `tests/integration/samples.test.ts` の追加は不要（CLAUDE.md の対象 URL ルールは適用外）

### 実装手順
1. `site/i18n/ja.json` / `en.json`: `install.steps` を書き換え、ストアボタンの文言キーを追加。ヒーローの eyebrow をどうするか決める
2. `site/lib/landing.ts`: インストール節にストアボタンを足す（GitHub Releases ボタンと並べる）。URL は言語ごとに `hl` を付ける
3. `site/content/{ja,en}/getting-started.md`: インストール節を「Chrome・Edge はストア」「Firefox は Releases の zip」に分ける（H2 は増やさない）
4. `README.md` / `README.en.md`: 19 行目付近の未公開文言を更新
5. `tests/site/landing.test.ts`: ストアリンクの検証と escape テストの mutator を追加
6. `docs/store-listing.md`: 冒頭に公開済みであることを一文（任意）

### 落とし穴
- i18n は ja/en のキー・配列長・型が完全一致していないとビルドが落ちる（`site/lib/build-site.ts` の `loadStrings` → `diffShape`、`tests/site/i18n.test.ts`）
- ガイドの H2 数は ja/en で一致必須（`tests/site/content.test.ts:45`）。節を足すなら両言語に足す
- ランディングの section id は `tests/site/landing.test.ts:17,76` が列挙している。id を増やすなら両方を更新する
- ストア URL は `utm_source` を外す。拡張機能側（設定ページ・ポップアップ）のリンクはこの PBI では変えない
- Firefox の記述を消さない。ストアは Chrome・Edge のみ

## 見積もり
2pt（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了（ユーザー作業）
- [x] ドキュメント更新済み
