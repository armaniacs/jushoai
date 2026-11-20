# PBI: samples corpus の拡充（継続作業の初回トランチ）

## ユーザーストーリー
「JushoAIで入力」を使う利用者として、samples corpus が実ページの欄構成を広くカバーしてほしい、なぜなら corpus が実フォームの多様性（radio の「参加者名」型・海外フォームなど）を反映しないとルール語彙の伸びしろが測れず、全ユーザーの補完成功率を上げる改善が進められないから

## 優先度
- 順位: 5 / 6
- RICEスコア: 8（Reach=10 / Impact=1 / Confidence=80% / Effort=1人週）
- 根拠: 単独では拡張機能の挙動を変えない間接価値。分類指標の測定基盤として全ユーザーの補完成功率に直結するが、初回トランチ 5 fixture 程度で始める open-ended な継続作業

## 出どころ
- Corpus today: samples/ に 22 fixture（統合テストのケース付き 19 + 手動確認用 demo-* 3、ケース無し）、tests/integration/samples.test.ts に 19 ケース + anchor テスト
- 計測基盤: make eval → vitest.eval.config.ts → tests/eval/corpus.eval.ts（import.meta.glob が samples/*.html を自動収集、PBI-136）+ src/eval/metrics.ts（7 指標: total/ruleHits/llmFallbacks/unknowns/refineChanged/refineDropped/fillable、synthetic profile、通信なし）
- 現在の pin: 163/33/102、refineChanged 22、refineDropped 0。fixture を足すと指標が上がるため corpus.eval.ts の pin 更新が必須（語彙追加は指標の内訳を動かす）
- 1 fixture の運用: make addurl URL=<url>（tests/target-url.md への登録 + 取得 + 雛形生成 + samples.test.ts 配線を 1 コマンドで）→ 最小再現まで削る → 期待値を埋める → テスト緑。radio は name 単位で 1 欄に束ね、性別・年代のみ分類、それ以外は未分類のまま。checkbox は skip 固定、hidden/submit/button/その他型は走査除外
- 伸びしろ（fixture 単位の測定）: 分類率が最も低いのは formmailer-anketo-gender（2/8、fillable 0、radio 政策）、reinvent-registration-contact（4/7）、registration.html（15/19）、formmailer-raijo-age（16/21）。demo-ai-ambiguous 2/10 は LLM デモとして意図的。forum.html（PBI-203）は参加者名 → FULL_NAME 解決済みで、残り unknown は意図的（サイト内検索 name="s"）
- 制約: de-identified のみ（実個人情報を入れない。corpus.eval.ts:50-65 の privacy test が、ページ文字列が報告行に出ないことと 1 行 200 バイト以内を検査）、fixture 先行 TDD（tests/helpers.ts makeMeta）、target-URL 由来 fixture には samples.test.ts ケースが必須、初回トランチ 5 fixture 程度

## BDD受け入れシナリオ
Scenario: 新しい fixture が指標を伸ばす
  Given make addurl で取り込んだ実ページの最小再現が samples/ に置かれ、tests/integration/samples.test.ts にケースが配線されている
  When in-scope の欄に期待値を埋めて make test と make eval を実行する
  Then 新 fixture 分だけ ruleHits または fillable が伸び、corpus.eval.ts の pin を更新して make eval が緑になる

Scenario: 追加した fixture が de-identified を守る
  Given 追加した fixture に実在の人物に紐づく個人情報はなく、label や field id などページ由来の文字列が含まれている
  When make eval を実行する
  Then 報告行にページ文字列が出ず、1 行 200 バイト以内のままで privacy test（corpus.eval.ts）がパスする

Scenario: pin 更新を忘れると評価が落ちる
  Given corpus.eval.ts の pin が既存の fixture 構成のままで、新しい fixture を samples/ に追加した
  When make eval を実行する
  Then pin が合わず評価が RED になり、fixture 追加のたびに pin 更新が必須だと分かる

## 受け入れ基準
- [x] 初回トランチとして samples/ に 5 fixture 程度を追加する。target-URL 由来は make addurl の手順どおり tests/target-url.md に登録し、samples.test.ts にケースを配線する
- [x] 各 fixture は最小再現まで削り、in-scope の欄に期待値を埋めてテストを緑にする（radio は name 単位で 1 欄に束ね、性別・年代のみ分類、checkbox は skip 固定のまま崩さない）
- [x] fixture 追加と語彙追加に合わせて tests/eval/corpus.eval.ts の pin を更新し、make eval が緑になる（劣化した指標は放置しない）
- [x] 追加する fixture は de-identified のみで、privacy test がパスする
- [x] make check が exit 0

## 実装手順
- 台帳から URL を選び make addurl URL=<url> で取り込む（登録・取得・雛形生成・テスト配線まで 1 コマンド）。人は最小再現まで削って期待値を埋めるだけ
- tests/integration/samples.test.ts のケースに期待値を埋めて緑にする
- 分類のずれが見つかったら fixture 先行 TDD: tests/core/ に makeMeta で再現 fixture を足して失敗させてから語彙（classify-rules など）を直す。正規表現が落ちたら期待値ではなく正規表現を直す
- 語彙追加後、make eval で指標を確認し corpus.eval.ts の pin を更新する
- 成長軸: (a) radio・「参加者名」型の語彙追加が主な伸びしろ (b) 海外フォーム（latin 住所・ローマ字名、overseas-address-form/overseas-webform-joshibi 済み）の継続取り込み。demo-* 3 件（ケース無し）は手動確認用として対象外

## テスト戦略
- 統合: tests/integration/samples.test.ts（target-URL 由来 fixture にケース必須）
- 指標: make eval（fixture 追加・語彙追加のたびに pin 更新）
- 単体: 語彙を触るときは tests/core/ に再現 fixture を先に足して失敗させてから直す（makeMeta）

## 見積もり
1（要チームでの見積もり）

## Definition of Done
- [x] 全 BDD シナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] ドキュメント更新済み（本 PBI に実装記録）

## 実装記録（2026-10-31）

初回トランチとして 5 fixture を `make addurl` で取り込んだ。URL は web_search で選び、取得前に実フォームの有無を確認した。

取り込んだ URL と fixture:
- https://business.form-mailer.jp/lp/61093651176278 → samples/richell-anketo-rating.html（リッチェルお客様アンケート。5段階評価×4・10段階×2 の rating radio 群とご要望 textarea が対象外で、受付番号 text が唯一の in-scope 欄）
- https://kosodatehiroba.com/form/contact → samples/kosodate-contact.html（お問い合わせフォーム。電話番号種別 radio が radio 政策どおり未分類、所属（会社・団体・学校等）は複合ラベルで未分類）
- https://ssl.form-mailer.jp/fms/a0ed8265668444 → samples/library-theater-apply.html（図書館劇場21第4幕 参加申し込み。氏名/フリガナ fieldset・郵便番号 2 欄・電話 3 欄・会員 radio）
- https://www.nishimachi.ac.jp/admissions/inquiry-form → samples/nishimachi-inquiry.html（英文の入学相談フォーム。autocomplete token によるローマ字名・Gender radio（Male/Female は日本プロファイル値と不一致で warn）・Date of Birth）
- https://www.gis.ac.jp/secondary/international-admissions-inquiry-form/ → samples/gis-intl-admission.html（海外からの入学相談フォーム。table th の nearby 見出し・氏名欄・居住国）

選定時に落とした URL:
- https://rakufo.com/templates/application/event-participation-application-form: テンプレートのプレビューは JS 描画で、実ページにはログイン/登録フォームしかない
- https://www.chuo-u.ac.jp/english/inquiry/ と https://www.ynu.ac.jp/english/contact/: フォーム入力欄なし（メール窓口のみ）
- https://member.jbsoc.or.jp/: JS アプリで静的フォームなし

指標の変化（make eval、pin 更新済み）:
- 直前の pin: 163/33/102（ruleHits/llmFallbacks/fillable）、refineChanged 22、refineDropped 0
- 実測: 204/46/127、refineChanged 28、refineDropped 0（fixtures 27、fields 247）
- fixture 別: richell-anketo-rating 0/1/0、kosodate-contact 4/4/4、library-theater-apply 15/3/9、nishimachi-inquiry 16/3/8、gis-intl-admission 6/2/4。library-theater 分で refineChanged +6（氏名/フリガナ fieldset と郵便番号・電話の分割）

語彙の伸びしろ（今回 pin した未分類と誤解釈は語彙追加の候補）:
- Nishimachi の Gender radio は Male/Female の選択肢が日本プロファイル値と一致しない（matchGenderOption が warn-no-option）
- School Website が school に、name-institution が fullName に載る（URL・教育機関の語彙なし）
- 所属（会社・団体・学校等）のような複合ラベルは office 前処理の意図どおり未分類

検証: make test 全緑（samples.test.ts に 5 ケース追加）、make eval 緑（pin 更新後）、privacy test（ページ文字列が報告行に出ない・1 行 200 バイト以内）緑のまま。

## 実装記録（Task 3・2026-11-09、第3トランチ 5 fixture）

主軸 (a) 学校・教育問い合わせの語彙化、副軸 (b) 海外フォーム継続で 5 件を `make addurl` で取り込んだ。URL は Bing 検索と DuckDuckGo で選び、取得前に curl で実フォームの有無を確認した。

取り込んだ URL と fixture:
- https://www.bst.ac.jp/inquire → samples/bst-inquire.html（BST 帰国子女系入学 inquiry。OpenApply ROI 静的フォーム。保護者 Surname/Forename/Email/Mobile、児童 Surname/Forename/Middle/Preferred name、Gender radio（値は 1/0）、Date of Birth、Applicant's Current School/Preschool、passport Yes/No radio）
- https://www.isi-education.com/contact/ → samples/isi-contact.html（ISI 日本語学校 contact。Pardot + WOVN 日英併記。ローマ字氏名/Email/Phone、SNS、Nationality、Residence 在日 radio、Study Duration radio、Purpose/Referral select。条件表示ブロックは既定非表示のため削り、zh 限定 disabled radio は除外）
- https://www.ois.ac.jp/contact → samples/ois-contact.html（大阪系インター inquiry。Elementor。保護者名前/フリガナ、子1 名前/フリガナ/性別 select、郵便番号、住所、E-mail、Tel、Fax、紹介者名。子2/3 ブロックと login 系 modal は別フォームのため削り）
- https://business.form-mailer.jp/fms/08ca15c3348737 → samples/kigakuen-briefing.html（希学園 学校説明会申込。実施教室 radio、来場者数、子 名前/フリガナ/性別 radio（男/女）/生年月日/学年/在籍小学校名、兄弟姉妹 radio、保護者名、住所、電話 3 欄、email 確認付き）
- https://ssl.form-mailer.jp/fms/b2c99844164312 → samples/seedome-openschool.html（シードーム オープンスクール申込。名前、email、携帯 3 欄、参加人数 子どもの年齢。ご希望日と参加目的の checkbox 群は skip）

選定時に落とした URL:
- https://www.asij.ac.jp/contact、https://yis.ac.jp/contact/、https://www.seisen.com/contact、https://www.smis.ac.jp/contact: 検索フォームしかない
- https://www.tuj.ac.jp/contact: 可視欄は検索窓のみ（30 input は hidden）
- https://www.caj.ac.jp/contact-us、https://www.giis.ac.jp/contact、https://www.kist.ed.jp/admissions/inquiry、https://www.horizon.ac.jp/admissions/inquiry: 到達不能または JS のみ
- https://www.montessorijapan.com/contact、https://www.marist.ac.jp/contact、https://www.bst.ac.jp/contact-us: 静的だが 2-4 欄と小さいため予備に残した
- 同系の form-mailer 学校説明会（1b86e5a6、9c708bda、e261e643）は到達確認済みの予備

指標の変化（make eval、pin 更新済み）:
- 直前の pin: 203/61/125、refineChanged 28、refineDropped 0（fixtures 27、fields 261、corpus.eval.ts 実測と一致）
- 実測: 259/94/162、refineChanged 39、refineDropped 0（fixtures 32、fields 350）
- 新 5 件の内訳: bst-inquire 14/13/10、isi-contact 5/7/4、kigakuen-briefing 22/10/11（refineChanged +6）、ois-contact 9/2/6（refineChanged +2）、seedome-openschool 6/1/6（refineChanged +3）。合計 +56/+33/+37、refineChanged +11 で集計と完全一致
- in-scope 密度はいずれも高く、richell のような 0 件枠なし（ois 9/11、seedome 6/7、kigakuen 22/32）

語彙の伸びしろ（今回 pin した未分類と挙動は語彙追加の候補、src 変更なし）:
- BST の fake_email ハニーポットが nearby の Email Address ラベルに付いて email 分類され fill する（実ページどおりの構造。ハニーポット除外は将来 PBI の候補）
- 希学園の子フリガナ対は lastName/firstName 分類だが実カタカナ pattern が漢字 plan を warn-pattern で止めて未注入（PBI-210 どおり。pattern を外すと注入されることを確認済み。legend 参照のカナ分類が語彙候補、library-theater と同形）
- BST の Middle Name(s) と Preferred name は fullName に載る（nickname 語彙なし、Nishimachi の Nickname 前例と同形）
- BST の Current Place of Residence、国籍 select 群、Title/Relation、ISI の SNS/Nationality/Purpose/Referral、OIS の Fax/紹介者名はいずれも未分類のまま（LLM fallback）
- OIS の同一フリガナ 2 欄は same-label 分割で親ヤマダ/子タロウに分かれる（pin 済み）

検証: make test 全緑（174 files、2271 passed、samples.test.ts 36 tests。radio 表は分類つき [件数, 分類] 形式に拡張し BST/Kigakuen の gender 解決も pin）、make eval 緑（pin 更新後、privacy と no-network 含む 3 tests）、make check exit 0。
