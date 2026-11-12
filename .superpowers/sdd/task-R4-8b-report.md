# Task R4-8b フルレポート — 大手塾 P1 21件の取込 (完了)

- ブランチ: `work/pbi-208-round4` (R4-9b と並行。commit は自分の成果物のみ。共有3ファイルに相手の未コミット差分がある場合は待機または /tmp blob + update-index 方式で分離。`git commit -- <paths>` は working tree を使うため禁止。patch フィルタ方式は廃止)
- 結果: 成功 21 / 失敗 0。P2・P3 には手を出していない。
- 検証: `npx vitest run tests/integration/samples.test.ts` 133緑、
  `make addurl-check` ゼロ、`npx tsc --noEmit` clean。
  `make eval` RED は想定内 (pin 未更新。R4-3 に委譲)。
- src/ 変更なし。samples.test.ts は tooling 配線のみ (直編集なし)。
  pin 更新なし。push なし (brief どおり)。
- 検証 (途中): 各 fixture の `npx vitest run tests/integration/samples.test.ts -t <fixture>` が緑。

## 中間記録1 (No.1–7)

| # | fixture | controls → 解決欄数 | commit (full SHA) |
|---|---------|---------------------|-------------------|
| 1 | toshin-shiryo-form.html | 35 → 12 | 5df44c7de84b282258be6977bffdec4dcd73cc9e |
| 2 | toshin-mendan-form.html | 28 → 12 | 22d31feeb1788b74849654e6178136d304debb9c |
| 3 | yotsuya-nyujuku-form.html | 25 → 17 | 7e2b5516ba0597f02fd62100c42469c97c23776e |
| 4 | kumon-annai-form.html | 17 → 10 | 42f99c768d7ebf02f54424323fdcb24c81ef45ac |
| 5 | manavis-shiryo-form.html | 22 → 15 | 790e6482137c9a1c49349a8ff770ebbbbeeb927c |
| 6 | eikoh-shiryo-form.html | 11 → 2 | c9707fa3c45d90dc6f8d73f69da4cae20328a1c2 |
| 7 | shozemi-contact-form.html | 14 → 8 | 2b0ac7d174c271c8f73f0c2ffc557ca48d0eaa6b |

運用メモ:
- tooling 汎用名は FIXTURE= 指定で回避 (No.2以降)。No.1 は input.html → toshin-shiryo-form.html に改名 (配線3箇所も同名置換。R4-9b 前例どおり)。
- No.6 の commit で samples.test.ts に stray `});` が混入した (自作 patch フィルタのバグ)。`git update-index --cacheinfo` で当該行のみ stage して amend (c9707fa) で除去。並行タスクの差分には触れていない。patch フィルタ方式は廃止し、blob 直接 stage 方式に切替済み。
- No.7 湘南ゼミナールは氏名2行のみ実ページどおり dt/dd 見出しを復元 (mitsuihome 前例)。結果は bare 時と同じ。
- No.10 は R4-9b 側の whole-file add (2a70549・7e14545) に配線が巻き込まれた。内容は自作業そのもので破壊なし。fixture HTML のみ 9dd07a6 で commit し完結。

## 中間記録2 (No.8–14)

| # | fixture | controls → 解決欄数 | commit (full SHA) |
|---|---------|---------------------|-------------------|
| 8 | waseda-ac-form.html | 40 → 5 | 6d75812f065b59c1b8603a6cda1681ac2c1d20f0 |
| 9 | morijuku-contact-form.html | 10 → 8 | 6596e2393dd75510c5b0e2773884c3870751a978 |
| 10 | jiritsu-red-contact-form.html | 12 → 7 | wiring: 2a70549・7e14545 (R4-9b) / html: 9dd07a6c89e5787335c06e2781282e4f24527137 |
| 11 | tomas-trial-form.html | 26 → 9 | 2251760d803894cf9bfa143c1aa578c7f12e600a |
| 12 | try-gakuin-reserve-form.html | 11 → 7 | 35a1d473b58aaf3a4bfa0205eee629fe9699cf5e |
| 13 | meiko-contact-form.html | 22 → 17 | 26910603c6b61837f43e221bf1115e88acfc010c |
| 14 | keishin-contact-form.html | 30 → 20 | 85bfadb642d23a61c3759eabbeed96e93a22578f |

追加の取込時修正:
- No.13 明光義塾: select 実選択肢を実ページどおり復元 (sex/grade/relationship/school_type/pref_cd 47件/opportunity_select)。sex→gender (値2)、pref_cd→東京都 (値149) の解決に必要 (R4-2b 前例)。
- No.14 京進 SMP: 実ページ Shift_JIS のため tooling の placeholder 文字化けを正規日本語に復元 (curl で実ページ確認。例：京進/太郎/キョウシン/タロウ等)。

