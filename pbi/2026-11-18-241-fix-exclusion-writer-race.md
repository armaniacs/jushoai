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
- [ ] オプション側の保存をマージ方式（保存時に再読込して draft との差分を適用）または storage.onChanged での再同期にする
- [ ] 削除意図と新規登録が両立する merge 規則を明示する（fixture 名・URL 単位の集合差分）
- [ ] 競合シナリオを tests/（options + exclusion-register の統合テスト）で固定する
- [ ] `make check` が緑

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
- [ ] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録）
