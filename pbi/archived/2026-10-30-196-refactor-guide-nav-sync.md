# PBI: ガイド同期トリガーの nav 一方向化

## ユーザーストーリー
開発者として、nav 遷移からガイドへ通知する一方向にしたい、なぜなら遷移の所有者は nav.ts なのにガイドへの通知だけ main.ts の手動リスナー（順序契約はコメント 2 か所でしか保持されない）で守られ、新トリガーを足す者が main.ts 編集を忘れるとガイドが stale になるため

## 優先度
- 順位: 7 / 13
- RICEスコア: 24（Reach=1.5 / Impact=1 / Confidence=80% / Effort=0.05人月）
- 根拠: 判定は PBI-170 で集約済み、残ったトリガー側の実在の順序契約を構造に落とす。依存なし

## BDD受け入れシナリオ
Scenario: 挙動は不変
  Given プロファイルページが表示されている
  When AI タブへ切り替えて戻る
  Then ガイドは非表示→再表示される（既有 guide-visibility テストどおり）

Scenario: 所有者経由の同期が 1 本
  Given nav 遷移が起きる
  When setActivePage が呼ばれる
  Then ガイド同期が遷移の所有者経由で 1 回走る（main.ts の手動リスナーなし）

## 受け入れ基準
- [x] main.ts の手動リスナー 2 つ（nav click・hashchange）と順序コメントが消える
- [x] nav 遷移の所有者がガイド同期を発火する（コールバック注入で循環 import を回避）
- [x] render 内 sync は float ガイドの表示復元のため残る
- [x] guide-visibility テストが緑、`make check` が緑

## テスト戦略
- 単体: setActivePage で onNavigate コールバックが 1 回走ることを pin
- E2E: 'navigates through the guide buttons'（aria-current pin）が成立すること
- 構造: 順序契約がコメントではなく所有者経由の 1 本になる

## 実装アプローチ
- nav.ts（setActivePage）にガイド同期用のコールバック登録点を設け、main.ts は mountNav 時に sync を注入する。nav.ts が guide-controller を直接 import すると循環（guide-controller→nav）になるため注入で回避

## 見積もり
0.05人月

## 技術的考慮事項
- nav.ts→guide-controller の直接 import による循環で jsdom の初期化順が崩れ、guide-visibility テストが落ちる（最大の落とし穴）。回避はコールバック注入

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み
