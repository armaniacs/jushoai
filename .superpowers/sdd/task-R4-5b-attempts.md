# Task R4-5b 試行ログ — 政令指定都市の有望4件の取込結果

- 対象: brief 列挙の有望4件 (brief の URL を verbatim で使用)。P1 3件 + P2 1件。
- 手順: `make addurl URL=<url> FIXTURE=<name>` で1件ずつ取込 → 最小再現まで削る (実ページ取得で見出し・選択肢・コメントアウトを照合) → LEDGER 期待値を honest pin で埋める → vitest 緑 → 1 fixture ごとに commit。
- src/ 変更なし。pin 更新 (tests/eval/corpus.eval.ts) なし。samples.test.ts は tooling 配線のみ (直編集なし)。
- 取得失敗 0件。4件すべて取込成功。
- 同一ブランチ上で R4-4a / R4-6a が並行実行中だったため、commit は自分の成果物のみを含むよう hunks 単位で stage した (詳細は report の「並行タスクとの分離」を参照)。

## 取込結果

| # | URL (brief No.) | 結果 | fixture名 or 失敗理由 |
|---|-----------------|------|------------------------|
| 1 | https://www.city.hamamatsu.shizuoka.jp/koho2/kocho/form.html | 成功 | hamamatsu-kocho-form.html (8 controls。honest pin: 6欄fill。氏名/ふりがな/郵便番号 dashed/住所連結/tel undashed/email。ファクス・件名は未分類) |
| 2 | https://com.city.okayama.jp/mailform/inquiry.cgi?so=532dba13cf0d370e939aeb7c15b7805de6a29ab8&ref=https%3A%2F%2Fwww.city.okayama.jp%2Fshisei%2F0000001222.html | 成功 | okayama-inquiry-form.html (12 controls。内4欄は q サイト内検索。honest pin: 6欄fill。denwa_no は dashed、fax_no・taitoru は未分類) |
| 3 | https://shiminnnokoe.city.fukuoka.lg.jp/teian/ | 成功 | fukuoka-teian-form.html (10 controls。honest pin: 8欄fill。ku select・m_title は未分類。choume/ban/gou と sex radio は実ページで HTML コメント化されており phantom として drop) |
| 4 | https://www.city.sapporo.jp/city/iken-hp/index.html | 成功 | sapporo-iken-form.html (3 controls。内1欄は q サイト内検索。honest pin: 2欄fill。thin fixture) |

## 取込時の修正 (tooling 出力に対する人手の最小修正)

1. fixture header コメントの付与: 全4件 (実ページとの対応・復元内容を記録。R4-2a/b 流儀)。
2. tr/th 行構造の復元の要否判定 (hamamatsu): 実ページは table tr>th 見出し + th 内 memo span (（全角）/（半角数字）/…) だが、tr/th/td 変種と bare label 変種で pin が完全一致することを vitest で確認したため、最小再現として bare label を採用。memo は分類に影響しない。
3. hidden shim の skip コメント集約 (hamamatsu/sapporo): 実ページの question.cgi 系は項目ごとに label_*/nes_*/desc_mail_*/mail_*/reply_mail_* の hidden shim を持ち、tooling が90行近い skip を出す。fixture では family 単位に集約 (LEDGER excluded は tooling の個別行を維持)。
4. radio 群の扱い (hamamatsu): item_3 (性別) / item_4 (年代) / item_5 (ご職業) は fieldset の legend が bare な「選択肢」で名も coded (item_N) のため unclassified のまま。mitsui-reform 前例どおり fixture からは drop し skip コメントのみ残す。
5. サイト内検索欄の保持 (okayama/sapporo): q ×4 (検索キーワード/記事ID検索) / q ×1 (検索)。forum.html s・mitsuihome kw 前例どおり fixture に残して unclassified のまま pin。
6. select 実選択肢の復元 (fukuoka): scaffolder は select を `--` に落とすため、ku (――/中央区/博多区/…/不明) と age (――/10歳未満/…/80代以上/不明) を実ページから verbatim で復元 (kobe 居住区・epson 都道府県前例)。―― は U+2015 ×2 (実ページどおり)。
7. tr/th 行構造の復元 (fukuoka): 実ページは全欄 table th 見出しで label association なしのため、auhikari 前例どおり最小 tr/th/td 行で復元。td 内の補足 span (記入例・（必須）注記等) は scanner が読まない (nearbyOf は th のみ) ため drop。
8. phantom control の除去 (fukuoka): choume/ban/gou の3分割 input と sex radio ×2 は実ページで HTML コメントアウトされており、scaffold の正規表現がコメント内まで拾ったもの。live DOM には存在しないため fixture・LEDGER ともに drop (live の sex は hidden shim のみ)。R4-2a/b にない新規の落とし穴として report に記録。
9. U+3000 の扱い: hamamatsu item_2 (やまだ たろう)・okayama hurigana・fukuoka kana・sapporo はいずれも placeholder 空で既定半角スペース pin (forum.html 系。kobe U+3000 とは別物)。vitest 緑でバイト等価を確認。

## 検証

- 自分の commit ツリー (43e2f4b) を別 worktree に checkout し、`npx vitest run tests/integration/samples.test.ts` 全69緑、`node scripts/sync-target-urls.mjs --check` ゼロ、`npx tsc --noEmit` clean を確認 (worktree は検証後に除去)。
- 本作業ツリーでの `make addurl-check` は並行 R4-6a の作業中 placeholder (15件) が残るため非ゼロ。自分の4件の placeholder はゼロ (report に計数あり)。
- `make eval` は pin 未更新の4件分 RED の想定内 (R4-3 に相当する集約タスクに委譲)。

(End of file)
