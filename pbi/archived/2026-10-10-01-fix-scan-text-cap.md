# PBI: スキャン時の label・placeholder 文字列に長さ上限を付ける

状態: 実装済み（`make check` green。コードレビューはユーザー作業として残す）

## ユーザーストーリー
拡張機能の全利用者として、ページから収集する label・placeholder に分類前の長さ上限がほしい、なぜならどんなページを開いても分類の入力が有界になり、正規表現マッチの増幅経路が構造的に閉じられるから

## 優先度
- 順位: 1 / 7、RICEスコア: 40.0（Reach=100 / Impact=0.25 / Confidence=80% / Effort=0.5pt）
- 根拠: すべてのスキャン走行（拡張機能の全利用者の全フォーム操作）が対象で Reach は最大。VulnHunter 監査では Informational ハードニング（攻撃駆動ではないため直接的な障害は実証されていない）で Impact は 0.25。変更は scan 側の切り詰め 2〜3 箇所とテストのみで、既存テストの不変性で確実に検証でき Confidence 80%、Effort 0.5pt

## 背景
- 出典: VulnHunter 監査 `JushoAI_VULNHUNT_RESULTS_2026-10-10-051858/phase2b_output.md` の候補 #9「Quadratic regex on page-controlled label text (LOG-OBS-1)」— FALSE POSITIVE 判定・Informational ハードニング。ハードニング候補 5 でも「Cap label/placeholder length on the scan path」（`classify-rules.ts:243, 314`）として指摘
- label・placeholder はページ制御の入力で、cap なしに 19 個の優先順序付き正規表現マッチャ（`src/core/classify-rules.ts`）に渡る。実証済みの二次時間 O(n²) 経路（`classify-rules.ts:243` の `/(市区町村|市町村).*(番地|丁目)/`）がある
- 分類はユーザー操作（ボタン click `content.ts:180` / popup `content.ts:213`）でのみ走るため攻撃駆動ではない。ただしページは拡張なしで自己 freeze できる以上、拡張経路は構造的に弱く、cap で増幅を構造的に除去できる
- 現状の有界化は偏っている: nearby 見出しは 60 文字で cap 済み（`scan-fields.ts:45,48,50` の `.slice(0, 60)`）、AI 送信 wire も `MAX_TEXT_LENGTH = 200` で cap 済み（`messages.ts:13,53`）。label（`scan-fields.ts:32-41`）と placeholder（`scan-fields.ts:141`）だけが scan 側で未 cap

## BDD受け入れシナリオ

Scenario: 長い label が上限で切り詰められ、分類は通常どおり動く
  Given 300 文字の label を持つ入力欄があるフォームを開いている
  When ページをスキャンする
  Then 欄の meta.label は先頭 200 文字になる
  And 分類は通常どおり行われ、注入フローは変わらない

Scenario: 200 文字ちょうどは変化しない
  Given ちょうど 200 文字の label を持つ入力欄がある
  When ページをスキャンする
  Then meta.label は 200 文字のまま、1 文字も欠けない

Scenario: 201 文字は 200 文字に切り詰められる
  Given 201 文字の label を持つ入力欄がある
  When ページをスキャンする
  Then meta.label は先頭 200 文字になる

Scenario: placeholder も同様に切り詰められる
  Given 300 文字の placeholder を持つ入力欄がある
  When ページをスキャンする
  Then 欄の meta.placeholder は先頭 200 文字になる

Scenario: 既存の分類結果は不変
  Given `tests/core/` の既存 fixture（実在するフォームの短い label・placeholder）でスキャンと分類を行う
  When cap を適用してスキャンする
  Then 分類結果は cap 導入前と 1 件も変わらない

Scenario: 長い文字列でも分類時間は有界
  Given 10,000 文字の label と `市区町村…番地…` を含む 200 文字の文字列を持つ欄がある
  When 分類を走らせる
  Then 1 欄あたりの分類時間は入力長の cap に比例して有界であり、二次時間の増幅は生じない

## 受け入れ基準
- [x] label は 200 文字（`MAX_TEXT_LENGTH` と同値の定数）で切り詰められる（200 ちょうどは変化なし、201 は 200 になる）
- [x] placeholder も同様に切り詰められる
- [x] nearby の既存 60 文字 cap（`scan-fields.ts:45,48,50`）は変更されない
- [x] 定数は `src/messages.ts` の既存上限（200）と同じ値を再利用し、新しいマジックナンバーを増やさない
- [x] 分類に使う文字列だけが有界になり、DOM 走査・注入フローの挙動は変わらない
- [x] 既存の分類テスト・スキャンテスト・サンプルテストがすべてパスする（分類結果不変）
- [x] 長い label（例: 10,000 文字）でも分類 1 欄あたりの時間が有界であることをテストで固定する
- [x] scan 側の 200 文字上限と AI 送信 wire の 200 文字上限（`sanitizeField`）が整合する
- [x] `make check` が green

