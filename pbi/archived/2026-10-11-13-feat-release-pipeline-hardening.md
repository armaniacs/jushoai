# PBI: リリース経路を最小権限に絞り、Release の生成に承認経路を通す

状態: 未着手（run-2 セキュリティ監査の rejected finding `github-release-tag-push-no-signature-no-approval-gate` と同レポート推奨アクション 5 から起票）
起票日: 2026-10-11

## ユーザーストーリー

このリポジトリの Release を出す開発者として、タグの push だけでは Release が作られず、最小権限に絞られた workflow が人の承認の後に動いてほしい。なぜなら、今は write 権限を持つ actor がタグを打てば単独で Release と zip の添付まで作れ、その workflow はチェックアウトの資格情報を保持したまま依存の導入でスクリプトを実行するため、依存の取込経路がそのまま配布物の生成経路に直結しているから。

## 優先度

順位 7 / 全候補 8 件。RICE 0.45（Reach=1 / Impact=1 / Confidence=90% / Effort=2pt）。根拠: リリース工程の施策で利用者には直接届かないため Reach は 1（dev 工程の施策を Reach=1 とする本 repo の基準、`2026-10-10-07-backlog-dev-toolchain-cves.md` と同じ扱い）。効果はサプライチェーン耐性で Impact=1。workflow の事実は確定しているため Confidence=90%。依存なし。

## 背景

- run-2 監査の rejected finding `github-release-tag-push-no-signature-no-approval-gate`（`~/security-audit-skill/jushoai/run-2/REPORT.md:27`）: `v*` tag push で release zip が出ることはソース上そのとおりだが、リポジトリ内に「誰が tag を打てて誰が release を出せるか」の分離が存在せず、tag を打てる actor は既に release を出せる write actor である。残る欠落（environment 承認ゲート、tag protection、main への ancestry 検査）は repository settings 側の hardening であり、ソース上の防御を破ってはいない、と判断された。再オープン条件（main が review 必須で `v*` tag が main にマージできない actor からも打てる場合）は記録に明記されている。
- 同レポートの推奨アクション 5（`~/security-audit-skill/jushoai/run-2/REPORT.md:76`）が修正の方向性である: release job を required reviewers 付き environment に束ねる、`v*` tag を ruleset で保護する、signed tag と検証手順を用意する、`actions/checkout` に `persist-credentials: false` を付け `permissions` を job に絞る、release job の `npm ci` を `--ignore-scripts` にする。
- 同種の hardening は pages workflow が既に半分持っている: job 単位の permissions（`:14-18`）、environment `github-pages`（`:25-27`）、`npm ci --ignore-scripts`（`:40`）。release workflow は同じ形に揃える。
- `v*` タグの protection ruleset、environment の required reviewers、署名付きタグ、main への ancestry 要件はリポジトリ設定側（GitHub の設定画面）でしか実施できない。したがって本 PBI の受け入れ基準は「workflow の変更がコミットされ、repo settings の手順が docs/release.md に記録されている」までとし、設定そのものは手作業であることを明記する。

## 事実（本 PBI 起票時に全件読み直し、行番号を確認済み）

