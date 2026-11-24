# PBI: リリース成果物にハッシュと来歴証明を付ける

## ユーザーストーリー
zip から手で読み込む利用者として、GitHub Release の zip が CI で作られた改ざんのないものだと確かめたい、なぜなら今は zip に添付のハッシュも署名も無く、ミラーや再配布物と見分けられないから

## 区分
セキュリティ / 1.0 推奨

## 優先度
- 順位: 10 / 17
- RICEスコア: 80 (Reach=30 / Impact=1 / Confidence=80% / Effort=0.3人週)
- 根拠: ストア経由の利用者はストアが配布を担保するため Reach は zip 利用者に限られる。274 の build job 分離と同じ所を触るため、274 と同時に実施すると安い

## BDD受け入れシナリオ

```gherkin
Scenario: 利用者がハッシュで照合できる
  Given GitHub Release に zip と SHA256SUMS がある
  When  利用者が手元の zip のハッシュを計算する
  Then  SHA256SUMS の値と一致する

Scenario: CI で作られたことを検証できる
  Given Release の zip
  When  gh attestation verify を実行する
  Then  このリポジトリの Release ワークフローで作られたことが確認できる
```

## 受け入れ基準
- [x] Release に `SHA256SUMS` を添付する
- [x] `actions/attest-build-provenance`（SHA 固定）で zip の来歴証明を付ける（必要な `id-token` / `attestations` 権限は build job だけに付与）
- [x] README の「ソースからのビルド」節に照合手順を 3 行で書く
- [x] sources zip から同じ zip が再現できるかを 1 回確認し、差分が出る場合は原因と受容判断を記録（AMO 審査の前提でもある）

## テスト戦略
- E2E: なし
- 統合: ドライラン用タグで検証コマンドが通ることを確認
- 単体: なし

## 見積もり
0.3人週（要チームでの見積もり）

## Definition of Done
- [ ] 全BDDシナリオが確認手順として実施済み
- [ ] コードレビュー完了
- [x] ドキュメント更新済み

## 出どころ
- 2026-11-24 正式版準備の棚卸し。`.github/workflows/release.yml:82-92`
- 依存: 274 と同時実施を推奨

## 引継ぎ
- 未着手（2026-11-24）。着手前に `docs/superpowers/plans/2026-11-24-ga-readiness-handoff.md` の該当節を読む（調査済みの事実・落とし穴・検証手順）

## 実装記録（2026-11-24、Task 4 で 274 と同時に実施）

### 配置
- build job で `(cd dist && sha256sum <3 種の zip> > SHA256SUMS)` を作り、`release-out/` に集約して artifact で渡す。submit job で `submit-in/` に受け取り `sha256sum -c` で照合する。Release には zip 3 種と `SHA256SUMS` の 4 ファイルを添付する。
- 来歴証明は build job の `actions/attest-build-provenance@4d101475d8b20a2381f78447822ac1eab6504dd8 # v4` で付け、`subject-path` は `dist/*.zip`。`id-token: write` と `attestations: write` は build job だけに付与する。
- README の「ソースからのビルド」節に照合手順を 3 行で追加した（zip と SHA256SUMS を同じ場所に置き、`sha256sum` と `sha256sum -c` で照合）。

### sources 再現の結果
- `jushoai-0.1.39-sources.zip` を別ディレクトリに展開し、`npm ci --ignore-scripts` → `make zip-firefox` を実行した。作られた `-firefox.zip` と `-sources.zip` はリポジトリで作った同版 zip とバイト一致した（firefox: `458f5e01…400f52`、sources: `560728c3…711b1b`）。差分なしのため受容判断は不要。再現確認済み。

## 引継ぎ（ユーザー作業）
- 初回 1.0 リリースの後に次が通ることを確認する（来歴証明の BDD シナリオの確認手順）。
  ```bash
  gh attestation verify <zip の場所> --owner armaniacs
  ```
- CI のドライランは PBI-274 の「引継ぎ（ユーザー作業）」の手順で行う。
