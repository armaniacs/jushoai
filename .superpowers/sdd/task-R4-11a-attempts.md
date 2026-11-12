# Task R4-11a 試行ログ — JSIC大分類20区分×各10社候補200 URLリスト

- 目的: JushoAI samples corpus 拡充 (PBI-208) 第4トランチの続き。対象は日本標準産業分類 (JSIC) の大分類20区分 (A〜T) とし、区分ごとに企業・団体を10件ずつ選ぶ (計200候補)。このタスクは候補リスト作りだけに限定し、addurl 取り込みは後続タスク (R4-11b以降) が行う。
- 対象区分 (brief記載をverbatimで使用): A 農業、林業 / B 漁業 / C 鉱業、採石業、砂利採取業 / D 建設業 / E 製造業 / F 電気・ガス・熱供給・水道業 / G 情報通信業 / H 運輸業、郵便業 / I 卸売業、小売業 / J 金融業、保険業 / K 不動産業、物品賃貸業 / L 学術研究、専門・技術サービス業 / M 宿泊業、飲食サービス業 / N 生活関連サービス業、娯楽業 / O 教育、学習支援業 / P 医療、福祉 / Q 複合サービス事業 (郵便局・農協など) / R サービス業 (他に分類されないもの) / S 公務 / T 分類不能の産業
- やること (brief記載をverbatimで使用): 1. 20区分×各10件 = 200 URL以上の候補をリスト化する。既存分 (tests/target-url.md) および試行済み (上記7ファイル) といずれも重複させない (URL正規化照合)。2. 各候補を curl で事前確認し、実フォームの有無を判定する。判定基準 (PBI-208 precedent): JS描画のみ・ログイン必須・フォームなし・到達不能は除外。除外したURLは理由を記録する。3. 結果を `.superpowers/sdd/task-R4-11a-attempts.md` に試行ログとして書く。形式は R4-1 のログに倣う (連番・URL・区分コード・企業名・判定・除外理由 or フォーム概要)。有望分には取込優先順位を付ける (P1: 欄構成が豊か・即取込推奨 / P2: 有望だが欄が小さい・機構が特殊 / P3: 予備)。4. 有望URLは `tests/target-url.md` にはまだ書かない (R4-11b以降が `make addurl URL=<url>` で登録する)。
- 重複排除: `tests/target-url.md` (116件) および試行済み7ファイル (`.superpowers/sdd/task-R4-1-attempts.md`、`.superpowers/sdd/task-R4-4a-attempts.md`、`.superpowers/sdd/task-R4-5a-attempts.md`、`.superpowers/sdd/task-R4-6a-attempts.md`、`.superpowers/sdd/task-R4-7a-attempts.md`、`.superpowers/sdd/task-R4-8a-attempts.md`、`.superpowers/sdd/task-R4-9a-attempts.md`、計1076 URL) とURL正規化照合 (小文字化・末尾スラッシュ除去・http→https) し重複なし。同一ドメインでもパス・クエリが異なるURLのみ採用。スクリプト照合済み。
- 確認方法: `curl -sL --max-time 25` + Chrome UA で取得し、HTTPコード・`<form`・`input`・`textarea`・`select` の有無と action・欄名 (name属性) を計数・目視。動的取得フォーム (JS描画) は「除外: JS描画のみ」。有望候補は input名まで掘って確認。
- 有望の優先順位: P1 (欄構成が豊か・即取込推奨) > P2 (有望だが欄が小さい・機構が特殊) > P3 (予備)。
- 本ファイルのみ変更。`tests/target-url.md` への登録は R4-11b以降が `make addurl` で行う。

## 区分別内訳集計

