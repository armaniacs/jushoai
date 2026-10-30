# PBI: タブ到達メッセージ送信の seam（backlog 残置）

## ユーザーストーリー
開発者として、active タブへのメッセージ送信（query→id ガード→sendMessage→catch）を 1 つの seam に束ねたい、なぜなら popup 2 経路と options の onImportDraft で同骨格が 3 手書きされ、次のタブ宛てアクション追加で 4 つ目のコピーが生まれるため

## 優先度
- 順位: 13 / 13
- RICEスコア: 5（Reach=1 / Impact=0.5 / Confidence=50% / Effort=0.05人月）
- 根拠: 重複は薄く、失敗文言が表面ごとに意図的に異なるため効果は将来のコピー防止に留まる。Speculative

## BDD受け入れシナリオ
Scenario: 3 分岐が同一骨格を通る
  Given query 空 / sendMessage 拒否 / res.ok=false の 3 分岐
  When 各表面から送信する
  Then 同一骨格が通り、文言の区分（表面ごとに意図的に別）は呼び出し側に残る

## 受け入れ基準
- [ ] askActiveTab 1 関数（query→ガード→sendMessage→catch→undefined 化）に束ねる
- [ ] 「id ガード失敗」と「sendMessage 拒否」と「res.ok=false」の文言区分を崩さない
- [ ] popup.test.ts の stub（vi.stubGlobal('chrome')）経路が成立する

## テスト戦略
- 単体: popup.test.ts 形式の stub で 3 分岐の骨格の等しさを pin（文言は表面ごとに固定）

## 実装アプローチ
- seam に束ね、メッセージ型と失敗文言だけを差分にする。onImportDraft の catch は呼び出し側（onImportFailed）が握る現行区分を維持

## 見積もり
0.05人月

## 技術的考慮事項
- seam が「sendMessage 拒否」と「res.ok=false」を同一値に落とすと options の 3 文言区分が崩れ、popup.test.ts の reason 解釈テストが落ちる（最大の落とし穴）

## 残置の判断
- 文言区分の崩れリスクが残る（Confidence 50%）ため、次のタブ宛てアクション追加時に着手段階を確認する。現状の 3 経路は動作しており、摩擦は将来のコピー防止に限られる

## Definition of Done
- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み
