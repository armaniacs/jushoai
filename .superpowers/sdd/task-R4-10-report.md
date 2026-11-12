# Task R4-10 フルレポート — 追加72件分のpin更新と全体検証

- ブランチ: `work/pbi-208-round4`
- 対象: R4-3 以降の追加取込 R4-4b 13件・R4-5b 4件・R4-6b 5件・R4-7b 8件・R4-8b 21件・R4-9b 21件 = 計72件の
  `tests/eval/corpus.eval.ts` pin 更新と、`make eval` / `make check` の緑化。
- src/ 変更なし。語彙追加が必要な劣化は直さず Concerns に残した (brief どおり)。
- push なし (brief どおり)。

## 結果サマリ

- `make eval`: 緑 (3 tests passed)。内訳: pin 照合 129行・privacy・no-network。
- `make check`: exit 0 (typecheck + test + 両ブラウザ build + manifest 検査 + web-ext lint)。
- 既存 57 fixture の pin ドリフト: なし (更新前の RED は 72行の行欠落のみ。
  `pin=... 実測=...` の差分は 1件も出なかった = 分類パイプラインの劣化なし)。
- ステータス: DONE_WITH_CONCERNS (Concerns は全て将来PBI候補の語彙・判定整理。
  src 変更なしで緑化できる範囲はすべて緑)。

## 指標の変化 (R4-3時 pin → 実測)

旧 pin は R4-3 時点の 57 fixture、新 pin は全 129 fixture。
fields の旧値は R4-3 レポートの確定値、新72件分は今回実測行の合計 (検算済み)。

| 指標 | 旧 pin (57 fixture) | 新72件分 | 新 pin (129 fixture) |
|------|---------------------|----------|----------------------|
| fixtures | 57 | 72 | 129 |
| fields | 691 | 1151 | 1842 |
| ruleHits | 448 (64.8%) | 725 (63.0%) | 1173 (63.7%) |
| llmFallbacks | 247 | 382 | 629 |
| fillable | 283 (41.0%) | 416 (36.1%) | 699 (37.9%) |
| refineChanged | 83 | 197 | 280 |
| refineDropped | 4 | 54 | 58 |

- 新72件の rule-hit 率 (63.0%) は既存 (64.8%) とほぼ同等。R4-3 時の新25件 (55.4%)
  より高いが、これは大学・塾・デベロッパーの問合せフォームが氏名/住所/電話の
  定型信号を比較的多く持つため。coded-name 系 (attributeNN・c_q・MailAddress) や
  bare 見出し系の honest な未分類が LLM fallback 側に残る構造は同じ。
- fillable 率は新72件 (36.1%) が既存 (41.0%) より低い。主因は (a) 大規模塾フォームの
  複数住所・紹介者欄の重複 fill 抑止 (refineDropped 39件中トシン/四谷/英進館/ena 系)、
  (b) thin fixture (azbil 0・eikoh 2・waseda-ac 2・tosyo 0・2000033 0) の混入、
  (c) tokyu-commercial/cre (fillable 3/24・3/20) のような企業幹部向けフォームの
  会社・部署・物件語彙の未分類。
- refineDropped=54 の新規内訳: toshin-shiryo/mendan 各4、eikoh 6、eishinkan 4、ena 4、
  tomas 9、yotsuya-littleclub 8、sekisui-catalog 4、sekisui-inquiry 5、azbil 6。
  いずれも複数住所ブロック・確認用メール・3-split の重複抑止で、既存唯一の
  mitsui-chintai (4) と同型の honest pin。誤って落としている欄はない
  (各取込レポートの expected と一致)。

## 新72件の内訳

ラウンド別の実測合計 (fields / ruleHits / llmFB / fillable / refineC/D):

