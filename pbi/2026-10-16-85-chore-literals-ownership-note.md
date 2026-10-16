# PBI: literals.ts に所有コメント1行を追加する

## ユーザーストーリー

将来の開発者として、`src/core/literals.ts` の `norm`（NFKC + case-fold、trim なし）と照合系（`eras.ts` / `genders.ts` / `prefectures.ts` / `profile.ts` の NFKC + trim 系 bespoke）が表面的に重複して見えても、誤って統一しようとしないために、`norm` の所有境界を示すコメント1行が欲しい。なぜなら、なぜなぜ30回（`.checking-team-tmp/cache/main__1014z/why30-nfkc.md` 結論）で現状維持が結論づいたが、その理由がコード上に残らないと、将来また同じ統一試行（lower 混入・trim 脱落などのリグレッションを招く試行）が発生するためである。

- 対象: `src/core/literals.ts` の `norm` 定義箇所（現行10行目前後のコメント部）
- 変更内容: 所有コメント1行を追加する（例: trim系正規化は照合系が所有し、ここではcase-foldのみ共有する）。コード変更はコメントのみであり、振る舞い・import・API の変更は一切行わない。
- 背景の事実: `norm = s.normalize('NFKC').toLowerCase()` は trim なしの case-fold であり、実使用は `classify-rules.ts` と `kana.ts` のみ。照合・保存系（`clean` / `strip` / `leadingDigits` / `digits` / `kana` / `birthday` 整形）は width-fold + trim で case を保持する別知識であり、単純統一は両方向リグレッションになる（`tests/core/normalize-parity.test.ts` 6件緑がロック済み）。詳細は `plans/2026-10-15-2247-review-1014z.md` 指摘D および why30 分析の結論部を参照。

## 優先度

- 順位: 4位 / 12件
- RICE スコア: 125（Reach = 5 / Impact = 0.25 / Confidence = 100% / Effort = 0.01人月）
- 根拠: 工数ほぼゼロ（コメント1行）で確実に将来コストを下げる。依存なし。振る舞い変更ゼロのためリスクなし。

## BDD受け入れシナリオ

### シナリオ1: 将来の開発者が所有境界を読み取れる

- Given 将来の開発者が `src/core/literals.ts` を開いて `norm` の定義を読んでいる
- When `norm` 直上のコメントを読む
- Then trim 系正規化は照合系（eras / genders / prefectures / profile）が所有し、`literals.ts` では case-fold のみを共有していることが分かる

### シナリオ2: 誤った統一試行が抑止される

- Given 開発者が `s.normalize('NFKC')` の文字列一致に気づき「分散しているから統一しよう」と考えた
- When コメントと `tests/core/normalize-parity.test.ts` のロック（"must not be silently unified"）を確認する
- Then case-fold と width-fold + trim は別知識であり、統一すると `lastNameRomaji: Yamada → yamada` 破壊や rule 分類の case-sensitive 化を招くため、統一を見送る判断ができる

### シナリオ3: 振る舞いが変わっていないことが確認できる

- Given コメント1行追加後のブランチ
- When 既存テストスイート（少なくとも `tests/core/normalize-parity.test.ts` 6件）を実行する
- Then 全件緑のままであり、コードの振る舞い・公開 API に差分がない

## 受け入れ基準

- [x] `src/core/literals.ts` に所有境界を示すコメントが1行追加されていること（trim 系は照合系が所有し、ここでは case-fold のみ共有する旨）
- [x] コメント以外のコード差分がないこと（振る舞い・import・API 不変）
- [x] `tests/core/normalize-parity.test.ts` 6件が緑であること

## テスト戦略

- 新規テストは追加しない。現状ロックである `tests/core/normalize-parity.test.ts` 6件の緑を回帰ゲートとする（case-fold vs trim の差異がピン留め済みのため）。
- 変更がコメントのみであることを `git diff` で目視確認する（`literals.ts` のコメント1行以外に差分なし）。
- 必要に応じて `make typecheck` の緑を確認する（実質的には不要だが、作業ツリーの健全性確認として）。

## 見積もり

- Effort: 0.01人月（コメント1行の追記と diff 確認のみ、数分程度）
- 依存: なし（他 PBI・他ファイルの変更を前提としない）

## Definition of Done

- [x] `src/core/literals.ts` へのコメント1行追加がコミット可能な状態であること
- [x] `git diff` でコメント1行以外の差分がないこと
- [x] `tests/core/normalize-parity.test.ts` 6件が緑であること
- [ ] レビュアーが「統一しない意図がコード上で読み取れる」と確認したこと
