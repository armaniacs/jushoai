# Task R4-8b フルレポート — 大手塾 P1 21件の取込 (途中)

- ブランチ: `work/pbi-208-round4` (R4-9b と並行。commit は自分の成果物のみ。共有3ファイルに相手の未コミット差分がある場合は待機または hunk surgery で分離)
- 進捗: 14 / 21 成功・失敗 0 (No.1–14)。push なし。src 変更なし。pin 更新なし。
  (No.10 の配線は R4-9b 側 commit に巻き込み。詳細は attempts の混入メモ)
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
- C8 紹介者名の fill: meiko friend_name (placeholder 明光太郎) が fullName に載る。紹介者と本人の区別は将来PBIで。
- C9 duplicate-name tel: tomas の同名 tel 2欄+3分割が未分類。
- C10 pref text 解決: keishin pref (text。placeholder 例：京都府) が prefecture に載る (honest pin)。
- C11 inq_tri_grp (再入会者の生年月日) が birthday-year に載り 1990 が fill (honest pin)。

Concerns (途中。分類ずれ・将来PBI候補。いずれも直さず honest pin):
- C1 tel 3-split の bare 未分類: toshin 2件の tel1/2/3・tel_check (tel-split-by-name 候補。kobe ANSWER6 と同型)。対照的に yotsuya/kumon/manavis の tel 3欄は type/maxlength 信号で分割対に載る。
- C2 保護者と児童の同値 fill: yotsuya の parent_* 4欄が児童と同一プロファイル値で fill (区別の語彙候補)。
- C3 住所の重複 fill: toshin 2件の address3 が address1 と同値 (mitsuihome と同形)。
- C4 eikoh 氏名・カナ欄の未分類: 見出しが div で nearby 対象外、placeholder のみでは未分類 (brother N7 同型)。
- C5 shozemi の name/placeholder 逆対応: first_name=姓欄に太郎 (name 起点分類。placeholder 整合の候補)。
- C6 manavis の address_sei/mei が氏名に載る・address/address_etc がともに全住所結合値 (honest pin)。
