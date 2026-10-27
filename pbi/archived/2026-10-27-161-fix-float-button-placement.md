# PBI: フローティング入力ボタンを入力欄に重ねない配置にする

## 背景

フォーム上で「JushoAI で入力」ボタン（`src/ui/button.ts` の `mountButton`、位置は `src/ui/position.ts` の `computeButtonPosition`）が姓名欄の入力部に覆いかぶさり、文字が見えず操作も邪魔になる報告があった。添付画像では姓/名の2カラム行の中央にボタンが乗り、名の入力欄を塞いでいる。

原因の見立て（深掘りで補正）: 主因は右側配置の衝突の可能性が高い。`computeButtonPosition` の右側判定（`src/ui/position.ts:17`）はビューポート幅しか見ておらず、アンカーはフォームごと1要素（`src/entrypoints/content.ts:492-493`）のため、2カラム姓/名行の姓にアンカーが来ると右配置が名の入力部に乗る。副因として、右側に入らない場合のフォールバックも `left = clamp(anchor.left)` で真上/真下に置き、密なレイアウトでは隣欄と重なる。いずれも衝突回避（他コントロールとの重なり判定）がない。

## ユーザーストーリー

フォーム入力者として、入力欄を塞がない位置に「JushoAI で入力」ボタンが出てほしい、なぜなら重なると値が見えず入力・確認の手が止まるから。

## 優先度

- 順位: 1 / 3
- RICEスコア: 600（Reach=30 / Impact=3 / Confidence=80% / Effort=0.12人月）
- 根拠: 3件中で唯一「塞がれて使えない」を根から解消する。Impact=3（圧倒的）。162（半透明）は見えるだけ・運用は塞がれたまま、163（ドラッグ）は回避の手間が残るため、本件が最優先。依存はなし（162・163の前提）。

## BDD受け入れシナリオ

```gherkin
Scenario: 2カラム姓名欄でボタンが入力部を塞がない
  Given 姓/名が横並びで右側にボタンの幅が入らないフォームがある
  When 「JushoAI で入力」ボタンを表示する
  Then ボタンの矩形がどのテキスト入力欄・セレクト欄の矩形とも重ならない

Scenario: 右側に余白がある場合は従来通り右に置く
  Given アンカー右側にボタンの幅+GAPが入るフォームがある
  When ボタンを表示する
  Then ボタンはアンカー右に垂直中央で置かれる（既存の配置を保つ）

Scenario: 上にも下にも置けない狭い画面では画面内に収まる
  Given 上下左右いずれも余裕がない狭いビューポートがある
  When ボタンを表示する
  Then ボタンはビューポート内に収まり、可能な限り重なりが最小の位置に置かれる
```

## 受け入れ基準

- [x] 添付画像相当の2カラム姓名フォームでボタンが入力欄と重ならない（単体＋実ブラウザ E2E で実測。E2E は tests/e2e/chrome.e2e.ts の two-column-form フィクスチャ）
- [x] 右に余白がある場合の既存配置（右・垂直中央）は変わらない
- [x] スクロール・リサイズ後も重ならない位置に追従する（`reposition` 経路）
- [x] 既存テスト `tests/ui/position.test.ts`・`tests/ui/button.test.ts` が通る

## テスト戦略（t_wadaスタイル）

### E2Eテスト

- 2カラムのサンプルフォームでボタンを出し、各入力欄の矩形とボタンの矩形の重なりがゼロであること

### 統合テスト

- `mountButton`＋実アンカーで `reposition()` 後のホスト矩形が入力欄と重ならないこと（jsdom または実ブラウザ）

### 単体テスト

- `computeButtonPosition` に重なり回避の fixture を追加: 右不適合＋2カラム隣接欄、上下不適合、非有限入力
- 既存の右配置・フォールバック・クランプの期待値は維持

## 実装アプローチ

- **Outside-In**: E2E（重なりゼロ）から開始し、失敗を確認してから実装
- **Red-Green-Refactor**: まず `position.test.ts` に失敗する重なり fixture を足す
- **リファクタリング**: グリーンになるたびに配置条件を整理

## 見積もり

0.12人月（要チームでの見積もり）

## 技術的考慮事項

- 依存関係: なし（162・163は本件の後に実施）
- 対象: `src/ui/position.ts`、`src/ui/button.ts`（`reposition`）、`tests/ui/position.test.ts`
- 非機能要件: 固定ホスト・`setProperty(..., 'important')` の書き方・`isTrusted` クリックガードは変えない。Shadow DOM（closed）・`textContent` の約束は維持

## 深掘りで確定した設計判断（2026-10-27）

- どの位置も重ならない場合: 最後の良い位置を維持し、162の半透明で緩和する（退避・縮小はしない。ユーザー確定）
- 衝突判定の適用範囲: ボタン自身のフォームコンテナ内の可視 input/select に限定し、document相対rectを sync 時にキャッシュする。`reposition` はスクロール毎フレームで走る（`src/ui/panel.ts:159-185`、rAF coalescing）ため、毎フレームの全欄スキャンを避ける
- 判定対象から display:none 等の非表示欄（ゼロ矩形）を除外する
- 既存テストは bare anchor（他欄なし）で衝突リスト空のため挙動不変、通る見込み。E2E は既存 samples の2カラム姓名フォーム（`demo-registration.html` 等）を使い、新規ページは作らない

## 実装者向け注記

### 現状コードの確認（着手前に必ず実行すること）

```bash
grep -rn "computeButtonPosition\|mountButton" src/ tests/
```

未実装ではなく既存配置の改善であることを確認してから着手すること。`computeButtonPosition` のフォールバック分岐（右不適合→上下）が重なりの発生点。

### 実装手順

1. E2E/統合の重なりゼロ検証を赤で書く（2カラム fixture）
2. `computeButtonPosition` の入力に衝突回避の材料を足す（避けるべき矩形リスト。右配置・上・下の候補を順に試し、どの欄とも重ならない最初の候補を採る。右配置が主因のため右側も検査対象）
3. `button.ts` の `reposition` で必要な材料（隣接欄の矩形等）を渡す
4. グリーン後にスクロール・リサイズ追従で再発しないことを確認

### 落とし穴

- ホストは `position: fixed`＋`all: initial !important` のため、座標は `setProperty(name, value, 'important')` で書くこと（通常の inline 代入は負ける）
- `anchor.getBoundingClientRect()` がゼロ矩形のときは既存通り最後の良い位置を保つ（画面隅に飛ばさない）
- 上下クランプで `top: 0` に丸めるとアンカーを覆うため、既存の「下に回す」判断を残す

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了（checking-team 2026-10-27・9レビュアー・指摘 High 1/Medium 11 はすべて修正済み・Low は記録のみ）
- [x] ドキュメント更新済み（README の使い方に重ならない配置を追記）
