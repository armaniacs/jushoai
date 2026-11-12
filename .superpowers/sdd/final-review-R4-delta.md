# Final Review R4-delta — work/pbi-208-round4 (R4-4b〜R4-10: 72件取込 + pin集約)

- レビュー範囲 (read-only。コード変更なし): `36887d0..HEAD` (差分パッケージ
  `.superpowers/sdd/review-36887d0..673bea1.diff`、108 files / +10715 / 削除0)。
- 対象: R4-4b 東証13件・R4-5b 政令市4件・R4-6b 図書館5件・R4-7b 大学8件・
  R4-8b 大手塾21件・R4-9b デベロッパー21件・R4-10 pin集約 (計72件)。
- 正本: `pbi/2026-10-31-208-feat-samples-corpus-growth.md` (受け入れ基準・1 fixture の運用)、
  `AGENTS.md` (テスト方針・運用の節)。各タスクレポート R4-4b/5b/6b/7b/8b/9b/10 を精読。
- 本レビューは実測つき: `make eval` 3 passed、`samples.test.ts` 133 passed、
  `tsc --noEmit` clean を実行確認。`make check` 全体 (両ブラウザ build 含む) は
  R4-10 報告の exit 0 を採用 (src 無変更のため回帰リスク最小。後述)。

## Verdicts

- **Spec: ✅ (PASS)** — PBI-208 受け入れ基準をすべて満たす。ブロッカーなし。
- **Quality: With findings (Important ×2 / Minor ×4 / Critical ×0)** —
  マージ可。Important はいずれも将来 PBI への申送りで、R4 の honest-pin 方針と整合
  (R4 内対応不要)。記録十分性は確認済み。

## Spec compliance (PBI-208 受け入れ基準)

- [x] **make addurl 手順・台帳・配線**: `tests/target-url.md` に 72行追加
  (diff `^+.*→` 72件 + 空行1。`--stat` 73 +)。形式は既存どおり `- <url> → <fixture>`。
  例外なく全72件が verbatim URL。`tests/integration/samples.test.ts` に 72ケース追加
  (diff は `it`/`expect(planFor/expectedFor)`/`});` のみ。期待値の直編集なし。
  実測 133 passed = 既存61 + 新72)。
- [x] **最小再現**: 全72 fixture が最小再現 (例: `samples/2000033.html` 10行、
  `samples/azbil-kikubari-form.html` 123行 + 方針注記の header comment)。
  先頭コメントに実 URL・欄構成・削り方の根拠を記載 (azbil の bare-td 注記は
  epson-ir 前例つきで模範的)。`tr/th` (ichishin 等 auhikari 前例)、`dl/dt/dd`、
  select 実選択肢の復元は scanner の nearby 読取と整合し、各レポート §取込時の修正で
  理由が説明されている。
- [x] **radio/checkbox/hidden 除外**: 全 fixture の skip コメントと ledger の
  excluded が 1:1 対応 (抜き打ち: 2000033 は skip 3 = excluded 3、
  `tests/corpus.ts:1927-1932`)。radio は「name 単位1欄・性別/年代のみ分類」文言で統一、
  checkbox は `skip fixed`、hidden/submit/button/textarea/file/image は `exclude`。
  性別解決は otsuka 前例どおりの gender 群のみ
  (例: sekisui-catalog `sex → '女性'`、`tests/corpus.ts:3824` 付近コメント明示)。
  `type=hidden` が expected に入った例は0件。
- [x] **期待値緑**: 実測 — `npx vitest run tests/integration/samples.test.ts` 133 passed、
  `make eval` 3 passed (pin 照合129行・privacy・no-network)、`npx tsc --noEmit` exit 0。
- [x] **pin 更新**: `tests/eval/corpus.eval.ts` のみ +72行 (削除0)。
  集計 fixtures=129 fields=1842 ruleHits=1173 llmFallbacks=629 fillable=699、
  refineChanged=280 refineDropped=58 は R4-10 報告値と完全一致 (実測で再確認)。
  既存57行のドリフトなし (eval RED にならない = 分類パイプラインの劣化なし。
  R4-10 の「pin=…実測=…差分0件」主張と整合)。
