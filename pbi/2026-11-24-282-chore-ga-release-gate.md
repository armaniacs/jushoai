# PBI: 正式版 1.0.0 のリリースゲートを定義して通す

## ユーザーストーリー
利用者として、「正式版」と書かれた版は未レビューの変更を含まず、約束された品質の確認を経ていてほしい、なぜなら 0.x の試用版と違い、正式版は安心して実データを預ける判断材料になるから

## 区分
改善 / 1.0 必須

## 優先度
- 順位: 5 / 17（統合部分は最初に着手してよい。版付けは全 1.0 必須 PBI の完了後）
- RICEスコア: 400 (Reach=100 / Impact=2 / Confidence=100% / Effort=0.5人週)
- 根拠: 台帳には「実装済み・コードレビューのみ残」や「アーカイブはマージ後」の PBI が多数あり、未マージのブランチが PR 順序（adachi → role → emergency-contact-tel → 本ブランチ）待ちになっている。276（再スキャン）はこの統合が終わった main に対して行う必要がある

## BDD受け入れシナリオ

```gherkin
Scenario: ゲートを満たした main だけが 1.0.0 になる
  Given 1.0 必須の PBI がすべて完了し、未マージの作業ブランチが無い
  When  保守者が package.json を 1.0.0 にしてタグを打つ
  Then  Release ワークフローが make check-all 相当の確認を通ったコミットから成果物を作る

Scenario: 未完了の必須項目があると版付けしない
  Given ゲート一覧に未チェックの必須項目が残っている
  When  保守者がゲート一覧を確認する
  Then  どの項目が残っているかが一覧で分かり、版付けを見送る
```

## 受け入れ基準
- [x] 未マージブランチを PR 順序どおり main に統合（`work/user-docs-reorg` を含む）
- [x] 台帳の「コードレビューのみ残」系 PBI を、レビュー実施かアーカイブ判断で閉じる（残置するものは 1.0 後と明記）
- [x] `docs/release.md` に 1.0 ゲート一覧（make check-all 緑、eval pin 緑、276 の結果、274/275/277/281/283 完了、ストア掲載文とプライバシー文書の整合、CHANGELOG の 1.0.0 節）を置く
- [x] バージョン方針（semver。保存形式の非互換は major でのみ行う、等）を `docs/release.md` に書く
- [x] ストア掲載文・README・サイトから「試用」相当の表現を見直す
- [ ] 1.0.0 の CHANGELOG 節と GitHub Release を作成

## テスト戦略
- E2E: `make check-all`（両ブラウザ E2E）
- 統合: `make check` と `make eval`
- 単体: なし

## 見積もり
0.5人週（統合の衝突解消は別途。要チームでの見積もり）

## Definition of Done
- [ ] ゲート一覧の全項目にチェック
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み

## 出どころ
- 2026-11-24 正式版準備の棚卸し。`pbi/00-INDEX.md` の進行中節、タグ `pre01-0.1.40`

## 引継ぎ

### Task 5 の実装記録（2026-11-24。統合の実行・版付けはしない。調査と文書だけ）

統合の事前調査（読み取りのみ。マージ・push・ブランチ作成なし）:

- 4 本の未マージブランチは一直線に積まれている（`git merge-base --is-ancestor` で確認。すべて Yes）。
  `work/adachi-label-extraction` → `work/role-profile-select` → `work/emergency-contact-tel` → `work/user-docs-reorg` → `work/ga-readiness`。
- 各先端と `main` の差分規模（`git log --oneline main..<branch> | wc -l`）: adachi 3、role 8、emergency-contact-tel 26、user-docs-reorg 34、ga-readiness 44。
- `main` への衝突見込みは `git merge-tree` で試算した（merge-base `d184fa17`、worktree 非破壊）。衝突記号は 0 件で、自動合流できる見込み。衝突解消の実施はしていない。
- 推奨 PR 順序は台帳 `pbi/00-INDEX.md` の 272 の記述（adachi → role → 本ブランチ）と引継ぎメモの 282 節（最上位 1 本にまとめるかはユーザー判断）どおりでよい。`work/user-docs-reorg` が adachi 以降の全部を含み、当ブランチがその先端に積まれているため、最上位ブランチの PR 1 本で全体を運べる。
- 版情報: `package.json` の `version` は `0.1.39`。ローカルタグ `pre01-0.1.40` は `74e3d89` にあり、当ブランチの履歴に含まれる（push していない）。

台帳の「コードレビューのみ残」系の現状整理（レビュー実施・アーカイブ判断はしない。判断はユーザーと統括の範囲）:

- 実装済み・コードレビューのみ残: `2026-10-19-00-backlog-holistic-round.md`（大局レビュー 61-64、実装済み）、`2026-10-19-00-backlog-pbi55-round.md`（PBI-55 レビュー指摘 56-60）、`2026-10-24-00-backlog-arch-round2.md`（アーキレビュー 150-159）。
- アーカイブはマージ後: `2026-11-23-272`（レビュー済み Ready to merge、ブランチ `work/emergency-contact-tel`）、`2026-11-23-273`（実装済み、同ブランチ）。
- 未実施のまま残るもの: 足立ラウンド 266-271（未マージブランチ上の実装）、checking-arch ラウンド 247-258、drykiss ラウンド 261-264、残置の 129 / 202。1.0 に含めるか 1.0 後に回すかの線引きが要る。

ゲート一覧と版方針: `docs/release.md` の末尾に「1.0 リリースゲート」と「版方針」を置いた（受け入れ基準 3 / 4 件目）。保存形式の詳細は PBI-283 の範囲とし、境界を文面で明示した。

「試用」相当の表現の見直し結果（受け入れ基準 5 件目。変更なし）:

- `docs/store-listing.md`: 該当なし。
- README: 該当なし（「実データを入れる前に試したいときは」等の 1 行は、版の位置づけではなく架空データでの操作案内のため残す）。
- サイト日英: 版の位置づけを示す表現はなし。`v1beta` は Gemini の API 版名で無関係。`お試し`（getting-started の節名等）は架空データでの操作案内のため残す。

### Task 11 の実装記録（2026-11-24。統合の実行。マージはしない）

- `work/ga-readiness` を `origin` に push した（新規ブランチ。force push なし。注: local main は origin/main より 7 commits 先行していた。結果への影響なし）。
- `main` への PR を 1 本作成した。PR #36（通常 PR。draft ではない）。base `main`、head `work/ga-readiness`。URL は https://github.com/armaniacs/jushoai/pull/36。
- PR 本文に 4 層の概要、Task 5 への参照、1.0 ゲートの状態、残作業を記載した。作成者本人のため review request は付けられず、本文末尾で @armaniacs を指名した。
- CI は PR 上で全緑を確認した（check、e2e chrome、e2e firefox）。
- PR #36 は 2026-11-24 にマージされた（merge commit 7893c9d）。`work/ga-readiness` は `origin/main` に fast-forward で追随済み。受け入れ基準 1 件目を `[x]` にする。

### Task 13 の実装記録（2026-11-24。272/273 のアーカイブ実行 + 残りの判断材料の作成。判断はしない）

アーカイブの実行（台帳の事前決定「アーカイブはマージ後」の実行）:

- `pbi/2026-11-23-272-feat-emergency-contact-tel.md` と `pbi/2026-11-23-273-feat-combo-search-parking.md` を `pbi/archived/` に移した（git mv）。
- `pbi/00-INDEX.md` の 2026-11-23 の進行中 2 節を、1 節の「進行中からアーカイブ済み（2026-11-24・272/273 を PR #36 でマージ済み）」に置き換えた。記載の実装コミットは 272 が 3f9225a / ba1bdc8 / c245c18 / 056fecc、273 が e12b661 / 9adc3fe / fbc007d / 19c6093。
- 検証: 8 件すべて `git merge-base --is-ancestor <commit> origin/main` が Yes（fetch 済み）。INDEX の新節が指す 2 ファイルは `pbi/archived/` に実在する。計画書（`docs/superpowers/plans/2026-11-23-*.md`）は起票時の記録のため変更なし。`make typecheck` と `make lint` は統括側で再実行し exit 0 を確認（2026-11-24）。272 の「レビュー済み」は台帳記載の転記のまま、273 は「実装済み」のみ（台帳の元の書き分けどおり）。`make eval` は PR の CI 対象外のため両件とも未確認と明記した。

「コードレビューのみ残」系 3 件の提案資料（レビュー実施かアーカイブかの判断はユーザーと統括の範囲）:

- holistic-round（`2026-10-19-00-backlog-holistic-round.md`）: 子 PBI 61-64 は実装・アーカイブ済み（統合 8ee8c19。src 8 件・tests 4 件ほどの差分）。レビュー対象は実装済み差分の確認のみで、新規実装は無い。見積もは軽い（差分の読み直し程度）。1.0 への意義は薄い（内部の見通し改善であり、利用者向けの挙動変更を含まない）。
- pbi55-round（`2026-10-19-00-backlog-pbi55-round.md`）: 子 PBI 56-60 は実装・アーカイブ済み（統合 0c1d9c4。17 ファイル・640 行追加）。56（結果ビューのフォーカス移動）は a11y に関わるため、1.0 の品質看板との整合だけ確認する価値がある。見積もは中程度（preview 系の差分中心）。意義は 56 の a11y 保証の再確認に留まる。
- arch-round2（`2026-10-24-00-backlog-arch-round2.md`）: 子 PBI 150-159 の 10 件は実装・アーカイブ済み（d0d0c9d 等の 10 件前後の実装コミット + cdf84c2 の指摘対応。fill-one / options / UI / store の各層に分散）。レビュー実施の見積もは重い（層をまたぐ 10 件分の差分）。1.0 への意義は薄い（内部構造の整理であり、150 の kana 帰属の分岐解消を除き挙動変更は無い）。