| 事実 | 根拠 |
|---|---|
| permissions が workflow 全体に `contents: write` で宣言されている | `.github/workflows/release.yml:7-8` |
| checkout に資格情報を保持しない設定（`persist-credentials: false`）が無い | `.github/workflows/release.yml:15` |
| 依存導入が `npm ci` で、スクリプトを実行しない `--ignore-scripts` が無い | `.github/workflows/release.yml:24` |
| release job に environment の設定が無い | `.github/workflows/release.yml:11-12` |
| Release の生成は `GH_TOKEN`（`github.token`）で `gh release create` を呼ぶ | `.github/workflows/release.yml:45-55`（env は `:47`） |
| workflow の起動条件は `v*` タグの push のみ | `.github/workflows/release.yml:3-5` |
| release job は `make check` と `make zip` / `make zip-firefox` を実行する | `.github/workflows/release.yml:34-40` |
| pages workflow は job 単位の permissions と environment を宣言する | `.github/workflows/pages.yml:14-18`（permissions）、`:25-27`（environment `github-pages`） |
| pages workflow は依存導入で `npm ci --ignore-scripts` を使う | `.github/workflows/pages.yml:40` |
| pages workflow は `--ignore-scripts` の後に `npx wxt prepare` を明示実行している | `.github/workflows/pages.yml:42-45` |
| リリース手順はタグを打つ actor が単独であるフローを意図として明記している | `docs/release.md:12-16` |
| build 検査は `tests/build/**/*.build.ts` を `environment: 'node'` で実行する | `vitest.build.config.ts:4` |
| `make check` は manifest 検査（test-build）を含み、test-build は build に依存する | `Makefile:40`、`Makefile:31` |
| release workflow の YAML 検査は tests/build に存在しない | `tests/build/` は `firefox-manifest.build.ts` のみ |

## BDD受け入れシナリオ

```gherkin
Scenario: リリースワークフローの権限が最小化されている
  Given リリース用のワークフローの検査が動いている
  When  検査を実行する
  Then  検査は、チェックアウトが資格情報を保持しないことを確かめる
  And   検査は、依存の導入でスクリプトを実行しないことを確かめる
  And   検査は、書き込み権限が Release を作る job にだけ付いていることを確かめる

Scenario: タグ push だけでは Release が作られない
  Given リリース job に人の承認を経る経路が設定されている
  When  タグが push される
  Then  Release の生成は承認の後にのみ行われる
  And   承認を待つ手順がリリース手順の文書に記録されている

Scenario: 署名付きタグの作成と検証がリリース手順に書かれている
  Given リリース手順の文書がリポジトリにある
  When  タグを打つ手順を確認する
  Then  手順に署名付きタグの作成と検証が含まれる
  And   手順に v* タグを保護する設定の確認が含まれる
```

## 受け入れ基準

- [x] `.github/workflows/release.yml` の `permissions` が workflow 全体の宣言から job 単位に絞られ、Release を作る job にだけ `contents: write` が付いている
- [x] checkout に `persist-credentials: false` が付いている
- [x] `npm ci` に `--ignore-scripts` が付いている
- [x] release job に environment が設定され、required reviewers を要求する environment 名が workflow と docs で一致している
- [ ] `npm ci --ignore-scripts` の状態で `make check` が通ることをローカルで確認している
- [x] `tests/build` に release workflow の YAML 検査が置かれ、権限の位置と `persist-credentials: false` と `--ignore-scripts` を断言している
- [x] repo settings の手順（`v*` タグの ruleset 保護、environment への required reviewers 追加、署名付きタグの作成と検証）が `docs/release.md` に記録されている。設定そのものは手作業であり、本 PBI では記録までを行う
- [x] `docs/release.md` の手順に承認待ちが追記されている
- [ ] 署名付きタグの作成と検証を docs の手順どおりに一度実行して確認している
- [x] `make check` が通る

## テスト戦略（t_wadaスタイル）

### ビルド検査（自動）
- `tests/build/release-workflow.build.ts`（新設案）: `.github/workflows/release.yml` を YAML として読み、(a) `permissions` が workflow 全体に無く Release job にだけある、(b) checkout step に `persist-credentials: false` がある、(c) 依存導入が `--ignore-scripts` 付きである、を断言する。`environment: 'node'`（`vitest.build.config.ts:4`）で動き、`make test-build`（`Makefile:31`）に載る
- 検査を入れた後、workflow を一時的に元に戻して落ちることを確認してから戻す（形骸化していないことの確認）

### 手作業の手順確認
- `npm ci --ignore-scripts` の状態で `make check` をローカル実行し、typecheck + test + build + manifest 検査 + web-ext lint が通ることを確認する（esbuild / wxt が postinstall を要する場合の扱いは「未決の設計判断」）
- GitHub の設定画面で、docs に記録した手順どおりに environment への required reviewers 追加と `v*` タグの ruleset 保護ができることを確認する
- 署名付きタグの作成と検証を docs の手順どおりに一度実行し、手順が動くことを確認する

