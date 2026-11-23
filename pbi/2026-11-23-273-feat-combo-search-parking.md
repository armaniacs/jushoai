# PBI: 検索補助窓の停泊と残置欄の pin 固定

## ユーザーストーリー

学校の申込み形を使う人として、塾の検索窓に塾名が入って完了と誤認しないようにしたい、なぜなら 送信値は隣の隠し select が持ち、見た目だけ埋まると必須エラーの往復が増えるから

## 優先度

- 順位: 単発 (なぜなぜ分析 3立場 x 30連鎖 2026-11-23 の着手分)。272 の後続
- RICEスコア: 48 (Reach=30 / Impact=2 / Confidence=80% / Effort=0.2人週)
- 根拠: 語彙 1 述語と fixture 復元で済む。誤注入面を 1 つ減らし、停泊を pin に固定する

## BDD受け入れシナリオ

```gherkin
Scenario: 検索補助窓は停泊する
  Given placeholder に 検索 を含む text 型の欄がある
  When  分類する
  Then  confident unknown になり計画にも LLM 送付にも載らない

Scenario: 残置欄は pin で固定される
  Given 足立 fixture に塾コンボ可視部と出身3連動がある
  When  分類と計画を作る
  Then  絞り込み2欄と2段目以降は unknown 停泊、学校selectは空optionで警告に置く
```

## 受け入れ基準

- [x] `塾を検索` のような placeholder の text 型が confident unknown になる (text/search 型に限定)
- [x] 足立 fixture に可視部を戻し excluded 注記を現仕様に書き換える
- [x] pin を更新し理由を記録する
- [x] PBI-270 に分析の示唆を追記する
- [x] `make check` と `make eval` が緑

## テスト戦略

- 単体: textCombo 形状 (placeholder 検索 x nearby 塾) の分類。値欄形 (label 検索なし) の対照
- 統合: 足立 fixture で停泊行が expected に入らないこと
- corpus: make eval で全 pin を確認

## 見積もり

0.2人週 (要チームでの見積もり)

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み

## 出どころ

- `.superpowers/sdd/why-why-school-remnants-2026-11-23.md` (3立場 x 30連鎖、着手時点の実測 6 件付き)
- `tmp/adachi/` の保存 HTML (#textCombo と #combobox と shussin 3連動)

## 実装者向け注記

- 検索 placeholder 語彙は classify-vocab-misc の isSearchBox の隣に置く (概念の単一所有)。ゲートは classify-rules の isSearchBox 直後、autocomplete/email の後に置く
- 対象は tag input かつ type text/search。select や button は対象外
- placeholder は norm して判定する (全角吸収)
- corpus の 検索placeholder は全件検索窓 (実測 13 種)。誤爆が出たら juku 特化に狭める
- 絞り込み2欄と隠し部への値注入はしない (出身地=現住所の仮定と ajax 待ちが PBI-270 の射程)

## 実装記録（2026-11-23）

- `work/emergency-contact-tel` に 4 コミット: 計画起票 e12b661、語彙追加 9adc3fe、fixture 復元 fbc007d、norm 退行修正 19c6093
- 語彙は `isJukuSearchWindow` (placeholder に 塾 と 検索 の両方を必須) として classify-vocab-misc に実装し、classify-rules の isSearchBox ゲートの直後に置いた。検索語だけの広い語彙は keyence の会社名欄 (placeholder に検索を含む) の pin を壊したため、計画の約束どおり塾語必須に狭めた
- 初回実装の `norm(m.placeholder.trim())` が norm 数契約 (nfkc-once) を壊したため、19c6093 で buildFieldNormViews のビュー再利用 (person-role 前例) に直した。契約値 6/7 を復元
- 足立 fixture に可視部 6 欄を戻した (textCombo・jukuShikuchosonCd・jukuCd・shussinTodofukenCd・shussinShikuchosonCd・shusshinSchoolCd)。停泊 5 欄は confident unknown、shusshinSchoolCd は school 分類のまま空 option で warn-no-option
- pin は adachi のみ `p(29,0,20,9,0)` → `p(30,0,20,9,0)` (+1 ruleHits は shusshinSchoolCd の school 判定)。他 fixture は不動
- 検証: make check exit 0 (194 files・3336 passed + 期待失敗1・build 24・web-ext 誤り 0)、make eval 3 passed
- 分析の全文は `.superpowers/sdd/why-why-school-remnants-2026-11-23.md` (3立場 x 30連鎖・着手時点の実測 6 件付き。.superpowers は gitignore のためリポジトリ外)
- 残置: 絞り込み2欄への値注入と ajax 待ちは PBI-270 の射程。隠し部 (#combobox・jukuTodofukenCd) は isHidden と hidden 型除外の既存防御で担保し、注入も fixture 収録もしない
