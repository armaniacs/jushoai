# PBI: corpus fixture の radio グループ復元 + re-pin（radio-heavy 軸を計測可能に）

## ユーザーストーリー
「JushoAIで入力」を使う利用者として、corpus が実ページの radio 構成（評価・種別・会員・時期などの radio 群）を実際に載せてほしい、なぜなら radio 政策の適用範囲（性別・年代のみ分類し残りは未分類のまま）が fixture 上で数えられず、radio-heavy 軸の伸びしろが測れないから

## 優先度
- 順位: 未定（次ラウンドの RICE で確定）
- 根拠: PBI-208 review Minor（radio restore）。corpus は分類指標の測定基盤で、radio 政策の適用範囲を実測できる形にする間接価値。radio を分類語彙に足す軸（212）の前に、まず計測できる形にする

## 出どころ
- PBI-208 の review Minor（progress.md:151、レビュー証跡 review-f92ce4e..ee13efa.diff）: radio-policy コメントが fixture に無い radio グループを語る（axis (a) radio coverage gone）。restore radio groups as formmailer-anketo-gender does and re-pin
- 該当 fixture とコメントの証跡（いずれも radio 要素は無く、ヘッダーコメントだけが語っている。2026-10-31 起票時に grep で確認済み）:
  - samples/richell-anketo-rating.html:6-7（rating radios 5段階評価×4・10段階×2 は matrix で未分類。radio 要素は無し、fixture 別指標 0/1/0）
  - samples/kosodate-contact.html:7（電話番号種別 radios 自宅/携帯/所属先）
  - samples/library-theater-apply.html:6-7（会員 radio 会員/非会員）
  - samples/gis-intl-admission.html:7-8（enrollment/grade radios 希望する入学・編入時期、希望する学年、寮、日本語の学習歴）
- 復元の参照: samples/formmailer-anketo-gender.html:75-96（性別 radio group。div role="group" data-fieldset-id + legend + label 包みの radio 要素を残す同形）
- 政策: radio は name 単位で 1 欄に束ね、性別・年代のみ分類してそれ以外は未分類のまま置く（AGENTS.md テスト方針。PBI-208 の受け入れ基準も同じ約束事）

## BDD受け入れシナリオ
Scenario: radio グループが実ページどおり fixture に載る
  Given richell・kosodate・library-theater・gis の 4 fixture に、実ページと同じ構成の radio グループ（fieldset と legend、label 包みの radio 要素）が復元されている
  When make test を実行する
  Then 各 fixture の samples.test.ts ケースが radio 欄を含んだ欄構成で緑になり、ヘッダーの radio-policy コメントが実際の radio 要素と一致する

Scenario: radio-heavy 軸が指標として数えられる
  Given radio グループ復元後の corpus
  When make eval を実行する
  Then 性別・年代以外の radio 欄は未分類のまま数えられ（radio 政策どおり）、fixture 追加分の指標差分が corpus.eval.ts の pin 更新で固定される

Scenario: 復元した radio 欄が誤って注入されない
  Given radio グループ復元後の corpus で make test を実行する
  Then 性別・年代に当たらない radio 欄は plan に出ず、checkbox・hidden の除外政策も従来どおり保たれる

## 受け入れ基準
- [ ] 4 fixture（richell・kosodate・library-theater・gis）に実ページどおりの radio 要素が復元され、radio-policy コメントが最終状態を語る文言になる
- [ ] radio は name 単位で 1 欄に束ね、性別・年代のみ分類、それ以外は未分類のまま（政策を崩さない）
- [ ] tests/integration/samples.test.ts の該当 4 ケースが緑になる
- [ ] make eval の指標差分を tests/eval/corpus.eval.ts の pin 更新で同じコミットに固定する（劣化した指標は放置しない）
- [ ] de-identified のまま privacy test（corpus.eval.ts）がパスする
- [ ] make check が exit 0

## 実装手順
- samples/ の 4 fixture に formmailer-anketo-gender.html と同形で radio 要素を復元する（fieldset（div role="group" data-fieldset-id）+ legend + label 包みの radio 要素）。実ページの取り直しが必要な場合は node scripts/add-fixture.mjs <url> [fixture名] から始める
- 各 fixture のヘッダーコメントを最終状態の文言に整える（コメントが実際に存在する radio 要素を語るように）
- tests/integration/samples.test.ts の該当 4 ケースに期待値を埋める
- make eval で指標差分を確認し、tests/eval/corpus.eval.ts の pin を本 PBI の実装コミットで一緒に更新する（別コミットに割ると fixture と pin の食い違いが持ち越される）
- 走査・分類を触る場合は fixture 先行 TDD: tests/core/ に makeMeta で再現 fixture を足して失敗させてから直す。正規表現が落ちたら期待値ではなく正規表現を直す

## テスト戦略
- 統合: tests/integration/samples.test.ts の 4 fixture ケースで期待値固定
- 指標: make eval（corpus.eval.ts の pin 更新込み。fixture 別の差分も実装記録に残す）
- 単体: 走査・分類を触るときは tests/core/ に再現 fixture を先に足す（makeMeta）

## 見積もり
1（要チームでの見積もり）

## 実装者向け注記

### 現状コードの確認
（着手前に必ず実行すること）

```bash
grep -c 'type="radio"' samples/richell-anketo-rating.html samples/kosodate-contact.html samples/library-theater-apply.html samples/gis-intl-admission.html
grep -rn 'radio' samples/richell-anketo-rating.html samples/library-theater-apply.html samples/gis-intl-admission.html samples/kosodate-contact.html | head
```

復元先の radio 要素は上記 4 fixture に存在しない（コメントだけが語っている）ことを起票時に確認済み（2026-10-31）。formmailer-anketo-gender.html と formmailer-raijo-age.html が radio 要素を持つ参照 fixture。

### 落とし穴
- richell の rating radios は matrix 型（行ラベル付きの評価群）。name 単位で束ねても性別・年代に当たらないため未分類のまま数える。分類語彙を足すのは別軸（212）で、本 PBI では計測できる形にするだけ
- radio を復元すると fixture の欄数と make eval の 7 指標が動く。pin 更新を片方だけ直すと pin の食い違いが持ち越される（PBI-210 の nishimachi と corpus.eval.ts と同じ教訓）
- label 包みの構造は formmailer-anketo-gender.html どおりに。hidden の request-parameter-default-empty は送信用のため除外（走査除外政策どおり）。checkbox は skip 固定のまま崩さない

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録）
