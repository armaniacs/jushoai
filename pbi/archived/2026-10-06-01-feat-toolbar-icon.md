# PBI: ツールバーに拡張機能アイコンを導入する

## ユーザーストーリー
拡張機能のユーザーとして、ツールバーに JushoAI のアイコンが表示されることがほしい、なぜなら自分がインストールした拡張機能を一目で識別でき、操作対象の UI だと認識できるから

## ビジネス価値
- 現在はアイコン未設定のため、ツールバーに無地のプレースホルダーが表示され視認性が低い
- 価値の測定: `dist/chrome-mv3/manifest.json` に `icons` が含まれ、ツールバーに JushoAI のロゴが表示される

## BDD受け入れシナリオ

```gherkin
Scenario: ツールバーで JushoAI を識別できる
  Given JushoAI がインストール済みである
  When  ユーザーがツールバーを見る
  Then  JushoAI のロゴアイコンが表示される

Scenario: アイコンファイルの欠落や誤サイズを検出する
  Given public/icon/ に 16/32/48/128 のいずれかの PNG が欠けているか、実寸がファイル名と一致しない
  When  テストを実行する
  Then  テストが失敗して欠落を指摘する
```

## 受け入れ基準
- [x] `public/icon/` に `16.png` / `32.png` / `48.png` / `128.png` が存在する
- [x] 各 PNG の実寸（IHDR）がファイル名のサイズと一致する
- [x] `make build` 後の `dist/chrome-mv3/manifest.json` に `icons` が反映される
- [ ] ソース画像は `site/assets/logo.png`（512x512、`tmp/JushoAI_512-512.png` と SHA-256 同一）から生成する（tmp 原本なしのため再検証不可。`site/assets/logo.png` が 512x512 の追跡済みソースであることは確認済み）

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- なし（ツールバー表示はブラウザ上の挙動であり、自動化対象外。手動確認は samples ではなく chrome://extensions またはツールバーで行う）

### 統合テスト
- `make check` の build 後に `dist/chrome-mv3/manifest.json` の `icons` を目視確認する（WXT の自動検出はビルド時の挙動のため、テストからは分離）

### 単体テスト
- `tests/icons.test.ts`: 4 サイズの PNG が存在し、PNG シグネチャと IHDR の width/height が期待値と一致すること

## 実装アプローチ
- **Red-Green**: 存在検査テストを先に追加して失敗（public/icon/ 未作成のため）→ アイコン生成で成功
- **リファクタリング**: 対象外（生成物とテストのみ）

## 見積もり
1

## 技術的考慮事項
- 依存関係: なし
- テスタビリティ: PNG の IHDR はバイト位置 16-23 のビッグエンディアンで読めるため、画像ライブラリ不要の決定的テストになる
- 非機能要件: WXT 0.21.4 の `discoverIcons` は `public/icon/{N}.png` を自動検出して `manifest.icons` に反映する（`node_modules/wxt/dist/core/utils/manifest.mjs`）。config への明示的な `icons` 追加は不要

## 実装者向け注記

### 現状コードの確認
（2026-10-06 着手時に実行済み）
```bash
grep -rn "icon" src/ wxt.config.ts   # src/ にアイコン関連コードなし、manifest に icons 未設定
ls public/                            # public/ は存在しない
```
未実装であることを確認済み。

### 実装手順
1. `tests/icons.test.ts` を追加し、失敗することを確認する
2. `sips` で 4 サイズを生成する:
   ```bash
   for n in 16 32 48 128; do
     sips -z $n $n site/assets/logo.png --out public/icon/$n.png
   done
   ```
3. テストが成功することを確認する
4. `make check` を実行する
5. `dist/chrome-mv3/manifest.json` に `icons` が入ったことを確認する

### 落とし穴
- 512 のソースを `public/` 配下に置くと WXT が dist にコピーし配布物に含まれる。ソースは `public/` の外に置く
- 再生成源は `site/assets/logo.png`（git 追跡済み、SHA-256 で `tmp/JushoAI_512-512.png` と同一の 512x512 PNG）。実装計画 `docs/superpowers/plans/2026-10-04-docs-site.md` と同じ `sips -z` 手順で生成する
- `sips -z` は縦横の順（`-z height width`）だが正方形なので結果は同じ

## Definition of Done
- [x] `tests/icons.test.ts` がパスする
- [x] `make check` が通る
- [x] `dist/chrome-mv3/manifest.json` に `icons` が反映される
- [ ] コードレビュー完了
- [x] ドキュメント更新: 不要（README にアイコン手順の記載はスコープ外）
