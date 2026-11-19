# PBI: 除外リストの複数ライター競合の解消

## ユーザーストーリー
「起動しないURL」を設定ページとフォーム上の両方から管理する利用者として、片方の操作がもう片方の登録を黙って消さないようにしてほしい、なぜなら 0.1.34 で除外リストに第 2 のライター（バナー経由のクイック登録）が増えたのに、オプション画面は boot 時に読んだ一覧をメモリに保持して「保存」でリスト全体を上書きするため、オプション画面を開きっぱなしの間ずっと競合ウィンドウが続き、クイック登録が黙って巻き戻されるから

## 優先度
- 順位: 11 / 14
- RICEスコア: 34（Reach=4 / Impact=2 / Confidence=85% / Effort=0.2人週）
- 根拠: Red Team が PoC 手順つきで実証、Data Integrity も同一問題を別面から指摘（last-write-wins で欠落が無言）。ユーザーが明示同意したオプトアウト制御の消失で、学習データより信頼に重い

## 出どころ
- checking-team 2026-11-18 ラウンド・Red Team Leader + Data Integrity Expert（重複統合）。`plans/2026-11-18-0530-review-main-v0.1.29.md`
- 場所: src/content/exclusion-register.ts:17-41（load→add→save の非原子 3 段階）、src/entrypoints/options/exclusion-section.ts:23-66（boot 時スナップショットの丸ごと書き戻し）、src/kv-store.ts:116-125（直列化なしの既知限界 PBI-148）

## BDD受け入れシナリオ
Scenario: オプション保存がクイック登録を消さない
  Given オプション画面の「起動しないURL」を開いた後、別タブでバナーから「この配下全体」を登録した
  When  オプション画面で「保存」を押す
  Then  保存は再読込した現行一覧と draft の差分を統合し、直前のクイック登録が残る

Scenario: クイック登録がオプション編集中の削除を復活させない
  Given オプション画面で既存エントリを削除済み（未保存）である
  When  別タブのバナーから別 URL をクイック登録する
  Then  オプション画面の保存は draft の削除意図と新規登録の両方を尊重する（復活させない）

Scenario: 保存成功通知の前の整合確認
  Given いずれかのライターが動いた直後である
  When  オプションの「保存」が成功する
  Then  通知の前に書き込み結果の整合を確認し、不整合があれば失敗扱いにする

## 受け入れ基準
- [x] オプション側の保存をマージ方式（保存時に再読込して draft との差分を適用）または storage.onChanged での再同期にする
- [x] 削除意図と新規登録が両立する merge 規則を明示する（fixture 名・URL 単位の集合差分）
- [x] 競合シナリオを tests/（options + exclusion-register の統合テスト）で固定する
- [x] `make check` が緑

## 実装手順
- merge 規則を決める（追加は和集合、削除は draft が boot 以降に消した ID/URL のみ反映、等）
- options の save-side（PBI-171/184 の表駆動保存）に再読込マージを組み込む
- kv-store への CAS 追加は不要ならやらない（scope を最小に保つ。必要と判断したら別途起票）
- 統合テストを tests/integration/ に追加する

## テスト戦略
- 統合テスト: fake storage で 2 ライターのインターリーブを再現し 3 シナリオを固定
- 既存の exclusion-section / exclusion-register テストが回帰網

## 見積もり
0.2人週（要チームでの見積もり）

## Definition of Done
- [x] 全 BDD シナリオが自動テストとして実装されパスする（実 3 モジュール接続の統合テスト 3 シナリオ + 単体 pin。RED→GREEN）
- [x] コードレビュー完了（タスクレビュー Approved・spec ✅。Critical/Important なし。Minor 5 件は下記）
- [x] ドキュメント更新済み（本 PBI に実装記録）

### レビュー記録（タスクレビュー Approved・Minor 5 件）