| 区分 | 候補 | 有望 (P1/P2/P3) | 除外 |
|------|------|-----------------|------|
| A 農業、林業 | 10 | 0 (0/0/0) | 10 |
| B 漁業 | 10 | 0 (0/0/0) | 10 |
| C 鉱業、採石業、砂利採取業 | 10 | 0 (0/0/0) | 10 |
| D 建設業 | 10 | 1 (1/0/0) | 9 |
| E 製造業 | 10 | 0 (0/0/0) | 10 |
| F 電気・ガス・熱供給・水道業 | 10 | 0 (0/0/0) | 10 |
| G 情報通信業 | 10 | 0 (0/0/0) | 10 |
| H 運輸業、郵便業 | 10 | 0 (0/0/0) | 10 |
| I 卸売業、小売業 | 10 | 1 (0/1/0) | 9 |
| J 金融業、保険業 | 10 | 0 (0/0/0) | 10 |
| K 不動産業、物品賃貸業 | 10 | 1 (1/0/0) | 9 |
| L 学術研究、専門・技術サービス業 | 10 | 1 (1/0/0) | 9 |
| M 宿泊業、飲食サービス業 | 10 | 0 (0/0/0) | 10 |
| N 生活関連サービス業、娯楽業 | 10 | 0 (0/0/0) | 10 |
| O 教育、学習支援業 | 10 | 0 (0/0/0) | 10 |
| P 医療、福祉 | 10 | 0 (0/0/0) | 10 |
| Q 複合サービス事業 (郵便局・農協など) | 10 | 0 (0/0/0) | 10 |
| R サービス業 (他に分類されないもの) | 10 | 1 (0/1/0) | 9 |
| S 公務 | 10 | 0 (0/0/0) | 10 |
| T 分類不能の産業 | 10 | 0 (0/0/0) | 10 |
| 合計 | 200 | 5 | 195 |

## 試行ログ

| # | URL | 区分 | 企業・団体名 | 判定 | 除外理由 / フォーム概要 |
|---|-----|------|--------------|------|--------------------------|

### A 農業、林業

| 1 | https://www.ja-zenchu.or.jp/contact/ | A | JA全中 | 除外 | 到達不能 (curl失敗・code=000。接続不可) |
| 2 | https://www.zennoh.or.jp/contact/ | A | JA全農 | 除外 | 到達不能 (HTTP 404「該当ページを表示できません」) |
| 3 | https://www.hokuren.or.jp/contact/ | A | ホクレン | 除外 | 到達不能 (HTTP 200だがsize 212の空頁。静的formなし) |
| 4 | https://www.ja-kyosai.or.jp/contact/ | A | JA共済連 | 除外 | フォームなし (HTTP 200「お問い合わせ・ご相談」案内頁。静的formなし) |
| 5 | https://www.nochubank.or.jp/contact/ | A | 農林中央金庫 | 除外 | 到達不能 (HTTP 403・bot遮断) |
| 6 | https://sfc.jp/information/contact/ | A | 住友林業 | 除外 | 到達不能 (HTTP 404) |
| 7 | https://www.iseki.co.jp/contact/ | A | 井関農機 | 除外 | フォームなし (HTTP 200「お問い合わせ」ハブ。静的formなし) |
| 8 | https://www.yanmar.com/jp/contact/ | A | ヤンマーHD | 除外 | 到達不能 (HTTP 403 Access Denied) |
| 9 | https://www.ojiholdings.co.jp/contact/ | A | 王子HD | 除外 | フォームなし (HTTP 200。静的formは検索1件のみ) |
| 10 | https://www.nipponpaper.co.jp/contact/ | A | 日本製紙 | 除外 | 到達不能 (curl失敗・code=000。接続不可) |

### B 漁業

| 11 | https://www.maruha-nichiro.co.jp/contact/ | B | マルハニチロ | 除外 | 到達不能 (HTTP 404。マルハニチロ→UMIOS移管後の旧導線とみられる) |
| 12 | https://www.nissui.co.jp/contact/ | B | ニッスイ | 除外 | 到達不能 (HTTP 404) |
| 13 | https://www.kyokuyo.co.jp/contact/ | B | 極洋 | 除外 | 到達不能 (HTTP 404) |
| 14 | https://www.zengyoren.or.jp/contact/ | B | JF全漁連 | 除外 | 到達不能 (HTTP 404) |
| 15 | https://www.tsukiji.or.jp/contact/ | B | 築地魚市場 | 除外 | 到達不能 (HTTP 404) |
| 16 | https://www.toyosu-ichiba.or.jp/contact/ | B | 豊洲市場協会 | 除外 | 到達不能 (curl失敗・code=000。接続不可) |
| 17 | https://www.maruha-nichiro-logistics.co.jp/contact/ | B | マルハニチロ物流 | 除外 | 到達不能 (curl失敗・code=000。接続不可) |
| 18 | https://www.nichiro.co.jp/contact/ | B | 日魯漁業 | 除外 | 到達不能 (curl失敗・code=000。接続不可) |
| 19 | https://www.taiyo-aandf.co.jp/contact/ | B | 大洋エーアンドエフ | 除外 | 到達不能 (curl失敗・code=000。接続不可) |
| 20 | https://www.shinkogyorui.co.jp/contact/ | B | 神港魚類 | 除外 | 到達不能 (curl失敗・code=000。接続不可) |

### C 鉱業、採石業、砂利採取業