Concerns 追加分:
- C7 コード化 attribute 名: waseda-ac の attributeNN 群は語彙が効かず未分類 (LLM fallback。name1/name2 系も同様)。
- C8 紹介者名の fill: meiko friend_name (placeholder 明光太郎)、tomas なし、ichishin syoukai_name、ena なしが fullName に載る。紹介者と本人の区別は将来PBIで。
- C9 duplicate-name tel: tomas の同名 tel 2欄+3分割が未分類。
- C10 pref text 解決: keishin pref (text。placeholder 例：京都府) が prefecture に載る (honest pin)。
- C11 inq_tri_grp (再入会者の生年月日) が birthday-year に載り 1990 が fill (honest pin)。
- C12 mailaddress の住所値 fill (重大): ichishin の mailaddress/mailaddress:cf 2欄は th メールアドレスつきでも full 住所値で fill。email 誤分類として将来PBIで優先調査。
- C13 その他欄の非対称: axis の その他3欄のうち schoolSelectionOther のみ school に載る。
- C14 dob pattern: axis の dobMonth/dobDate は profile 05/07 が pattern (leading-zero 不可) に合わず未注入 (PBI-210 形状)。
- C15 kana suffix 未解決: eishinkan の seiKana/meiKana 欄は未分類 (keishin fam_name2/mei_name2 解決と対照的。suffix 読分け候補)。
- C16 GAKKO_NM 等の bare 学校名: yotsuya-littleclub GAKKO_NM・ichishin class_cd が未分類 (school-by-name 候補)。一方 school_name 系は解決。

## 中間記録3 (No.15–21)

| # | fixture | controls → 解決欄数 | commit (full SHA) |
|---|---------|---------------------|-------------------|
| 15 | rinkai-shiryo-form.html | 15 → 9 | 161d12090e4200bd900cb3a6a22f3c4c9653a9f7 |
| 16 | sanaru-contact-form.html | 22 → 11 | 0e1fb316ea9494c9c74232705aa2f249f0437168 |
| 17 | ichishin-contact-form.html | 35 → 24 | df34a319b9ca0b792d9f16b8d6522d75a3d2a0ac |
| 18 | ena-request-form.html | 28 → 16 | a4d5af1a9dd504850b50c1ca948a10fe15e7b397 |
| 19 | eishinkan-contact-form.html | 30 → 16 | dd99e41639749d4aef3e56fc8b460eb43fb21dc9 |
| 20 | axis-inquiry-form.html | 22 → 14 | 2745557d899bfd4ba1eaefd8290a317a914fd5dc |
| 21 | yotsuya-littleclub-form.html | 34 → 10 | c755232980bb09525840e58886192d91f119b7d9 |

追加の取込時修正:
- No.15 臨海: form_group_grade のみ実選択肢 (学年13件) を実ページどおり復元。course/prefecture/classroom は実ページでも空 (JS連動)。
- No.17 市進: 実ページ th/td 表組みのため th 見出しつき table に復元 (auhikari 前例)。select 実選択肢も復元。jQuery Sizzle 断片の誤配線 select (name=""+b+"-...) は実在コントロールでないため fixture・ledger とも除外。
- No.18 ena: grade/prefecture のみ実選択肢を復元 (prefecture→東京都が解決)。
- No.19 英進館: Shift_JIS 文字化け復元 + gender radio 実値復元 (→値2)。
- No.20 Axis: native select は Vue カスタムで実ページでも空のため '--' が忠実。
- No.21 四谷pform: select 実選択肢を全復元 (JUSHO_1 実選択肢でも prefecture 未解決のまま honest pin)。

## 申送り (集約タスクへ)

- `make eval` の pin 更新は未実施 (R4-3 に委譲)。21件分の honest pin が corpus に入っている。
- Concerns C1–C16 は src 変更を伴うため本タスクでは未着手。特に C12 (mailaddress 住所値 fill) は誤分類のため優先度高め。
- R4-9b との並行運用の教訓 (次トランチ向け): 共有3ファイルの stage 前に必ず `git status` + `git diff` で相手差分を確認。混在時は /tmp blob + `update-index --cacheinfo` で自作分のみ stage し、素の `git commit` (pathspec なし) で commit。`git commit -- <paths>` は index ではなく working tree を使うため巻き込みの原因になる。共有ファイルの in-place 書換えは競合の元なので /tmp 経由で行う。
- `.superpowers/sdd/task-R4-8b-attempts.md` に21件の取込ログあり (本 report と同時 commit)。

Concerns (途中。分類ずれ・将来PBI候補。いずれも直さず honest pin):
- C1 tel 3-split の bare 未分類: toshin 2件の tel1/2/3・tel_check (tel-split-by-name 候補。kobe ANSWER6 と同型)。対照的に yotsuya/kumon/manavis の tel 3欄は type/maxlength 信号で分割対に載る。
- C2 保護者と児童の同値 fill: yotsuya の parent_* 4欄が児童と同一プロファイル値で fill (区別の語彙候補)。
- C3 住所の重複 fill: toshin 2件の address3 が address1 と同値 (mitsuihome と同形)。
- C4 eikoh 氏名・カナ欄の未分類: 見出しが div で nearby 対象外、placeholder のみでは未分類 (brother N7 同型)。
- C5 shozemi の name/placeholder 逆対応: first_name=姓欄に太郎 (name 起点分類。placeholder 整合の候補)。
- C6 manavis の address_sei/mei が氏名に載る・address/address_etc がともに全住所結合値 (honest pin)。
