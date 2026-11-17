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
- [x] マッチングが origin 完全一致 + path セグメント境界（`target === entry || target.startsWith(entry + '/')` 相当。query/hash は別扱い）になる
- [x] 既存保存値の読み込み時（parseExcludedUrls）に正規化を足し、v0.1.29〜0.1.37 の保存データとの互換を保つ
- [x] 境界ケースの fixture を tests/core/ に先に追加して RED から直す
- [x] `make check` が緑

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
- [x] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み（本 PBI に実装記録）

## 実装記録

- src/core/exclusions.ts: `isExcludedUrl` を URL 構成要素ベースに変更。`new URL` の origin 完全一致の上で、path をセグメント境界で比較する。末尾スラッシュ付きエントリはディレクトリ接頭辞（`tp.startsWith(ep)`）、裸パスは「ページ自身 + 配下」（`tp === ep || tp.startsWith(ep + '/')`）。`/pay` は `/payment`・`/pay-admin` に一致しない。query 付きエントリは 1 ページの exact 登録として path を完全一致に固定し、query は同じ境界規則（`?a=1` は `?a=1&b=2` に一致、`?a=12` には不一致）。fragment は判定に使わない。両側 case-insensitive（既存の pin を維持）。
- src/core/exclusions.ts: `parseExcludedUrls` に読み込み時正規化を追加。fragment を除去してから重複除去する（`#top` 付きの旧 exact 登録が現行規則で読まれる）。末尾スラッシュなし・大文字混在の旧保存値（v0.1.29〜0.1.37）はそのまま現行規則で読まれ、裸パス =「ページ自身 + 配下」のため登録ページは起動しないまま。
- src/content/exclusion-prefix.ts は無変更。prefix 候補（origin + 第 1 パスセグメント + 末尾スラッシュ、query なし）は新規則のディレクトリ形式と自然に整合し、矛盾なし。
- テスト: tests/core/exclusions.test.ts に PBI-239 の境界 fixture 6 件を追加（兄弟パス不一致・ページ+配下一致・query/fragment 別扱い・末尾スラッシュ境界・fragment 正規化・旧保存値互換 pin）。fixture 先行で RED を確認: 4 件失敗（兄弟パス `/payment`・`/pay-admin` の誤一致、query 境界 `?a=12` の誤一致、fragment が残る、旧保存値で `/payment` が除外扱い）→ 実装後に GREEN（26/26）。
- 検証: 関連テスト 9 ファイル 130 件 GREEN（exclusions / exclusion-prefix / search-box-exclusion (PBI-224) / exclusion-register / content-exclusions / exclusions-store / dismiss-dialog / exclusion-section / content-session）。typecheck OK。`npm run eval` GREEN。`npm run eval-pin` の 311 行が変更前後で完全一致（pin rows 不変）。`make check` 緑（web-ext lint は既存の manifest 警告 2 件のみ、errors 0）。
