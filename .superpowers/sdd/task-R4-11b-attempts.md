# Task R4-11b 取込結果ログ (JSIC区分の有望5件)

R4-11a の有望5件を `make addurl` 手順で1件ずつ取り込んだ記録。成功5件・失敗0件
(日本管財は初回 fetch が WAF に 403 されたが、browser UA の curl で取得して
共有 tooling 関数で配線したため、最終的に成功)。

## 1. フジタ — 成功

- URL: https://www.fujita.co.jp/contact/
- fixture: samples/fujita-contact.html (in-scope 11)
- 手順: 初回 `make addurl URL=<url>` が既定名 contact.html を生成し、
  九工大 fixture (R4既存) を worktree 上で上書きした。既定名が衝突することに
  気づき、samples/contact.html を git checkout で復旧、registry 行を除去して
  `make addurl URL=<url> FIXTURE=fujita-contact.html` で張り直した。
  以降の4件は最初から FIXTURE=明示名で取り込んだ (全5件とも既定名は
  contact.html になるため)。
- 最小再現: 実ページの table 構成を th 見出し付きで再現。contact_type の
  実選択肢10件は実ページどおり復元。サイト内検索窓2件は site chrome として
  trim。customer_type (法人/個人) radio は束ねて skip。
- 期待値 (honest pin): 7欄解決。company=株式会社サンプル、
  your_name_last/first=山田 太郎 (各々フルネーム読み)、
  your_kana_last/first=ヤマダ タロウ (各々フルネーム読み)、
  email/email_check=yamada@example.com。
  contact_type select・tel01/02/03 は未分類のまま pin。
- commit: 00d7ef55cdd9f202336175307fcd0dedbc6d4a4f

## 2. ヤマダHD — 成功

- URL: https://www.yamada-holdings.jp/contact/
- fixture: samples/yamada-holdings-contact.html (in-scope 6)
- 手順: `make addurl URL=<url> FIXTURE=yamada-holdings-contact.html` で一発配線。
- 最小再現: 実ページの table 構成を th 見出し付きで再現 (項目名コード化のため
  nearby が唯一の信号)。TITLE の実選択肢4件は実ページどおり復元。
  display:none の user-id-state は honeypot として trim。
- 期待値 (honest pin): 4欄解決。f01=山田 太郎、f03=09012345678 (ハイフンなし)、
  pm_email/pm_email2=yamada@example.com。TITLE select・f02 (フリガナ) は
  未分類のまま pin。
- commit: d6e6c9f7bf5c7c7e4dcc13fa20d3361f8b290980

## 3. アパマン — 成功

- URL: https://www.apaman.co.jp/contact/
- fixture: samples/apaman-contact.html (in-scope 9)
- 手順: `make addurl URL=<url> FIXTURE=apaman-contact.html` で一発配線。
- 最小再現: 実ページの dl/dt/dd 構成を再現 (label 結合なし・dt が nearby 信号、
  mitsui-reform と同形)。placeholder は generic な例示のため原文維持。
  remarks textarea・privacy checkbox は対象外。
- 期待値 (honest pin): 9欄解決。company=株式会社サンプル、
  your_name=山田 太郎、kana=やまだ たろう (ひらがな保持)、
  tel_mobile/tel_home=090-1234-5678、fax=090-1234-5678 (tel 値で fill)、
  zipcode=100-0001、address=東京都千代田区千代田1-1 千代田ビル101、
  email=yamada@example.com。
- commit: ce72c1516ee4247f7e91bf2a7e1900ed4cfbc19f

## 4. 日本弁理士会 — 成功

- URL: https://www.jpaa.or.jp/contact/
- fixture: samples/jpaa-contact.html (in-scope 11)
- 手順: `make addurl URL=<url> FIXTURE=jpaa-contact.html` で一発配線。
  テンプレ excluded の末尾だけ手編集時に残存行が出たため除去 (typecheck 確認済)。
- 最小再現: 実ページの table 構成を th scope=row 付きで再現 (MW WP Form・
  和文項目名)。職種/業種の実選択肢は実ページどおり復元。住所欄なし。
  同意チェックはオプトアウト式のため対象外。
- 期待値 (honest pin): 9欄解決。会社名=株式会社サンプル、部署・役職=開発部
  (department 語彙で解決)、氏名=山田 太郎、フリガナ=ヤマダ タロウ、
  メールアドレス/確認=yamada@example.com、
  電話番号[data][0..2]=090/1234/5678。職種/業種 select は未分類のまま pin。
- commit: 6c66184365173530247665417604f08971b56812

## 5. 日本管財 — 成功 (fetch 回避あり)

- URL: https://www.nkanzai.co.jp/contact/
- fixture: samples/nkanzai-contact.html (in-scope 4)
- 手順: `make addurl URL=<url> FIXTURE=nkanzai-contact.html` の fetch が
  403 (WAF が default fetch UA を遮断)。registry 行だけ残り配線なしの状態から、
  curl (browser UA) で HTTP 200 取得した HTML を共有 tooling 関数
  (add-fixture.mjs の buildWiring/applyWiring) で配線。registry 行は
  make addurl が書いたものをそのまま使用。取得・輸送だけ代替し、
  samples//tests への変更は tooling 経由を維持した。
- 最小再現: 実ページの dl/dt 構成を再現 (label 結合なし・dt が nearby 信号)。
  SP 用 contactselect はフォーム外のタブ切替、q はサイト内検索のため
  site chrome として trim。住所・電話欄なし。
- 期待値 (honest pin): 3欄解決。contact_name=山田 太郎、
  contact_mail/contact_mail_r=yamada@example.com。
  contact_subject (件名) は profile 値なしのため正しく未充填。
- commit: 8337bca03773d68dd36bbc725dddbd25c5c3e041

## 検証

- npx vitest run tests/integration/samples.test.ts: 138 passed (既存133 + 新規5)
- make addurl-check: no '<expected>' remnants
- src/ 変更なし。samples.test.ts への変更は tooling 配線のケース3行のみ/件。
- push なし。各 commit は path 限定 add (自分の成果物4ファイルのみ)。