## テスト戦略（t_wadaスタイル）
- 単体（`tests/dom/scan-fields.test.ts`）: cap の境界（200 ちょうど / 201 / 300 文字）、placeholder、radio グループ label、nearby の 60 文字 cap 不変。切り詰め後も whitespace 正規化（`clean`）が先に効くことを確認
- 単体（`tests/core/classify-rules.test.ts`）: 既存分類結果の不変性（fixture 全件）、長い文字列での分類時間の有界性（時間アサーションは環境差を吸う緩い上限で）
- 統合（`tests/messages.test.ts`）: scan で 200 文字に切れた label・placeholder が `sanitizeField` の wire 上限（同値 200）でさらに切られないこと（送信サイズ契約との整合）

## 実装者向け注記
### 現状コードの確認（着手前に実行済み・読み取りで検証済み）
- `labelOf`（`src/dom/scan-fields.ts:32-41`）は `el.labels` / `aria-label` / `aria-labelledby` を `textWithoutControls` + `clean` で収集し、cap なし
- placeholder は `scan-fields.ts:141`（`input?.placeholder ?? ''`）で cap なし
- nearby は `scan-fields.ts:45,48,50` で既に `.slice(0, 60)`
- `src/messages.ts:13` の `MAX_TEXT_LENGTH = 200` はモジュール内非公開で、`sanitizeField` の `text()`（`messages.ts:53`）経由で ai-classify wire にのみ効く（scan 側には効かない）。`META_CLIP_LENGTH = 80`（`messages.ts:62`）はプロンプト・フィードバック用の表示幅で別物。混同しないこと
- 分類は `classify-rules.ts:314` の `ownText`（`m.name, m.htmlId, m.label, m.placeholder` を結合して NFKC + lower）に全マッチャを走らせる。`classify-rules.ts:243` の `/(市区町村|市町村).*(番地|丁目)/` が二次時間経路
- 分類の走行タイミングはユーザー操作のみ（`content.ts:180` ボタン click、`content.ts:213` popup message）

### 実装手順
1. 定数の共有: `MAX_TEXT_LENGTH`（200）を `src/messages.ts` から export するか、core 側の共有定数にして messages.ts と dom の両方から参照する。dom→messages の import グラフ（`ai/types`・`llm/availability` を引き込む）を嫌うなら core 共有が向く。どちらでも新規マジックナンバーを増やさない
2. `src/dom/scan-fields.ts`: `labelOf` の戻り値（`clean(parts.join(' '))` の後）に `.slice(0, MAX_TEXT_LENGTH)` を 1 箇所足す。これで入力欄 label・radio グループ label（`scan-fields.ts:89-91`）・radio option text（`scan-fields.ts:110`）が一括で有界化される
3. `placeholder`（`scan-fields.ts:141`）も同様に `.slice(0, MAX_TEXT_LENGTH)` を足す
4. `tests/dom/scan-fields.test.ts` と `tests/core/classify-rules.test.ts` に境界ケースと不変性のテストを追加する
5. `make check` で通しで検証する

### 落とし穴
- `labelOf` は共有関数で、radio グループ label（`scan-fields.ts:89-91`）と radio option text（`scan-fields.ts:110`）にも効く。labelOf 内で切れば 3 経路を 1 行で閉じるが、meta.options の text も切れる点は意識した変更として受け入れること（オプション文字列もページ制御入力で、既存 fixture は短いため既存テストに影響しない）
- `clean`（`scan-fields.ts:12`）を先に通してから slice する。slice を `clean` より前に置くと、切った境界が空白正規化でずれる
- `ownText`（`classify-rules.ts:314`）は `m.name`・`m.htmlId` も結合するが、これらは監査推奨の対象外（wire では `sanitizeField` が 200 で cap）。スコープを label・placeholder に留めること。広げるなら wire との整合と既存テストへの影響を再確認する
- 既存の分類テストを壊してはいけない。`tests/helpers.ts` の `makeMeta` が作る fixture の label・placeholder は 200 文字より十分短いため、正規表現や期待値は変更せず scan 側だけ変える
- `wantsKana` / `wantsKanaOwnMeta`（`classify-rules.ts:264-283`）も placeholder・label を読むが、有界な文字列は同一ロジックを通るだけで挙動は変わらない

## 見積もり
0.5pt（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み