| ラウンド | 件数 | fields | ruleHits | llmFB | fillable | refineC/D | 主な系統 |
|---------|------|--------|----------|-------|----------|-----------|----------|
| R4-4b | 13 | 191 | 130 (68.1%) | 62 | 73 (38.2%) | 30/6 | 東証製造業の問合せ (製造・素材・物流) |
| R4-5b | 4 | 33 | 23 (69.7%) | 10 | 17 (51.5%) | 0/0 | 自治体広聴 (浜松・岡山・福岡・札幌) |
| R4-6b | 5 | 17 | 14 (82.4%) | 3 | 9 (52.9%) | 0/0 | 東京区立図書館 (葛飾・江東・荒川・板橋・新宿) |
| R4-7b | 8 | 87 | 64 (73.6%) | 25 | 42 (48.3%) | 8/0 | 大学 (九工大・産医大・昭和・福岡・KIT・島根・青学2) |
| R4-8b | 21 | 490 | 300 (61.2%) | 156 | 171 (34.9%) | 86/39 | 大手塾 (東進・四谷・公文・マナビス・栄光・湘南・早稲田・森・RED・TOMAS・トライ・明光・京進・臨海・佐鳴・市進・ena・英進館・Axis・四谷LC) |
| R4-9b | 21 | 333 | 194 (58.3%) | 126 | 104 (31.2%) | 73/9 | 大手デベロッパー (SMP・ラトゥール・すみふ・プラウド・BRANZ・東急商業/CRE・ブリリア・ヒューリック・森ビル・オープンハウス・穴吹2・長谷工・CIGR・和田興産・阪急阪神・NTT都市・積水3) |

fixture 別の実測 (pin 行そのまま。fields / ruleHits / llmFB / fillable / refineC/D):

R4-4b: tokyo-steel 8/5/3/4/0/0、taiheiyo 14/8/6/5/0/0、ngk 8/7/1/4/0/0、
lixil 20/15/5/8/2/0、kubota 13/9/4/5/1/0、azbil 32/3/29/0/0/6、
keyence 14/13/1/6/1/0、sysmex 12/10/3/5/0/0、lasertec 17/15/2/8/9/0、
toyoda-gosei 11/8/3/5/2/0、mitsubishi-materials 19/18/1/12/12/0、
yoshinoya-store 11/9/2/5/3/0、tonami-luggage 12/10/2/6/0/0。

R4-5b: hamamatsu-kocho 8/6/2/5/0/0、okayama-inquiry 12/6/6/5/0/0、
fukuoka-teian 10/9/1/5/0/0、sapporo-iken 3/2/1/2/0/0。

R4-6b: mailform (葛飾) 4/4/0/4/0/0、opinion-html (江東) 7/4/3/2/0/0、
arakawa-mailform 4/4/0/3/0/0、2000033 (板橋) 2/2/0/0/0/0、
tosyo-00001-html (新宿) 0/0/0/0/0/0。

R4-7b: contact (九工大) 11/11/0/6/0/0、inquiry-html (産医大) 12/12/0/7/2/0、
index-asp (昭和) 19/6/12/4/2/0、6932 (福岡大) 17/13/4/5/1/0、
kit-contact 9/7/2/7/0/0、shimane-inquiry 5/3/2/2/0/0、
aoyama-campus 8/7/4/7/3/0、aoyama-sagamihara 6/5/1/4/0/0。

R4-8b: toshin-shiryo 35/21/10/7/2/4、toshin-mendan 28/21/3/7/2/4、
yotsuya-nyujuku 25/22/3/13/4/0、kumon-annai 17/10/7/8/7/0、
manavis-shiryo 22/18/4/12/3/0、eikoh-shiryo 11/3/2/2/0/6、
shozemi-contact 14/12/2/7/1/0、waseda-ac 40/6/34/2/2/0、
morijuku-contact 10/9/1/7/1/0、jiritsu-red-contact 12/11/1/6/0/0、
tomas-trial 26/10/7/5/2/9、try-gakuin-reserve 11/9/2/6/3/0、
meiko-contact 22/18/4/9/6/0、keishin-contact 30/22/8/14/11/0、
rinkai-shiryo 15/10/5/7/5/0、sanaru-contact 22/12/10/7/8/0、
ichishin-contact 35/24/11/16/17/0、ena-request 28/16/8/10/3/4、
eishinkan-contact 31/18/9/9/7/4、axis-inquiry 22/18/4/7/2/0、
yotsuya-littleclub 34/10/21/10/0/8。

