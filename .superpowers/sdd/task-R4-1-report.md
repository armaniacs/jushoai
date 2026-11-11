# Task R4-1 フルレポート — PBI-208 Round4 候補100 URLリスト (再送)

- ブランチ: `work/pbi-208-round4` (base 39d2aaf)。作業開始時 `git status` で確認済み。
- 実施日: 2026-11-12。`curl -sL --max-time 25` + Chrome UA で全件事前確認。
- 成果物: `.superpowers/sdd/task-R4-1-attempts.md` (試行ログ No.1-183) のみ。
  `src/`・`samples/`・`tests/` には触っていない。`tests/target-url.md` への登録はしていない (R4-2以降)。
- push なし (ローカルコミットのみ)。

## 結果サマリ

- 試行総数: 183件 (要求100件以上を満たす。連番1-183・重複URLなしを検証済み)
- 有望: 28件 (P1 12 / P2 14 / P3 2)
- 除外: 155件
- 既存19件 (`tests/target-url.md`) との重複: なし (ドメイン・パス照合済み)

## 手法 (失敗対策の記録)

1. batch1 (No.1-123): 就活人気・東証上場・TOP10000級の企業/自治体/EC/医療/不動産の `/contact/`・`/customer/`・`/inquiry/` 系パスを123件推測してcurl。結果は大半が404/403/ハブ頁だった (推測パスの限界)。
2. batch2 (No.124-183): batch1でHTTP 200だったハブ頁のHTMLから `form/contact/toiawase/entry/enquete` 系リンクを抽出・絶対URL化 (174件抽出→重複・画像・検索系を除き60件を選定) して再curl。ここから有望28件中28件すべてを得た。
3. 判定は取得HTMLの `<form action>`・input type/name・textarea/select を計数+目視し、PBI-208 precedent (JS描画のみ・ログイン必須・フォームなし・到達不能は除外) に沿って分類した。

## 有望リスト (R4-2以降の `make addurl` 対象候補。優先順位付き)

### P1 (即取込推奨・12件。多様性が高く欄構成が豊か)

| No. | URL | 概要 |
|-----|-----|------|
| 124 | https://www.fujifilm.com/jp/ja/form/FF-CSR | 富士フイルムCSR窓口。氏名分割・カナ分割・email確認・郵便・都道府県select・tel/fax・textarea |
| 129 | https://www.otsuka.co.jp/contacts/opinion/form | 大塚製薬ご意見。氏名・カナ・会社・mail・tel3分割・性別radio・年齢 |
| 130 | https://www.mitsuihome.co.jp/support/sonota/form.php | 三井ホーム。担当radio・所属・氏名/カナ2欄・郵便2欄・住所・都道府県select |
| 131 | https://www.mitsui-reform.com/ssl/catalog/select.html | 三井リフォーム資料請求。氏名/カナ2欄・tel・email確認・郵便。radio 33の大規模 |
| 132 | https://www.tokyu-land.co.jp/form/contact/ | 東急不動産総合。氏名・カナ・郵便・住所2欄・email確認・都道府県select |
| 139 | https://contact.city.kobe.lg.jp/webapp/form/26436_ucnb_1/index.do | 神戸市Webフォーム (Struts)。text 8・checkbox 5・textarea・select。自治体 |
| 145 | https://cform.epson.jp/form5/pub/e040/1009009009015109731 | エプソンCSR・環境。郵便3分割・住所検索ボタン付き。cform系 |
| 151 | https://webform.ricoh.com/form/pub/e00103/risb | リコー経済社会研究所。氏名分割・email確認・tel3分割 |
| 156 | https://form.kikkoman.co.jp/m/website | キッコーマン。tel3分割・email確認・textarea・select |
| 169 | https://area31.smp.ne.jp/area/is?SMPFORM=qcrc-mcldsd-95bb156300186458a5d681e60ccadfa&type=ac | SMPフォーム。氏名・フリガナ・郵便2分割・住所2欄・都道府県select |
| 170 | https://reg31.smp.ne.jp/regist/is?SMPFORM=qili-mbohmg-16d3b32725ef963f616238bd9d403ec2 | SMPフォーム。氏名/カナ2欄・郵便2分割・tel/fax・email確認 |
| 171 | https://go6.global.toshiba/GX/contactform | 東芝Pardot。lastname/firstname・zip/state/city/addressone・tel・email確認。外資系形式 |

### P2 (有望・14件。同型2件目・項目名コード化・要精査を含む)