| 21 | https://www.inpex.co.jp/contact/ | C | INPEX | 除外 | 到達不能 (HTTP 404。静的formは検索系のみ) |
| 22 | https://www.japex.co.jp/contact/ | C | 石油資源開発 | 除外 | フォームなし (HTTP 200。静的formは検索・タブ切替radioのみ) |
| 23 | https://www.furukawakk.co.jp/contact/ | C | 古河機械金属 | 除外 | 到達不能 (HTTP 404) |
| 24 | https://www.toho-zinc.co.jp/contact/ | C | 東邦亜鉛 | 除外 | 到達不能 (HTTP 404) |
| 25 | https://www.hitachi-cement.co.jp/contact/ | C | 日立セメント | 除外 | フォームなし (HTTP 200「お問い合わせ」案内頁。静的formなし) |
| 26 | https://www.ube.co.jp/contact/ | C | 宇部興産 | 除外 | 到達不能 (HTTP 200で/error/no_page.htmに転送。404頁) |
| 27 | https://www.chichibu-lime.co.jp/contact/ | C | 秩父石灰 | 除外 | 到達不能 (curl失敗・code=000。接続不可) |
| 28 | https://www.nittetsu-mining.co.jp/contact/ | C | 日鉄鉱業 | 除外 | 到達不能 (curl失敗・code=000。接続不可) |
| 29 | https://www.toho-titanium.co.jp/contact/ | C | 東邦チタニウム | 除外 | フォームなし (HTTP 200「お問合せ」案内頁。静的formなし) |
| 30 | https://www.asahihd.co.jp/contact/ | C | アサヒHD | 除外 | 到達不能 (curl失敗・code=000。接続不可) |

### D 建設業

| 31 | https://www.kajima.co.jp/contact/ | D | 鹿島建設 | 除外 | フォームなし (HTTP 200。静的form 7件はすべて検索系。実窓口は別導線とみられる) |
| 32 | https://www.shimz.co.jp/contact/ | D | 清水建設 | 除外 | 到達不能 (HTTP 404) |
| 33 | https://www.taisei.co.jp/contact/ | D | 大成建設 | 除外 | フォームなし (HTTP 200。静的formは検索3件のみ) |
| 34 | https://www.takenaka.co.jp/contact/ | D | 竹中工務店 | 除外 | 到達不能 (HTTP 404) |
| 35 | https://www.obayashi.co.jp/contact/ | D | 大林組 | 除外 | 到達不能 (HTTP 404) |
| 36 | https://www.haseko.co.jp/contact/ | D | 長谷工コーポレーション | 除外 | 到達不能 (HTTP 404) |
| 37 | https://www.toda.co.jp/contact/ | D | 戸田建設 | 除外 | 到達不能 (HTTP 404) |
| 38 | https://www.maeda.co.jp/contact/ | D | 前田建設工業 | 除外 | 到達不能 (HTTP 404) |
| 39 | https://www.nishimatsu.co.jp/contact/ | D | 西松建設 | 除外 | フォームなし (HTTP 200。静的formは検索のみ) |
| 40 | https://www.fujita.co.jp/contact/ | D | フジタ | 有望 P1 | 静的実フォーム (HTTP 200「お問い合わせメールフォーム」。action=/contact/confirm/、input 16・textarea 1・select 1。your_name_last/first・your_kana_last/first・tel01/02/03・email確認・customer_type radio・contact_type select。命名素直で多様性◎) |

### E 製造業

| 41 | https://www.komatsu.jp/inquiry/ | E | コマツ | 除外 | 到達不能 (HTTP 404転送頁。/inquiry/ なし) |
| 42 | https://www.hitachicm.co.jp/contact/ | E | 日立建機 | 除外 | 到達不能 (curl失敗・code=000。接続不可) |
| 43 | https://www.omron.com/jp/ja/contact/ | E | オムロン | 除外 | 到達不能 (HTTP 403 Access Denied) |
| 44 | https://www.yakult.co.jp/inquiry/ | E | ヤクルト本社 | 除外 | 到達不能 (メンテナンス中頁に転送。静的formなし) |
| 45 | https://www.meiji.com/contact/ | E | 明治HD | 除外 | 到達不能 (HTTP 403・error頁) |
| 46 | https://www.morinagamilk.co.jp/contact/ | E | 森永乳業 | 除外 | フォームなし (HTTP 200。静的formはサイト内検索のみ) |
| 47 | https://www.nissin.com/jp/contact/ | E | 日清食品HD | 除外 | 到達不能 (HTTP 404) |
| 48 | https://www.housefoods.co.jp/contact/ | E | ハウス食品 | 除外 | 到達不能 (curl失敗・code=000。接続不可) |
| 49 | https://www.shiseido.com/jp/ja/contact/ | E | 資生堂 | 除外 | 到達不能 (HTTP 410 Gone) |
| 50 | https://www.kao.com/jp/customer/ | E | 花王 | 除外 | 到達不能 (HTTP 404) |