- 残存する競合窓（CAS を使わない設計の限界として台帳に明記）: (1) オプション保存の load と save の間にクイック登録が挟まるとその登録は黙って消える（縮小済み・排除には CAS が必要で PBI が禁止）。(2) 逆方向: banner 側の load→add→save が全体上書きのままのため、banner の load と save の間にオプション保存が挟まるとオプション側の追加が消え得る。いずれも窓は数ミリ秒〜秒単位で、PBI-148 の既知限界の圏内
- BDD シナリオ 3 の「いずれかのライターが動いた直後」は文字通りのインターリーブ再現ではなく障害直接注入で pin（Then の保障は両失敗点で実質十分）
- 書き込み失敗後に UI の一覧へ draft が残ること（コード上は保持）は未 pin。store 不変のみ表明
- BDD の「書き込み結果の整合を確認」を保存後の読み戻しと厳密に読む余地あり。brief の操作化（merge〜書き込み間の失敗で通知しない）は満たすため本タスクでは対応せず
- cap 超過時の最古エントリ丸めは無通知（merge 後 1 回適用の範囲内。通知が必要なら別課題）

## 実装記録

- **方式**: (a) マージ方式保存を採用。(b) storage.onChanged 再同期は不採用（brief の指針どおり）。
- **merge 規則**（`src/core/exclusions.ts` の `mergeExcludedEntries({ boot, draft, current })` に純粋関数として実装）:
  - final = (current ∪ draft-additions) − draft-removals
  - draft-additions = draft のうち boot スナップショットに無い URL（大文字小文字を同一視して比較）
  - draft-removals = boot スナップショットに有り draft で消えた URL（current に残っていても削除 → 復活させない）
  - draft が触っていない URL は current に残る場合のみ生き残る（他ライターの削除をオプション保存が復活させない）
  - 重複は current 側を優先して同一視、EXCLUDED_URLS_MAX は merge 後に 1 回適用（末尾 = 新しい方を残す）
  - boot・draft・current はいずれも正規化済み（add 時 `normalizeExclusionEntry`、load 時 `parseExcludedUrls`）なので、merge 内での追加正規化はしない
- **options 側**（`src/entrypoints/options/exclusion-section.ts`）: boot 時スナップショット `boot` を保持し、`onSave` は `deps.load()` で保存時に再読込 → merge → `deps.save(merged)` の 1 回書き込み。失敗（再読み込み・書き込みとも）は「保存に失敗しました」を表示して成功通知を出さず、draft は保持（シナリオ 3）。成功時は in-memory 一覧・boot スナップショット・ナビ件数を merge 結果に同期し、開いたままのページにもマージ後の一覧が見える。失敗 boot（load 失敗）では `boot = []` として扱い、ユーザー追記はすべて draft-additions になる。deps の形状（`load` / `save`）と content 側（`exclusion-register.ts` の load→add→save）、kv-store は無変更（CAS は PBI の方針どおり見送り）。
- **テスト**:
  - `tests/integration/exclusion-writers.test.ts`（新設）: fake chrome.storage 1 つに実セクション＋実ストア＋実 `registerExclusionChoice` を接続し、2 ライターのインターリーブで BDD 3 シナリオ（＋書き込み失敗バリエーション）を固定
  - `tests/core/exclusions.test.ts`: `mergeExcludedEntries` の単体テスト 6 件（追加統合・削除尊重・復活なし・同一視・上限後置き・boot 空）
  - `tests/options/exclusion-section.test.ts`: boot 失敗後に保存した場合の期待を新契約（保存時再読込も失敗 → 失敗扱い・書き込みなし）へ更新、merge 保存の回帰 1 件を追加
- **TDD**: 3 シナリオを先に追加して RED を確認（Scenario 1: クイック登録が `https://docs.google.com/spreadsheets/` ごと消える / Scenario 2: `[]` に上書き / Scenario 3: 再読込失敗でも成功通知）→ 実装後に GREEN。
- **検証**: `make check` 緑（typecheck、全 188 ファイル 3139 テスト、両ブラウザビルド、manifest 検査、web-ext lint errors 0）。`npm run eval` も従来どおりパス（分類 pin に影響なし）。既存の exclusion-register / dismiss-dialog / exclusions-store テストは無変更のまま退行なし。
