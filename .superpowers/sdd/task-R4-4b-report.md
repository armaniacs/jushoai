# Task R4-4b フルレポート — 東証5000番台 P1 14件の取込結果

- ブランチ: `work/pbi-208-round4`
- 対象: brief 列挙の P1 14件 (verbatim URL)。P2・P3 には手を出していない。
- 結果: 成功 13件 / 取得不可 1件 (No.3 advantest)。
- 検証: `npx vitest run tests/integration/samples.test.ts` 全83緑 (R4-4b分13 + 他タスク分)、
  `node scripts/sync-target-urls.mjs --check` ゼロ、`npx tsc --noEmit` clean。
- src/ 変更なし。pin 更新 (tests/eval/corpus.eval.ts) なし (R4-3 集約に委譲。`make eval` RED は想定内)。
  samples.test.ts は tooling 配線のみ (直編集なし)。
- push なし (brief どおり)。

## 成功分 (13 fixture・13 commits)

| # | URL (brief No.) | fixture (in-scope controls) | commits (full SHA) |
|---|-----------------|-----------------------------|--------------------|
| 1 | tokyosteel contact | tokyo-steel-contact-form.html (5) | 95517fef7ffdc33f4a9956560a9fc05362f630e4 |
| 2 | taiheiyo-cement contact | taiheiyo-cement-contact-form.html (8) | dff0252dbd6a11ac8552eff1d99461b57b8c3ce0 |
| 4 | ngk contact/input?form_type=3 | ngk-contact-form.html (7) | 2d038c33994eb1f58b339d1f31bb6f22aa5a254c |
| 5 | lixil SMP | lixil-inquiry-form.html (15) | 5d5e1c926bf9eead403b60f3b82acae77da9fb08 |
| 6 | kubota engine input.php?fid=01 | kubota-engine-contact-form.html (9) | 3799aef31d453db34429be14ac9b7822ee3dcb6e |
| 7 | azbil kikubari | azbil-kikubari-form.html (3) | 637cffb93bfced48f8c70e2bbbe94f5fa7fbbc37 |
| 8 | keyence askKeyence | keyence-inquiry-form.html (12) | 3c8f5acdcc26ecf14760b2402403da6d3d297771 |
| 9 | sysmex contact/input?inquiry_type=1 | sysmex-contact-form.html (10) | cac400d6c7b7a7e67750f37e69df468f0c18d753 |
| 10 | reg34 SMP (lasertec) | lasertec-inquiry-form.html (15) | 4ff92fd1374ea51d76e7d16cba7440baf1bcdac4 |
| 11 | toyoda-gosei seihin_form | toyoda-gosei-form.html (8) | 074805a2d5c62cc026544548e2ed38b5e1423adc |
| 12 | krs.bz materials_request_ja | mitsubishi-materials-form.html (18) | 8513cc2929927ab92895cf2de644153e438d712e |
| 13 | yoshinoya storeform | yoshinoya-store-form.html (9) | e1e7ed2ebe755399029b883564d85598b2efe6bb |
| 14 | tonami luggage | tonami-luggage-form.html (10) | 581ae8d6766796a837ac72b3516c62e4883620d8 |

in-scope 計 129 controls。

## 取得不可分 (1件)

- No.3 `https://www.advantest.co.jp/ja/contact/`: `https://www.advantest.com/ja/ja/contact/` に redirect され 404 (エラーページ。サイト内検索のみで実フォームなし。サイト再編で正規ページは `https://www.advantest.com/ja/contact/` に移転済み)。verbatim 規則により移転先の取込は行わず skip。

## 取込時の修正 (tooling 出力に対する人手の最小修正)

詳細は `.superpowers/sdd/task-R4-4b-attempts.md` の「取込時の修正」10項を参照。
要点: 汎用名衝突の改名 (contact.html→tokyo-steel。以降 FIXTURE= 明示)、tr/th・dl/dt/dd 行構造の復元 (8件: lixil・kubota・mitsubishi・toyoda-gosei・yoshinoya・tonami + th系。scanner が読む構造のみ復元)、select 実選択肢の復元 (9件。keyence enq0 の数値実体参照・toyoda email の数値実体参照を復号)、SMP 2件の Shift_JIS→UTF-8 復号、フロー外コントロールの除去 (kubota 検索フォーム・keyence signin 画面と catalog dialog・tonami 検索。skip コメントで文書化)、全 radio 群の性別・年代でないことの確認 (全て skip のまま)、fixture header コメント付与 (全件)、U+3000 の保持 (mitsubishi。hexdump 確認)、thin fixture の pin (azbil 3欄。epson-ir 前例)。

## Concerns (分類ずれ・将来PBI候補。直さず honest pin)

R4-2b の C1–C9・N1–N7 の番号を継承し、R4-4b での再発・新出を記す:

- C1 姓/名とも fullName: tokyo-steel `name`→山田 太郎 / taiheiyo `name`→山田太郎 + `kana`→山田太郎 (漢字のまま!) / yoshinoya `name`→山田太郎 + `store_name`(店舗名)→山田太郎。一方 keyence・kubota・mitsubishi・tonami は姓/名分割が効く。fullName 単欄の分割可否の読分けは語彙候補。
- C2 FAX に tel 値: sysmex `fax`→09012345678 (dashed 全値) / mitsubishi `e_8565` FAX 3-split 全て fill。一方 tokyo-steel・taiheiyo・toyoda-gosei の `fax` は未分類のまま。fax 語彙なし。
- C3 会社・部署系の読分け: `company` 系は keyence `companyName`・sysmex `facility_company`・mitsubishi `e_8558` が株式会社サンプルに解決する一方、tokyo-steel・taiheiyo (`organization`)・kubota (`companyName`)・lasertec・toyoda-gosei (`company`)・tonami (`company_name_s`) は未分類。`department` 系は東京製鐵・太平洋・NGK・クボタ・キーエンス・レーザーテックで普通科に解決する一方、sysmex `department`(所属部署名)・mitsubishi `e_8559`(部署名) は未分類、tonami は `position`(部署・役職)→開発部 (companyDepartment)。会社/部署の読分けは語彙候補。
- C4 email 系: keyence `enq0`(商品カテゴリ)・`countryID`、lixil `title`・`category`・`item_no`・`work`・`company`、taiheiyo `category`・`title`・`industry`・`organization` は未分類のまま (LLM fallback)。
- C5 (R4-2b なし): 電話の dash 付与の不整合: type=tel (ngk・kubota・keyence・sysmex・mitsubishi・yoshinoya・lasertec phone) は dashed、type=text + ハイフン無し placeholder (tokyo-steel・taiheiyo・lixil telephone・kubota ではなく lixil は dashed…正確には lixil `telephone`→090-1234-5678 で dashed) に対し、taiheiyo `tel`・tokyo-steel `tel` は undashed。tonami `post_code`→100-0001 は dashed (placeholder に dash あり)。dash 判定条件の整理は将来PBI (R4-2b N4 の継続)。
- C6 kana: taiheiyo `kana`→山田太郎 (漢字。C1 と同根)、ngk `name-kana`→やまだ たろう (平仮名・区切りありで解決)、toyoda `name2`→やまだ たろう、yoshinoya `kana`→ヤマダタロウ (無区切り)、mitsubishi カナ分割は解決。placeholder 信号の差 (全角ひらがな/例示) の整理は語彙候補。
- C7 性別: 該当なし (全フォームの radio 群を確認し、性別・年代は存在せず。全て matrix/choice のため skip のまま)。
- C8 住所の重複・変則 fill: lixil `address3`・`address4` が同一の都道府県付き連結値 (refine の重複注入抑止の対象外。R4-2b C8 と同型)、lasertec `address3`(ビル名)→Long Island City (海外住所への fallback。refine の変則解決として将来PBI)、kubota `address` は都道府県なし連結 (千代田区千代田1-1 千代田ビル101)、keyence `address1` も都道府県なし連結、一方 taiheiyo・ngk・sysmex・yoshinoya・tonami の住所は都道府県付き連結、toyoda `adr1` は番地+建物のみ。refine の連結条件の整理は将来PBI。
- N4 (R4-2b N3 継承) 非JIS順・値ベース照合: sysmex `pref`(values 1-47)→'13'、keyence `stateID`(values 00-47 numeric)→'13' は値ベース照合で東京都に解決。kubota `pref_name` の選択肢順は非JIS順 (栃木・群馬・茨城…)。値ベース照合の前提が崩れた場合の挙動は将来PBI。
- N8 honeypot の対照: taiheiyo `_formrun_gotcha`(英語 label「ignore this field」) は未分類のまま (BST の fake_email が email fill した前例との対照。honeypot 除外の要否は将来PBI)。
- N9 thin fixture: azbil は 3欄解決のみ (expected 3件。epson-ir-form.html 前例)。corpus の多様性には寄与するが指標への寄与は小さい。
- N10 郵便の dash: tonami `post_code`→100-0001 (dashed。placeholder 例：933-8566 が唯一の dash 信号)。郵便番号の dash 判定 (maxlength/placeholder/type の複合条件) は将来PBI。

## 申送り (R4-3 集約タスクへ)

- `make eval` RED は想定内 (pin 未更新 13件分)。R4-3 で一括更新すること。
- 上記 C1–C8・N4・N8–N10 の語彙/判定候補は src 変更を伴うため本タスクでは未着手。
- `.superpowers/sdd/task-R4-4b-attempts.md` に14件の取込ログあり (本 report と同時作成・未 commit。親タスクの集約時に commit すること)。
- 共有ブランチの競合記録 (attempts ログ末尾) を参照: private-index による commit 方式、index 汚染からの復旧手順、advantest registry 行の扱い。

(End of file)
