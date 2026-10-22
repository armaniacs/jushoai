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
- [x] `make addurl`→最小再現fixture→`tests/integration/samples.test.ts`の手順と連動する→ corpus は`import.meta.glob`で`samples/*.html`を自動収集し、新規fixtureが無編集で加入する
- [x] target-url台帳の未配線検出（`sync-target-urls.mjs`）と重複しない（evalは台帳に触れずcorpus測定のみ）
- [x] `make check`を壊さない（別コマンドまたは`make`配下に分離）→ `make eval`は独立ターゲット。`*.eval.ts`は`tests/**/*.test.ts`のinclude外で`make test`に含まれない

## テスト戦略
- E2E: 対象外（ローカル計測ツールのため）
- 統合: corpusの一括実行テスト（`tests/eval/corpus.eval.ts`。20 fixture自動収集・指標集計・レポート行のPII検査）
- 単体: 指標計算ロジックの単体テスト（`tests/eval/metrics.test.ts`。通常suiteに含む）

## 見積もり
5（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする（指標とレポートがローカルで出る。通信なし。レポートはfixture名と件数のみ）
- [ ] コードレビュー完了
- [x] ドキュメント更新済み（README・CLAUDE.mdに`make eval`を追記）

## 実装記録（2026-10-23）

- `src/eval/metrics.ts`: 純粋な指標計算（total / ruleHits / llmFallbacks / unknowns / refineChanged / refineDropped / fillable）。classifier なしで rule-only 実行し通信しない。レポート行は fixture 名と件数のみで固定書式。
- `vitest.eval.config.ts` + `make eval`（package.json の `eval` スクリプト）: `make check` に含まれない別ターゲット。
- `tests/eval/corpus.eval.ts`: `import.meta.glob` で `samples/*.html` を自動収集し、fixture ごとの指標行と集計を出す。レポート行にページ由来文字列（山田・太郎・千代田・実フォームの field id）が入らないことを検査。200 バイト上限も検査。
- `tests/eval/metrics.test.ts`: 指標ロジックの単体テスト（通常 suite、`make test` に含む）。
- 初回 corpus 計測（20 fixture / 168 欄）: ruleHits 141（83.9%）/ llmFallbacks 27（16.1%）/ fillable 89。
- `make check` exit 0（123 ファイル 1698 テスト + 1 expected fail）。`make eval` 3 テスト PASS。