未実施のまま残る群の 1.0 後回しの提案（判断はユーザーと統括の範囲）:

- 266-271（足立・人物分離 6 件）は未マージブランチ上の実装であり、PR #36 には含まれていない。1.0 の対象に含めるなら別 PR の順序決めが要るため、1.0 後が自然である。
- 247-258（checking-arch 12 件）と 261-264（drykiss 4 件）は内部整理のリファクタ中心であり、利用者向けの不足を塞ぐものではない。1.0 後に回しても版の約束には影響しない。
- 129（動的フォーム対応）と 202（tab-send-seam）は着手条件が未到来の残置であり、条件が来るまで待つ扱いを継続するのが自然である。
- 新規 PBI-291（a11y 結果読み上げ。未採点・未着手）は PBI-285 の監査から分離した項目であり、1.0 後でも可の扱いである。RICE 採点はこのタスクでは行わない。

### Task 14 の実装記録（2026-11-24。基準 2 件目の完結。版番号に触れない）

ユーザー決定（Ask。4 件）を転記する:

- レビュー系 3 件は pbi55-round のみレビュー実施し、holistic-round と arch-round2 はレビュー実施なしで閉じる（アーカイブ）。
- 未実施群（266-271 / 247-258 / 261-264 / 129 / 202）はすべて 1.0 後に回す。
- PBI-291 は 1.0 後に回す（RICE 採点も後回し）。
- 版付けは version 0.2.0 として進む（1.0.0 ではない）。タグ push 前に最終確認を挟む。版番号の前提変更は Task 15 が反映し、このタスクでは版番号に触れない。

pbi55-round のレビュー実施（対象は子 PBI 56-60 の実装済み差分。統合 0c1d9c4。17 ファイル・640 行追加）:

- 56（結果ビューのフォーカス移動）の a11y 保証を確認した。`src/ui/preview.ts` の `showResult` は報告ボタンへ `report.focus()` し（当時の差分で追加）、`tests/ui/preview.test.ts` の「moves focus to the report button (PBI-56)」が shadow root の activeElement で固定している。現行コードの `showResult`（538 行付近）に残存する。
- Task 9（PBI-285 監査）の F2（`showUndoResult` の `done.focus()`）は 56 と対称の対応であり矛盾しない。発話の不足は PBI-291 に分離済みで、このラウンドの範囲外である。
- 57（byResult の Readonly 化）、58（FILL_RESULT_LABELS の一本化）、59（resultMode の setRows ガード）、60（E2E の reportButton と resultPanelText）はいずれも現行コードに残存し、利用者向け挙動の変更は無い。
- 判定は問題なし。round 台帳にレビュー記録を付けて `pbi/archived/` に移動した。

holistic-round と arch-round2 の閉鎖（レビュー実施なし。ユーザー決定どおり）:

- 両台帳に閉鎖記録を 1 節ずつ残し、`pbi/archived/` に移動した。理由は内部整理のみで利用者向け挙動変更が無いこと、子 PBI は実装・アーカイブ済みであること（holistic は 61-64・統合 8ee8c19、arch-round2 は 150-159）。

1.0 後の明記（`pbi/00-INDEX.md`。行の書き換えではなく注記を足した）:

- 266-271（足立・人物分離の節）、247-258（checking-team + アーキテクチャ発見の節）、261-264（DRY/KISS 調査ラウンドの節）の各節見出しに「1.0 後。2026-11-24 ユーザー決定」を追記した。
- 129、202、291 の各行に同じ注記を追記した。

受け入れ基準 2 件目を `[x]` にする。版番号（1.0.0 / 0.2.0）・CHANGELOG・package.json・タグ・Release は触っていない。

### 残作業

- 未マージブランチの統合: PR #36 をマージ済み。受け入れ基準 1 件目は `[x]` にした。
- 台帳の「コードレビューのみ残」系のレビュー実施かアーカイブ判断（残置するものは 1.0 後と明記）。Task 14 で完結（pbi55 はレビュー実施、holistic と arch-round2 はレビューなしで閉鎖、未実施群と 291 は 1.0 後を明記）。受け入れ基準 2 件目は `[x]` にした。
- 版付け: 1.0 必須 PBI（274 / 275 / 277 / 281 / 283）と 276 の完了後に `docs/release.md` のゲート一覧をすべて確認し、`package.json` を `1.0.0` にしてタグを打ち、GitHub Release を作る。
- 元の引継ぎ: 未着手（2026-11-24）。着手前に `docs/superpowers/plans/2026-11-24-ga-readiness-handoff.md` の該当節を読む（調査済みの事実・落とし穴・検証手順）
