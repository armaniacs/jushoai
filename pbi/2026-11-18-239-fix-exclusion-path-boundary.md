# PBI: isExcludedUrl のパス境界

## ユーザーストーリー
バナーから「このページだけ」を登録した利用者として、登録したページだけが起動しなくなってほしい、なぜなら 現状の判定は URL 文字列の素朴な前方一致で、`https://shared-host/pay` の exact 登録が `https://shared-host/payment`・`https://shared-host/pay-admin` 等の無関係パスまで一致させ、同意より広い fail-open になるから

## 優先度
- 順位: 9 / 14
- RICEスコア: 36（Reach=2 / Impact=2 / Confidence=90% / Effort=0.1人週）
- 根拠: ユーザーが明示確認したオプトアウト範囲の正確さ。origin 越えの過剰一致は既に起こらないが、同一 origin 内の兄弟パスは等価な第三者ページでも起こり得る

## 出どころ
- checking-team 2026-11-18 ラウンド・Red Team Leader。`plans/2026-11-18-0530-review-main-v0.1.29.md`
- 場所: src/core/exclusions.ts:37-41（`target.startsWith(e.toLowerCase())`）、src/content/exclusion-register.ts:30-31・src/content/exclusion-prefix.ts:7-19（exact 候補の生成）

## BDD受け入れシナリオ
Scenario: 兄弟パスは一致しない
  Given 除外エントリ `https://shared-host/pay` が登録されている
  When  `https://shared-host/payment` を判定する
  Then  一致しない（起動する）

Scenario: パス配下は一致する
  Given 除外エントリ `https://shared-host/pay` が登録されている
  When  `https://shared-host/pay/detail?x=1` を判定する
  Then  一致する（起動しない）

Scenario: 既存保存値の正規化
  Given v0.1.37 以前に保存された末尾スラッシュなしのエントリがある
  When  parseExcludedUrls で読み込む
  Then  同じ判定規則で読まれ、既存の起動しない URL 設定が意図に反して消えない

## 受け入れ基準
- [ ] マッチングが origin 完全一致 + path セグメント境界（`target === entry || target.startsWith(entry + '/')` 相当。query/hash は別扱い）になる
- [ ] 既存保存値の読み込み時（parseExcludedUrls）に正規化を足し、v0.1.29〜0.1.37 の保存データとの互換を保つ
- [ ] 境界ケースの fixture を tests/core/ に先に追加して RED から直す
- [ ] `make check` が緑

## 実装手順
- tests/core/exclusions.test.ts（または既存テスト）に境界 fixture を先に足す
- isExcludedUrl を URL 構成要素ベース（new URL の origin 比較 + path セグメント前方一致）に変える
- parseExcludedUrls に正規化を足す（既存エントリの判定が変わらないことを pin で固定）

## テスト戦略
- fixture 先行: 兄弟パス不一致・配下一致・query 付き・末尾スラッシュの 4 面
- exclusion-register / exclusion-prefix の既存テストと corpus の pin が回帰網

## 見積もり
0.1人週（要チームでの見積もり）

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録）