- [x] **de-identified**: 新規 fixture の text/email/tel 系 `value` は全て `""`
  (非空 `value="…"` は option 値のみ: 都道府県名・数値 scheme 等)。
  ledger の期待値は `山田/ヤマダ/千代田/yamada@example.com/090-1234-5678` の
  synthetic のみ。placeholder 内のページ由来例示 (例: 穴吹太郎、`info@example.com`) は
  入力欄属性の写しで実個人情報ではない (PBI 許容範囲)。privacy テスト緑を実測で再確認。
- [x] **make check exit 0**: R4-10 が exit 0 を記録
  (typecheck + test + 両ブラウザ build + manifest 検査 + web-ext lint。
  web-ext WARNING 2件は manifest の既知定型)。本レビューではフル check を再実行せず、
  構成要素 (`vitest samples` + `vitest eval` + `tsc`) を実測で緑確認。
  `src/`・`scripts/`・`tests/core/`・`tests/build/`・`site/` の変更なし
  (`git diff --name-only` で確認、該当0件) のため回帰リスクは最小。
  108 files の内訳は samples 72 + tests/corpus.ts + corpus.eval.ts +
  samples.test.ts + target-url.md + .superpowers レポートのみ。

## Honest-pin 抜き打ち (6件。いずれも現行ルール出力を偽らず固定)

1. **板橋 `2000033.html`** (`tests/corpus.ts:1920-1926` / `samples/2000033.html:1-10`) —
   `MailAddress`/`MailAddressKakunin` (type=text + 明確なメールアドレス label) に
   full-address 値 `東京都千代田区千代田1-1 千代田ビル101` を pin。
   コメント「type=text のため email 解決せず full-address 値が fill (honest pin。
   email-via-label 候補)」あり。誤 fill を盛らず・隠さず固定しており honest。
   記録十分性: ledger コメント + R4-6b C-R4-6b-2 + R4-10 伸びしろ#2 (優先度高) で十分。
2. **市進 `ichishin-contact-form.html`** (`tests/corpus.ts:4627-4662` /
   `samples/ichishin-contact-form.html:38-41`) — th「メールアドレス」つき
   `mailaddress`/`mailaddress:cf` に full 住所値 `東京都千代田区千代田1-1` を pin。
   コメント「th メールアドレスつきでも full 住所値で fill (honest pin。
   重大な分類ずれとして Concerns に記録)」あり。honest。
   記録十分性: ledger コメント + R4-8b C12 + R4-10 伸びしろ#4 (優先度高) で十分。
3. **積水メール `sekisui-mail-form.html`** (`tests/corpus.ts:4507-4524`) —
   `mailaddress` (type=text) に住所値 pin。コメント「mailaddress 語彙が候補。
   ff-csr の fax と同形の誤読」あり。honest (上記2件と同型の第3証拠として有用)。
4. **京進 `keishin-contact-form.html`** (`tests/corpus.ts:4439-4466` /
   fixture L28) — `pref` (text。placeholder 例：京都府) → `東京都`、
   `address1`/`address3` 重複、`inq_tri_grp` → birthday-year `1990` をいずれも
   コメントつき honest pin。R4-8b C10/C11 の申告どおり。
5. **azbil thin** (`samples/azbil-kikubari-form.html:1-17` /
   pin `corpus.eval.ts:40` 3/29/0/0/6) — bare-td 構造の注記つきで 3欄のみ解決を pin。
   盛らない姿勢が epson-ir 前例と整合し honest。指標寄与小・多様性寄与の評価も妥当。
6. **新宿 `tosyo-00001-html.html`** (pin 0/0/0/0/0) — radio のみの survey を
   `expected: {}` で pin し radio 政策コメントを付与。richell 前例どおり honest。

## 指摘一覧 (file:line 付き)

### Important (将来PBI申送り。R4内対応不要。いずれも記録十分性は確認済み)

- **I-1. mailaddress 系の住所値 misfill (未分類より強い誤分類)**:
  `tests/corpus.ts:1924-1925` (板橋 2000033)、`tests/corpus.ts:4655-4656` (市進)、
  `tests/corpus.ts:4516` (積水メール)。email 欄に住所値が入るのは偽陽性注入であり、
  将来の語彙 PBI (email-via-label / mailaddress 語彙) で優先対応すべき。
  現状はいずれも honest pin + Concerns 記録済みのため Spec は ✅。マージを止めない。
