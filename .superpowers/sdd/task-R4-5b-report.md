# Task R4-5b フルレポート — PBI-208 Round4 政令指定都市の有望4件の取込結果

- ブランチ: `work/pbi-208-round4`
- 対象: brief 列挙の有望4件 (verbatim URL)。P1 3件 (浜松・岡山・福岡) + P2 1件 (札幌)。
- 結果: 成功 4件 / 失敗 0件。
- 検証: 自分の commit ツリー (43e2f4b) を別 worktree に checkout し、`npx vitest run tests/integration/samples.test.ts` 全69緑、`node scripts/sync-target-urls.mjs --check` ゼロ、`npx tsc --noEmit` clean (worktree は検証後に除去)。
- src/ 変更なし。pin 更新 (tests/eval/corpus.eval.ts) なし (集約タスクに委譲)。`make eval` REDは想定内。
- samples.test.ts は tooling 配線のみ (直編集なし)。
- push なし (brief どおり)。

## 成功分 (4 fixture・4 commits)

| # | URL (brief No.) | fixture | commits (full SHA) |
|---|-----------------|---------|--------------------|
| 1 | 浜松市お問い合わせフォーム | hamamatsu-kocho-form.html (8 controls・6欄fill) | 1740880870c2ca14aef618a8997e525b963ae4cb |
| 2 | 岡山市メールフォーム inquiry.cgi | okayama-inquiry-form.html (12 controls・6欄fill。内4欄は q 検索) | c33148706b3203f2311f81661387e2bc31d1fd3a |
| 3 | 福岡市市政への提案 | fukuoka-teian-form.html (10 controls・8欄fill) | b4502ccde5781249c31c62a731990f024d606dd1 |
| 4 | 札幌市HPご意見・ご提案 | sapporo-iken-form.html (3 controls・2欄fill) | 43e2f4beb99971ad9e54e4cf56708dd10cba004b |

## 失敗分 (0件)

- なし。brief の4 URL はいずれも静的取得可能で、最小再現まで削って honest pin した。

## 取込時の修正 (tooling 出力に対する人手の最小修正)

詳細は `.superpowers/sdd/task-R4-5b-attempts.md` の「取込時の修正」9項を参照。
要点: header コメント付与 (全件)、tr/th 復元の要否の実証判定 (hamamatsu は bare と tr/th で pin 一致のため bare を採用)、hidden shim skip の集約、radio 群の drop (legend 選択肢 + coded 名で未分類。mitsui-reform 前例)、サイト内検索欄の保持 (forum 前例)、fukuoka ku/age の実選択肢復元 (kobe 前例。―― は U+2015 ×2)、fukuoka tr/th 行復元 (auhikari 前例)、phantom control (HTMLコメント内) の除去 (新規の落とし穴)、半角スペース pin のバイト等価確認。

## Concerns (分類ずれ・将来PBI候補。直さず honest pin)

R4-2a の C1–C10 / R4-2b の N1–N7 の番号は引き継がず、本タスクの観察を列挙する (重なるものは前例を注記)。

- F1 ファクス語彙の穴 (R4-2a C2 系の新証拠): hamamatsu `item_9` (9.ファクス)、okayama `fax_no` (ファクス番号) が未分類のまま。一方 ff-csr `fax` (name=fax + type=tel) は tel 値を fill。カタカナ「ファクス」label だけでは解決せず、name/type 信号との非対称がある。fax 語彙候補。
- F2 email の label/placeholder 非対称 (R4-2a C4 の両面証拠): hamamatsu `item_10`・okayama `mail/mail2`・sapporo `item_3` (いずれも type=text + メールアドレス label) は解決する一方、otsuka `mail`・kobe ANSWER3 (email placeholder) は未解決のまま。label 信号は効き、placeholder 信号は効かない。email-via-placeholder 候補。
- F3 dash 付与の非対称 (R4-2b N4 系の新証拠): hamamatsu `item_8` (bare 数値名) は undashed `09012345678` に対し、okayama `denwa_no`・fukuoka `phone` (denwa/phone 名) は dashed。zip も hamamatsu `item_6` は dashed `100-0001` だが fukuoka `zipcode` は maxlength=7 のため undashed `1000001` (maxlength 考慮の整形は動作)。dash 判定条件の整理は将来PBIで。
- F4 radio 群は tr>th を読まない (新規): `scanRadioGroups` の nearby は '' 固定のため、hamamatsu `item_3/4/5` の th 見出し (3.性別/4.年代/5.ご職業) が group に届かず、fieldset legend の bare な「選択肢」+ coded 名で未分類のまま。text 系と同様に th を読めば性別/年代が解決する可能性があり、radio-nearby 候補。
- F5 区 select の未分類 (R4-2a C5 系): fukuoka `ku` (――/中央区/…/不明 実選択肢) が未分類のまま、`choumei` が都道府県付き連結 (`東京都千代田区千代田1-1`) を fill。kobe ANSWER4・epson c_q6 と同形。prefecture/ward-select 語彙候補。
- F6 thin fixture (R4-2a C9 系): sapporo は2欄fill (P2 どおり)。corpus の多様性 (自治体広聴フォーム) には寄与するが指標への寄与は小さい。
- F7 scaffold が HTML コメント内 control を拾う (新規・tooling 改善候補): fukuoka の choume/ban/gou・sex radio は実ページでコメントアウト済みだが、抽出正規表現がコメント内まで拾い、tooling が live でない control を足す。現状は人手 trim で除去したが、抽出前のコメント除去が tooling 候補。
- 参考 (concern ではない): hamamatsu `item_11`・okayama `taitoru`・fukuoka `m_title` (件名) は profile 値なしのため正しく未注入。

## 並行タスクとの分離 (同一ブランチ上の R4-4a・R4-6a)

- 作業中、R4-4a (docs)・R4-6a (corpus: tokyo-steel / taiheiyo / lixil / advantest / ngk / 日本ガイシ / kubota / mailform…) が同一ブランチに頻繁に commit していた。tests/corpus.ts・samples.test.ts・tests/target-url.md に彼らの未 commit hunk が混在する状態での commit が2回発生した (fukuoka・sapporo)。
- 対処: `git add` のファイル単位指定では彼らの hunk を巻き込むため、fresh な `git diff HEAD` から自分の hunk のみを抽出した patch を作り、GNU patch で HEAD スナップショットに当て、`git hash-object -w` + `git update-index --cacheinfo` で index を再構成してから commit した。commit 直前に `git rev-parse HEAD` がスナップショット時と同一であることを確認し、HEAD 移動時は作り直す手順とした。
- 結果: 自分の4 commits はいずれも自分の4ファイルのみを含み、追加のみ・削除なし (`git show --stat` で確認)。他タスクの未 commit 作業 (lixil・kubota・mailform の hunk、AGENTS.md の2行) は worktree に残したまま一切触っていない。
- 注意: 本作業ツリーでの `make addurl-check` は並行 R4-6a の作業中 placeholder (15件) のため非ゼロ。自分の4件分はゼロであることを個別に計数済み。全体ゼロの確認は R4-6a の完了後に集約タスクで行うこと。

## 申送り (集約タスクへ)

- `make eval` 全体 RED は想定内 (pin 未更新 4件分: hamamatsu 6欄・okayama 6欄・fukuoka 8欄・sapporo 2欄)。
- 上記 F1–F7 の語彙/判定/tooling 候補は src 変更を伴うため本タスクでは未着手。
- `.superpowers/sdd/task-R4-5b-attempts.md` に4件の取込ログあり。

(End of file)
