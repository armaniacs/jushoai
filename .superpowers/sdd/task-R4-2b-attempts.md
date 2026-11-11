# Task R4-2b 試行ログ — PBI-208 Round4 P2 14件の取込結果

- 対象: brief 列挙の P2 14件 (brief の URL を verbatim で使用)。P1・P3 には手を出していない。
- 手順: `make addurl URL=<url> FIXTURE=<name>` で1件ずつ取込 → 最小再現まで削る (実ページ取得で見出し・選択肢を照合) → LEDGER 期待値を honest pin で埋める → vitest 緑 → 1 fixture ごとに commit。
- src/ 変更なし。pin 更新 (tests/eval/corpus.eval.ts) なし。samples.test.ts は tooling 配線のみ (直編集なし)。
- 取得失敗 0件。14件すべて取込成功。

## 取込結果

| # | URL | 結果 | fixture名 or 失敗理由 |
|---|-----|------|------------------------|
| 1 | https://www.fujifilm.com/jp/ja/form/FF-Webmaster-Ja | 成功 | ff-webmaster-form.html (15 controls。ff-csr と同型 Drupal。honest pin: 姓/名とも fullName、FAX に tel 値、勤務先・学校名→school、部署名は未分類) |
| 2 | https://www.fujifilm.com/jp/ja/form/FF-Procurement-Tokyo | 成功 | ff-procurement-form.html (15 controls。No.1 と同型 + textarea 2欄。honest pin は No.1 と同一) |
| 3 | https://holdings.fujifilm.com/ja/form/compliance-hotline | 成功 | ff-compliance-hotline-form.html (7 controls。同型だが住所・会社・TEL欄なし。honest pin: 姓/名とも fullName、カナ分割、email確認2欄) |
| 4 | https://www.tokyu-land.co.jp/form/kojin/ | 成功 | tokyu-land-kojin-form.html (18 controls。実ページの dl/dt/dd 見出しを復元。honest pin: 二重住所ブロックとも都道府県付き連結+building、tel は undashed、物件条件・pref系は未分類) |
| 5 | https://www.tokyu-land.co.jp/form/tenant/ | 成功 | tokyu-land-tenant-form.html (15 controls。dl/dt/dd 見出し復元。honest pin: 8欄fill。貴社名・部署名・役職・出店条件・pref は未分類) |
| 6 | https://enquete.benesse.ne.jp/forms/o/we040f7618/form | 成功 | benesse-inquiry-form.html (11 controls。設問文を label 復元、Q1 select 実選択肢復元。honest pin: 姓名・カナ分割、tel undashed、email確認2欄が解決。会員番号3分割・Q1 は未分類) |
| 7 | https://form.mitsui-chintai.co.jp/webapp/form/19959_rndb_66/index.do | 成功 | mitsui-chintai-inquiry-form.html (5 controls。kobe 同系 Struts。honest pin: カナのみ解決、他は未分類。最も thin な部類の1欄fixture) |
| 8 | https://cform.epson.jp/form5/pub/e040/3009009007012109727 | 成功 | epson-ir-form.html (20 controls。epson-csr と同型・同順。c_q6 都道府県48選択肢を sibling から復元。honest pin: citycode 2欄のみ解決) |
| 9 | https://webform.ricoh.com/form/pub/e00134/vulnerability_inq | 成功 | ricoh-vulnerability-form.html (10 controls。c_q41 対象製品20選択肢を実ページから復元。honest pin: 0欄fill。expected: {} の thin fixture) |
| 10 | https://business.brother.co.jp/public/application/add/113 | 成功 | brother-inquiry-form.html (16 controls。3 select 実選択肢復元。honest pin: zip・prefecture(値'10')・tel・email の4欄。見出しは plain div のため bare が等価であることを scanner 読解で確認) |
| 11 | https://form.kikkoman.co.jp/m/media | 成功 | kikkoman-media-form.html (9 controls。実ページに placeholder なし・select なし。honest pin: tel 3分割のみ解決) |
| 12 | https://form.kikkoman.co.jp/m/works | 成功 | kikkoman-works-form.html (11 controls。性別 select 実選択肢復元 (男性/女性/その他順)。honest pin: 姓名・カナ・tel 3分割の7欄。性別・email は未分類) |
| 13 | https://aeon-voice.my.salesforce-sites.com/VoiceAgreementForm?cid=08 | 成功 | aeon-voice-form.html (9 controls。Salesforce hidden_* ミラー5欄 + 可視4欄。label の数値実体参照を復号。honest pin: 7欄fill。gender radio 群は skip のまま) |
| 14 | https://form-auhikari.kddi.com/cgi-bin/callback/form.cgi | 成功 | auhikari-callback-form.html (14 controls。実ページの tr/th 行構造を復元。honest pin: 13欄fill。label_add1234 のみ未分類) |

## 取込時の修正 (tooling 出力に対する人手の最小修正)

1. dl/dt/dd 行構造の復元: tokyu-land-kojin / tenant (tokyu-land-contact 前例。bare では grouping が変わる)。
2. tr/th 行構造の復元: auhikari (scanner が tr>th を nearby として読むため。bare では姓名・カナ分割が効かない)。
3. 設問文の label 復元: benesse (コード化名のため設問文が唯一の信号)。
4. select 実選択肢の復元: benesse Q1、epson-ir c_q6 (sibling と同文言であることを実ページで確認)、ricoh-vuln c_q41 (実ページから取得)、brother 3種 (実ページから取得。prefecture は非JIS順)、kikkoman-works 性別 (男性先頭順)。
5. 数値実体参照の復号: aeon (label/placeholder の `&#12362;...` を UTF-8 に復号。信号は等価)。
6. fixture header コメントの付与: 全14件 (実ページとの対応・復元内容を記録。R4-2a 流儀)。
7. brother の bare 等価性の確認: src/dom/scan-fields.ts の nearbyOf 読解 (tr>th / dd>dt / legend のみ) により、plain div 見出しは scanner に読まれないことを確認。bare のまま honest pin。
8. U+3000 の保持: mitsui-chintai / aeon のカナ pin (hexdump で確認。kobe 前例どおり)。

(End of file)
