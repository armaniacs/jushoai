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
- [x] 両ブラウザの manifest について `permissions` / `optional_permissions` / `host_permissions` / `optional_host_permissions` / `content_scripts.matches` / `web_accessible_resources` / `externally_connectable` を許可リストと完全一致で検査する
- [x] `content_security_policy.extension_pages` は未指定のままブラウザ既定に任せ、指定された場合に `unsafe-eval` / `unsafe-inline` / `wasm-unsafe-eval` / 外部 origin を含まないことを検査する（明示する案は下記の理由で置き換え）
- [x] dist の JS に `eval(` / `new Function(` が無いことを検査（誤検知の例外は理由付きで列挙。現状は 0 件）。外部 URL の `import(` は未検査
- [x] 許可リストの更新には PR テンプレートでストア掲載文・プライバシー文書の更新確認を求める

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

## 実装記録
- 検査: `tests/build/manifest-guard.build.ts`（両 dist を走査）。`make test-build` 緑
- CSP 判断: Firefox MV3 の既定 CSP は `upgrade-insecure-requests` を含み、明示上書きで既定の挙動が変わる危険があるため、ブラウザ既定に任せて後退だけを止める。受け入れ基準の「明示する」はこの判断で置き換えた
- 誤検知の許可リスト: なし（`eval(` / `new Function(` は両 dist で 0 件）
- 赤確認: dist の manifest に `tabs` を一時追加し、許可リスト検査が失敗することを確認して戻した
- 外部 URL の `import(` の検査は未実装
- タスクレビュー: spec 適合、Approved（Critical/Important なし）。Minor は `.superpowers/sdd/ga-readiness-task-2-review.md`

## 引継ぎ
- 残り 2 点（小）: JS 走査の対象ファイル数が 0 でないことの assert、外部 URL の `import(` 検査。詳細は `docs/superpowers/plans/2026-11-24-ga-readiness-handoff.md`