### F 電気・ガス・熱供給・水道業

| 51 | https://www.chuden.co.jp/contact/ | F | 中部電力 | 除外 | 到達不能 (HTTP 404) |
| 52 | https://www.kepco.co.jp/contact/ | F | 関西電力 | 除外 | 到達不能 (HTTP 403 Access Denied) |
| 53 | https://www.tohoku-epco.co.jp/contact/ | F | 東北電力 | 除外 | 到達不能 (HTTP 404) |
| 54 | https://www.kyuden.co.jp/contact/ | F | 九州電力 | 除外 | 到達不能 (HTTP 404) |
| 55 | https://www.hepco.co.jp/contact/ | F | 北海道電力 | 除外 | 到達不能 (HTTP 404) |
| 56 | https://www.energia.co.jp/contact/ | F | 中国電力 | 除外 | 到達不能 (HTTP 404) |
| 57 | https://www.yonden.co.jp/contact/ | F | 四国電力 | 除外 | フォームなし (HTTP 200「よくあるご質問・お問い合わせ」FAQ頁。静的formは空formのみ) |
| 58 | https://www.rikuden.co.jp/contact/ | F | 北陸電力 | 除外 | 到達不能 (HTTP 404) |
| 59 | https://www.osakagas.co.jp/contact/ | F | 大阪ガス | 除外 | 到達不能 (HTTP 404) |
| 60 | https://www.tohogas.co.jp/contact/ | F | 東邦ガス | 除外 | 到達不能 (HTTP 404) |

### G 情報通信業

| 61 | https://www.ntt.com/contact/ | G | NTTコミュニケーションズ | 除外 | フォームなし (HTTP 200。静的formは検索のみ) |
| 62 | https://www.kddi.com/contact/ | G | KDDI | 除外 | フォームなし (HTTP 200。静的formは検索のみ) |
| 63 | https://www.iij.ad.jp/contact/ | G | IIJ | 除外 | フォームなし (HTTP 200「お問い合わせ」案内頁。静的formなし) |
| 64 | https://www.sakura.ad.jp/contact/ | G | さくらインターネット | 除外 | 到達不能 (HTTP 404) |
| 65 | https://www.gmo.jp/contact/ | G | GMOインターネット | 除外 | 到達不能 (HTTP 403・bot遮断) |
| 66 | https://www.lycorp.co.jp/contact/ | G | LINEヤフー | 除外 | 到達不能 (HTTP 403。実体は404頁) |
| 67 | https://www.cyberagent.co.jp/contact/ | G | サイバーエージェント | 除外 | フォームなし (HTTP 200。静的formは検索のみ) |
| 68 | https://dena.com/jp/contact/ | G | DeNA | 除外 | フォームなし (HTTP 200「お問合せ」案内頁。静的formなし。実窓口は別導線とみられる) |
| 69 | https://www.mercari.com/contact/ | G | メルカリ | 除外 | 到達不能 (HTTP 403・bot遮断) |
| 70 | https://www.zozo.co.jp/contact/ | G | ZOZO | 除外 | 到達不能 (curl失敗・code=000。接続不可) |

### H 運輸業、郵便業

| 71 | https://www.jrkyushu.co.jp/inquiry/ | H | JR九州 | 除外 | 到達不能 (HTTP 404。静的formは検索系のみ) |
| 72 | https://www.jr-shikoku.co.jp/contact/ | H | JR四国 | 除外 | 到達不能 (HTTP 404) |
| 73 | https://www.jrfreight.co.jp/contact/ | H | JR貨物 | 除外 | 到達不能 (HTTP 200だが実体はエラーページ。静的formなし) |
| 74 | https://www.keisei.co.jp/contact/form/ | H | 京成電鉄 | 除外 | 到達不能 (HTTP 404) |
| 75 | https://www.keikyu.co.jp/contact/form/ | H | 京急電鉄 | 除外 | 到達不能 (HTTP 404) |
| 76 | https://www.hanshin.co.jp/contact/ | H | 阪神電気鉄道 | 除外 | 到達不能 (HTTP 404。404頁内の乗換・切符系formのみで問合せ欄なし) |
| 77 | https://www.nankai.co.jp/contact/ | H | 南海電鉄 | 除外 | 到達不能 (HTTP 404) |
| 78 | https://www.nyk.com/inquiry/ | H | 日本郵船 | 除外 | 到達不能 (HTTP 404) |
| 79 | https://www.mol.co.jp/inquiry/ | H | 商船三井 | 除外 | 到達不能 (HTTP 200で/error/404.htmlに転送。404頁) |
| 80 | https://www.kline.co.jp/inquiry/ | H | 川崎汽船 | 除外 | 到達不能 (HTTP 404) |

