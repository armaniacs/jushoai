# Task R4-4a フルレポート — 東証5000番台以降企業の候補186件リスト化

- status: DONE
- 候補: 186件 / 有望: 28件 (P1: 14 / P2: 13 / P3: 1) / 除外: 158件
- 重複: tests/target-url.md の44件・R4-1の183件との重複なし (正規化URL照合済み、自己重複も0)

## やったこと

1. 証券コード5000〜9999の東証上場企業156社を選定し、各社コーポレートサイトの `/contact/` 系ハブ頁を基本候補 (No.1-156) とした。鉄鋼・非鉄・窯業・機械・重電・電子部品・半導体・輸送用機器・精密・商社・外食・小売・金融・不動産・運輸・通信・サービスを横断。
2. `curl -sL --max-time 25` + Chrome UA で全件取得し、`<form`・`input`・`textarea`・`select`・`action`・項目名を計数/抽出して判定した。
3. ハブ頁から発見した具体フォーム導線30件をフォローし、No.157-186として追加検証した (SMP / Struts / form.run / spiral-site / msgs / kintone系を含む)。
4. 結果を `.superpowers/sdd/task-R4-4a-attempts.md` に試行ログとして記録した (R4-1の形式に倣う)。
5. 20件ごとに path限定 commit した (計10コミット、pushなし)。

## 有望リスト (R4-4b以降の `make addurl` 対象候補。取込優先順位付き)

### P1 (欄構成が豊か・即取込推奨。14件)

| No. | URL | 備考 |
|-----|-----|------|
| 3 | https://www.tokyosteel.co.jp/contact/ | 東京製鐵。company/department/name/tel/email確認/fax |
| 13 | https://www.taiheiyo-cement.co.jp/contact/ | 太平洋セメント。form.run静的。name/kana/email確認/postal/address/tel/fax |
| 65 | https://www.advantest.com/ja/contact/ | アドバンテスト。lname/fname/address/email/company/phone |
| 157 | https://www.ngk.co.jp/contact/input?form_type=3 | 日本ガイシ。name/name-kana/zip/address/tel/mail |
| 158 | https://inquiry.lixil.co.jp/regist/is?SMPFORM=naoj-lctgtj-defd68f97cffa36b3ed5f3bcd2c68ca6&qcat=18 | LIXIL・SMP。氏名・カナ・郵便・都道府県・住所・電話・メール確認 |
| 160 | https://global.engine.kubota.co.jp/ja/contact/input.php?fid=01 | クボタ。last_name/kana/zipCode/pref/address/phone/email確認 |
| 168 | https://form.azbil.com/form/pub/contact/kikubari_contact | アズビル。氏名分割・郵便+住所検索・tel分割・email確認 |
| 169 | https://www.keyence.co.jp/inquiry/askKeyence/ | キーエンス。lastName/firstName/zipCode/stateID/address1-2/phone |
| 170 | https://www.sysmex.co.jp/contact/input?inquiry_type=1 | シスメックス。name/フリガナ/zip/pref/city/building/tel/fax/email |
| 171 | https://reg34.smp.ne.jp/regist/is?SMPFORM=pfsd-lgqblb-eadedf16d2d1b0d8725c37ca6ad1a2e6 | レーザーテック・SMP。氏名・カナ・郵便・都道府県・住所・電話 |
| 172 | https://www.toyoda-gosei.co.jp/contact/seihin_form/ | 豊田合成。matter/name/company/zip1-2/adr1/tel/fax/email |
| 175 | https://krs.bz/toktprf/m/materials_request_ja | 三菱商事。tel 3分割×2・zip・email確認 |
| 176 | https://www.yoshinoya-holdings.com/contact/storeform/ | 吉野家HD。name/kana/zip1-2/pref/address/tel/mail |
| 181 | https://www.tonami.co.jp/contact/luggage/ | トナミ運輸・CF7。name-sei/mei/post_code/prefectures/address/email確認 |

