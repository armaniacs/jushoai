# PBI: lockfile ミラー前提の文書化

## ユーザーストーリー
このリポジトリで依存を入れる開発者として、package-lock.json が非公式ミラー npm.flatt.tech に全行固定されている前提と fallback 経路が文書化されてほしい、なぜなら 信頼境界がミラー運営者に置かれている状態が暗黙条件になっており、障害時に検証可能な代替経路が明示されていないから

## 優先度
- 順位: 6 / 14
- RICEスコア: 45（Reach=2 / Impact=0.5 / Confidence=90% / Effort=0.02人週）
- 根拠: v0.1.29 時点から続く状態だが、jsdom 31 major で新推移的依存（bcp-47・parse5-parser-stream 等）もミラー経由で固定が拡大した。integrity ハッシュ付きのため改ざん検知は可能で、まずは文書化で方針を固定する

## 出どころ
- checking-team 2026-11-18 ラウンド・Supply Chain & Dependency Sentinel。`plans/2026-11-18-0530-review-main-v0.1.29.md`
- 場所: package-lock.json（530 件すべて `https://npm.flatt.tech/...`、`registry.npmjs.org` は 0 件。.npmrc はリポジトリに存在しない）

## BDD受け入れシナリオ
Scenario: ミラー前提が文書化されている
  Given リポジトリの .npmrc または AGENTS.md・README の依存節
  When  依存の取得手順を読む
  Then  ミラー利用の意図・integrity ハッシュによる改ざん検知の前提・ミラー障害時の fallback（registry.npmjs.org での再生成手順）が書かれている

## 受け入れ基準
- [x] .npmrc（または AGENTS.md の依存節）にミラー利用の意図と fallback を記載する
- [x] registry.npmjs.org に戻す方が妥当と判断した場合は、その方針を 1 行で決定・記録し lockfile を再生成する（本 PBI の方は文書化のみでよいが、判断自体は行う）
- [x] `make install` が緑（lockfile に触らない場合も動作確認）

## 実装手順
- 現状の lockfile 解決 URL と .npmrc の不在を確認する
- 方針（ミラー継続 + 文書化 / npmjs に戻す）を決めて 1 箇所に記録する
- 文書化の場合は .npmrc に registry 設定とコメント、または AGENTS.md に節を足す

## テスト戦略
- 検証: `make install` と `make check`（lockfile 変更なしなら既存の締めを落とさない）
- npmjs に戻す場合: lockfile 再生成後の `make check` + CI での解決確認

## 見積もり
0.02人週（要チームでの見積もり）

## Definition of Done
- [x] 全 BDD シナリオが検証手順でパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み（本 PBI に実装記録）

## 実装記録

- 方針決定: ミラー継続 + 文書化を採用（コントローラ決定を踏襲）。lockfile を `registry.npmjs.org` に戻す再生成は行わない。方針は AGENTS.md の依存解決節に記載済み。
- `.npmrc` を新設: `registry=https://npm.flatt.tech/`（lockfile の解決 URL と一致）。ASCII のポインタコメントのみで、説明本文は AGENTS.md に置いた。
- AGENTS.md に「依存解決と npm ミラー」の節を追加: ミラー継続の方針、integrity ハッシュ（sha512）による改ざん検知の前提と信頼境界、ミラー障害時の fallback（registry 行の除去または upstream 指定 + `npm install --package-lock-only` での再解決、URL が書き換わるため一時措置）。
- 配置判断の理由: 意図・前提・手順を含む複数行の散文は .npmrc のコメントとして馴染まないため AGENTS.md の節に記載し、.npmrc は設定 1 行に保った（節への誘導コメント付き）。
- 検証: `npm ci` 成功し lockfile 変更なし（`git status --porcelain` は ` M AGENTS.md` と `?? .npmrc` のみ）。`npm config get registry` → `https://npm.flatt.tech/`。`make check` exit 0（typecheck + test + 両ブラウザ build + manifest 検査 + web-ext lint）。AGENTS.md は全文字が CP932 にエンコード可能、U+2014 不使用を確認済み。
- 事象のメモ（本 PBI とは無関係の既存不整合）: `make install`（`npm install`）は lockfile のルート version を `0.1.31` から package.json の `0.1.37` に同期して 2 行書き換える。HEAD 時点で package.json と lockfile の version がずれているのが原因で、registry 固定とは無関係。検証後 lockfile は HEAD に戻した。install の lockfile 不変検証には `npm ci` を使うのが確実。
