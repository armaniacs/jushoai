# PBI: 同意検証がパネル host を掴むようにする（ヒット判定の修正を含む）

状態: 未着手（E2E `firefox: fill flow` 2 件の失敗から起票。診断テストで中止理由「覆われ」を確認）
起票日: 2026-10-11

## 真因の訂正記録

- 初期仮説（シャドウ内ノードのリターゲット欠落）は外れ。診断のヒット正体特定により、ヒットはプレビュー host 自身（`right:16px・幅360` と一致）と確定した
- 真因: ページ内に `[data-jushoai]` host が 2 つ（フォームボタン・パネル）あり、`getHost()` が先頭（フォームボタン側）を掴んでいた。プレビュー host へのヒットを別要素と誤判定する偽陰性
- 対応: `PreviewHandle.getHost` 窓を追加し、ゲートはパネル host を検証する。ヒット判定の `isOwnTopmost`（内側ノード受容）は防御として維持する

## ユーザーストーリー

入力する利用者として、覆いのない正常なパネルでの適用が中止されないでほしい。なぜなら、`elementFromPoint` がシャドウ内の実ノードを返すブラウザでは、`host.contains` が境界を越えられず正常系を偽陰性にするから。

## 優先度

- 順位: 1 / 全候補 1 件
- RICEスコア: 150（Reach=100 / Impact=3 / Confidence=100% / Effort=2）
- 根拠: E2E 2 件が失敗する回帰。単体テストは hitTest を fake していたため実リターゲットを検証できていなかった

## BDD受け入れシナリオ

```gherkin
Scenario: リターゲットしないブラウザでも正常適用できる
  Given ヒットテストがシャドウ内の実ノードを返す
  When  利用者が適用を試みる
  Then  自 UI として認められ、承認どおりに値が注入される

Scenario: 別シャドウツリーの覆いは引き続き拒否される
  Given 別ツリーのノードが最前面にある
  When  利用者が適用を試みる
  Then  注入は中止され、理由が表示される
```

## 受け入れ基準

- [x] ヒット判定が `host.contains` または「hit の root が ShadowRoot かつ `root.host` が自 host」のいずれかで認める
- [x] 実ノード受容・別ツリー拒否の単体テストが追加されている
- [x] E2E `firefox: fill flow` 2 件が通る
- [x] `make check` が通る

## テスト戦略

- 単体: 実 shadow root を使う受容・拒否の 2 分岐（fake の hitTest では再現しない）
- E2E: 実 Firefox で fill flow 2 件が緑になること

## 見積もり

2pt（要チームでの見積もり）

## Definition of Done

- [x] 全 BDD シナリオが自動テストとして実装されパスする
- [x] E2E の fill flow が緑である
- [x] `make check` が通る
- [x] コードレビュー完了