R4-9b: smp-openhouse 14/9/5/5/5/0、sumitomo-latour 23/14/9/6/0/0、
sumifu-step 12/9/3/6/3/0、proud-procedure 22/18/2/6/8/0、
tokyu-branz 13/8/5/4/3/0、tokyu-commercial 24/11/13/3/4/0、
tokyu-cre 20/11/9/3/4/0、brillia-support 19/7/12/6/0/0、
hulic-develop 14/9/5/7/4/0、mori-webcas 13/4/9/2/4/0、
openhouse-customer 12/11/1/7/0/0、anabuki-general 9/3/5/2/2/0、
anabuki-landuse 15/8/6/1/4/0、haseko-contact 7/3/4/3/2/0、
cigr-ir 13/11/2/5/3/0、wadakohsan 10/8/2/5/0/0、
hhp-site 15/9/6/7/9/0、nttud 7/5/2/4/0/0、
sekisui-catalog 35/11/20/7/4/4、sekisui-inquiry 22/13/4/8/5/5、
sekisui-mail 14/12/2/7/9/0。

## 検証

- `make eval`: 3 passed (pin 照合 129行・privacy・no-network)。
  集計行: fixtures=129 fields=1842 ruleHits=1173 llmFallbacks=629 fillable=699。
- privacy: `keeps page content out of every report line` 緑。
  報告行にページ文字列 (山田/太郎/千代田/formAttendee/field_46) を含まず、
  全行 200byte 以内。`never reaches the network` 緑。
- `make check`: exit 0 (typecheck + test + 両ブラウザ build + manifest 検査 +
  web-ext lint)。web-ext の WARNING 2件は manifest の data_collection_permissions に関する
  既知の定型警告 (本タスクの変更範囲外)。
- 変更範囲: `tests/eval/corpus.eval.ts` のみに 72行追加 (削除0)。
  src/・samples/・tests/corpus.ts・samples.test.ts に変更なし
  (テスト配線は各取込タスクで緑化済み)。

## 語彙の伸びしろ (将来PBI候補。src 変更なしのため本タスクでは未着手)

各取込レポートの Concerns を件数裏付け順に集約。番号は R4-2b/R4-4b 系を継承:

1. 会社・部署・役職語彙 (最多): tokyu-commercial/cre・brillia・hulic・mori・
   anabuki・haseko・sekisui の company/department/division/organization、
   mori c_q10・cigr 漢字名・anabuki kana の漢字 placeholder 人名、
   toshiba `department`→普通科・ff 勤務先→school の誤読系 honest pin と併せ、
   会社/部署/学校の読分けが最大の塊。
2. coded-name 系の人・カナ・email: waseda-ac attributeNN 群 (40欄中6解決・llmFB 34で
   corpus 最薄クラス)、azbil (32欄中3解決・matrix 群は skip 対象外のまま LLM 行き)、
   tokyo-steel/taiheiyo の organization、eikoh の div 見出し氏名・カナ (brother 同型)、
   板橋 MailAddress→full-address 誤 fill (R4-6b C-R4-6b-2。未分類より強いずれで優先度高)。
3. 紹介者・物件・担当者名の本人混同: meiko friend_name・ichishin syoukai_name・
   tomas 系の紹介者 fullName 解決、tokyu-branz mansion_name→姓、openhouse sales_name→氏名。
   紹介者/物件/担当者の除外語彙が候補 (R4-8b C8)。
4. email 分布の非対称: type=text の mail 未分類 (smp-openhouse・tokyu-branz・commercial・
   cre・hhp、email-via-name 候補) に対し email-via-placeholder は解決。
   ichishin mailaddress→住所値 fill は誤分類のため優先度高 (R4-8b C12)。