- **I-2. 複数住所ブロック・紹介者欄の重複/誤結合 fill**:
  `tests/corpus.ts:3237` 付近 (toshin-shiryo/mendan `address3` 重複)、
  tokyu-commercial/cre の自宅・連絡先 3+4 分割対への誤結合、proud 旧新、
  anabuki 連絡先・物件 (R4-9b Concerns 郵便2欄の項)、`tests/corpus.ts:4464`
  (keishin `address3` 重複)。refineDropped=54 (新規分) は R4-10 §検証で
  「重複抑止・誤って落とした欄なし」と計数済み。対照・複数住所の区別は将来PBI。
  現状マージを止めない。

### Minor (運用・表記の磨き。将来的に直せばよい)

- **M-1. sekisui-catalog の placeholder 文字化け (EUC-JP 未復号)**:
  `samples/sekisui-catalog-request.html:3-18`
  (`placeholder="����ѿ�"` 等。`email` 欄の `���sample@sekisuihouse.co.jp` を含む)。
  ledger コメント (`tests/corpus.ts:3826-3827` 付近「Shift_JIS 由来の文字化け
  placeholder あり」) で開示済み。`name1/name2` 等は name 信号で解決しており
  期待値は honest。ただし fixture が実ページの信号 (例示文字列) を失っているため、
  将来 placeholder 信号を語彙化する際は復元が必要 (京進は curl 照合で復元済みの対照例)。
- **M-2. thin fixture の割合**: azbil (fillable 0)・tosyo-00001 (0)・2000033 (0・誤pin)・
  eikoh (2)・waseda-ac (2)。R4-10 §語彙の伸びしろ#11 で多様性寄与として正当化済み。
  fillable 率低下 (新72件 36.1% vs 既存 41.0%) の説明とセットで PBI 台帳に残すこと。
- **M-3. ichishin の重複 skip/excluded 行**: `samples/ichishin-contact-form.html:88,108`
  (`comment (textarea)` ×2)、`:107,109` (`submit (submit)` ×2) と
  `tests/corpus.ts:4692-4693` 付近の対応行。fixture と ledger は 1:1 対応しており
  ミスではないが、初見ではコピペ重複に見える。実ページに同名 control が複数ある旨の
  一行があれば親切 (mitsuihome-sonota の R4 前例と同形)。
- **M-4. R4-9b No.14/16/17 の commit 混入**: task-R4-9b-report.md に申告あり
  (他タスク配線の巻き込み。HEAD 状態は正常)。履歴 hygiene のみで実害なし。
  R4-8b の「`git commit -- <path>` 禁止・/tmp blob + update-index」教訓と合わせ、
  次トランチの運用メモとして残すこと。

### Info (記録のみ。対応不要)

- ledger diff の `→` なし1行は空行 (`+` のみ) で無害。72件の ledger 行は全て
  `- <url> → <fixture>` 形式。
- diff 全体で削除0件・バイナリ0件・fixture 内 `<script|iframe|object|embed>` 0件。
- samples.test.ts の diff は配線 (`it`/`planFor`/`expectedFor`) のみで期待値の直編集なし。
  tooling 配線 + 最小修正の運用 (AGENTS.md どおり) が守られている。

## 検証ログ (本レビュー実測)

- `make eval` → 3 passed
  (aggregate fixtures=129 fields=1842 ruleHits=1173 llmFallbacks=629 fillable=699。
  R4-10 pin 値と一致)
- `npx vitest run tests/integration/samples.test.ts` → 133 passed (既存61 + 新72)
- `npx tsc --noEmit` → exit 0
- `git diff 36887d0..HEAD --name-only | grep -E '^(src/|scripts/|tests/core/|tests/build/|site/)'` → 0件
- `git diff 36887d0..HEAD -- tests/target-url.md | grep -c '^+.*→'` → 72
- `git diff 36887d0..HEAD --stat -- tests/eval/corpus.eval.ts` → 72 insertions (+のみ)
- text 系 input の非空 `value` → 0件 (非空値は option 値のみ)
- `make check` フル (両ブラウザ build 含む) は未再実行。R4-10 の exit 0 を採用。
  src 無変更 + 上記3点の緑により、次回 check-all 時の回帰リスクは最小と判断。