### P2 (有望だが欄が小さい・コード化項目。取込時精査。13件)

No.73 ローム (contactusポートレット, `last_name`・`first_name`。ログイン導線併設のため取込時確認)、No.138 光通信 (inquiry_type/name/email/tel。action空=JS送信の可能性)、No.159 住友重機械 (`e_*` コード化だがzip検索・tel分割あり)、No.162 JUKI (actionなし=JS送信の可能性)、No.163 グローリー (Struts・`singleAnswer` コード化)、No.164 セガサミー (`f*` コード化・email確認あり)、No.167 古河電工 (spiral-site・`f*` コード化)、No.174 三井物産 (Struts・コード化)、No.177 イエローハット (SMP・住所欄なし)、No.180 JPX (Struts・コード化)、No.183 スターフライヤー (Struts・コード化)、No.184 松竹 (`c_q*` コード化)、No.185 東映 (msgs・コード化)。

### P3 (予備。1件)

No.33 タダノ (`action=#` でJS送信の可能性。静的欄は豊か。取込時確認)。

## 除外の内訳 (158件)

- 到達不能 (404/403/410/503/curl失敗・空応答): 約110件。`/contact/` 直下が存在しない企業が大半で、R4-1と同傾向。
- フォームなし (ハブ頁・検索formのみ): 約45件。実フォームが製品別・ブランド別・外部フォーム基盤 (SMP / Struts / spiral-site / msgs / kintone / Salesforce / office.com) に分離しているパターンが多く、発見分は No.157-186 として検証済み。
- JS描画のみ: 3件 (No.161 form.run、No.182 NX、ほかハブ内JS導線)。

## concerns

- ハブ頁 (`/contact/`) 直当ては404率が高く、効率はR4-1よりやや低い。P1の約半数はフォローアップ行 (No.157以降) から出ており、ハブ→導線リンクの追跡が有効だった。
- No.33 (タダノ)、No.138 (光通信)、No.162 (JUKI) は `action` 空・`#` のためJS送信の可能性があり、取込時 (`make addurl`/fixture化) に要確認。P2/P3に格付け済み。
- No.158/171/177 のSMP系、No.163/174/180/183/185 のStruts/msgs系は項目名がコード化されている。R4-1 precedent (P2) に倣いP2としたが、分類器の語彙獲得にはP1 (素直な項目名) を優先して取り込むことを推奨する。
- curl長期タイムアウト1件 (堀場 No.64、25s)。再試行していない。
- `samples/`・`tests/`・`src/`・`tests/target-url.md` には触っていない。有望URLの台帳登録は R4-4b 以降に委ねる。

## commits (pushなし)

- 991e241 docs(sdd): R4-4a 試行ログ No.1-20 (5000番台素材・鉄鋼)
- 5dd6aef docs(sdd): R4-4a 試行ログ No.21-40 (機械・建機・農機)
- a25e15e docs(sdd): R4-4a 試行ログ No.41-60 (軸受・重電・電子部品)
- 28eca87 docs(sdd): R4-4a 試行ログ No.61-80 (計測・半導体・輸送用機器)
- 5bcf2b4 docs(sdd): R4-4a 試行ログ No.81-100 (自動車部品・精密・商社)
- 384d8e6 docs(sdd): R4-4a 試行ログ No.101-120 (外食・小売・金融・不動産)
- 3f75c6f docs(sdd): R4-4a 試行ログ No.121-140 (不動産・運輸・通信)
- 73841cd docs(sdd): R4-4a 試行ログ No.141-160 (サービス・フォローアップ前半)
- ac99a7e docs(sdd): R4-4a 試行ログ No.161-180 (フォローアップ中盤)
- 246a1d7 docs(sdd): R4-4a 試行ログ No.181-186 +集計 (フォローアップ後半)
- (本レポートのcommitは下記コマンドで実施)
