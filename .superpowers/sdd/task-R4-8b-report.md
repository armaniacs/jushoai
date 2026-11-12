# Task R4-8b フルレポート — 大手塾 P1 21件の取込 (途中)

- ブランチ: `work/pbi-208-round4` (R4-9b と並行。commit は自分の成果物のみ。共有3ファイルに相手の未コミット差分がある場合は待機または hunk surgery で分離)
- 進捗: 7 / 21 成功・失敗 0 (No.1–7)。push なし。src 変更なし。pin 更新なし。
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
- No.6 の commit で samples.test.ts に stray `});` が混入した (自作 patch フィルタのバグ)。`git update-index --cacheinfo` で当該行のみ stage して amend (c9707fa) で除去。並行タスクの差分には触れていない。フィルタは修正済み。
- No.7 湘南ゼミナールは氏名2行のみ実ページどおり dt/dd 見出しを復元 (mitsuihome 前例)。結果は bare 時と同じ。

Concerns (途中。分類ずれ・将来PBI候補。いずれも直さず honest pin):
- C1 tel 3-split の bare 未分類: toshin 2件の tel1/2/3・tel_check (tel-split-by-name 候補。kobe ANSWER6 と同型)。対照的に yotsuya/kumon/manavis の tel 3欄は type/maxlength 信号で分割対に載る。
- C2 保護者と児童の同値 fill: yotsuya の parent_* 4欄が児童と同一プロファイル値で fill (区別の語彙候補)。
- C3 住所の重複 fill: toshin 2件の address3 が address1 と同値 (mitsuihome と同形)。
- C4 eikoh 氏名・カナ欄の未分類: 見出しが div で nearby 対象外、placeholder のみでは未分類 (brother N7 同型)。
- C5 shozemi の name/placeholder 逆対応: first_name=姓欄に太郎 (name 起点分類。placeholder 整合の候補)。
- C6 manavis の address_sei/mei が氏名に載る・address/address_etc がともに全住所結合値 (honest pin)。
