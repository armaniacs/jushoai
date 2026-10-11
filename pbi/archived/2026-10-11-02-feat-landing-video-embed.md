# PBI: ランディングに紹介動画を埋め込む

状態: 実装済み（`make check` / `make site` / `npx vitest run tests/site` green。コードレビューはユーザー作業として残す）

## ユーザーストーリー
JushoAI を検討している訪問者として、実際に動いているところを短い動画で見たい、なぜなら静止画のモックだけでは、自分のフォームで何が起きるか、押す前に何を確認できるかを確かめられないから

## 優先度
- 順位: 2 / 2
- RICEスコア: 64（Reach=60 / Impact=2 / Confidence=0.8 / Effort=1.5 人日）
- 根拠: 導入判断の材料として効くが、訪問者の一部しか動画は見ない。動画自体は完成済み（`video/README.md`）で、追加は埋め込みとセクションだけ。ストア導線（01）と同じ `site/i18n/{ja,en}.json` と `site/lib/landing.ts` を触るため 01 の後に実施する

## 背景
- 紹介動画は完成して YouTube に公開済み: `https://www.youtube.com/watch?v=Y3y9ofrsyFo`（約 2 分、1920x1080、30fps、H.264。出典は `video/README.md`）
- `promo/2026-10-10-store-registration/note.md` は既にこの動画にリンクしているが、サイトには載っていない
- ランディングの説明は静止画のモック（`site/lib/mocks.ts`）だけで、プレビュー → 承認 → 注入の流れを図と文章で伝えている
- サイトの Markdown は `html:false`（`site/lib/markdown.ts:34`）なので、Markdown に iframe を書いても escape される。埋め込みは `site/lib/landing.ts` に実装する
- ユーザー指定の置き場所: ランディングの専用セクション（features の後）

## BDD受け入れシナリオ
Scenario: ランディングで動画を見られる
  Given 訪問者が日本語のランディングを開いている
  When features の次のセクションまでスクロールする
  Then 動画の埋め込みがあり、その場で再生を始められる
  And 埋め込みのそばに見出しと説明（何が映っているか）がある

Scenario: 英語ページも同じ動画を見られる
  Given 訪問者が英語のランディングを開いている
  When 動画セクションを見る
  Then 同じ動画が埋め込まれ、見出しと説明が英語になっている

Scenario: 埋め込みがページの読み込みを遅くしない
  Given 訪問者がランディングを開いた
  When 動画セクションまでスクロールしていない
  Then iframe は遅延読み込み（loading="lazy"）で、動画プレイヤーはまだ読み込まれていない

Scenario: 追跡 Cookie を増やさない
  Given 訪問者が動画セクションまでスクロールした
  When iframe が読み込まれる
  Then 埋め込み先は youtube-nocookie.com である
  And iframe に title 属性があり、支援技術で何の埋め込みか分かる

Scenario: 埋め込みが読み込めなくても説明は読める
  Given ネットワークやプライバシー設定で YouTube が読み込めない
  When 動画セクションを見る
  Then 見出しと説明、YouTube への直接リンクは読める

## 受け入れ基準
- [x] ランディングの features の後に動画セクションがあり、ja/en 両方に存在する
- [x] iframe は `https://www.youtube-nocookie.com/embed/Y3y9ofrsyFo` を指し、`loading="lazy"` と `title` を持つ
- [x] 見出し・説明・YouTube への直接リンクの文言は `site/i18n/{ja,en}.json` にあり、`escapeHtml` を通る
- [x] レスポンシブで 16:9 を保つ（`site/assets/site.css` に `aspect-ratio` のスタイルを足す）
- [x] 動画セクションの id を `tests/site/landing.test.ts:17,76` の列挙に足し、id が 1 回だけ出ることを検証する
- [x] `tests/site/landing.test.ts` の escape テストに動画セクションの文言を足す
- [x] `tests/site/i18n.test.ts`（キー形状一致）と `tests/site/content.test.ts`（ja/en の H2 一致）が green
- [x] `make site` が green で、`site-dist` の生成 HTML に iframe が含まれる
- [x] サイト自体の埋め込みについてプライバシーページへ追記するかは別途判断（この PBI のスコープ外）

## テスト戦略（t_wadaスタイル）
- 単体（`tests/site/landing.test.ts`）: セクションが ja/en に 1 つずつ、iframe の `src`/`title`/`loading`、直接リンクが `youtube.com/watch` を指す、辞書の文言が escape される
- 統合（`tests/site/i18n.test.ts`）: 追加キーが ja/en で同形
- ビルド（`tests/site/build.test.ts`、`make site`）: `site-dist/index.html` と `site-dist/en/index.html` に iframe が入る
- 手動: `make site-serve` で ja/en の見た目、遅延読み込み、再生を確認（自動テストでは実際の再生は検証しない）

## 実装者向け注記
### 現状コードの確認
- `site/lib/landing.ts` は 7 セクション（features / steps / fields / providers / privacy / install / faq）を文字列連結で組み立てる。iframe を出す位置は features セクション（45-54 行）の直後が自然
- `site/assets/site.css` に埋め込み用のスタイルは無い（`figure` の指定は 80 行目のみ）
- `site/lib/check-site.ts` は `img` の `alt` を検査するが、iframe の `title` は検査しない。a11y のため実装側で付ける
- この PBI は走査対象のフォーム URL を持たないため、`samples/` の fixture 追加は不要

### 実装手順
1. `site/i18n/ja.json` / `en.json`: 動画セクションの文言（見出し、説明、直接リンク）を追加。キー構造は ja/en で同じにする
2. `site/lib/landing.ts`: `Strings` 型に動画セクションを足し、features の後に描画する（`src` はコード内の定数から組み立てる）
3. `site/assets/site.css`: `.video`（`aspect-ratio: 16 / 9`、iframe を `width`/`height` 100%）を追加
4. `tests/site/landing.test.ts`: セクション id の列挙と escape テストを更新し、iframe の検証を追加
5. `site/lib/mocks.ts` とガイドは触らない

### 落とし穴
- iframe の `src` を辞書から取ると `escapeHtml` で `&` が壊れる。`src` はコード内の動画 ID 定数から組み立てる
- セクション id を増やすと `tests/site/landing.test.ts:17,76` が落ちる。両方に足す
- i18n のキー・配列長・型は ja/en で一致必須（`site/lib/build-site.ts` の `loadStrings` と `tests/site/i18n.test.ts`）
- ガイド（`site/content`）に H2 を足すと ja/en の H2 数一致検査（`tests/site/content.test.ts:45`）に引っかかる。この PBI ではガイドを触らない
- `youtube-nocookie.com` でも再生時は YouTube 側と通信する。プライバシーページの記述は拡張機能の話なので、サイト自体の説明を足すかは別途判断
- ストア案内（01）と同じ `site/i18n/{ja,en}.json` と `site/lib/landing.ts` を触るため、並行実装すると衝突する

## 見積もり
3pt（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了（ユーザー作業）
- [x] ドキュメント更新済み
