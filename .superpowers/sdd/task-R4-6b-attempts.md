# Task R4-6b 試行ログ — 東京23区区立図書館の有望5件の取込

- 対象: brief 列挙の5件 (verbatim URL)。順序は推奨どおり葛飾→江東→荒川→板橋→新宿。
- 手順: 各URLを `make addurl URL=<url>` で1件ずつ取り込み (tests/target-url.md 登録・取得・雛形生成・テスト配線まで1コマンド)。中身は tests/corpus.ts の interface 経由。samples.test.ts への regex 直編集なし (tooling 配線のみ)。
- 方針: 最小再現まで削り、期待値は現行ルールの正直な出力で pin (honest pin)。分類ずれは直さず Concerns に記録。pin 更新なし。src/ 変更なし。1 fixture ごとに commit (Conventional Commits 日本語)。push なし。
- 並行タスク (R4-4b・R4-5b 他) が同一ブランチで作業中のため、commit には自分の成果物のみを含めた。共有ファイル (tests/corpus.ts・tests/integration/samples.test.ts・tests/target-url.md) は差分フィルタで自 hunk のみ stage し、競合が激しい板橋・新宿分は GIT_INDEX_FILE (private index) で commit した。詳細は report の「申送り」を参照。
- 荒川のみ `FIXTURE=arakawa-mailform.html` を指定した (素の `make addurl URL=...` だと葛飾と同じ `mailform.html` になり雛形を上書きするため。Makefile の文書化された option であり tooling 経由を維持)。

## No.1 葛飾 https://www.lib.city.katsushika.lg.jp/mailform → 成功

- tooling: `samples/mailform.html` (4 controls)。雛形は既に最小 (text 4 + radio/textarea/submit の skip comments)。人手の削減なし。
- 実ページ構成 (LiCS系 Eメールレファレンス): `txtName`(氏名)/`txtKana`(氏名ふりがな)/`txtMail`/`txtTel` + `radioReply` + `txtQtext`。R4-6a No.23 の記録と一致。
- pin (現行ルール出力):
  - `txtName`: `山田 太郎` (fullName)
  - `txtKana`: `やまだ たろう` (「ふりがな」label のため hiragana 結合値。honest pin)
  - `txtMail`: `yamada@example.com`
  - `txtTel`: `090-1234-5678` (dashed)
- commit: `b42d178178b8af3029eceaf07860b634f1814952`

## No.2 江東 https://www.koto-lib.tokyo.jp/viewer/opinion.html → 成功 (削減あり)

- tooling: `samples/opinion-html.html` (10 controls)。header/footer のサイト内検索 form (`T_Keyword`×2・`T_File` radio・`T_*` hidden・`B_Search`) と login form (`login` text・`password`) が混入していた。
- 実ページ確認 (curl): 4 form あり (`search-1`・`opinion-input`・`search-2`・`login`)。`opinion-input` のみ残し、検索・login 系は別 form のため trimmed。tel 欄は `title` 属性 (市外局番/市内局番/加入者番号) を持つが scaffold が落としていたためそのまま (最小再現。分類に影響なし)。
- pin:
  - `item0`: `山田 太郎`、`item1`: `東京都千代田区千代田1-1 千代田ビル101` (「住所」単独 label のため full address 結合値)、`item3`: `yamada@example.com`
  - `item2_0/1/2` (電話番号 3-split): 未分類のまま pin。`for="item2"` の label 結合は `item2_0` (id=item2) のみで、_1/_2 に信号なし。tel-split-by-name 候補 (kobe ANSWER6 と同型。Concerns C-R4-6b-1)。
  - `item4` (件名): profile 値なしのため正しく未 fill。
- commit: `7524854774091189714dc1b2d7b778d1b13e23a6`

## No.3 荒川 https://www.library.city.arakawa.tokyo.jp/mailform → 成功

- tooling: `make addurl URL=... FIXTURE=arakawa-mailform.html` → `samples/arakawa-mailform.html` (4 controls)。雛形は既に最小のため削減なし。
- 実ページ構成 (LiCS系): `textName`(お名前)/`textAddress`(ご住所)/`textMail`/`textTel` + `groupKind`/`groupReply` radio + `textMessage`。R4-6a No.20 の記録と一致。
- pin: `textName`=`山田 太郎`、`textAddress`=`東京都千代田区千代田1-1 千代田ビル101` (full address 結合値)、`textMail`=`yamada@example.com`、`textTel`=`090-1234-5678`。4欄すべて fill。
- commit: `c046c5a1913d3d8871d3409f3c5d3b7b570e8079`

## No.4 板橋 https://www.city.itabashi.tokyo.jp/cgi-crm/CRM030/CRM030_004/G7507000000/2000033 → 成功 (削減あり・分類ずれあり)

- tooling: `samples/2000033.html` (3 controls)。header の Google CSE 検索 field (`q`・`cx`・`ie`) が混入していた。
- 実ページ確認 (curl): 2 form (`cse-search-box` と `method=post` の CRM 本体)。検索系を trimmed。label は数値文字参照 (`&#x30E1;...`) だったため可読名 (メールアドレス/確認用メールアドレス 必須) に復号した (DOM textContent は等価のため分類不変)。
- pin (honest pin。分類ずれ):
  - `MailAddress` / `MailAddressKakunin` (いずれも type=text): email に解決せず、full-address 値 `東京都千代田区千代田1-1 千代田ビル101` が fill される。label は明確にメールアドレスだが type=text + 英字 name では email 語彙に載らない。email-via-label 候補 (kobe ANSWER3 の未分類より強いずれ。Concerns C-R4-6b-2)。
  - 後続ステップ (確認画面→本登録) は本タスクの範囲外。brief の「難しい場合は無理せず」は入口 form の取込自体が可能だったため適用せず。
- commit: `b546ce0682f0dc1ecf31c9681a72b730f7accf72`

## No.5 新宿 https://www.city.shinjuku.lg.jp/soshiki/tosyo_00001.html → 成功 (thin・0欄fill)

- tooling: `samples/tosyo-00001-html.html` (0 controls)。雛形は survey form のみで最小のため削減なし。
- 実ページ確認 (curl): 中央図書館案内ページ末尾のページ評価ミニ survey (`action=/fb/fb.php`)。`q2`「役に立ちましたか」/`q3`「見つけやすかったですか」各3択 radio + hidden 群のみで、text/email/tel 系入力欄なし。性別・年代群に該当しないため radio は skip のまま。
- pin: `expected: {}` (richell-anketo-rating.html と同型の thin fixture)。LEDGER excluded に設問文脈を記録した。
- brief の「難しい場合は無理せず」は、入口の取込・配線・緑化が成立したため失敗扱いとせず成功に計上した (fill 対象がないこと自体を honest pin)。
- commit: `9101e9dbeed4dff985a899899860f0c72ceeb535`

## 集計

- 成功 5件 / 失敗 0件。失敗分の target-url.md 追記なし (tooling が成功分のみ書く)。
- 検証: `npx vitest run tests/integration/samples.test.ts` 全76緑 (本タスク5件含む)、`make addurl-check` ゼロ。
- src/ 変更なし。pin 更新なし。push なし。

(End of file)
