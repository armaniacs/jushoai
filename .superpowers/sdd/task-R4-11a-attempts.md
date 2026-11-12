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
