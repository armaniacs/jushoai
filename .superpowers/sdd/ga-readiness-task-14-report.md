# Task 14 report: PBI-282 基準2の完結

状態: DONE

## 実施したこと

PBI-282 の受け入れ基準 2 件目（台帳の「コードレビューのみ残」系をレビュー実施かアーカイブ判断で閉じる）を完結した。ユーザー決定（Ask。4 件）どおり、pbi55-round のみレビュー実施し、holistic-round と arch-round2 はレビュー実施なしで閉じた。未実施群と PBI-291 は 1.0 後と明記した。版番号には触れていない。

- `pbi/2026-10-19-00-backlog-pbi55-round.md` にレビュー記録を付けて `pbi/archived/` に移動した
- `pbi/2026-10-19-00-backlog-holistic-round.md` と `pbi/2026-10-24-00-backlog-arch-round2.md` に閉鎖記録を付けて `pbi/archived/` に移動した
- `pbi/00-INDEX.md` の上記 3 節を「進行中からアーカイブ済み（2026-11-24・PBI-282 Task 14）」の 1 節に置き換えた
- `pbi/00-INDEX.md` の未実施群（266-271、247-258、261-264 の節見出し、129、202 の行）と 291 の行に「1.0 後。2026-11-24 ユーザー決定」を追記した
- PBI-282 の受け入れ基準 2 件目を `[x]` にし、Task 14 の実装記録（Ask の決定 4 件の転記を含む）を追加し、残作業の該当行を完結に書き換えた

## pbi55 レビューの根拠

対象差分は統合コミット 0c1d9c4（`git show 0c1d9c4 --stat` で 17 ファイル・640 行追加を確認）である。重点の 56（結果ビューのフォーカス移動）は `src/ui/preview.ts` の `showResult` が報告ボタンへ `report.focus()` することと、`tests/ui/preview.test.ts` の「moves focus to the report button (PBI-56)」が shadow root の activeElement で固定していることで保証される。両方とも現行コードに残存することを grep で確認した（`report.focus()` は現行 preview.ts の showResult 内）。

Task 9 監査結果との整合: Task 9 の F2（`showUndoResult` の `done.focus()`）は 56 と対称の対応であり矛盾しない。発話の不足は PBI-291 に分離済みで、このラウンドの範囲外である。57（byResult の Readonly 化）、58（FILL_RESULT_LABELS の一本化）、59（resultMode の setRows ガード）、60（E2E の reportButton と resultPanelText）の残存も現行コードの grep で確認した。問題は無かったため round 台帳は開いたままにせず閉じた。

## 検証

- 参照切れの確認: INDEX の新節が指す 3 ファイルは `pbi/archived/` に実在する。3 台帳への参照は INDEX と PBI-282 の Task 5 / Task 13 節（当時の記録であり原文のまま）にのみあり、PBI 側の現行の進行中節に残存はない。`pbi/` 直下に 3 台帳は残っていない（`git status` で RM 3 件を確認）。
- 文書の文字種: 追加・変更した .md が CP932 で表せることを確認する（下の検証節）。
- `make -C /Users/yaar/Playground/JushoAI typecheck` → 下の検証節に記載する。
- `make -C /Users/yaar/Playground/JushoAI lint` → 下の検証節に記載する。

## 検証結果

- `make -C /Users/yaar/Playground/JushoAI typecheck` → exit 0（2026-11-24 実施）。
- `make -C /Users/yaar/Playground/JushoAI lint` → exit 0（同上）。
- 追加行の文字種: 今回の diff の追加行はすべて CP932 で表せる（`+` 行の encode 検査で不良 0）。`pbi/00-INDEX.md` 全体には既存の ✅（U+2705。HEAD 時点で 13 件）が残るが、今回の追加分ではないため触っていない。
- 版番号・CHANGELOG・package.json・タグ・Release は触っていない（`git status` で対象外を確認）。