## 実装アプローチ

- **Outside-In**: まず `tests/build` の検査を書いて現状 Red を確認する（現行の release.yml は全項目で落ちる）。次に workflow を直して緑にする
- **Red-Green-Refactor**: 権限の絞り込み → 資格情報の保持停止 → スクリプトの実行停止 → environment の束ね込み、の順に断言と実装を対応させる。environment の required reviewers は settings 側の手作業なので、workflow 側は environment 名の宣言までを行う
- **コード外の工程は docs で閉じる**: repo settings の手順と承認待ちを docs/release.md に記録する。GitHub 側の設定は自動検査の対象外とし、記録と手順確認で代替する

## 見積もり

2pt（要チームでの見積もり）

## 技術的考慮事項

- 依存関係: なし。進行中の子 05（`2026-10-11-05-feat-declaration-request-use-check.md`）が `tests/build` に host 権限の build 検査を新設するが、本 PBI の検査は別ファイルで独立しており、実施順の制約も無い
- テスタビリティ: workflow 定義は YAML として読める。GitHub 側の設定（ruleset、required reviewers、署名）はリポジトリ外なので自動検査の対象外とし、docs の記録と手順確認で代替する
- 非機能要件: environment 承認により、タグ push から Release 生成までに人の承認が入る。リリースの所要時間は承認待ちぶん伸びる（可用性とのトレードオフ）

## 実装者向け注記

### 現状コードの確認（着手前に実行し、済み）

```bash
sed -n '1,30p' .github/workflows/release.yml   # → :7-8 permissions、:15 checkout、:24 npm ci
sed -n '45,55p' .github/workflows/release.yml  # → GH_TOKEN と gh release create
grep -n "environment\|permissions\|ignore-scripts" .github/workflows/pages.yml
#   → :14-18 permissions、:25-27 environment、:40 npm ci --ignore-scripts
ls tests/build/                                # → firefox-manifest.build.ts のみ（release workflow の検査は未実装）
```

→ release workflow の最小権限化・資格情報の保持停止・スクリプトの実行停止・environment は**未実装**。pages workflow は permissions・environment・`--ignore-scripts` を既に持ち、同じ形に揃える変更になる。

### 落とし穴

- **`npm ci --ignore-scripts` で `make check` が通るかをローカルで先に確認すること。** esbuild / wxt は postinstall を要する可能性がある。pages.yml は `:40` で `--ignore-scripts` の後に `npx wxt prepare`（`:45`）を明示実行しているが、これは site のテスト（`:48` で `tests/site` のみ）を走らせるための型生成であり、`make check`（typecheck + test + build + test-build + lint-firefox、`Makefile:40`）が同じ形で通る保証は無い。通らない場合の対応は「未決の設計判断」に置く
- **checkout の `persist-credentials: false` を付けても `gh release create` には影響しない。** Release の生成は `GH_TOKEN`（`release.yml:47` で `github.token` を設定済み）を使うからである（`:45-55`）。消えるのは checkout が残す資格情報だけで、Release 生成の権限は job の permissions と environment で決まる
- **environment 承認を付けたら手順の記録を必ず変えること。** タグ push から Release 生成までに人の承認が入るため、docs/release.md の手順（`:12-16`）に承認待ちを追記する。追記しないと「タグを push したら Release が出る」という記述と workflow の挙動が食い違い、egress の件と同じ「記録と強制の乖離」を再生産する
- **`permissions` は workflow 全体の宣言を消すのではなく job 単位に移すこと。** 消すだけだと既定権限に倒れ、読み手が job の必要権限を workflow から追えなくなる。宣言を 1 か所（Release job の下）に保つ
- **YAML の読み方に注意。** `tests/build` は `environment: 'node'` で動く（`vitest.build.config.ts:4`）。既存の `firefox-manifest.build.ts` は JSON を `readFileSync` で読むだけなので、YAML をパースする場合はパーサが要る。js-yaml 4.3.2 は lockfile にあるが `@eslint/eslintrc` の transitive 依存（`package-lock.json:526`）で、package.json の直接依存ではない。読み方は「未決の設計判断」に置く
- **`make check` を緑に保つこと。** 本 PBI の変更は workflow と docs と tests/build が対象で、src/ には触らない。`make check` が落ちるのは tests/build の断言が workflow と合っていないときだけである

