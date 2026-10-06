# nav hash 読みの helper 抽出

種別: refactor
優先度: 順位 3/3、RICE 2.0（Reach=2 / Impact=0.5 / Confidence=1.0 / Effort=0.5）
根拠: hash の読み・ guard・正規化が2箇所に重複し、3箇所目の読み手が写経しやすい
依存: なし

## ユーザーストーリー

設定画面の保守者として、hash 読みの契約を1関数で知りたい。なぜなら `initialPage` と `hashchange` が同じ形を繰り返しているから。

## 背景

- `src/entrypoints/options/nav.ts:23-31`: `initialPage` 内の hash 読み・guard・フォールバック
- `src/entrypoints/options/nav.ts:137-143`: `hashchange` リスナー内の同形の読み・guard

## BDD受け入れシナリオ

Scenario: 初期表示の挙動が変わらない
  Given 正しい hash と不正な hash
  When 設定ページを開く
  Then 正しい hash はそのページ、不正・空はプロファイルになる

Scenario: hash 変更の挙動が変わらない
  Given 開いている設定ページ
  When hash が変わる
  Then 対応ページに切り替わり、不正 hash は無視される

## 受け入れ基準

- [x] hash 読みが `readPageFromHash` 相当の1関数に集約される
- [x] 初期表示・hash 変更の挙動が変わらない
- [x] 既存テストが green を維持する

## テスト戦略

- vitest: `tests/options/` の nav 系に初期表示と hash 変更の parity を追加する

## 見積もり

0.5pt

## Definition of Done

- [x] helper に集約され、挙動不変である
- [x] BDDシナリオの2件がテストで裏付けられている
- [x] 既存テストが green である
