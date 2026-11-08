# PBI: corpus fixture の radio グループ復元 + re-pin（radio-heavy 軸を計測可能に）

## ユーザーストーリー
「JushoAIで入力」を使う利用者として、corpus が実ページの radio 構成（評価・種別・会員・時期などの radio 群）を実際に載せてほしい、なぜなら radio 政策の適用範囲（性別・年代のみ分類し残りは未分類のまま）が fixture 上で数えられず、radio-heavy 軸の伸びしろが測れないから

## 優先度
- 順位: 着手確定（なぜなぜ分析（持ち越し候補、2026-10-31）の合意で着手順序 1 番。radio 計測が語彙追加（212）の前にある）
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
- [x] 4 fixture（richell・kosodate・library-theater・gis）に実ページどおりの radio 要素が復元され、radio-policy コメントが最終状態を語る文言になる
- [x] radio は name 単位で 1 欄に束ね、性別・年代のみ分類、それ以外は未分類のまま（政策を崩さない）
- [x] tests/integration/samples.test.ts の該当 4 ケースが緑になる
- [x] make eval の指標差分を tests/eval/corpus.eval.ts の pin 更新で同じコミットに固定する（劣化した指標は放置しない）
- [x] de-identified のまま privacy test（corpus.eval.ts）がパスする
- [x] make check が exit 0

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
- [x] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み（本 PBI に実装記録）

## 実装記録（2026-10-31）

### 復元した radio グループ（4 fixture、radio 欄 +14、すべて未分類）
- samples/richell-anketo-rating.html: 評価 radios 6 群（5段階×4 = field_2953447〜2953450、10段階×2 = 2953452・2953453）を formmailer-anketo-gender.html:75-96 同形（div role="group" + data-fieldset-label + legend + label 包みの radio、name 単位で束ね）で復元。fieldset の label/legend は実ページどおりの尺度文言（5：満足、4：まあまあ満足、3：普通、2：やや不満、1：不満 ほか）。選択肢 value は実ページどおり 0-4 と 0-9、option text は 5〜1 と 10,９〜１。実ページの質問見出し（A〜D・(3)(4)）は入力を持たない label 専用 fieldset で走査対象外のため省略し、各グループ直前のコメントで質問との対応を残した
- samples/kosodate-contact.html: 電話番号種別 radios（自宅/携帯/所属先、name=wpforms[fields][42]）を実ページの wpforms マークアップどおり復元。実ページでは field label（(04)電話番号種別）が radio 入力に紐づかないため、走査上のグループ label は先頭 option の自宅になり分類語彙に当たらない。formmailer 同形（data-fieldset-label="電話番号種別"）で戻すと label に電話が載り tel 誤分類になるため（走査・分類は触らない制約、実ページの実際の挙動を優先）、実ページ構成を採用した
- samples/library-theater-apply.html: 会員 radio（なら図書館につどう会　会員: 会員/非会員、field_6426354）を formmailer-anketo-gender.html 同形で復元（既存 fieldset の簡易形に合わせた属性構成、label は legend 側に載る）
- samples/gis-intl-admission.html: enrollment/grade radios 6 群（desired-enrollment 5・desired-grade 7・dormitory-accommodation 3・japanese-proficiency 3・jlpt-level 6・studied-japanese 2）を実ページの選択肢 value どおりで復元。行 th の質問見出しは radio meta の nearby に入らないため、各グループに legend（希望する入学・編入時期 ほか）を持たせた。生の CF7 構成（legend なし）だと desired-grade の先頭 option（中学1年 / Junior High School Grade 1）が school 語彙に当たるため、formmailer 同形が必須だった

### 指標差分（make eval、ローカル計測）
- fixture 別（ruleHits/llmFallbacks/fillable、fields）: richell-anketo-rating 0/1/0 fields 1 → 0/7/0 fields 7、kosodate-contact 4/4/4 fields 8 → 4/5/4 fields 9、library-theater-apply 15/3/9 fields 15 → 15/4/9 fields 16、gis-intl-admission 6/2/4 fields 8 → 6/8/4 fields 14
- 集計: fields 247 → 261（radio 欄 +14）、ruleHits 204 → 204（不変）、llmFallbacks 46 → 60（未分類の radio 欄の分）、fillable 126 → 126（不変）、refineChanged 28 → 28（不変）、refineDropped 0 → 0。radio-heavy 軸（radio 欄の数と radio 政策の適用範囲）が指標として数えられるようになり、pin は 204/60/126 に fixture 変更と同じコミットで更新した

### 確認したテスト
- make test: 174 ファイル全緑。samples.test.ts に PBI-211 の期待値ケース（restored radio groups are one field per name and stay unclassified）を追加し、4 fixture の radio グループ name・option 数・未分類を固定。既存 4 ケースの toEqual は radio が plan に出ないため不変
- make eval: pin 更新後に緑
- make check: exit 0
- 文字種チェック: check_docs_chars.py が OK（本 PBI と CHANGELOG.md）
- src/ は未変更（fixture の復元・期待値・pin 更新のみ。分類ルールの変更は 212 のスコープ）
