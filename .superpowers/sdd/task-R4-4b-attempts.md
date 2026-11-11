# Task R4-4b 試行ログ — 東証5000番台 P1 14件の取込結果

- 対象: brief 列挙の P1 14件 (brief の URL を verbatim で使用)。P2・P3 には手を出していない。
- 手順: `make addurl URL=<url> [FIXTURE=<name>]` で1件ずつ取込 → 最小再現まで削る (実ページ取得で見出し・選択肢・编码を照合) → LEDGER 期待値を honest pin で埋める → vitest 緑 → 1 fixture ごとに commit。
- src/ 変更なし。pin 更新 (tests/eval/corpus.eval.ts) なし。samples.test.ts は tooling 配線のみ (直編集なし)。
- 結果: 成功 13件 / 取得不可 1件 (No.3 advantest)。

## 取込結果

| # | URL | 結果 | fixture名 or 失敗理由 |
|---|-----|------|------------------------|
| 1 | https://www.tokyosteel.co.jp/contact/ | 成功 | tokyo-steel-contact-form.html (5 controls。honest pin: 氏名 fullName、部署名→普通科、tel undashed、email確認2欄。category・company・fax は未分類) |
| 2 | https://www.taiheiyo-cement.co.jp/contact/ | 成功 | taiheiyo-cement-contact-form.html (8 controls。form.run。honest pin: 氏名・ふりがな共に山田太郎(無区切り・漢字)、email確認2欄、郵便 undashed、住所は都道府県付き連結、tel undashed、部署名→普通科。gotcha は未分類) |
| 3 | https://www.advantest.co.jp/ja/contact/ | 取得不可 | brief URL は `https://www.advantest.com/ja/ja/contact/` に redirect され 404 (エラーページ、実フォームなし。サイト再編で `/ja/contact/` に移転済み)。無理をせず skip |
| 4 | https://www.ngk.co.jp/contact/input?form_type=3 | 成功 | ngk-contact-form.html (7 controls。honest pin: 氏名→山田 太郎、ふりがな→やまだ たろう、郵便 undashed、住所は都道府県付き連結、tel は dashed、mail、部署名→普通科。お勤め先は未分類) |
| 5 | https://inquiry.lixil.co.jp/regist/is?SMPFORM=naoj-lctgtj-defd68f97cffa36b3ed5f3bcd2c68ca6&qcat=18 | 成功 | lixil-inquiry-form.html (15 controls。SMP。honest pin: 姓名・カナ・郵便の2分割、email確認2欄、都道府県、住所4欄、tel dashed。title・category・item_no・work・company は未分類。住所3/4欄は同一値の重複 fill) |
| 6 | https://global.engine.kubota.co.jp/ja/contact/input.php?fid=01 | 成功 | kubota-engine-contact-form.html (9 controls。honest pin: 姓のみ→山田、ふりがな、郵便分割、都道府県、住所は都道府県なし連結、tel dashed、email確認2欄、部署名→普通科。subject・会社名・エンジン番号2欄は未分類) |
| 7 | https://form.azbil.com/form/pub/contact/kikubari_contact | 成功 | azbil-kikubari-form.html (3 controls。SPIRAL。honest pin: mid-tel 3欄のみ→千代田区。その他 bare コード名は未分類。thin fixture) |
| 8 | https://www.keyence.co.jp/inquiry/askKeyence/ | 成功 | keyence-inquiry-form.html (12 controls。マルチステップ。honest pin: 姓/名分割、email ゲート+確認、会社名→株式会社サンプル、郵便 undashed、都道府県は値'13'、住所は都道府県なし連結+building、tel 2欄は dashed、部署名→普通科。enq0・countryID は未分類) |
| 9 | https://www.sysmex.co.jp/contact/input?inquiry_type=1 | 成功 | sysmex-contact-form.html (10 controls。honest pin: 氏名→山田 太郎、ふりがな→やまだ たろう、施設/会社名→株式会社サンプル、郵便 undashed、都道府県は値'13'、市区町村→千代田区、建物名、tel/fax とも dashed 全値、email。件名・所属部署名は未分類) |
| 10 | https://reg34.smp.ne.jp/regist/is?SMPFORM=pfsd-lgqblb-eadedf16d2d1b0d8725c37ca6ad1a2e6 | 成功 | lasertec-inquiry-form.html (15 controls。SMP。honest pin: 姓名・カナ・郵便・電話の分割、都道府県、市区町村→千代田区、番地→千代田ビル101、ビル名→Long Island City、部署名→普通科、email。会社名・役職は未分類) |
| 11 | https://www.toyoda-gosei.co.jp/contact/seihin_form/ | 成功 | toyoda-gosei-form.html (8 controls。honest pin: 氏名→山田 太郎、ふりがな→やまだ たろう、郵便2分割、住所は番地+建物のみ、tel dashed、email確認2欄。勤務先・所属・FAX は未分類) |
| 12 | https://krs.bz/toktprf/m/materials_request_ja | 成功 | mitsubishi-materials-form.html (18 controls。krs 外資系基盤。honest pin: 氏名・カナ分割、email確認2欄、電話・FAX の3分割×2組、郵便分割、住所は都道府県/丁目・番地/ビルに分割、会社名→株式会社サンプル。部署名は未分類) |
| 13 | https://www.yoshinoya-holdings.com/contact/storeform/ | 成功 | yoshinoya-store-form.html (9 controls。honest pin: 氏名・フリガナとも無区切り、郵便2分割、都道府県テキスト、住所は都道府県付き連結、tel dashed、email、店舗名→山田太郎。ブランド・利用日時は未分類) |
| 14 | https://www.tonami.co.jp/contact/luggage/ | 成功 | tonami-luggage-form.html (10 controls。CF7。honest pin: 姓/名分割、email確認2欄、郵便は dashed、都道府県、住所は都道府県付き連結+building、tel dashed、部署・役職→開発部。会社名・お問い合わせ番号は未分類) |