### I 卸売業、小売業

| 81 | https://www.family.co.jp/contact/ | I | ファミリーマート | 除外 | 到達不能 (HTTP 404) |
| 82 | https://www.lawson.co.jp/contact/ | I | ローソン | 除外 | 到達不能 (HTTP 404) |
| 83 | https://www.donki.com/contact/ | I | ドンキホーテ | 除外 | 到達不能 (HTTP 404) |
| 84 | https://www.shimamura.gr.jp/contact/ | I | しまむら | 除外 | 到達不能 (HTTP 403 Access Denied) |
| 85 | https://www.uniqlo.com/jp/ja/contact/ | I | ユニクロ | 除外 | 到達不能 (HTTP 404。静的formはfingerprint 1欄のみ) |
| 86 | https://www.yamada-holdings.jp/contact/ | I | ヤマダHD | 有望 P2 | 静的実フォーム (HTTP 200「お問い合わせ」。action=cgi-bin/contact.cgi、input 8・textarea 1・select 1。f01=お名前・f02=フリガナ・pm_email確認・f03=電話・TITLE select・question textarea。項目名コード化のためP2) |
| 87 | https://www.imhds.co.jp/contact/ | I | 三越伊勢丹HD | 除外 | 到達不能 (HTTP 404。静的formは検索系のみ) |
| 88 | https://www.takashimaya.co.jp/contact/ | I | 高島屋 | 除外 | 到達不能 (curl失敗・code=000。接続不可) |
| 89 | https://www.ksdenki.com/contact/ | I | ケーズHD | 除外 | 到達不能 (curl失敗・code=000。接続不可) |
| 90 | https://www.edion.co.jp/contact/ | I | エディオン | 除外 | フォームなし (HTTP 200「お問い合わせ」ハブ。静的formなし) |

### J 金融業、保険業

| 91 | https://www.nissay.co.jp/contact/ | J | 日本生命 | 除外 | フォームなし (HTTP 200「お問合せ」案内頁。静的formなし) |
| 92 | https://www.sumitomolife.co.jp/contact/ | J | 住友生命 | 除外 | フォームなし (HTTP 200。静的formは検索のみ) |
| 93 | https://www.jp-bank.japanpost.jp/contact/ | J | ゆうちょ銀行 | 除外 | 到達不能 (HTTP 200で/error/pc403.htmlに転送。403エラー頁) |
| 94 | https://www.resona-gr.co.jp/contact/ | J | りそなHD | 除外 | 到達不能 (HTTP 404) |
| 95 | https://www.smth.jp/contact/ | J | 三井住友トラスト | 除外 | フォームなし (HTTP 200。静的formは検索のみ) |
| 96 | https://www.ms-ins.com/contact/ | J | 三井住友海上 | 除外 | フォームなし (HTTP 200。静的formは検索のみ) |
| 97 | https://www.sompo-japan.co.jp/contact/ | J | 損保ジャパン | 除外 | JS描画のみ (HTTP 200だが可視欄なし。__VIEWSTATEのみで実体はJS描画とみられる) |
| 98 | https://www.sbigroup.co.jp/contact/ | J | SBI HD | 除外 | フォームなし (HTTP 200「お問い合わせ」案内頁。静的formなし) |
| 99 | https://www.orix.co.jp/contact/ | J | オリックス | 除外 | 到達不能 (HTTP 404) |
| 100 | https://www.ms-ad-hd.com/contact/ | J | MS&AD HD | 除外 | 到達不能 (HTTP 404) |

### K 不動産業、物品賃貸業

