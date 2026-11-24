# PBI: リリースの build と submit を分け、ストア資格情報をビルド中のコードから隔離する

## ユーザーストーリー
保守者として、テストやビルドで実行される依存コードがストア資格情報に触れられないようにしたい、なぜなら今は同じ job の中で `make check` が依存コードを実行した直後に、同じ作業領域の `npx wxt submit` が資格情報付きで走るから

## 区分
セキュリティ / 1.0 必須

## 優先度
- 順位: 3 / 17
- RICEスコア: 480 (Reach=100 / Impact=3 / Confidence=80% / Effort=0.5人週)
- 根拠: 資格情報は submit step の env にしか無いが、先行 step（vitest・wxt build・依存の実行）は同じファイルシステムに書ける。侵害された dev 依存が `node_modules/.bin/wxt` や `dist/*.zip` を書き換えれば、次の step で資格情報付きのコードが動くか、改ざん zip が提出される。`--ignore-scripts` は install 時のみの防御。アカウント側の保護 (279) は将来構想に回したため、1.0 時点の提出経路の防御は本 PBI が担う

## BDD受け入れシナリオ

```gherkin
Scenario: 資格情報を持つ job はビルドしない
  Given v* タグが push された
  When  Release ワークフローが走る
  Then  build job は資格情報なしで make check と zip を作り、成果物とハッシュを upload する
  And   submit job は依存を実行せず、ハッシュを検証した成果物だけを提出する

Scenario: 成果物が途中で変わると提出しない
  Given build job が出したハッシュと submit job が受け取った zip のハッシュが違う
  When  submit job が検証する
  Then  提出せずに失敗する
```

## 受け入れ基準
- [x] `release.yml` を build（permissions: contents: read、secrets なし）と submit（environment: release）の 2 job に分ける
- [x] submit job は `npm ci` を最小化する（提出に必要なツールだけを固定版で入れる。`wxt submit` が依存を要するなら、その install は build の node_modules を引き継がない）
- [x] build job の zip の SHA-256 を job output と成果物で渡し、submit 前に照合する
- [x] `actions/setup-node` の npm cache を release では使わない（キャッシュ汚染の経路を切る）判断を記録
- [x] GitHub Release 作成は submit 成功後のまま（半端な Release を残さない既存方針を維持）
- [ ] ドライラン（submit を `--dry-run` 相当にしたタグ）で 1 回通す

## テスト戦略
- E2E: なし
- 統合: ドライラン用タグで build → submit の受け渡しと、ハッシュ不一致で止まることを確認
- 単体: なし（ワークフロー）

## 見積もり
0.5人週（要チームでの見積もり）

## Definition of Done
- [ ] 全BDDシナリオが確認手順として実施済み
- [ ] コードレビュー完了
- [x] ドキュメント更新済み（docs/release.md）

## 出どころ
- 2026-11-24 正式版準備の棚卸し。`.github/workflows/release.yml:41-64`

## 引継ぎ
- 未着手（2026-11-24）。着手前に `docs/superpowers/plans/2026-11-24-ga-readiness-handoff.md` の該当節を読む（調査済みの事実・落とし穴・検証手順）

## 実装記録（2026-11-24、Task 4 で 278 と同時に実施）

### 構成
- build job: permissions は `contents: read` + `id-token: write` + `attestations: write` のみ。secrets と `env:` を持たない。`npm ci --ignore-scripts` → `npx wxt prepare` → タグ一致検査（push 時のみ）→ `make check` → `make zip` / `make zip-firefox` → `SHA256SUMS` 生成 → artifact upload → 来歴証明。
- submit job: `needs: build`、`environment: release`、`permissions: contents: write`。checkout なし（成果物だけで動く）。download → `sha256sum -c` → 提出ツールのみ install → 提出 → Release 作成。
- version は build の outputs で渡す（submit は `needs.build.outputs.version` を参照）。

### 判断の記録（保守的な側に倒した点）
- 提出の呼び出しは `npx wxt submit` ではなく、固定版 `publish-browser-extension@6.2.0` を別ディレクトリに `--ignore-scripts` で入れて直接呼ぶ。根拠: `wxt submit` の実体は同バイナリへの委譲であり（wxt の CLI 実装で確認）、同じ env 変数（`CHROME_ZIP` 等）を読むため等価。等価にできない点は見つからなかった。プロジェクトの依存は submit に入れない。
- npm cache は release では使わない（`cache: "npm"` を外す）。根拠: キャッシュ汚染の経路を切る。`check.yml` 側は残す。
- ドライランはタグ方式ではなく `workflow_dispatch` + `dry_run` 入力（初期値 true）にする。根拠: 現 trigger では任意の `v*` タグ push が実提出になるため、「ドライラン用タグ」は安全に打てない。dispatch は分岐 ref のため、submit の実提出と Release 作成を `github.event_name == 'push'` に限定し、dispatch は必ず `--dry-run`（認証確認のみ）になる。受け入れ基準の「タグで 1 回通す」はこの方式に置き換え、ユーザー側の実行待ちとして残す。
- build は承認なしで即時実行される。根拠: build は secrets を持たないため。資格情報の使用は submit の environment 承認が守る。
- 新規 action は全て SHA 固定 + `# vN` コメント。版は実績に留める保守判断で v4 系を選んだ（upload-artifact v4.6.2、download-artifact v4.3.0、attest-build-provenance v4）。公式リポジトリのタグから SHA を解決して記録した。
- submit に checkout を置かない。成果物の受け取り・照合・提出・Release 作成は checkout なしで動く。将来 `run:` 手順を足す際の事故を防ぐ。

### 検証結果
- `tests/build/release-workflow.build.ts` を新構成に先に書き換えて赤を確認し、yml 更新後に緑（22 件）。
- `make check` が緑（unit 194 ファイル 3349 件、build 5 ファイル 50 件、web-ext lint は想定内の警告 2 件のみ）。
- YAML は pyyaml で構文確認済み。actionlint は環境になし。
- 改ざん検出はローカルで代替確認: 別ディレクトリで `sha256sum -c` を行い、1 バイト改変の zip で `FAILED`・終了 1 になることを確認。
- CI のドライラン（`gh workflow run`）は未実施。理由: 当セッションでは push 禁止のため分岐を push できない。手順は「引継ぎ（ユーザー作業）」に残す。

## 引継ぎ（ユーザー作業）
- 分岐を push した後に次を実行し、build 緑 → submit 承認 → submit が `--dry-run` で通り Release が作られないことを確認する。承認前に build が即時実行される点も合わせて確認する。
  ```bash
  gh workflow run release.yml --ref <ブランチ名> -f dry_run=true
  ```
