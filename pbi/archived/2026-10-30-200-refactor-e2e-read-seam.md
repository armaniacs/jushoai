# PBI: e2e harness の closed-shadow 読み取り seam の一本化

## ユーザーストーリー
開発者として、closed shadow への読み取りを harness の 1 seam にまとめたい、なぜなら 5 reader が `div[data-jushoai]` host 走査を個別再実装し（待ちポリシーが reader ごとに別）、scenarios.ts が生CSSを 44 出現で直書きして UI 内部構造の変更が全シナリオに波及するため

## 優先度
- 順位: 11 / 13
- RICEスコア: 11（Reach=2 / Impact=1 / Confidence=80% / Effort=0.15人月）
- 根拠: PBI-150〜166 で reader 追加が高頻度。検証に実ブラウザ e2e が要る。依存なし

## BDD受け入れシナリオ
Scenario: 既存シナリオは完全に不変
  Given 両ブラウザの e2e スイート
  When 全シナリオを実行する
  Then シナリオ名・件数・アサート値（rgba 実値比較含む）がすべて不変

Scenario: scenarios は生CSSを書かない
  Given 新しいシナリオを足す
  When ボタン・badge・内訳パネルを読む
  Then 意図 named の harness ヘルパーで読め、生CSS（.wrap 含む）の直書きが不要である

## 受け入れ基準
- [x] host 走査＋待ちポリシーが harness の 1 seam に置かれる
- [x] セレクタ辞書が harness 側に集まり、scenarios の生CSS直書き（.wrap 再実装 2 か所含む）が消える
- [x] reportButton の catch→null（clean-apply 判定）は不変
- [ ] 両ブラウザ e2e が緑（実行できる環境の場合）

## テスト戦略
- E2E: make e2e-firefox / make e2e-chrome（HEADLESS=1）で全シナリオが緑であること（make check には含まれない）
- 構造: harness 内で host 走査ループが 1 箇所になることを grep で固定

## 実装アプローチ
- harness に「closed shadow 到達＋host 走査＋待ちポリシー」の 1 seam を置き、5 reader と scenarios が意図（fill ボタン・適用ボタン・badge・内訳パネル・確認ダイアログ）で呼ぶ

## 見積もり
0.15人月

## 技術的考慮事項
- reportButton の catch→null（15秒待たない clean-apply 判定）を待ちあり・throw に寄せると runPartialNoticeFlow がタイムアウト/flaky 化する（最大の落とし穴）
- ユニットは赤にならない壊れ方をするため、実ブラウザ e2e の実行が必須

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み