| 101 | https://www.kentaku.co.jp/contact/ | K | 大東建託 | 除外 | フォームなし (HTTP 200。静的formは検索2件のみ) |
| 102 | https://www.livable.co.jp/contact/ | K | 東急リバブル | 除外 | フォームなし (HTTP 200「各種お問い合わせ」ハブ。静的formなし。実窓口は別導線とみられる) |
| 103 | https://www.rehouse.or.jp/contact/ | K | 三井のリハウス | 除外 | 到達不能 (curl失敗・code=000。接続不可) |
| 104 | https://www.stepon.co.jp/contact/ | K | 住友不動産販売 | 除外 | 到達不能 (HTTP 404) |
| 105 | https://www.daiwaliving.co.jp/contact/ | K | 大和リビング | 除外 | 到達不能 (HTTP 404。転送先は賃貸トップで問合せformなし) |
| 106 | https://www.ur-net.go.jp/contact/ | K | UR都市機構 | 除外 | 到達不能 (HTTP 404) |
| 107 | https://www.mf-realty.jp/contact/ | K | 三井不動産リアルティ | 除外 | 到達不能 (HTTP 403。実体は404頁。静的formなし) |
| 108 | https://www.nomura-solutions.co.jp/contact/ | K | 野村不動産ソリューションズ | 除外 | フォームなし (HTTP 200「お問い合わせ」案内頁。静的formなし) |
| 109 | https://www.apaman.co.jp/contact/ | K | アパマン | 有望 P1 | 静的実フォーム (HTTP 200「お問い合わせ」。action=/mail_send.php、input 12・textarea 1。company・your_name・kana・tel_mobile/home・fax・zipcode・address・email・remarks。郵便・住所・電話・メール揃いで多様性◎) |
| 110 | https://www.samty.co.jp/contact/ | K | サムティ | 除外 | 到達不能 (HTTP 404) |

### L 学術研究、専門・技術サービス業

| 111 | https://www.riken.jp/contact/ | L | 理化学研究所 | 除外 | フォームなし (HTTP 200。静的formは検索のみ) |
| 112 | https://www.aist.go.jp/contact/ | L | 産業技術総合研究所 | 除外 | 到達不能 (HTTP 404) |
| 113 | https://www.jaxa.jp/contact/ | L | JAXA | 除外 | 到達不能 (HTTP 404) |
| 114 | https://www.nri.com/jp/contact | L | 野村総合研究所 | 除外 | フォームなし (/jp/contactがトップに転送。静的formは検索のみ) |
| 115 | https://www.mri.co.jp/contact/ | L | 三菱総合研究所 | 除外 | 到達不能 (HTTP 404) |
| 116 | https://www.jri.co.jp/contact/ | L | 日本総研 | 除外 | フォームなし (HTTP 200。静的formは検索のみ) |
| 117 | https://www.dir.co.jp/contact/ | L | 大和総研 | 除外 | フォームなし (HTTP 200。静的formは検索3件のみ) |
| 118 | https://www.mizuho-rt.co.jp/contact/ | L | みずほリサーチ | 除外 | 到達不能 (HTTP 403 Access Denied) |
| 119 | https://www.jpc-net.jp/contact/ | L | 日本生産性本部 | 除外 | フォームなし (HTTP 200。静的formは検索3件のみ) |
| 120 | https://www.jpaa.or.jp/contact/ | L | 日本弁理士会 | 有望 P1 | 静的実フォーム (HTTP 200「お問い合わせ」。MW WP Form、input 18・textarea 1・select 2。会社名・部署・役職・氏名・フリガナ・メールアドレス確認・電話番号3分割・職種/業種select。日本語名項目が素直で多様性◎。住所欄なし) |

### M 宿泊業、飲食サービス業

| 121 | https://www.imperialhotel.co.jp/contact | M | 帝国ホテル | 除外 | フォームなし (HTTP 200。静的formは検索2件のみ) |
| 122 | https://www.hotel-okura.co.jp/contact | M | オークラホテル | 除外 | 到達不能 (curl失敗・code=000。接続不可) |
| 123 | https://www.newotani.co.jp/contact | M | ニューオータニ | 除外 | 到達不能 (HTTP 404) |
| 124 | https://www.princehotels.co.jp/contact | M | プリンスホテル | 除外 | 到達不能 (HTTP 404) |
| 125 | https://www.toyoko-inn.co.jp/contact | M | 東横イン | 除外 | 到達不能 (HTTP 404) |
| 126 | https://www.apahotel.co.jp/contact | M | アパホテル | 除外 | 到達不能 (curl失敗・code=000。接続不可) |
| 127 | https://www.hoshinoresorts.com/contact/ | M | 星野リゾート | 除外 | フォームなし (HTTP 200「お問い合わせ」頁だが静的formなし。予約導線はJSとみられる) |
| 128 | https://www.mcdonalds.co.jp/contact/ | M | マクドナルド | 除外 | 到達不能 (HTTP 404) |
| 129 | https://www.skylark.co.jp/contact/ | M | すかいらーくHD | 除外 | 到達不能 (HTTP 404) |
| 130 | https://www.zensho.co.jp/contact/ | M | ゼンショーHD | 除外 | 到達不能 (HTTP 404) |

