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
- [ ] Release に `SHA256SUMS` を添付する
- [ ] `actions/attest-build-provenance`（SHA 固定）で zip の来歴証明を付ける（必要な `id-token` / `attestations` 権限は build job だけに付与）
- [ ] README の「ソースからのビルド」節に照合手順を 3 行で書く
- [ ] sources zip から同じ zip が再現できるかを 1 回確認し、差分が出る場合は原因と受容判断を記録（AMO 審査の前提でもある）

## テスト戦略
- E2E: なし
- 統合: ドライラン用タグで検証コマンドが通ることを確認
- 単体: なし

## 見積もり
0.3人週（要チームでの見積もり）

## Definition of Done
- [ ] 全BDDシナリオが確認手順として実施済み
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み

## 出どころ
- 2026-11-24 正式版準備の棚卸し。`.github/workflows/release.yml:82-92`
- 依存: 274 と同時実施を推奨
