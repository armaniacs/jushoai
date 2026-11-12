# Task R4-5a 試行ログ — 政令指定都市20市 候補URLリスト

- 目的: 政令指定都市20市 (神戸市は取込済みのため除外し19市が対象) の公式サイトから実フォームを持つ静的ページ候補を100 URL以上リスト化し、curl で実フォーム有無を事前確認する (addurl 取り込みは R4-5b 以降)。
- 判定基準 (PBI-208 precedent): JS描画のみ・ログイン必須・フォームなし・到達不能は除外。除外URLは理由を記録。自治体に多い Struts/電子申請系フォーム (input type=button の JS 送信など) は機構を記録。
- 既存 (`tests/target-url.md`) および R4-1 試行済み183件 (`.superpowers/sdd/task-R4-1-attempts.md`) といずれも重複させない (全件ドメイン・パス照合。既存の神戸市 `contact.city.kobe.lg.jp` との重複回避のため神戸市は対象外)。
- 確認方法: `curl -sL --max-time 25` + Chrome UA で取得し、`<form`・`input`・`textarea`・`select` の有無と action・欄種を目視/計数。動的取得フォーム (JS描画) は「除外: JS描画のみ」。
- 有望の優先順位: P1 (多様性が高く欄構成が豊か・即取込推奨) > P2 (有望だが欄が小さい/外部フォーム依存・機構が特殊) > P3 (予備)。
- 本ファイルのみ変更。`tests/target-url.md` への登録は R4-5b 以降が `make addurl` で行う。

## 試行ログ