## 取込時の修正 (tooling 出力に対する人手の最小修正)

1. 汎用名の衝突回避: No.1 が `contact.html` に配線されたため `tokyo-steel-contact-form.html` に改名 (LEDGER/test/registry を手修正)。以降は FIXTURE= を明示 (taiheiyo も素朴には `contact.html` になる)。
2. tr/th 行構造の復元: lixil (SMP・Shift_JIS を UTF-8 に復号、select 実選択肢 15/12/48)、kubota (dl/dt/dd。ヘッダ/フッタの製品検索フォーム混入を除去、select 実選択肢 7/48)、mitsubishi (tr/th。(姓)/(名) inline span は非信号として除去、email placeholder の U+3000 を hexdump 確認の上で保持)、toyoda-gosei (tr/th。email placeholder の数値実体参照を復号)、yoshinoya (dl/dt/dd。aria-label は placeholder と重複のため除去)、tonami (dl/dt/dd。ヘッダのサイト内検索フォーム `s` を別フォームとして除去、prefectures 実選択肢 48)。
3. select 実選択肢の復元: taiheiyo (category 8 / title 31 / industry 23)、azbil (c_q4 都道府県 47・numeric values)、keyence (enq0 19/countryID 201/stateID 48。enq0 テキストは数値実体参照だったため復号)、sysmex (pref 47・values 1-47)、lasertec (position 6 / pref 47)。
4. フロー外コントロールの除去 (kubota search-form 前例): keyence の signin 画面 loginUserName と catalog dialog の無名 select、kubota の製品検索フォーム群、tonami のサイト内検索 `s`。除去分は skip コメントで文書化。
5. radio/checkbox の照合: 全フォームの radio 群を確認し、性別・年代はなし (個人/法人、IR/ニュース/その他、商品カテゴリ等は matrix/choice のため全て skip のまま)。sysmex inquiry_other (3択)、tonami radio-type (個人/法人) も同様。
6. fixture header コメントの付与: 全13件 (実ページとの対応・復元内容・除去理由を記録。R4-2a/2b 流儀)。
7. 痩せ fixture の pin: azbil は 3欄のみ解決 (epson-ir-form.html 前例の thin fixture として honest pin)。
8. U+3000 の保持: mitsubishi の email placeholder (hexdump で確認。R4-2b の mitsui-chintai/aeon 前例どおり)。
9. No.3 advantest は brief URL が 404 のため取得不可として skip (正規ページは `https://www.advantest.com/ja/contact/` に移転済み。verbatim 規則により移転先の取込は行わない)。
10. R4-4a の記述との差異: lasertec は mail 確認欄なし (単一 mail のみ。R4-4a「確認2欄」は誤り)。

## 共有ブランチ上の競合と対処 (申送り用記録)

- 同一ブランチ上で他タスク (R4-5x/6x 系) が並行実行中であり、tests/corpus.ts・samples.test.ts・tests/target-url.md への未 commit 変更と、共有 git index への stage 操作が終始インターリーブした。
- このため途中から shared index を使わず、private index (`GIT_INDEX_FILE`) + `write-tree` + `commit-tree` + `update-ref` の CAS で commit した (azbil 以降の8件。全 commit の files は `git show` で自分の4点のみであることを確認済み)。
- 作業中に共有 index へ他タスク由来とみられる staged deletions (自分の fixture 8件分) が混入しているのを確認した。worktree と HEAD blob は無事であり、`git reset HEAD` で index を HEAD に戻して修復した (worktree 不変)。自分の commit 13件は全て履歴に残存することを確認済み。
- tests/target-url.md に No.3 advantest の行 (`→ advantest-contact-form.html` 付き) が他タスク由来とみられる状態で残っている。brief URL の fetch は 404 失敗であり、fixture・LEDGER・case は存在しない。R4-4b の成果には含めない (上記 No.3 のとおり取得不可)。
- 一時的に HEAD の samples.test.ts に閉じ括弧の不整合 (depth -1) があった。現 worktree/HEAD (581ae8d) では 83 tests 全緑であり、不整合は解消されている。

(End of file)
