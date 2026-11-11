# Task R4-5a フルレポート — 政令指定都市20市 候補119 URLリスト

- ブランチ: `work/pbi-208-round4` (開始前に `git status` で確認。並行タスク R4-4a の作業ファイル `AGENTS.md` 等には一切触れず、commit は `git add -f .superpowers/sdd/task-R4-5a-*` のpath限定のみ)
- 対象: 政令指定都市20市から神戸市 (取込済み) を除く19市
- 期間: 2026-11-12 (JST)

## 結果サマリ

- 候補総数: 119件 (要求100件以上を満たす。No.1-119)
- 有望: 4件 (P1 3件・P2 1件・P3 0件)
  - P1 No.57 浜松市お問い合わせフォーム (`koho2/kocho/form.html`。`question.cgi` 機構。氏名・ふりがな・性別・年代・職業radio・郵便・住所・電話・FAX・メール・件名・内容の12項目)
  - P1 No.76 岡山市メールフォーム (`com.city.okayama.jp/mailform/inquiry.cgi`。`namae/hurigana/jyusyo/denwa_no/fax_no/mail確認/taitoru/naiyou`)
  - P1 No.91 福岡市市政への提案 (`shiminnnokoe.city.fukuoka.lg.jp/teian/`。独自PHP `confirm.php`。氏名・カナ・性別・年代・郵便・住所分割・電話・メール・件名・内容)
  - P2 No.1 札幌市HPへのご意見・ご提案 (`city/iken-hp/index.html`。ご意見textarea・お名前・メールの3欄のみ)
- 除外: 115件 (フォームなし 96・JS描画のみ 12・ログイン必須 2・到達不能 5)
- 重複: `tests/target-url.md` との重複なし・R4-1の183件との重複なし (スクリプトで全件照合済み)。ファイル内重複なし
- 市別件数: 札幌8・仙台13・さいたま5・千葉8・横浜10・川崎6・相模原5・新潟9・静岡4・浜松8・名古屋4・京都5・大阪4・堺5・岡山4・広島4・北九州5・福岡8・熊本4 (各市4件以上)
- `tests/target-url.md` への登録: なし (R4-5b以降が `make addurl` で登録)
- src/・samples/・tests/ の変更: なし

## 進め方

1. 各市トップ頁からフォーム系キーワード (`form/toiawase/contact/shinsei/yoyaku/moushikomi/apply/kocho/iken/pubcomment/event/koza/shisetsu` 等) を含むリンクを抽出して候補化。リンクの薄い市 (名古屋・川崎・静岡・岡山・熊本・京都・大阪・堺・広島・北九州・さいたま・浜松) はアンカーテキスト (`問|申|募|聴|声|相談|予約|意見|提案|申請|受付|窓口` 等) による第2ラウンド発掘を実施
2. 各候補を `curl -sL --max-time 25` + Chrome UA で取得し、HTTPコード・form/input/textarea/select計数・action・input名で判定。有望級はフォーム内欄を個別ダンプして確認 (札幌・浜松・岡山・福岡)
3. `.superpowers/sdd/task-R4-5a-attempts.md` に20件ごとに追記してpath限定commit (計6コミット)。pushなし

## 所見 (R4-5b以降への引き継ぎ)

- 実フォームは広聴系サブシステムに集中: `cgi-bin/question/question.cgi` (浜松・札幌も同系だが札幌は3欄のみ)・`com.city.okayama.jp/mailform/inquiry.cgi` (岡山)・`shiminnnokoe` 独自PHP (福岡)。R4-5bの取込はこの3×P1から着手を推奨
- CMS本体頁の静的formはほぼ検索・FAQ検索 (ASP.NET `__VIEWSTATE` ポストバック: 京都・大阪コールセンター)・ページレビューradio (`feedback.cgi`: 千葉・浜松)・ページ評価投票 (`vote.cgi`: 新潟) に限られ、取込対象にならない
- 電子申請・施設予約は静的到達不可が確定: 横浜電子申請 (ログイン)・さいたまe-tumo (手続き検索のみ)・相模原わたしの手続案内 (JS)・さいたま/浜松/北九州の施設予約 (JS+ログイン)・川崎粗大ごみ (Struts系セッション遷移)。s-kantan/e-tumoの他市URL推測 (大阪・静岡・名古屋) は404
- 自治体Struts/ASP/CMSポストバック系の機構メモは attempts ログの各行に記録済み

## concerns

- 有望が4件/119件と低率。政令市公式サイトの静的フォーム到達性が構造的に低い (実フォームが広聴サブシステムに集約され、申請・予約系はログイン/JS必須) ため。R4-5bの取込量確保には、本タスク範囲外 (区役所・市立施設・外郭団体の個別フォーム) の追加発掘が必要になる可能性がある
- No.52/58 (浜松voice系)・No.13/119 (さいたまe-tumo) は内容一致の別URL。重複計上を避けるため集計で注記済み。URL正規化の重複判定は完全一致のみで行った

## commits

- `34fed7e82c3c6adebb635e7f211d06bf6c938c79` docs(sdd): R4-5a 試行ログ No.1-20 (札幌・仙台・さいたま・千葉)
- `19e36064425a94b41c23d3b11f5ac4d3b0351dc4` docs(sdd): R4-5a 試行ログ No.21-40 (札幌・仙台・横浜・川崎・相模原)
- `9cbb5e282ce99e17d4fc21bd82f3dc458580c883` docs(sdd): R4-5a 試行ログ No.41-60 (相模原・新潟・静岡・浜松・名古屋)
- `77cc864f16033a47c9f40c8ce22b89e62ad29ab3` docs(sdd): R4-5a 試行ログ No.61-80 (名古屋・京都・大阪・堺・岡山・広島)
- `a1e6216e352468a248252c54ca55e047a57dcee1` docs(sdd): R4-5a 試行ログ No.81-100 (北九州・福岡・熊本・仙台・さいたま)
- `93a0b3800818222cdc3f3fd51dedb7e6e8f9bcd2` docs(sdd): R4-5a 試行ログ No.101-119 と集計 (119件・有望4件)

## status

DONE_WITH_CONCERNS (候補119件・有望4件・重複ゼロ。要件は満たすが有望率が低く、R4-5bの取込量確保には範囲外の追加発掘が必要になり得る)
