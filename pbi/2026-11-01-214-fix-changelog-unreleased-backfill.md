# PBI: CHANGELOG 遡及（204〜210 の変更を Unreleased に 1 コミットで記録する）

## ユーザーストーリー
次の 0.1.30 のリリースノートを読む利用者として、204〜210 で入った変更（ダークモードの自動追従・pattern 違反の注入警告・E2E のドライバー事前検査・PR テンプレート・corpus 拡充）もノートに載っていてほしい、なぜなら Unreleased に PBI-211 と PBI-212 の 2 行だけが残ったままだと、0.1.30 が数行のみの半端なリリースノートで出て、入ったはずの変更が読めなくなるから

## 優先度
- 順位: 1 / 8（RICE 採点ラウンド、ユーザー承認済み）
- RICEスコア: 10.0（Reach=1.0: 0.1.30 のリリースノートに触れる全利用者 / Impact=1: 中、ノートの質 / Confidence=100%: ガード動作と未記録変更を実測済み / Effort=0.1 人週: docs のみ・1 コミット）
- 根拠: 半端リリースの防止。独立・最小（他候補とファイル競合なし）。依存なし（次の push に同乗）
- 依存関係: なし。PBI-211・212 は実装済み・未 push（branch ahead 2）のため、本 PBI の遡及コミットはその 2 コミットに同乗して次の push で一緒に上がる。CHANGELOG.md を触る他の候補は 213 など未実装のものだけで、現時点で競合するファイルは無い

## 出どころ
- なぜなぜ分析（.superpowers/sdd/why-why-arch-2026-10-31-summary.md）の発見 10（着手順序と RICE 前提）を、3 立場のうち開発プロセス・運用が Top 1 に挙げた項目: CHANGELOG 遡及（204〜210 の利用者に見える変更が未記録。ガードは空節のみを捕らえ行の不足を捕らえないため、遡及 1 コミットを次の push に同乗させるのが最優先）（summary:11。着手計画 1 番は summary:36、状態訂正は summary:45）
- 実測で確認した現状（2026-11-01 起票時）:
  - CHANGELOG Unreleased は現在 2 行（### Changed 配下に PBI-211 の corpus radio 復元と PBI-212 の英語語彙。PBI-212 実装の 402def7 で 1 行から 2 行になった）。最終リリースは 0.1.29（2026-10-29）
  - 204〜210 の実装コミット（いずれも origin に push 済み）が Unreleased に未記録:
    - PBI-204: 5ff42cb（E2E の ChromeDriver 版数事前検査、初回ガイド横取りの CI 失敗を修正）
    - PBI-205・206: 714d108（プライバシー記事に監査ログ保持期間と DNS rebinding の注意書き）
    - PBI-207: bbe4cc1（.github/PULL_REQUEST_TEMPLATE.md の追加）
    - PBI-208: ee13efa（corpus に radio・海外フォームの 5 fixture 追加、pin 204/46/127）
    - PBI-209: 20e1235（shadow UI のダークモード自動追従、OVERLAY_CSS とバナーの変数化）と 06846e6（color-scheme の上書きをカスケード順で効くように）
    - PBI-210: b57b19c（pattern 違反の値注入を警告して注入しない）
  - release-notes.mjs のガードは節見出しが無いときだけ throw し（scripts/release-notes.mjs:8）、CLI は本文が空文字列のときだけ throw する（:18）。節があっても行が足りない場合は何も検査しない
  - release.yml では Submit to stores（:49-64）が Extract release notes（:79-80）より先に走り、ガードが fire するとしたら提出の後。行不足のままタグを打つと、ストア提出は完了したうえで半端なノートの GitHub Release が作られる（:82-92）
  - CHANGELOG.md の消費者はこのリリース経路のみ。ドキュメントサイト（site/）とテスト（tests/release-notes.test.ts、inline の文字列を使う）は CHANGELOG.md の実物を読まない

## BDD受け入れシナリオ
Scenario: 204〜210 の変更が Unreleased にそろって記録される
  Given Unreleased には PBI-211 と PBI-212 の 2 行だけが記録され、204〜210 の変更はどこにも載っていない
  When 遡及の 1 コミットで 204〜210 の変更が Unreleased に追記される
  Then ダークモードの自動追従、pattern 違反の注入警告、E2E のドライバー事前検査、PR テンプレート、corpus 拡充が、読む人向けの区分（Added/Changed/Fixed など）に分けて並び、入った変更がどれも欠けない

Scenario: 既に記録済みの PBI-211・212 の行は壊れない
  Given Unreleased に PBI-211 と PBI-212 の行が既に記録されている
  When 遡及の追記を行う
  Then 既存の 2 行の文言と位置は保たれ、Keep a Changelog の見出し構造（Unreleased・バージョン節・末尾のリンク定義）は壊れない

Scenario: 次の 0.1.30 のリリースノートが半端にならない
  Given 遡及後の CHANGELOG で v0.1.30 のタグが打たれる
  When リリース workflow が 0.1.30 のノートを抽出する
  Then 抽出されたノートに 204〜212 の変更がそろって含まれ、数行のみの半端なノートにならない