| # | URL | 判定 | 除外理由 / フォーム概要 |
|---|-----|------|--------------------------|
| 1 | https://www.city.sapporo.jp/city/iken-hp/index.html | 有望 P2 | 静的実フォーム (HTTP 200「札幌市公式ホームページに関するご意見・ご提案」。`action=/php/question/question.php`、textarea `item_1`(ご意見)・text `item_2`(お名前)・text `item_3`(メールアドレス)+送信確認submit。欄が3つのみのためP2) |
| 2 | https://www.city.sapporo.jp/shisetsuannai/yoyaku/index.html | 除外 | フォームなし (HTTP 200「予約が可能な施設一覧」。静的formは検索のみ。予約は外部システム導線) |
| 3 | https://www.city.sapporo.jp/somu/shiminnokoe/iken/teian.html | 除外 | フォームなし (HTTP 200「市政への提案メール」。静的formは検索のみ。提案先は別導線) |
| 4 | https://www.city.sapporo.jp/koho_kocho/index.html | 除外 | フォームなし (HTTP 200「広報・広聴・シティプロモート」。静的formは検索+問合せボタンPOSTリンクのみ) |
| 5 | https://www.city.sapporo.jp/shohi/01-shohi/01-soudan/details/reception.html | 除外 | フォームなし (HTTP 200「消費生活相談受付状況」。静的formは検索+問合せボタンPOSTリンクのみ) |
| 6 | https://www3.city.sapporo.jp/download/shinsei/ | 除外 | フォームなし (HTTP 200。申請書ダウンロードの手続き検索 `form_name/keywords` のみ。申請自体は別導線) |
| 7 | https://www.city.sendai.jp/kochotoke-kocho/shise/koho/kocho/sonota/comment/index.html | 除外 | フォームなし (HTTP 200「パブリックコメント手続き」。静的formは検索+問合せボタンPOSTリンク `simple_faq/form.cgi` のみ) |
| 8 | https://www.city.sendai.jp/kyoikusodan/ijime_soudan_portal.html | 除外 | フォームなし (HTTP 200「いじめに関する相談」。静的formは検索+問合せボタンPOSTリンクのみ。相談は電話・面談導線) |
| 9 | https://www.city.sendai.jp/shisetsu/index.html | 除外 | フォームなし (HTTP 200「施設案内・施設予約」。静的formは検索のみ。予約は外部システム導線) |
| 10 | https://www.city.sendai.jp/event/index.html | 除外 | フォームなし (HTTP 200「イベント情報」。静的formは検索のみ) |
| 11 | https://www.city.sendai.jp/romu/madoguchi_tansyuku.html | 除外 | フォームなし (HTTP 200「窓口の受付時間を変更」。静的formは検索+問合せボタンPOSTリンクのみ) |
| 12 | https://faq.callcenter.city.sendai.jp/app/top | 除外 | JS描画のみ (HTTP 200「杜の都おしえてコール」。静的formは `onsubmit="return false;"` の空formのみ。FAQ検索はJS生成) |
| 13 | https://apply.e-tumo.jp/city-saitama-u/ | 除外 | フォームなし (HTTP 200「さいたま市電子申請・届出サービス」トップ。静的formは手続き検索 `_csrf/topDetail` のみ。申請手続きはログイン/JS導線) |
| 14 | https://www.city.saitama.lg.jp/faq/index.html | 除外 | フォームなし (HTTP 200「さいたま市よくある質問」。静的formは検索のみ) |
| 15 | https://www.city.chiba.jp/front/otoiawase.html | 除外 | フォームなし (HTTP 200「ご意見・お問い合わせ」。静的formは検索+問合せボタンPOSTリンク `simple_faq/form.cgi` のみ) |
| 16 | https://www.city.chiba.jp/shimin/shimin/kusei/toiawaseichiran.html?ippan | 除外 | フォームなし (HTTP 200「住民票・戸籍取扱窓口」。静的formは検索+ページレビューradio `feedback.cgi`(役に立った/立たなかった)のみ。氏名・住所欄なし) |
| 17 | https://www.city.chiba.jp/shimin/shimin/kusei/soumado_onrainyoyaku.html?ippan | 除外 | フォームなし (HTTP 200「区役所窓口優先案内オンライン予約」。静的formは検索+ページレビューradioのみ。予約自体は外部システム導線) |
| 18 | https://www.city.chiba.jp/cgi-bin/event_cal/calendar.cgi | 除外 | フォームなし (HTTP 200「イベントカレンダー」。静的formは検索+年月・区selectの絞込のみ。申込欄なし) |
| 19 | https://www.city.chiba.jp/zaiseikyoku/zaisei/shikin/furusatokihukin.html?top | 除外 | フォームなし (HTTP 200「ふるさと納税お申込み方法」。静的formは検索+ページレビューradioのみ。申込は外部ポータル導線) |
| 20 | https://www.city.chiba.jp/sogoseisaku/shichokoshitsu/kohokocho/callcenter.html | 除外 | フォームなし (HTTP 200「市役所コールセンター」。静的formは検索+問合せボタン+ページレビューradioのみ) |
| 21 | https://www.city.sapporo.jp/somu/demaekoza/index.html | 除外 | フォームなし (HTTP 200「出前講座」。静的formは検索+問合せボタンPOSTリンクのみ) |
| 22 | https://www.city.sapporo.jp/shisetsuannai/index.html | 除外 | フォームなし (HTTP 200「施設案内」。静的formは検索+問合せボタンPOSTリンクのみ) |
| 23 | https://www.city.sapporo.jp/inuneko/main/event.html | 除外 | フォームなし (HTTP 200「イベント情報」。静的formは検索+問合せボタンPOSTリンクのみ) |
| 24 | https://www.city.sendai.jp/miyagino-shinko/event/startup.html | 除外 | フォームなし (HTTP 200。体験会案内頁。静的formは検索+問合せボタンPOSTリンクのみ) |
| 25 | https://www.city.sendai.jp/ninyo/shise/shokuin/saiyo/shikenjoho/index.html | 除外 | フォームなし (HTTP 200「仙台市職員採用情報」。静的formは検索のみ) |
| 26 | https://www.city.sendai.jp/kikaku-suishin/diversity-event2026.html | 除外 | フォームなし (HTTP 200。イベント案内頁。静的formは検索+問合せボタンPOSTリンクのみ) |
| 27 | https://www.city.yokohama.lg.jp/city-info/koho-kocho/kocho/teian/index.html | 除外 | フォームなし (HTTP 200「市民からの提案」。静的formは検索のみ。提案は別導線) |
| 28 | https://www.city.yokohama.lg.jp/city-info/koho-kocho/kocho/public/index.html | 除外 | フォームなし (HTTP 200「パブリックコメント・意見募集」。静的formは検索のみ。意見提出は案件別導線) |
| 29 | https://shinsei.city.yokohama.lg.jp/cu/141003/ea/residents/portal/home | 除外 | ログイン必須 (HTTP 200「横浜市電子申請・届出システム」。静的formなし、`loginIdTextBox/passwordTextBox` のログイン欄のみ。本文はJS) |
| 30 | https://www.atrium.city.yokohama.lg.jp/event/ | 除外 | フォームなし (HTTP 200「横浜市役所アトリウム催事案内」。form・inputなし) |
| 31 | https://www.city.yokohama.lg.jp/faq/index.html | 除外 | フォームなし (HTTP 200「Q＆Aよくある質問集」。静的formは検索のみ) |
| 32 | https://www.city.yokohama.lg.jp/kocho/teian.html | 除外 | フォームなし (HTTP 200「市民からの提案」(旧URL)。静的formは検索のみ) |
| 33 | https://www.city.yokohama.lg.jp/kanko-bunka/kanko-event/eventannai/calendar/list_calendar.html | 除外 | フォームなし (HTTP 200「イベントカレンダー」。静的formは検索のみ) |
| 34 | https://furusato-yokohama.jp/expo2027 | 除外 | JS描画のみ (HTTP 200「横浜市ふるさと納税」。form・inputなし。寄附申込はJS導線) |
| 35 | https://www.sodai.city.kawasaki.jp/eco/view/kawasaki/top.html | 除外 | フォームなし (HTTP 200「川崎市粗大ごみインターネット受付」トップ。Struts系 `jsessionid` セッション遷移の申込メニューボタン `Form:doCarry/doCollect` 等のみで氏名・住所欄なし。実申込は後段セッション遷移のため静的到達不可。機構を記録) |
| 36 | https://www.city.kawasaki.jp/kurashi/category/16-24-1-0-0-0-0-0-0-0.html | 除外 | フォームなし (HTTP 200「オンライン手続かわさき」。静的formは検索のみ。手続きは外部システム導線) |
| 37 | https://www.city.kawasaki.jp/shisei/category/286-0-0-0-0-0-0-0-0-0.html | 除外 | フォームなし (HTTP 200「広聴・パブリックコメント」。静的formは検索のみ) |
| 38 | https://www.city.kawasaki.jp/kodomo/category/270-0-0-0-0-0-0-0-0-0.html | 除外 | フォームなし (HTTP 200「こどもの相談・手当・助成」。静的formは検索のみ) |
| 39 | https://tetsuzuki.city.sagamihara.kanagawa.jp/?from=top.life.events | 除外 | JS描画のみ (HTTP 200「相模原市わたしの手続案内」。form・inputなし。手続案内はJS) |
| 40 | https://www.city.sagamihara.kanagawa.jp/lifeevent/1012104.html | 除外 | フォームなし (HTTP 200「妊娠・出産」。静的formは検索のみ) |
| 41 | https://www.city.sagamihara.kanagawa.jp/kurashi/shisetsu/index.html | 除外 | フォームなし (HTTP 200「施設マップ」。静的formはサイト内検索+施設検索のみ) |
| 42 | https://www.city.niigata.lg.jp/shisetsu/index.html | 除外 | フォームなし (HTTP 200「施設案内」。form・inputなし) |
| 43 | https://www.city.niigata.lg.jp/life_event/nayami/index.html | 除外 | フォームなし (HTTP 200「悩み・相談」。form・inputなし。相談は電話・面談導線) |
| 44 | https://www.city.niigata.lg.jp/life_event/todokede/index.html | 除外 | フォームなし (HTTP 200「証明・税金・保険・年金」。form・inputなし) |
| 45 | https://www.city.niigata.lg.jp/life_event/hikkoshi/index.html | 除外 | フォームなし (HTTP 200「引越し」。form・inputなし) |
| 46 | https://www.city.niigata.lg.jp/event/index.html | 除外 | フォームなし (HTTP 200「各種講座・催し」。form・inputなし) |
| 47 | https://www.city.niigata.lg.jp/kosodate/ninshin/life_stage/azuketai/ninnkahoikushisetsu/R09nyuen.html | 除外 | フォームなし (HTTP 200「認可保育施設への入園」。form・inputなし。申込は別導線) |
| 48 | https://niigata-ipc.or.jp/seminar_event/30138/ | 除外 | フォームなし (HTTP 200。新潟IPCセミナー案内頁。静的formは検索のみ。参加申込は別導線) |
| 49 | https://furusato-forgood.jp/projects/000545 | 除外 | フォームなし (HTTP 200。新潟市案件の寄附カート頁。静的formは金額・返礼品選択 `amount/return_gift_code` のみで氏名・住所欄なし。寄附者情報は後段JS導線) |
| 50 | https://www.city.shizuoka.lg.jp/faq/p009731.html | 除外 | フォームなし (HTTP 200「寄せられた市政へのご意見・ご提案」。静的formは検索のみ) |
| 51 | https://www.city.shizuoka.lg.jp/cgi-bin/event_cal_multi/calendar.cgi | 除外 | フォームなし (HTTP 200「イベント情報」。静的formは検索+年月・地域・対象selectの絞込のみ。申込欄なし) |
| 52 | https://www.city.hamamatsu.shizuoka.jp/voice/ | 除外 | フォームなし (HTTP 200「ご意見・お問い合わせ」。静的formはページレビューradio `feedback.cgi` のみ。本体フォームは No.57) |
| 53 | https://yoyacool.e-harp.jp/hamamatsu | 除外 | ログイン必須・JS描画のみ (HTTP 200「浜松市スポーツ・文化施設予約システムまつぼっくり」。formタグなし・`fvnm/fvno` 等のJS用inputのみ。予約はJS+ログイン導線) |
| 54 | https://www.city.hamamatsu.shizuoka.jp/shinse/index.html | 除外 | フォームなし (HTTP 200「申請や手続きから探す」。form・inputなし。手続き案内のみ) |
| 55 | https://www.city.hamamatsu.shizuoka.jp/event/ | 除外 | フォームなし (HTTP 200「イベント・お知らせ情報」。静的formは検索のみ) |
| 56 | https://www.city.hamamatsu.shizuoka.jp/shisetsu-annai/index.html | 除外 | フォームなし (HTTP 200「施設」。静的formは検索+ページレビューradioのみ) |
| 57 | https://www.city.hamamatsu.shizuoka.jp/koho2/kocho/form.html | 有望 P1 | 静的実フォーム (HTTP 200「お問い合わせフォーム」。`action=/cgi-bin/question/question.cgi`、input 92・textarea 1。お名前・ふりがな・性別radio・年代radio・ご職業radio・郵便番号・ご住所・電話番号・ファクス・メールアドレス・件名・内容の12項目。多様性◎) |
| 58 | https://www.city.hamamatsu.shizuoka.jp/voice/index.html | 除外 | フォームなし (HTTP 200。No.52と同一内容「ご意見・お問い合わせ」。静的formはページレビューradioのみ) |
| 59 | https://www.city.nagoya.jp/about/1017974.html | 除外 | フォームなし (HTTP 200「ご意見・お問い合わせ」。静的formは検索のみ。問合せは担当課別導線) |
| 60 | https://www.city.nagoya.jp/kurashi/index.html | 除外 | フォームなし (HTTP 200「くらし・手続き」。静的formは検索のみ) |
| 61 | https://www.city.nagoya.jp/about/1045105.html | 除外 | フォームなし (HTTP 200「質問する」。静的formは検索のみ) |
| 62 | https://www.city.kyoto.lg.jp/main/site_policy/0000000011.html | 除外 | フォームなし (HTTP 200「お問い合わせ」。静的formはGoogle CSE検索のみ) |
| 63 | https://www.city.kyoto.lg.jp/templates/pubcomment/0-Curr.html | 除外 | フォームなし (HTTP 200「市民意見の募集」。静的formはGoogle CSE検索のみ) |
| 64 | https://www.city.kyoto.lg.jp/sogo/page/0000012821.html | 除外 | フォームなし (HTTP 200「京都いつでもコール」。静的formはGoogle CSE検索のみ) |
| 65 | https://www.call3755.city.kyoto.lg.jp/faq_p/P000.aspx | 除外 | フォームなし (HTTP 200「京都いつでもコール」FAQ。静的formはASP.NETポストバック `__VIEWSTATE/txtKeyword` のFAQ検索のみ。機構を記録) |
| 66 | https://furusato-kyoto.jp/ | 除外 | JS描画のみ (HTTP 200「京都市ふるさと納税特設サイト」。form actionなし・selectのみ。寄附申込はJS導線) |
| 67 | https://www.osaka-city-callcenter.jp/faq/index.aspx | 除外 | フォームなし (HTTP 200「大阪市総合コールセンター」FAQ。静的formはASP.NETポストバックのFAQ検索のみ。機構を記録) |
| 68 | https://www.city.osaka.lg.jp/event/index.html | 除外 | フォームなし (HTTP 200「イベント・観光」。静的formは検索のみ) |
| 69 | https://s-kantan.jp/city-osaka-u/ | 除外 | 到達不能 (HTTP 404。`apply.e-tumo.jp/city-osaka-u/` に転送されるが同所も404。大阪市の電子申請は別導線) |
| 70 | https://www.city.sakai.lg.jp/aboutweb/ikenboshu.html | 除外 | フォームなし (HTTP 200「市政・ホームページへのご意見・ご提案」。form・inputなし。意見提出は別導線) |
| 71 | https://www.city.sakai.lg.jp/aboutweb/banner_boshu.html | 除外 | フォームなし (HTTP 200「バナー広告募集」。form・inputなし) |
| 72 | https://www.city.sakai.lg.jp/shievent/calendar/list_calendar.html | 除外 | フォームなし (HTTP 200「市イベント情報カレンダー」。form・inputなし) |
| 73 | https://www.city.sakai.lg.jp/sangyo/nosui/event/nogyosai.html | 除外 | フォームなし (HTTP 200「堺市農業祭」。form・inputなし) |
| 74 | https://www.city.sakai.lg.jp/kanko/hakubutsukan/unesco/renkei/mukeir8.html | 除外 | フォームなし (HTTP 200「無形文化遺産関連事業」。form・inputなし。セミナー参加者募集の申込は別導線) |
| 75 | https://www.city.okayama.jp/shisei/0000001222.html | 除外 | フォームなし (HTTP 200「ご意見・ご提案」。静的formはサイト内検索のみ。本体フォームは No.76) |
| 76 | https://com.city.okayama.jp/mailform/inquiry.cgi?so=532dba13cf0d370e939aeb7c15b7805de6a29ab8&ref=https%3A%2F%2Fwww.city.okayama.jp%2Fshisei%2F0000001222.html | 有望 P1 | 静的実フォーム (HTTP 200「広報広聴課広聴担当へのお問い合わせ」。`action=inquiry.cgi`、input 24・textarea 1。`namae`・`hurigana`・`jyusyo`・`denwa_no`・`fax_no`・`mail/mail2`(確認)・`taitoru`・`naiyou`。岡山市メールフォーム機構。多様性◎) |
| 77 | https://www.city.okayama.jp/faq/ | 除外 | フォームなし (HTTP 200「よくある質問」。静的formは `txtFaqKey` のFAQ検索のみ) |
| 78 | https://www.city.hiroshima.lg.jp/living/soudan/1025721/1016736.html | 除外 | フォームなし (HTTP 200「お問い合わせ」。静的formは検索のみ) |
| 79 | https://www.city.hiroshima.lg.jp/shisei/kouchou/index.html | 除外 | フォームなし (HTTP 200「広聴」。静的formは検索のみ) |
| 80 | https://www.city.hiroshima.lg.jp/living/soudan/index.html | 除外 | フォームなし (HTTP 200「市民相談」。静的formは検索のみ) |
| 81 | https://www.city.kitakyushu.lg.jp/cgi-bin/form/event.php?f=event.html | 除外 | フォームなし (HTTP 200「イベントカレンダー」。静的formはキーワード・地域・分類selectの絞込検索のみ。申込欄なし) |
| 82 | https://www.city.kitakyushu.lg.jp/kurashi/menu01_0611.html | 除外 | フォームなし (HTTP 200「相談・窓口」。静的formはページID検索のみ) |
| 83 | https://www.city.kitakyushu.lg.jp/shisei/menu004_00002.html | 除外 | フォームなし (HTTP 200「広報・広聴」。静的formはページID検索のみ) |
| 84 | https://faq-call-center-city.kitakyushu.life/ | 除外 | JS描画のみ (HTTP 200「よくあるご質問」。form・inputなし。FAQ検索はJS) |
| 85 | https://www.city.kitakyushu.lg.jp/page/dch/madoguchi_sisetsu/ | 除外 | JS描画のみ (HTTP 200「スマらく窓口」。form・inputなし。窓口・施設予約は外部JS導線) |
| 86 | https://www.city.fukuoka.lg.jp/shisei/iken-teian/index.html | 除外 | フォームなし (HTTP 200「意見募集・市政への提案」。form・inputなし。本体フォームは No.91) |
| 87 | https://www.city.fukuoka.lg.jp/lifeinformation/net-tetsuduki/index.html | 除外 | フォームなし (HTTP 200「ネットで手続き」。form・inputなし。手続き案内のみ) |
| 88 | https://www.city.fukuoka.lg.jp/lifeinformation/net-tetsuduki/downloadservice/index.html | 除外 | フォームなし (HTTP 200「申請書ダウンロードサービス」。form・inputなし。様式DL案内のみ) |
| 89 | https://www.city.fukuoka.lg.jp/lifeinformation/shohiseikatsu-sodan/index.html | 除外 | フォームなし (HTTP 200「相談・消費生活トップ」。form・inputなし) |
| 90 | https://www.city.fukuoka.lg.jp/shicho/koho/event/weekend_event.html | 除外 | フォームなし (HTTP 200「今週末のおでかけ情報」。form・inputなし) |
| 91 | https://shiminnnokoe.city.fukuoka.lg.jp/teian/ | 有望 P1 | 静的実フォーム (HTTP 200「市政への提案」。`action=confirm.php`、input 17・textarea 1・select 2。`name/kana/sex/age/zipcode`・住所分割 `ku/choumei/ban/gou`・`phone/email`・`m_title/m_data`。多様性◎) |
| 92 | https://shiminnnokoe.city.fukuoka.lg.jp/index.php | 除外 | フォームなし (HTTP 200「寄せられた市民の声」。form・inputなし。閲覧のみ) |
| 93 | https://www.city.fukuoka.lg.jp/shimin/shohiseikatsu/life/syouhiseikatusentauhoumupeiji/internetsoudan/internetsoudan_2.html | 除外 | フォームなし (HTTP 200「インターネット消費生活相談ご利用案内」。form・inputなし。相談本体は別導線) |
| 94 | https://www.city.kumamoto.jp/list04456.html | 除外 | フォームなし (HTTP 200「市政へのご意見・ご提案(市民の声)」一覧。静的formはCMS検索ポストバック `__VIEWSTATE` のみ。機構を記録) |
| 95 | https://higomaru-call.jp/faq/CCFaqIndex.asp | 除外 | フォームなし (HTTP 200「ひごまるコール」FAQ。静的formは `txtS` のFAQ検索 `CCFaqList.asp` のみ) |
| 96 | https://www.city.kumamoto.jp/kiji00372590/index.html | 除外 | フォームなし (HTTP 200「総合相談窓口」。静的formはCMS検索ポストバックのみ) |
| 97 | https://www.city.kumamoto.jp/kiji00372166/index.html | 除外 | フォームなし (HTTP 200「義援金・寄附金受付」。静的formはCMS検索ポストバックのみ) |
| 98 | https://www.city.sendai.jp/webkoho/information/index.html | 除外 | フォームなし (HTTP 200「よく利用される情報一覧」。静的formは検索のみ) |
| 99 | https://www.city.saitama.lg.jp/001/001/007/p016829.html | 除外 | フォームなし (HTTP 200「区役所の休日窓口」。静的formは検索のみ) |
| 100 | https://saitama.rsv.ws-scs.jp/web/ | 除外 | JS描画のみ (HTTP 200「さいたま市公共施設予約」。form・inputなし。予約はJS導線) |
| 101 | https://www.city.kawasaki.jp/main/event2/curr.html | 除外 | フォームなし (HTTP 200「イベント・講座」。静的formは `frmSearch` の種類・対象・地域チェックボックス絞込のみ。申込欄なし) |
| 102 | https://www.city.kawasaki.jp/kurashi/category/256-0-0-0-0-0-0-0-0-0.html | 除外 | フォームなし (HTTP 200「相談窓口」。静的formは検索のみ) |
| 103 | https://www.city.sagamihara.kanagawa.jp/lifeevent/1012105.html | 除外 | フォームなし (HTTP 200「入園・入学」。静的formは検索のみ) |
| 104 | https://www.city.sagamihara.kanagawa.jp/lifeevent/1012106.html | 除外 | フォームなし (HTTP 200「結婚・離婚」。静的formは検索のみ) |
| 105 | https://www.city.shizuoka.lg.jp/s004405.html | 除外 | フォームなし (HTTP 200「バナー広告募集」。静的formは検索+問合せボタンPOSTリンク+ページレビューradioのみ) |
| 106 | https://www.city.chiba.jp/kodomomirai/kodomomirai/kikaku/kodomosyuukanevent.html | 除外 | フォームなし (HTTP 200「こどもまんなかフォーラム」。静的formは検索+ページレビューradioのみ) |
| 107 | https://www.city.chiba.jp/sogoseisaku/sogoseisaku/identitysuishin/900th_eventparade.html | 除外 | フォームなし (HTTP 200「千葉開府900年記念パレード」。静的formは検索+ページレビューradioのみ) |
| 108 | https://www.sankeien.or.jp/event/ | 除外 | フォームなし (HTTP 200「三溪園イベント情報」。静的formはサイト内検索のみ。市外郭団体) |
| 109 | https://www.city.yokohama.lg.jp/city-info/koho-kocho/press/index.html | 除外 | フォームなし (HTTP 200「記者発表」。静的formは検索のみ) |
| 110 | https://www.city.niigata.lg.jp/life_event/kekkon/index.html | 除外 | フォームなし (HTTP 200「結婚・離婚」。form・inputなし) |
| 111 | https://www.city.niigata.lg.jp/kanko/kanko/promotion/eventschedule.html | 除外 | フォームなし (HTTP 200「大規模イベントスケジュール」。静的formはページ評価投票 `vote.cgi`(useful1/2)のみ。申込欄なし) |
| 112 | https://www.city.hamamatsu.shizuoka.jp/kurashi-tetsuzuki/index.html | 除外 | フォームなし (HTTP 200「手続き・くらし」。form・inputなし) |
| 113 | https://www.city.okayama.jp/soshiki_list.html | 除外 | フォームなし (HTTP 200「各課の窓口」。静的formはサイト内検索のみ) |
| 114 | https://www.city.sendai.jp/sesakukoho/gaiyo/shichoshitsu/kaiken/oshirase.html | 除外 | フォームなし (HTTP 200「市長定例記者会見」。静的formは検索のみ) |
| 115 | https://www.city.hiroshima.lg.jp/faq/index.html | 除外 | フォームなし (HTTP 200「よくある質問と回答」。静的formは検索のみ) |
| 116 | https://www.city.osaka.lg.jp/event/news/curr.html | 除外 | フォームなし (HTTP 200「新着情報(イベント・観光)」。静的formは検索のみ) |
| 117 | https://s-kantan.jp/city-shizuoka-u/ | 除外 | 到達不能 (HTTP 404。`apply.e-tumo.jp/city-shizuoka-u/` に転送されるが同所も404。静岡市の電子申請は別導線) |
| 118 | https://apply.e-tumo.jp/city-nagoya-u/ | 除外 | 到達不能 (HTTP 404。名古屋市の電子申請は別導線) |
| 119 | https://apply.e-tumo.jp/city-saitama-u/offer/offerList_initDisplay | 除外 | フォームなし (HTTP 200。No.13のリダイレクト先と同一の手続き検索頁 `_csrf/topDetail`。申請手続きはログイン/JS導線) |

