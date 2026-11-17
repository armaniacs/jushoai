# Report: PBI-236 lockfile ミラー前提の文書化

Status: DONE_WITH_CONCERNS

## 現状確認

- `package-lock.json`: `https://npm.flatt.tech/` が 530 行、`registry.npmjs.org` は 0 件（PBI 記載どおり）。
- `.npmrc` はリポジトリに存在しなかった。
- 作業ブランチ: `work/checking-round-2026-11-18`、着手時の working tree はクリーン。

## 方針決定

- コントローラ決定を踏襲し、**ミラー継続 + 文書化**を採用。lockfile を `registry.npmjs.org` 側に戻す再生成はしない（lockfile は 1 バイトも触っていない）。
- 文書配置の判断: **AGENTS.md の節 + 最小 .npmrc**。理由は、記載すべき内容（意図・integrity 前提・手順を含む fallback）が複数行の散文になり、.npmrc のコメントとして馴染まないため。`.npmrc` は設定 1 行 + AGENTS.md 誘導の ASCII コメントに保ち、本文は AGENTS.md の「依存解決と npm ミラー」節に置いた。

## 変更内容

1. `.npmrc`（新規）: `registry=https://npm.flatt.tech/`。lockfile の解決 URL と一致。
2. `AGENTS.md`: `## コマンド` の後に `## 依存解決と npm ミラー` 節を追加。
   - ミラー継続の方針と lockfile 再生成をしない旨
   - integrity ハッシュ（sha512）が付き npm が取得時に検証する、という改ざん検知の前提と、信頼境界がミラー運営者に置かれている点
   - fallback: `.npmrc` の registry 行を一時除去（または upstream 指定）し `npm install --package-lock-only` 相当で再解決 → `npm ci` が通る。URL が書き換わるため一時措置とし、復旧後に元に戻すか方針を再決定する旨
3. `pbi/2026-11-18-236-chore-lockfile-mirror-doc.md`: 受け入れ基準 3 件をチェック、実装記録を追加（DoD のコードレビューは未チェックのまま）。

## 検証結果

- `npm config get registry` → `https://npm.flatt.tech/`
- `npm ci` → 成功（全 530 パッケージがミラーから解決）。終了後の `git status --porcelain`:
  ```
   M AGENTS.md
  ?? .npmrc
  ```
  `package-lock.json` への差分なし。
- `make check` → exit 0（typecheck + test + 両ブラウザ build + manifest 検査 + web-ext lint。lint の KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION 警告は既存の warning のみ）。
- `make install`（`npm install`）→ install 自体は成功。ただし lockfile のルート version 2 行（`0.1.31` → package.json の `0.1.37`）を書き換えた。**本変更ではなく、HEAD 時点で存在する package.json と lockfile の version 不整合が原因**（`npm install` はルート version を同期する）。検証後 `git checkout -- package-lock.json` で戻し、コミットには含めない。lockfile 不変の install 検証としては `npm ci`（上記）が確実。
- AGENTS.md charset 規律: 全文字が CP932 にエンコード可能（python で 1 文字ずつ検証）、U+2014 不使用（rg で確認）。

## TDD

本 PBI は docs/config のみで振る舞いの BDD シナリオがコードに接触しないため、fixture-first の TDD は適用外。BDD シナリオは上記のファイル内容と検証で確認。

## コミット一覧

- `chore(tooling): npm ミラーの前提を .npmrc と AGENTS.md に文書化する`
- `docs(pbi): PBI-236の実装記録を台帳に反映する`
- `docs(sdd): PBI-236の実装レポートを追加する`

## セルフレビュー

- .npmrc の registry URL は lockfile の解決 URL と一致していることを確認済み（530 件の接頭辞と一致）。
- lockfile・package.json は未変更。`npm ci` が lockfile を書かない設計である点に加え、git status でも確認した。
- AGENTS.md の追加節は既存の文体（本文散文 + バッククォート）に合わせ、既存節の並び替え・再フォーマットはしていない。
- `.npmrc` は ASCII のみで、他環境での文字コード問題を避けた。
- npm install-scripts の fsevents 警告は本変更と無関係の既存挙動。

## Concerns

- 既存不整合の発見: HEAD の package-lock.json ルート version は `0.1.31` で、package.json（`0.1.37`）とずれている。そのため `make install`（`npm install`）が lockfile のルート version 2 行を書き換える。「`make install` しても lockfile が変わらない」は現状のリポジトリでは成立しない（本変更と無関係。`npm ci` では不変を確認済み）。version 同期コミットを別途入れるか、リリース手順で `npm install` を実行して lockfile を更新する運用にするか、コントローラの判断を推奨。
- fallback 手順は lockfile の解決 URL を書き換えるため、その旨を AGENTS.md 節内に明示済み。恒久移行するかは復旧後の再決定事項（PBI 方針どおり）。
