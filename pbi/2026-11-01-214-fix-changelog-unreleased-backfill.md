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
- [x] Unreleased に 204〜210 の利用者に見える変更（ダークモードの自動追従 / pattern 違反の注入警告 / E2E のドライバー事前検査 / PR テンプレート / corpus 拡充）が記録され、どれも欠けない
- [x] Unreleased の各行が実際の実装コミットと各 PBI の実装記録と一致する（実在しない変更を書かない）
- [x] 既に記録済みの PBI-211・212 の 2 行を壊さない（文言・位置を保つ）
- [x] Keep a Changelog の構造を維持する（Unreleased の見出しと Added/Changed/Fixed などのセクション分け。バージョン節と末尾のリンク定義に触れない）
- [x] 遡及後の Unreleased が `node scripts/release-notes.mjs Unreleased` で抽出でき、エラーにならない（現在の空節で失敗する挙動を壊さない。scripts/ と workflow には触れない。行不足を検出するガードの強化は本 PBI の範囲外）
- [ ] 0.1.30 のタグは遡及コミットが入った push の後に打つ（タグと版上げ自体は本 PBI に含めない）
- [x] CHANGELOG.md と PBI 台帳（本 PBI への実装記録）を 1 コミットにまとめる
- [x] 文字種チェックが OK（check_docs_chars.py が「OK: no out-of-range characters」を出す。CHANGELOG.md も同様）
- [x] `make test` が緑のまま

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

## 実装記録（2026-11-01）

### 区分の判断と各行

Unreleased に Added・Changed・Fixed の3区分を起こした（Keep a Changelog の標準の見出し順）。既存の `### Changed` 見出しと PBI-211・212 の 2 行は文言・位置とも変更していない（新規行は 212 の行の後に置いた）。行の文言は実装コミットと各 PBI の実装記録から書いた。

- Added（4 行）:
  - ダークモード自動追従（PBI-209、実装 20e1235 + 後追い修正 06846e6）。行文言は「OS のダークモード設定に、ページ上のバナーとパネル（プレビュー・AIガイド・確認ダイアログなど）が自動で追従する（shadow root 内の CSS 変数化と dark パレット。light モードの見た目は不変）」。利用者に見える新機能のため Added。実装と後追い修正（color-scheme のカスケード順）はどちらも未リリースで、利用者が受け取る機能は 1 つのため 1 行にまとめた
  - PR テンプレート（PBI-207、bbe4cc1）。`.github/PULL_REQUEST_TEMPLATE.md` の新設のため Added。4節構成（概要・内容・検証・注意）は実装記録どおり
  - corpus 拡充（PBI-208、ee13efa）。行文言は「samples corpus に実ページの fixture 5 件（rating radio 群・電話種別 radio・氏名 fieldset・英文の入学相談・table 見出しの海外フォーム）を追加し、ルール語彙の伸びしろを測れる形にする」。fixture の内訳は実装記録の取り込み 5 件（richell-anketo-rating・kosodate-contact・library-theater-apply・nishimachi-inquiry・gis-intl-admission）どおり。既存の 211 の行（radio 復元）と重複しないよう、追加に限定して書いた
  - E2E の版数事前検査（PBI-204、5ff42cb）。行文言は「Chrome の E2E に ChromeDriver と Chrome の版数の事前検査を追加する（不一致・取得不能のときは修復手順を示したメッセージで失敗し、古いキャッシュに黙って落ちない。`CHROME_BIN`・`CHROMEDRIVER_BIN` での上書きも可能）」。既存の CHANGELOG で E2E・CI 基盤の追加を Added に載せる運用（0.1.26・0.1.29）に合わせた
- Changed（新規 1 行。211・212 の 2 行は不変）:
  - 参加者名語彙（PBI-203、5d10972）。行文言は「参加者名の語彙を分類に足す: 「(01)参加者名」のラベルを持つ欄が氏名として分類され、フォーラム申込フォームで参加者名の氏名が補完される」。212 の英語語彙の行と同種・同調子の文言にし、区分内の位置も 212 の直後にした（判断の理由は下記）
- Fixed（2 行）:
  - pattern 違反の注入警告（PBI-210、b57b19c）。行文言は「欄の pattern と合わない値が黙って注入される問題を修正し、maxlength 超過と同じ位置の警告行にして注入しない（preview に「欄のパターンと合わないため入力しません」と表示され、承認しても値は入らない。正規表現の構造を持たない pattern と type=date は検査対象外）」。出どころに「PBI-208 で露呈した実バグ」とあり、黙って注入されて送信が壊れる実害の修正のため Fixed。警告文言（STATUS_NOTE）と対象外の 2 点は実装記録どおり
  - 初回ガイド横取りの CI 失敗（PBI-204、5ff42cb）。行文言は「初回向けガイドの浮遊表示が保存ボタンのクリックを横取りして CI の Chrome E2E が失敗する問題を修正する（ガイドを一時非表示にしてから本体を操作する）」。PBI-204 の 1 コミットは版数検査の追加と横取り修正の2面のため、区分ごとに分けて書いた

### PBI-203 の参加者名語彙（5d10972）の判断

同一遡及コミットに載せた。理由: 拡張機能自体の利用者に見える分類の変化（参加者名欄が氏名として分類され補完される）で、既存の 212（英語フォームの語彙）と同種の変更。この行を欠かすと、0.1.30 のノートに本 PBI が防ごうとしている「入ったはずの変更が読めない」状態が残る。文言は PBI-203 の実装記録（FULL_NAME 正規表現への追加、samples/forum.html と samples.test.ts の期待値固定、make eval の指標 163/33/102）と一致させた。

### 205・206 の記事の注意書き（714d108）の判断

載せなかった。理由: docs/blog/04-for-users-privacy-design.md への 1 文ずつの追記で、拡張機能の挙動にも同梱されるドキュメント（site/content・README・ユーザー向けガイド）にも触れない読み物向けの変更。CHANGELOG の消費者は release-notes.mjs の抽出を経由してリリースノートを読む利用者で、伝えるべきは拡張機能の変更のため、記事の注意書きは対象外と判断した。同種の blog 記事の追加（eae39f7、0.1.29 以降）も CHANGELOG 未記録で、記事単位の追記を載せない既存の運用に合わせた。

### 検証

- `node scripts/release-notes.mjs Unreleased`: エラーにならず、Added 4 行・Changed 3 行（既存 2 行 + 新規 1 行）・Fixed 2 行を抽出した
- `python3 /Users/yaar/.agents/skills/docs-charset/scripts/check_docs_chars.py CHANGELOG.md pbi/2026-11-01-214-fix-changelog-unreleased-backfill.md`: 両方 `OK: no out-of-range characters`（EM DASH U+2014 は不使用。横棒が必要な箇所は使っていない）
- `make test`: 174 ファイル・2255 passed + 1 expected fail（既存の意図的マーカー）で緑。docs のみの変更で、テストの追加・変更はしていない
- バージョン節（`## [0.1.29]` 以降）と末尾のリンク定義には触れていない。タグ・版上げはしていない
- 受け入れ基準のうち「0.1.30 のタグは遡及コミットが入った push の後に打つ」は運用項目のため [ ] のまま残す
