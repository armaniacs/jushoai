# PBI: 送らないeval harness（ローカル計測）

## ユーザーストーリー
開発者として、実失敗率をtelemetryなしで把握したい、なぜならprivacy上送信できない以上、手動確認と7件のtarget-urlだけでは改善の当たりが分からないから

## 優先度
- 順位: 6 / 6
- RICEスコア: 160（Reach=200 / Impact=2 / Confidence=80% / Effort=2人週）
- 根拠: 直接の利用者価値はなく開発者向けのためRICEは最低。ただし131・133の効果測定の土台で、他と競合しないため並行着手可

## BDD受け入れシナリオ
Scenario: ローカルで成功率が見える
  Given fixture corpusと合成フォーム
  When harnessを実行する
  Then ルールヒット率・LLM fallback率・refine成功率が出る

Scenario: 計測は外部に出ない
  Given harness実行時
  When 集計する
  Then フォーム内容・プロファイル値を外部送信しない

## 受け入れ基準
- [ ] `make addurl`→最小再現fixture→`tests/integration/samples.test.ts`の手順と連動する
- [ ] target-url台帳の未配線検出（`sync-target-urls.mjs`）と重複しない
- [ ] `make check`を壊さない（別コマンドまたは`make`配下に分離）

## テスト戦略
- E2E: 対象外（ローカル計測ツールのため）
- 統合: corpusの一括実行テスト
- 単体: 指標計算ロジックの単体テスト

## 見積もり
5（要チームでの見積もり）

## Definition of Done
- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み