### N 生活関連サービス業、娯楽業

| 131 | https://www.jtb.co.jp/inquiry/ | N | JTB問合せ窓口 | 除外 | 到達不能 (HTTP 200で/Error/404Error.aspに転送。404頁) |
| 132 | https://www.his.co.jp/contact/ | N | HIS | 除外 | 到達不能 (HTTP 404) |
| 133 | https://www.knt.co.jp/contact/ | N | 近畿日本ツーリスト | 除外 | 到達不能 (HTTP 404) |
| 134 | https://www.olc.co.jp/contact/ | N | オリエンタルランド | 除外 | 到達不能 (curl失敗・code=000。接続不可) |
| 135 | https://www.usj.co.jp/contact/ | N | USJ | 除外 | 到達不能 (curl失敗・code=000。接続不可) |
| 136 | https://www.avex.co.jp/contact/ | N | エイベックス | 除外 | フォームなし (HTTP 200トップ。静的formなし) |
| 137 | https://www.yoshimoto.co.jp/contact/ | N | 吉本興業 | 除外 | フォームなし (HTTP 200「ご依頼・お問い合わせ」案内頁。静的formなし) |
| 138 | https://www.karaokekan.co.jp/contact/ | N | カラオケ館 | 除外 | 到達不能 (curl失敗・code=000。接続不可) |
| 139 | https://www.duskin.co.jp/contact/ | N | ダスキン | 除外 | 到達不能 (HTTP 404) |
| 140 | https://www.secom.co.jp/inquiry/ | N | セコム問合せ | 除外 | 到達不能 (HTTP 404) |

### O 教育、学習支援業

| 141 | https://www.u-tokyo.ac.jp/contact/ | O | 東京大学 | 除外 | 到達不能 (HTTP 403 Forbidden) |
| 142 | https://www.kyoto-u.ac.jp/contact | O | 京都大学 | 除外 | フォームなし (HTTP 200。静的formは検索のみ) |
| 143 | https://www.waseda.jp/contact/ | O | 早稲田大学 | 除外 | 到達不能 (HTTP 403・Cloudflare遮断) |
| 144 | https://www.keio.ac.jp/contact/ | O | 慶應義塾 | 除外 | 到達不能 (HTTP 404) |
| 145 | https://www.kawai-juku.ac.jp/contact/ | O | 河合塾 | 除外 | 到達不能 (HTTP 404) |
| 146 | https://www.sundai.ac.jp/contact/ | O | 駿台予備校 | 除外 | 到達不能 (HTTP 404) |
| 147 | https://www.yozemi.ac.jp/contact/ | O | 代々木ゼミナール | 除外 | 到達不能 (HTTP 200で/notfound.htmlに転送。404頁) |
| 148 | https://www.gakken.co.jp/contact/ | O | 学研HD | 除外 | 到達不能 (HTTP 404) |
| 149 | https://www.benesse.co.jp/customer/ | O | ベネッセお客様窓口 | 除外 | フォームなし (HTTP 200「ベネッセお客様本部」案内頁。静的formなし) |
| 150 | https://www.kumon.ne.jp/contact/ | O | 公文教育研究会 | 除外 | 到達不能 (HTTP 404) |

### P 医療、福祉

| 151 | https://www.takeda.co.jp/contact/ | P | 武田薬品工業 | 除外 | 到達不能 (HTTP 404。size 21の空応答) |
| 152 | https://www.astellas.co.jp/contact/ | P | アステラス製薬 | 除外 | 到達不能 (curl失敗・code=000。接続不可) |
| 153 | https://www.daiichisankyo.co.jp/contact/ | P | 第一三共 | 除外 | JS描画のみ (HTTP 200だが可視欄なし。__EVENTTARGET等のASP.NET残骸のみで実体はJS描画とみられる) |
| 154 | https://www.eisai.co.jp/contact/ | P | エーザイ | 除外 | 到達不能 (HTTP 404) |
| 155 | https://www.juntendo.ac.jp/hospital/contact/ | P | 順天堂医院 | 除外 | 到達不能 (HTTP 404。転送先はerror/404.html) |
| 156 | https://www.toranomon.gr.jp/contact/ | P | 虎の門病院 | 除外 | 到達不能 (curl失敗・code=000。接続不可) |
| 157 | https://www.ncc.go.jp/contact/ | P | 国立がん研究センター | 除外 | 到達不能 (HTTP 404) |
| 158 | https://www.nichiigakkan.co.jp/contact/ | P | ニチイホールディングス | 除外 | フォームなし (HTTP 200「お問い合わせ」案内頁。静的formなし) |
| 159 | https://www.benesse-style-care.co.jp/contact/ | P | ベネッセスタイルケア | 除外 | 到達不能 (HTTP 404。ベネッセスタイルケア案内のみ) |
| 160 | https://www.sompocare.co.jp/contact/ | P | SOMPOケア | 除外 | 到達不能 (curl失敗・code=000。接続不可) |

