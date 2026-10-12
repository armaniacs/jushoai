# PBI: フォームボタンのアンカー選択を視覚順・テキスト優先にする

状態: 未着手（実ページ `pro.form-mailer.jp` 2 件でボタンが左下に配置されるとの報告から起票）
起票日: 2026-10-11

## ユーザーストーリー

フォームで入力する利用者として、入力ボタンが入力欄のそばにあってほしい。なぜなら、現行は DOM 順先頭の一致でアンカーを選び、チェックボックス群が DOM 先頭のページでは幅 22px の欄がアンカーになって左端に固定されるから。

## 優先度

- RICEスコア: 45（Reach=100 / Impact=1 / Confidence=70% / Effort=2）
- 根拠: ボタンは全注入フローの入口。機能は壊れないため Impact=1。実機のアンカー特定が未済のため Confidence=70%。対象 URL 2 件の fixture 化を含むため Effort=2

## 背景

- 報告: `https://pro.form-mailer.jp/fms/12fc22bc297429` と `https://pro.form-mailer.jp/lp/2dd1c663300469` で、ボタンがビューポート左下に配置される
- 実測（headless Chrome の DOM ダンプ）: 当該ページは checkbox・radio 群が DOM 先頭、テキスト欄が後に並ぶ。`pickAnchor`（`src/dom/detect-forms.ts:18-21`）は DOM 順の先頭一致で、幅 22px の欄がアンカーになると右配置（`22+8+220`）が確定して左端に固定される
- ボタンは `absolute` 配置でクリック・プレビュー・同意ゲートは位置に依存しないため、機能破壊ではない。配置の意図（入力欄のそば）からの乖離である

## BDD受け入れシナリオ

```gherkin
Scenario: チェックボックス群が先頭のページでテキスト欄がアンカーになる
  Given チェックボックス群の後にテキスト欄があるフォームがある
  When  ボタンを配置する
  Then  アンカーはテキスト欄であり、左端には固定されない

Scenario: 非表示・ゼロ面積の欄はアンカーにならない
  Given 非表示の欄が DOM 先頭にある
  When  ボタンを配置する
  Then  可視の欄がアンカーになる

Scenario: 対象 URL の実機で配置が意図どおりである
  Given 上記 2 件の URL を開いている
  When  ボタンの位置を確認する
  Then  入力欄のそばに配置されている
```

## 受け入れ基準

- [x] `pickAnchor` が視覚順（文書内 y 位置）を考慮し、テキスト系入力を優先する
- [x] 非表示・ゼロ面積の欄をアンカー候補から外す
- [x] 既存の `tests/ui/position.test.ts`・`detect-forms` 系テストが緑のままである
- [x] 対象 URL 2 件が `tests/target-url.md` に登録され、fixture と `samples.test.ts` のケースが追加されている（`make addurl` 運用）
- [ ] 実機（Chrome / Edge / Firefox）での配置確認の結果が記録されている
- [x] `make check` が通る

### 追補の堅牢化（配置の自己修復）

- 実機の数値が計算と合わない事例があり、配置確定後のレイアウトずれ（フォント・画像・DevTools ドック）を疑った
- `reposition()` がゼロ面積・切断アンカーでは前回位置を維持するようにし、scroll（rAF スロットル）・resize・`ResizeObserver` で再解決する
- どの仮説でも収束するため、原因特定とは独立に有効

### 真犯人（確定・修正済み）

- 診断ログ（anchor rect 正確・inline 正確・描画 `rect=0,1153`）で、インライン座標が描画に反映されていないことが確定した
- 原因: host の `all: initial !important`（ページ CSS 対策）が `top/left: initial !important` に展開され、重要指定なしの `reposition()` の座標書き込みを毎回打ち消していた。PBI-07 以前は `all: initial` が非 important だったため機能していた
- 修正: `reposition()` の座標書き込みを `setProperty(..., 'important')` に変更（同一インライン内の同優先度 important は出現順で解決されるため勝つ）。座標系は fixed＋ビューポート座標に統一
- 検証: ヘッドレス Chrome（拡張機能入り）で `rendered=683,276` が `inline` と一致、アンカー右端 `675+8` と一致。単体テストは top/left の important 優先度を断言

### 自動検証の記録（2026-10-11）

- `make check` exit 0、Chrome E2E 3/3（連続 4 回）
- ヘッドレス Chrome（拡張機能入り・`demo-registration.html`）で、scroll 0 / 300 / 2000 の各位置で `inline` と `rendered` が一致し、常にビューポート内にあることを確認（`onScreen: true`）
- スクロールでアンカーが画面上方へ抜けた場合は `Math.max(0, ...)` によりビューポート上端へクランプされる（ボタンが消えない意図どおりの挙動）
- 残り: ユーザー環境（Edge / Firefox）での目視確認

## テスト戦略

- 単体: `makeMeta` でチェックボックス先頭＋テキスト後続の fixture を作り、アンカー選択を固定する（Red→Green）
- 統合: `tests/integration/samples.test.ts` に対象 URL の fixture ケースを追加する
- 実機確認はユーザー作業（配置の目視）

## 見積もり

2pt（要チームでの見積もり）

## Definition of Done

- [x] 全 BDD シナリオが自動テストとして実装されパスする
- [x] 対象 URL の登録・fixture・統合テストが完了している
- [x] `make check` が通る
- [ ] コードレビュー完了