No.125, 126 (富士フイルム同型・宛先違い), 127 (同・住所欄なし), 133, 134 (東急不動産・個人/テナント用),
143 (ベネッセenquete・項目名コード化), 144 (三井賃貸Struts), 146 (エプソンIR・同型),
152 (リコー脆弱性窓口・同系), 155 (ブラザー・大規模77欄だが項目名コード化),
157, 158 (キッコーマン・取材/採用向け), 176 (イオンSalesforce・hidden多め),
182 (au折返し相談・56欄)。

### P3 (予備・2件)

No.135 (東急BRANZ・同一サイト4件目のため予備), No.179 (ホンダ販売店アンケート・住所欄有無は取込時確認)。

## 除外内訳 (155件。ログ本文を `grep -c` で計数)

- 到達不能 (99件): 404系が最多 (推測パスが存在しない)。403・bot遮断 (パナ・ソニー・銀行・飲料・Cloudflare) / 接続失敗code=000 / 429 (富士通) / メンテナンス (ヤクルト) / 直アクセスでエラー画面 (三井不動産enquete No.136-138) を含む。
- フォームなし (49件): HTTP 200のハブ・リンク集・案内頁で静的formが検索のみまたは皆無。No.40 (ドコモ・ページ評価アンケートのみ) を含む。子URLに実フォームがあるものはbatch2で追跡済み。
- JS描画のみ (7件): No.44 (SMBC・空) / 128 (日清form) / 161 (ヤマト) / 162 (ヤマトbmpage・ログイン系の可能性あり) / 166 (JR九州予約) / 167 (kintone) / 178 (JTB)。`make addurl` が静的HTML取得のため対象外。

## 除外理由とPBI-208基準の対応

- 到達不能: 基準どおり除外。403/bot遮断は再試行せず除外とした (addurl取得も同条件で失敗するため)。
- JS描画のみ: `make addurl` が静的HTML取得のため対象外。基準どおり除外。
- ログイン必須: 今回は該当なし (No.162・239はJS描画扱いに含めた)。
- フォームなし: サイト内検索のみ・リンク集・案内頁は除外。ただし子URLに実フォームがある場合はbatch2で追跡した。
- 住所・氏名欄なし (No.40, 71, 179はP3止まり): JushoAIの対象 (姓名・フリガナ・住所) と無関係のため除外/低優先。基準の拡張解釈でありconcernに記載。

## 検証 (self-review)

- [x] 連番1-183・欠番なし (`awk` で検証)
- [x] URL重複なし (`sort | uniq -d` で空)
- [x] 既存19件との重複なし (全URLを `tests/target-url.md` と照合)
- [x] 変更ファイルは attempts のみ (`git status` で確認。AGENTS.mdのstaged変更は作業前から存在し触っていない)
- [x] `tests/target-url.md` 未登録 (R4-2に委譲)
- [x] 20件ごとにcommit (計9コミット)。pushなし
- [x] 捏造なし。全行curl実測に基づく。No.147はURL誤記を1件訂正済み (誤: `/java/` → 正: `/ja/`)。除外カテゴリ概数の曖昧さを本レポートに明記した

## concerns

1. batch1の推測パス (123件中、有望0) は効率が悪かった。有望はすべてbatch2 (ハブ頁リンク追跡) 由来。R4-2以降の候補探しでは「ハブ→子フォーム追跡」を最初から行う方が効率的。
2. 除外の約7割が「到達不能 (404/403)」。403/bot遮断系 (大企業・銀行・飲料) は `make addurl` でも取得不可の可能性が高く、R4-2ではP1/P2から着手すべき。
3. No.143/155/176など項目名コード化フォーム (enquete/Salesforce/大規模B2B) はfixture化時にlabel対応付けの手間が大きい。P2止まりの理由。
4. kintone公開フォーム (No.167)・SMP以外の動的系はJS描画で除外したが、SMP (No.169/170) は静的HTMLだった。フォーム基盤ごとの静的/動的の違いはR4-2の事前知識になる。
5. `.superpowers/` が `.gitignore` 対象のため `git add -f` でコミットした。運用上は問題ないが、履歴に残す方針は親判断に委ねる。

## R4-2への申送り

- P1の12件から `make addurl URL=<url>` で登録・取得すること。同一基盤の重複 (富士フイルム124-127、東急132-135、エプソン145-146、リコー151-152、キッコーマン156-158) は1件ずつ様子を見て広げる。
- No.176 (Salesforce)・No.182 (au) はhidden項目が多いため、最小再現への削りが大きめになる見込み。
