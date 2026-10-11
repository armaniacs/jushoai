# PBI: 監査ログ入口で pageUrl を 1024 バイトに制限する

状態: 未着手（PBI-08 の未決判断 (b) を採るとの決定から起票）
起票日: 2026-10-11
親: `archived/2026-10-11-08-fix-audit-entry-bytes.md`

## ユーザーストーリー

監査ログを見る利用者として、記録されるページ URL が有界であってほしい。なぜなら、`sanitizePageUrl` に長さ上限がなく、`history.pushState` で pathname が伸びうるため、計上を正しくしても記録 1 件が無制限に大きくなるから。

## 優先度

- RICEスコア: 12（Reach=40 / Impact=0.5 / Confidence=60% / Effort=1）
- 根拠: AI 層に届く。計上は PBI-08 で正しくなったため Impact は中。origin 実長の実測がなく Confidence=60%。入口 1 か所＋テストで Effort=1

## BDD受け入れシナリオ

```gherkin
Scenario: 上限を超える pageUrl は入口で有界になる
  Given UTF-8 で 1024 バイトを超える pageUrl がある
  When  監査ログに記録する
  Then  1024 バイト以内の接頭辞で記録される
  And   文字境界で切られ、壊れた文字を含まない

Scenario: 上限以内の pageUrl はそのまま記録される
  Given 1024 バイト以内の pageUrl がある
  When  監査ログに記録する
  Then  値が変わらず記録される
```

## 受け入れ基準

- [x] 監査ログの入口（`sanitizePageUrl` の共有関数ではなく監査側）で UTF-8 1024 バイトに制限される
- [x] 切り詰めは文字境界で行われ、サロゲートペアを分割しない
- [x] 通常長の pageUrl は値が変わらない
- [x] TSV の `page_url` 列とビューア表示が制限後の値を示す（列構成は不変）
- [x] フィードバック報告 URL の生成には影響しない
- [x] `make check` が通る

## テスト戦略

- 単体: 上限超・上限内・マルチバイト境界・サロゲートペアの 4 ケースを Red→Green で追加する
- 既存の `tests/ai/audit-log.test.ts` が緑のままであること

## 技術的考慮事項

- 上限値の根拠: origin 部は現実的に 300 バイト未満（ホスト名上限 253＋スキーム・ポート）に収まるため、パス側に 700 バイト程度残る。全体予算（4MB）に対して無視できる
- 制限箇所は監査の入口に置き、`sanitizePageUrl` 自体は変えない（フィードバック報告 URL と共有のため）

## 見積もり

1pt（要チームでの見積もり）

## Definition of Done

- [x] 全 BDD シナリオが自動テストとして実装されパスする
- [x] `make check` が通る
- [ ] コードレビュー完了