## 受け入れ基準
- [ ] Unreleased に 204〜210 の利用者に見える変更（ダークモードの自動追従 / pattern 違反の注入警告 / E2E のドライバー事前検査 / PR テンプレート / corpus 拡充）が記録され、どれも欠けない
- [ ] Unreleased の各行が実際の実装コミットと各 PBI の実装記録と一致する（実在しない変更を書かない）
- [ ] 既に記録済みの PBI-211・212 の 2 行を壊さない（文言・位置を保つ）
- [ ] Keep a Changelog の構造を維持する（Unreleased の見出しと Added/Changed/Fixed などのセクション分け。バージョン節と末尾のリンク定義に触れない）
- [ ] 遡及後の Unreleased が `node scripts/release-notes.mjs Unreleased` で抽出でき、エラーにならない（現在の空節で失敗する挙動を壊さない。scripts/ と workflow には触れない。行不足を検出するガードの強化は本 PBI の範囲外）
- [ ] 0.1.30 のタグは遡及コミットが入った push の後に打つ（タグと版上げ自体は本 PBI に含めない）
- [ ] CHANGELOG.md と PBI 台帳（本 PBI への実装記録）を 1 コミットにまとめる
- [ ] 文字種チェックが OK（check_docs_chars.py が「OK: no out-of-range characters」を出す。CHANGELOG.md も同様）
- [ ] `make test` が緑のまま

## 実装手順
- 出どころ節の実装コミットと各 PBI の実装記録（pbi/2026-10-31-204 〜 210）から利用者に見える変更を読み取り、Keep a Changelog の区分（Added/Changed/Fixed）ごとに Unreleased への行を起こす。行の文言はこの PBI では決めず、実装時に実在の変更から書く
- 既存の PBI-211・212 の 2 行を壊さず、セクション見出しの配下に置く。区分が増える場合も Keep a Changelog の見出し構造の範囲で行う
- バージョン節と末尾のリンク定義には触れない。版上げ・タグ付けは本 PBI に含めない
- `node scripts/release-notes.mjs Unreleased` で抽出を確認し、check_docs_chars.py で文字種を確認する
- CHANGELOG.md と PBI 台帳（本 PBI に実装記録）を 1 コミットにまとめ、次の push に同乗させる

## テスト戦略
- E2E: なし（リリースノートはブラウザを経ない）
- 統合: なし（site は CHANGELOG を読まないため make site-serve での表示確認は無い。リリース経路の抽出確認として `node scripts/release-notes.mjs Unreleased` が統合相当）
- 単体: charset チェック（check_docs_chars.py）+ Keep a Changelog 構造の目視確認（セクション見出し・リンク定義の維持）+ 各行を実装コミットと PBI 台帳に突き合わせる手動確認

## 見積もり
1（要チームでの見積もり）

## 実装者向け注記

### 現状の確認
（着手前に必ず実行すること）

```bash
node scripts/release-notes.mjs Unreleased
git log --oneline v0.1.29..HEAD
python3 /Users/yaar/.agents/skills/docs-charset/scripts/check_docs_chars.py CHANGELOG.md
```

未実装の確認済み（2026-11-01 起票時）: Unreleased に 204〜210 の変更行は無い。対象の実装コミットは 7 コミット（PBI-209 は実装と後追い修正の 2 コミット: 20e1235・06846e6）。ガード（scripts/release-notes.mjs:8・:18）は空節のみで行の不足は見ない。tests/release-notes.test.ts は節の抽出と no-section の throw のみを固定し、空節・行不足は未カバー。

### 落とし穴
- リリース workflow は Submit to stores が先で、ガードの失敗はストア提出の後に出る（release.yml:49-80）。半端リリースの防止はガードではなく遡及コミット自体で行い、次のタグを打つ前に Unreleased を整える
- CHANGELOG の節本文はリリースノートとしてそのまま抽出される（trim のみ、scripts/release-notes.mjs:11）。既存の行の文体（プレーンな 1 文、必要な箇所だけコード span）に合わせて書く
- PBI-203 の参加者名語彙（5d10972、0.1.29 以降の実装）も Unreleased に未記録。必須範囲は 204〜210 だが、同一遡及コミットに載せるかは実装時に判断して実装記録に残す
- 205・206 の記事の注意書き（714d108）は読み物向けの変更。載せるかどうかも実装時に判断し、判断を実装記録に残す
- 既存の 211・212 行は ### Changed 配下にある。区分の再配置で既存行の位置や文言が変わらないようにする
- チェックボックスのチェックと実装記録の追記を CHANGELOG 更新と同じコミットに残す（台帳だけ直すと遡及の記録が台帳と食い違う）

## Definition of Done
- [ ] 全 BDD シナリオを検証手順として確認し、パスする（docs のみの PBI で、自動テストの追加はしない。`make test` が緑のまま）
- [ ] コードレビュー完了
- [ ] CHANGELOG Unreleased に 204〜210 の変更が整い、次の 0.1.30 のタグ運用に備える
- [ ] 本 PBI に実装記録（区分の判断・PBI-203 と 205・206 の扱い・文字種チェックの結果）を残す
- [ ] 変更は CHANGELOG.md と PBI 台帳のみで、scripts/・workflow・src/ には触れない
