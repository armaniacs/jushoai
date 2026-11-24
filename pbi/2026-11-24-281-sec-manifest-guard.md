# PBI: manifest の権限と CSP の後退を機械検査で止める

## ユーザーストーリー
利用者として、更新で拡張の権限やスクリプト実行方針が黙って広がらないことを望む、なぜなら権限の追加は全サイトでの振る舞いを変え、ストア側の再同意も十分に目立たないから

## 区分
セキュリティ / 1.0 必須

## 優先度
- 順位: 4 / 17
- RICEスコア: 400 (Reach=100 / Impact=1 / Confidence=80% / Effort=0.2人週)
- 根拠: 現在の `permissions: ['storage', 'contextMenus']` と `optional_host_permissions` は最小で良好。正式版はこれを約束として固定する段階。`tests/build/` に検査の土台があり工数が小さい

## BDD受け入れシナリオ

```gherkin
Scenario: 権限を足すとビルド検査が落ちる
  Given 誰かが manifest に必須権限 tabs を足した
  When  make test-build を実行する
  Then  許可リスト外の権限として失敗し、追加には許可リストの更新と理由の記載が要る

Scenario: リモートコードや eval を許す CSP を入れると落ちる
  Given extension_pages の CSP に unsafe-eval か外部 origin が入った
  When  make test-build を実行する
  Then  失敗する

Scenario: バンドルに動的コード実行が混ざると落ちる
  Given 依存更新で dist の JS に new Function や eval が入った
  When  make test-build を実行する
  Then  検出した箇所を示して失敗する
```

## 受け入れ基準
- [ ] 両ブラウザの manifest について `permissions` / `optional_permissions` / `host_permissions` / `optional_host_permissions` / `content_scripts.matches` / `web_accessible_resources` / `externally_connectable` を許可リストと完全一致で検査する
- [ ] `content_security_policy.extension_pages` を明示し（`script-src 'self'; object-src 'self'` 相当）、その値を検査する
- [ ] dist の JS に `eval(` / `new Function(` / 外部 URL の `import(` が無いことを検査（誤検知の例外は理由付きで列挙）
- [ ] 許可リストの更新には PR テンプレートでストア掲載文・プライバシー文書の更新確認を求める

## テスト戦略
- E2E: なし
- 統合: `tests/build/` に検査を追加し、意図的に権限を足した一時変更で赤を確認
- 単体: なし

## 見積もり
0.2人週（要チームでの見積もり）

## Definition of Done
- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み

## 出どころ
- 2026-11-24 正式版準備の棚卸し。`wxt.config.ts`、`src/entrypoints/content.ts:127`
