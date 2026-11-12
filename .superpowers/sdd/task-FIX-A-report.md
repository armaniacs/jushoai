# Task FIX-A report — 最終レビューMinor M1/M2/M5 の修正

- ブランチ: `work/pbi-208-round4`
- 対象: `tests/corpus.ts` の LEDGER prose のみ (+ `.superpowers/sdd/task-SIMP-T6-report.md` の件数表記。report のみ・コード外)
- expected / pin / fixtures / scripts / src 不変
- コミット: `50d972853d66586f61fca8f4cdbfc652214f0b10` (1件、push なし)

## 変更内容 (すべて prose のみ、キー・事由の対応不変)

### M1: `tests/corpus.ts:38` コメント `thirteen` → `twelve`
- `FF_EXPECTED` の実キーは12件 (`name[first]` / `name[last]` / `name_kana[first]` /
  `name_kana[last]` / `e_mailatoresu[mail_1]` / `e_mailatoresu[mail_2]` /
  `qinwuxianxuexiaoming` / `postal_code` / `city` / `jianwuming` / `tel` / `fax`)。
  自分で数えて12件を確認。コメントのみ訂正し、const 本体は無改変。
- ついでに `task-SIMP-T6-report.md` の「キー13件」「同一13件」(同報告の列挙自体は12キー) を
  「キー12件」「同一12件」に正した (report のみ・コード外)。

### M2: `tests/corpus.ts:2708` の `x274` 括弧化
- 変更前: `reserve[category_type]/reserve[media_type]/reserve[referrer]/event_type/event_data[] x274`
- 変更後: `reserve[category_type]/reserve[media_type]/reserve[referrer]/event_type/(event_data[] x274)`
- 単体4キー + `event_data[]`×274 が一意に読める。理由リテラル
  `(hidden): empty-submit shim or server state, never a fill target (exclude)` は一字一句不変。
- T4 の `key xN` 規約 (単一キー直後に `xN`) と整合する形であり、束全体×274 の読みを排除した。

### M5: 行内重複キーの `x2` 寄せ (既存 `key x2` 流儀に合わせる)
- jpaa (`:3221`): `mw-wp-form-form-id/mw_wp_form_token/mw-wp-form-form-id/mw_wp_form_token`
  → `mw-wp-form-form-id x2/mw_wp_form_token x2`
  (前例: `:1445` `c_q12 x2/c_q16 x2/…`、`:3123` `GOYOUKEN x2/SEX x2/BROTHER_KBN x2`)。
- nkanzai (`:3235`): `cx/cof/ie/cx/cof/ie` → `cx x2/cof x2/ie x2`。
- いずれも理由リテラルは一字一句不変。

## 多重集合不変の目視レビュー (修正前後の diff 対照)
- M1: コメント行のみ。`FF_EXPECTED` の kv 行の dels/adds なし。
- M2: 変更前 `{reserve[category_type]×1, reserve[media_type]×1, reserve[referrer]×1, event_type×1, event_data[]×274}`
  → 変更後も同一 (括弧の追加のみ)。`x274` の係る先が `event_data[]` 単体であることを明示しただけで、
  係数の付け替えなし。
- M5 jpaa: 変更前 `{mw-wp-form-form-id×2, mw_wp_form_token×2}` → 変更後 `x2` 表記で同一。
- M5 nkanzai: 変更前 `{cx×2, cof×2, ie×2}` → 変更後 `x2` 表記で同一。
- `git diff` は上記4行のみ (他ファイルの変更なし。T6 report の件数訂正は gitignore 下のため commit 外)。

## 検証 (全緑)
- `npx tsc --noEmit`: exit 0
- `npx vitest run tests/integration/samples.test.ts`: 138 passed
- `make addurl-check`: ゼロ (`no '<expected>' remnants.`)
- `make eval`: 3 passed (fixtures=134, fields=1883)

## concerns
- M2 の `(event_data[] x274)` 括弧化はファイル内に完全な前例がない表記だが、LEDGER prose は
  機械パース対象外 (tooling の `xN` 展開処理なし) のため、tooling・テストへの影響はない
  (上記 addurl-check / eval の緑で裏付け)。
- `.superpowers/` は gitignore 下のため、T6 report の件数訂正と本レポートは commit 外 (working tree のみ)。