### 未決の設計判断

- **`npm ci --ignore-scripts` が `make check` を通さない場合の対応。** (a) postinstall 相当を明示 step に足す（pages.yml の `npx wxt prepare` と同じ形）、(b) esbuild の実体が platform 別の optional dependency で配られるため何も要らない、のどちらになるかはローカル確認まで分からない。通らなければ (a) を取る（workflow に追加 step を足す）
- **YAML のパース方法。** (a) YAML パーサを devDependency に足す、(b) 行単位の単純な断言にする（workflow が小さいため壊れにくく、依存を増やさない）。js-yaml は transitive 依存として node_modules に hoist されているが、直接 import は hoisting 依存になるため推奨しない。追従性を優先するなら (a)、依存を増やしたくないなら (b)
- **environment 名。** pages.yml は GitHub 既定の `github-pages`（`:25-27`）を使う。release 用の environment 名（例: `release`）を新規に作るか、`github-pages` を流用するか。新規作成を推奨する（pages の承認経路と Release の承認経路が混ざらない）
- **ancestry 検査（タグが main に含まれることを workflow 内で検証する）を本 PBI に含めるか。** 推奨アクション 5（`REPORT.md:76`）には含まれるが、本 PBI の修正の方向性（permissions 絞り・資格情報・スクリプト停止・environment）には含まれていない。含めるなら `git merge-base` ベースの検査 step になるが、`v*` タグの ruleset 保護と役割が重なる。本 PBI では含めず、必要なら別 PBI とすることを推奨する
- **pages.yml の checkout（`:31`）にも資格情報を保持しない設定が無い。** workflow の権限が `contents: read`（`:15`）なので影響は小さいが、本 PBI で合わせて直すかは範囲の判断。直す場合は検査の対象を release.yml だけにするか両方にするかも同時に決める

## Definition of Done

- [x] 全 BDD シナリオが build 検査と docs の記録で検証されパスする（承認経路のシナリオは docs の記録と手作業の確認で検証する）
- [ ] `make check` が通る（`npm ci --ignore-scripts` の状態を含む。通常状態は green 確認済み）
- [ ] workflow の変更がコミットされている
- [x] repo settings の手順（ruleset、required reviewers、署名付きタグ）が docs/release.md に記録されている
- [x] docs/release.md に承認待ちが追記されている
- [x] build 検査を意図的に壊して落ちることを確認済み（形骸化していない）
- [ ] コードレビュー完了

### 実装の記録（2026-10-11、サブエージェントによる並列実装）

- 実装: permissions を job 単位化（`contents: write` は release job のみ）、`environment: release`、`persist-credentials: false`、`npm ci --ignore-scripts`＋`npx wxt prepare` 明示 step（未決 (a) 採用。postinstall が skip されるため）。environment 名は新規 `release`（pages と混ぜない）。ancestry 検査・pages.yml は範囲外
- 検証: build 検査 5 tests の Red（修正前と一時復元の 2 回）→Green。`tsc` exit 0、`npx wxt prepare` 成功（node_modules 未破壊）。`make check` exit 0（通常状態。最終検証）
- ユーザーの作業として残る項目: GitHub 設定画面の手作業（environment `release` 作成＋Required reviewers、v* ruleset 保護）、署名タグの実行確認、`--ignore-scripts` 状態での `make check`、コミット、コードレビューの最終承認