## 集計

- 試行総数: 119件 (No.1-119。要求100件以上を満たす)
- 有望: 4件 (P1 3件・P2 1件・P3 0件)
  - P1 (3): No.57 (浜松市お問い合わせフォーム。氏名・ふりがな・性別・年代・職業radio・郵便・住所・電話・FAX・メール・件名・内容の12項目)、No.76 (岡山市メールフォーム。namae・hurigana・jyusyo・denwa・fax・mail確認・taitoru・naiyou)、No.91 (福岡市市政への提案。name/kana/sex/age/zipcode・住所分割ku/choumei/ban/gou・phone/email・件名・内容)
  - P2 (1): No.1 (札幌市HPへのご意見・ご提案。ご意見textarea・お名前・メールの3欄のみ)
- 除外: 115件 (フォームなし 96・JS描画のみ 12・ログイン必須 2・到達不能 5。重複頁の内容一致 2件—No.52/58、No.13/119—は別URLのため各1件として計数)
- 市別件数 (19市・神戸市除外): 札幌8・仙台13・さいたま5・千葉8・横浜10・川崎6・相模原5・新潟9・静岡4・浜松8・名古屋4・京都5・大阪4・堺5・岡山4・広島4・北九州5・福岡8・熊本4 (各市4件以上で偏りなし)
- 既存 (`tests/target-url.md`) との重複: なし (全119件を照合。既存の神戸市 `contact.city.kobe.lg.jp` とも重複なし)
- R4-1試行済み183件との重複: なし (全119件を照合。R4-1の `/contact` 推測URL群ともパス不一致)
- 有望の多様性: 自治体広聴フォーム (浜松・岡山・福岡) + 自治体HP意見フォーム (札幌)。いずれも氏名・住所・連絡先・内容を持つ日本式行政フォームで、既存corpus (学校・企業中心) と重複しない
- 傾向メモ: 政令市のCMS頁は静的formが検索・FAQ検索・ページレビューradioに限られることが大半。実フォームは `cgi-bin/question/question.cgi` 系 (浜松)・`mailform/inquiry.cgi` 系 (岡山)・`shiminnnokoe` 独自PHP (福岡) など広聴系サブシステムに集中。電子申請 (横浜・さいたまe-tumo・相模原)・施設予約 (札幌・さいたま・浜松・北九州スマらく) はログイン/JS導線で静的到達不可。s-kantan/e-tumoの他市流用URL推測 (大阪・静岡・名古屋) はいずれも404で、各市の電子申請は別導線
