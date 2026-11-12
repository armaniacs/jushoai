# Task SIMP-T1 Report — C1 文字化け placeholder の修正

Branch: work/pbi-208-round4
Task: SIMP-T1 (code-review-simplify.md C1 対応)
方針: (b) 化けた placeholder 属性を削る (取得し直しは選ばず。理由は後述)

## 変更内容 (対象2ファイルのみ)

- `samples/sekisui-catalog-request.html`: 文字化け `placeholder` 8件を削除
  (name1, name2, kana1, kana2, address1, planned_address1, email, emailConfirm)
- `samples/sekisui-inquiry-form.html`: 文字化け `placeholder` 9件を削除
  (name-kanji1, name-kanji2, name-kana1, name-kana2, email-name, email-domain,
  email-name-confirm, email-domain-confirm, addr1)
- いずれも `placeholder="..."` 属性の削除のみ。タグ・属性の並び・その他は不変。
  削除後の両ファイルに `placeholder` 属性は残存しない。

## 方針 (b) を選んだ理由

- 残存文字列に U+FFFD (REPLACEMENT CHARACTER) を含む。U+FFFD はデコード時に
  元バイトが失われた痕跡であり、現ファイルから正しい charset で復元することは
  不可能 (例: inquiry 側 `��j�Z�L�X�C`、catalog 側 `����ѿ�`)。
- (a) 取得し直しは、対象 CGI (catalog.cgi / form.cgi) が現存・同内容である保証が
  なく、外部取得によるスコープ拡大になる。brief が許容する (b) が最小・確実。
- `kikkoman-media-form.html` が bare input で再現成立の前例 (当該 fixture 自体に
  placeholder なし)。bare 化は運用上許容された形。

## 分類結果の変化 (あり。期待値の更新はしない)

`sekisui-inquiry-form.html` の `name-kana1` / `name-kana2` が、従来の未分類
(excluded) から `lastNameKana: ヤマダ` / `firstNameKana: タロウ` に分類される
ようになった。これは化けた信号に依存しない正しい形への修正であり、brief の
指示通り期待値 (tests/corpus.ts)・台帳・pin には触っていない。

### 機序 (裏取り済み)

- `src/core/kana.ts` の `placeholderRejectsKana` は `ph !== '' && /[一-龠a-z]/`
  で kana 要求を veto する。旧 placeholder `��j�Z�L�X�C` は小文字 `j` を含むため
  veto が発動し `wantsKana` が false 固定になっていた。
- `KANA` 語彙は romaji `kana` を含むため、name 属性 `name-kana1/2` 自体は kana
  信号を持つ。placeholder 削除で veto が外れ、name 由来の正しい kana 分類が
  復活した。`name-kanji1/2` は kana 信号を持たないため従来通り未分類のまま。
- `sekisui-catalog-request.html` 側は変化なし (name1/kana1 等の name 信号が
  元々支配的で、旧 placeholder は veto 条件 `[一-龠a-z]` に該当する文字を
  含まなかったか、含んでも分類経路に影響しなかった)。

## 検証結果

1. `npx vitest run tests/integration/samples.test.ts`
   → 137 passed / 1 failed (全138件中)。失敗は上記の
   `sekisui-inquiry-form.html` 1件のみで、差分は `name-kana1/2` の2欄追加のみ。
   catalog 側を含む他137件は不変。
2. `make addurl-check` → ゼロ (`no '<expected>' remnants.`)。
3. `grep -n "�" samples/sekisui-*.html` → ヒットなし (exit 1。U+FFFD 残存なし)。
   参考: 削除後の両ファイルに `placeholder` 文字列自体が存在しないことを確認済み。

## 参考: `make eval` への波及 (pin 更新は対象外のため未実施)

- `sekisui-inquiry-form.html: ruleHits pin=13 実測=15, fillable pin=8 実測=10,
  refineChanged pin=5 実測=7, refineDropped pin=5 実測=3`
- 上記 samples 差分と整合する方向の変化 (+2欄がルール分類・fillable 化)。
  pin 表 (`tests/eval/corpus.eval.ts`) の更新は brief 対象外
  (「他の fixture・台帳・pin には触らない」) のため行わない。後続タスクでの
  pin 更新時に本 report の数値をそのまま使える。

## concerns

- 本 commit 後も `tests/integration/samples.test.ts` と `make eval` は
  inquiry-form の1件分だけ赤いまま残る (意図的なもの。理由は本 report に明記)。
  後続で pin・期待値を更新するタスクが `tests/corpus.ts` 側の excluded コメント
  (`name-kanji1/2/name-kana1/2 ... 文字化け placeholder のみ`) も合わせて
  直す必要がある (kana 2欄はもう未分類ではない)。
- 実ページ再取得 (方針 (a)) を将来やる場合、対象 CGI の現存確認が先決。
  現時点では不要と判断した。