5. tel/zip の 3-split と dash: toshin 2件・eikoh・kobe・benesse・江東 item2 の
   bare 3-split 未分類 (tel-split-by-name 候補)、tomas の duplicate-name tel、
   kyutech zip1/2 の undashed 重複 fill、show a yubin の bare 未分類 (yubin-by-name 候補)。
   dash 判定条件 (type/placeholder/maxlength の複合) の整理は R4-2b N4 の継続。
6. 住所の重複・変則 fill: toshin 2件・eishinkan・ena の address3 重複、
   tokyu-commercial/cre の自宅/連絡先・proud の旧新・anabuki の連絡先/物件の
   3+4 分割対への誤結合 (対照・複数住所の区別が候補)、mitsubishi address3/4・
   mitsuihome address3 と同型、lasertec address3 の海外住所 fallback。
7. 姓/名とも fullName (C1): tokyo-steel/taiheiyo/yoshinoya の name・kana、
   kyutech name1/2・kana1/2、6932 kana_1/2、ff 4件と同型。same-label 分割の対象外形。
8. 郵便・住所の値ベース照合の前提: 6932 pref (+10 scheme の値 `23` で東京都に解決)、
   meiko pref_cd (値149)、keyence stateID の値ベース解決。前提崩壊時の挙動は将来PBI。
9. 性別・生年月日の周辺: showa wrapping-label radio (seibetsu1) 未分類、
   6932 birthday_y/m/d 未分類 (birthday-by-name 候補)、keishin inq_tri_grp→birthday-year
   の honest pin、axis dobMonth/dobDate の pattern 不整合 (PBI-210 形状)。
10. kana drift・学校吸着: uoeh query[2][1]→太郎 (kanji firstName)、
    6932 school_ken→school 誤吸着 (warn-no-option)、aoyama-sagamihara 学部・学科→school
    (都立日比谷高校を fill。ff-csr 同型)、6932 GAKKO_NM・ichishin class_cd の bare 学校名未分類。
11. thin fixture (指標寄与小・多様性寄与): azbil・eikoh・waseda-ac・richell・
    ricoh-vuln・epson-csr/ir・ricoh-risb・kobe・mitsui-chintai・tosyo-00001 (0欄)・
    2000033 (2欄誤 pin 継続)・sapporo・shimane・showa。corpus の多様性には寄与。
12. tooling 改善候補 (src 外): fukuoka の HTML コメント内 control 抽出 (抽出前コメント除去)、
    汎用 fixture 名の衝突 (contact/inquiry/commercial/cre/mailform 手動改名済み。
    FIXTURE= 直指定で回避)、samples.test.ts の既存構文破損 (R4-7b で修復済み)。

## PBI-208 台帳への追記用要点

- Round4 で corpus は 57 → 129 fixture (R4-4b 13・R4-5b 4・R4-6b 5・R4-7b 8・
  R4-8b 21・R4-9b 21 → R4-10 で pin 集約)。
- 全体指標: fields 1842・ruleHits 1173 (63.7%)・fillable 699 (37.9%)。
  新72件は rule-hit 63.0% と既存並みだが、塾・デベロッパー系の大規模フォームで
  複数住所・紹介者の重複 fill 抑止 (dropped 54) と thin fixture が fillable を下げる。
- 既存57件のドリフトはゼロ (分類パイプラインの劣化なし)。
- 上記「語彙の伸びしろ」12項が PBI-208 後の語彙 PBI 候補。特に優先度高は
  2 (MailAddress 誤 fill)・4 (mailaddress 住所値 fill)。

## Commits

- pin 更新: `7f6f5acbbdf91051271cb616d7f544a4f1562f44`
  test(eval): R4-4b〜R4-9b追加72件分のpinを追加しmake evalを緑化 (1 commit に集約)
- 本レポート: `docs(sdd)` commit として同ブランチに記録 (push なし)

(End of file)