### Q 複合サービス事業 (郵便局・農協など)

| 161 | https://www.japanpost.jp/question/ | Q | 日本郵政ご意見 | 除外 | 到達不能 (HTTP 404。静的formは検索・メガメニューのみ) |
| 162 | https://www.post.japanpost.jp/question/ | Q | 日本郵便問合せ | 除外 | フォームなし (HTTP 200。静的formは検索2件のみ) |
| 163 | https://www.coopkyosai.coop/contact/ | Q | コープ共済 | 除外 | 到達不能 (curl失敗・code=000。ドメイン接続不可) |
| 164 | https://www.jp-life.japanpost.jp/contact/ | Q | かんぽ生命 | 除外 | フォームなし (HTTP 200。静的formは検索2件とアコーディオン切替radioのみ) |
| 165 | https://www.ja-zenchu.or.jp/inquiry/ | Q | JA全中ご意見 | 除外 | 到達不能 (curl失敗・code=000。接続不可) |
| 166 | https://www.ja-kyosai.or.jp/inquiry/ | Q | JA共済ご相談 | 除外 | 到達不能 (HTTP 404) |
| 167 | https://www.zenrosai.coop/contact/ | Q | 全労済 | 除外 | フォームなし (HTTP 200。静的form 3件はすべてサイト内検索。実窓口は別導線とみられる) |
| 168 | https://www.coopdeli.coop/contact/ | Q | コープデリ | 除外 | 到達不能 (curl失敗・code=000。接続不可) |
| 169 | https://www.pal-system.co.jp/contact/ | Q | パルシステム | 除外 | フォームなし (HTTP 200ヘルプ頁。静的formなし) |
| 170 | https://www.seikatsuclub.coop/contact/ | Q | 生活クラブ | 除外 | 到達不能 (HTTP 200で/sorry/notfound.htmlに転送。404頁) |

### R サービス業 (他に分類されないもの)

| 171 | https://www.recruit.co.jp/inquiry/ | R | リクルート問合せ | 除外 | 到達不能 (HTTP 404) |
| 172 | https://www.persol-group.co.jp/contact/ | R | パーソルHD | 除外 | 到達不能 (HTTP 404) |
| 173 | https://www.pasonagroup.co.jp/contact/ | R | パソナグループ | 除外 | JS描画のみ (HTTP 200だが可視欄なし。__VIEWSTATEのみ。実フォームは/clientinquiry.html等の別導線とみられる) |
| 174 | https://www.alsok.co.jp/contact/ | R | ALSOK | 除外 | 到達不能 (HTTP 404) |
| 175 | https://www.we-are-csp.co.jp/contact/ | R | セントラル警備保障 | 除外 | JS描画のみ (HTTP 200だが可視欄なし。hidden 2欄のみで実体はJS描画とみられる) |
| 176 | https://www.trans-cosmos.co.jp/inquiry/ | R | トランスコスモス問合せ | 除外 | フォームなし (/inquiry/がトップに転送。静的formなし) |
| 177 | https://www.bell24.co.jp/contact/ | R | ベルシステム24 | 除外 | 到達不能 (HTTP 404) |
| 178 | https://www.nkanzai.co.jp/contact/ | R | 日本管財 | 有望 P2 | 静的実フォーム (HTTP 200「お問い合わせ」。action=./confirm/、input 13・textarea 1・select 1。contact_name・contact_mail確認・contactselect select・contact_message textarea。住所・電話欄なしのためP2) |
| 179 | https://www.secom.co.jp/business/contact/ | R | セコム法人窓口 | 除外 | 到達不能 (HTTP 404) |
| 180 | https://www.japanpost.jp/about/contact/ | R | 日本郵政について | 除外 | 到達不能 (HTTP 404) |
