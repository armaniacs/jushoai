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
- [ ] `release.yml` を build（permissions: contents: read、secrets なし）と submit（environment: release）の 2 job に分ける
- [ ] submit job は `npm ci` を最小化する（提出に必要なツールだけを固定版で入れる。`wxt submit` が依存を要するなら、その install は build の node_modules を引き継がない）
- [ ] build job の zip の SHA-256 を job output と成果物で渡し、submit 前に照合する
- [ ] `actions/setup-node` の npm cache を release では使わない（キャッシュ汚染の経路を切る）判断を記録
- [ ] GitHub Release 作成は submit 成功後のまま（半端な Release を残さない既存方針を維持）
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
- [ ] ドキュメント更新済み（docs/release.md）

## 出どころ
- 2026-11-24 正式版準備の棚卸し。`.github/workflows/release.yml:41-64`

## 引継ぎ
- 未着手（2026-11-24）。着手前に `docs/superpowers/plans/2026-11-24-ga-readiness-handoff.md` の該当節を読む（調査済みの事実・落とし穴・検証手順）
