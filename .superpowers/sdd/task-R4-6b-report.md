# Task R4-6b フルレポート — 東京23区区立図書館の有望5件の取込結果

- ブランチ: `work/pbi-208-round4`
- 対象: brief 列挙の5件 (verbatim URL)。R4-6a の有望5件 (P1 3・P2 1・P3 1) の取込。
- 結果: 成功 5件 / 失敗 0件。
- 検証: `npx vitest run tests/integration/samples.test.ts` 全76緑 (本タスク5件含む)、`make addurl-check` ゼロ、`npx tsc --noEmit` は本タスク範囲では未実行 (src/ 無変更のため。最終 check は集約側に委譲)。
- src/ 変更なし。pin 更新 (tests/eval/corpus.eval.ts) なし (後の集約タスクに委譲)。samples.test.ts は tooling 配線のみ (regex 直編集なし)。push なし (brief どおり)。

## 成功分 (5 fixture・5 commits)

| # | URL (brief No.) | fixture | controls | commit (full SHA) |
|---|-----------------|---------|----------|-------------------|
| 1 | 葛飾 mailform | mailform.html | 4 (氏名/ふりがな/mail/tel) | b42d178178b8af3029eceaf07860b634f1814952 |
| 2 | 江東 opinion.html | opinion-html.html | 7→in-scope 3 (氏名/住所/mail。tel 3-split 未分類・件名未 fill) | 7524854774091189714dc1b2d7b778d1b13e23a6 |
| 3 | 荒川 mailform | arakawa-mailform.html | 4 (氏名/住所/mail/tel 全 fill) | c046c5a1913d3d8871d3409f3c5d3b7b570e8079 |
| 4 | 板橋 CRM 2000033 | 2000033.html | 2 (MailAddress 確認2欄。email 未解決・full-address 値で pin) | b546ce0682f0dc1ecf31c9681a72b730f7accf72 |
| 5 | 新宿 fb | tosyo-00001-html.html | 0 (radio のみ。expected {} の thin fixture) | 9101e9dbeed4dff985a899899860f0c72ceeb535 |

## 失敗分 (0件)

- なし。brief が注意していた板橋 (No.4)・新宿 (No.5) はいずれも入口 form の取込・最小再現・緑化が成立したため成功に計上した。板橋の後続ステップ (確認画面→本登録)・新宿の CMS ゲートウェイ後続は本タスクの範囲外 (試行ログに記録済み)。

## 取込時の修正 (tooling 出力に対する人手の最小修正)

- No.2 江東: header/footer 検索 form と login form を trimmed (curl で4 form の境界を確認)。tel の `title` 属性は scaffold が落としていたため復元せず (分類不変)。
- No.3 荒川: 削減なし。ただし `FIXTURE=arakawa-mailform.html` を指定した (素の addurl では葛飾と同名 `mailform.html` になり上書き衝突するため。Makefile 文書化の option)。
- No.4 板橋: header 検索 field (`q`・`cx`・`ie`) を trimmed (curl で2 form の境界を確認)。数値文字参照の label を可読名に復号 (DOM 等価)。
- No.5 新宿: 削減なし (0 controls の survey form そのまま)。
- No.1 葛飾: 削減なし (雛形が既に最小)。

## Concerns (分類ずれ・将来PBI候補。直さず honest pin)

- C-R4-6b-1 江東 `item2_0/1/2` 電話番号 3-split の未分類: `for="item2"` は `item2_0` にしか結合せず _1/_2 に信号なし。kobe ANSWER6・benesse `q01005001/2/3` と同型の tel-split-by-name 候補。
- C-R4-6b-2 板橋 `MailAddress`/`MailAddressKakunin` の誤分類: type=text + 英字 name では label「メールアドレス」が読まれず full-address 値が fill される (未分類ではなく誤 fill のため kobe ANSWER3 より強いずれ)。email-via-label 候補。
- C-R4-6b-3 汎用 `mailform` 系 fixture 名: 葛飾と荒川がともに `/mailform` パスのため tooling 既定名が衝突する。今回は FIXTURE= で回避したが、同系 LiCS 館の追加取込時は命名規約の申送りが必要。
- C-R4-6b-4 thin fixture 2種の指標寄与: No.4 (2欄・誤 pin)・No.5 (0欄) は corpus の多様性には寄与するが `make eval` 指標への寄与は小さい/歪み (R4-2b の C9 と同旨。pin 未更新のため eval RED は想定内)。

## 申送り

- `make eval` 全体 RED は想定内 (pin 未更新5件分。本タスクでは更新しない)。
- 上記 C-R4-6b-1〜C-R4-6b-4 の語彙/判定候補は src 変更を伴うため本タスクでは未着手。
- 同一ブランチ並行タスクとの干渉回避のため、本タスクの No.4・No.5 は GIT_INDEX_FILE (private index) で commit した。共有 index の stage 状態には触れていない (作業後に `git status` で自ファイルの混入がないことを確認)。並行タスク側の stage/untracked ファイル (azbil・advantest・AGENTS.md 等) は一切 commit に含めていない。
- `.superpowers/sdd/task-R4-6b-attempts.md` に5件の取込ログあり。

(End of file)
