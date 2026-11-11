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
