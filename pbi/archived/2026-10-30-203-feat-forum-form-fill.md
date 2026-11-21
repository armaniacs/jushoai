# PBI: 子育てひろばフォーラム申込フォームへの対応（参加者名をルール語彙に足す）

## ユーザーストーリー
フォーラム申込フォーム（WPForms）を使う利用者として、参加者名・フリガナ・所属団体名・都道府県・電話番号・メールアドレスを「JushoAIで入力」で補完したい、なぜなら (01)参加者名 だけルール語彙に無く未分類で残り、欄ごとに手入力が残るから

## 出どころ
- 対象 URL: https://kosodatehiroba.com/form/forum（tests/target-url.md 登録済み）
- 現状（2026-10-30 の probe 計測）: fixture の分類は 参加者名 → unknown、フリガナ → fullNameKana、所属団体名 → company、都道府県 → prefecture、電話番号 → tel、メールアドレス → email

## BDD受け入れシナリオ
Scenario: 参加者名が氏名として分類される
  Given 「(01)参加者名 *」のラベルを持つ単欄
  When 「JushoAIで入力」を押す
  Then fullName に分類され氏名がプレビューされ、承認後に注入される

Scenario: 実ページの欄構成が fixture で固定される
  Given samples/forum.html の最小再現
  When tests/integration/samples.test.ts を実行する
  Then 参加者名・フリガナ・所属団体名・都道府県・電話番号・メールアドレス 2 欄が対応値で注入され、サイト内検索欄（name="s"）は未分類のまま置かれる

## 受け入れ基準
- [x] 参加者名はルールで fullName に分類される（LLM に依存しない）
- [x] 対象 URL の手順どおり make addurl で fixture と samples.test.ts のケースが配線済み。期待値を埋めてテストを緑にする
- [x] サイト内検索欄（name="s"）は未分類のまま注入しない
- [x] make eval でルール分類の指標が劣化しない

## 実装手順
- fixture 先行: tests/core/ に「参加者名 → fullName」の再現 fixture を makeMeta で追加して失敗させてから正規表現を直す。正規表現が落ちたら期待値ではなく正規表現を直す
- samples/forum.html の都道府県 select を実ページどおり（placeholder 都道府県選択 + 代表 option）にして、注入経路を fixture で見えるようにする
- tests/integration/samples.test.ts の forum.html ケースに期待値を埋める

## テスト戦略
- 統合: tests/integration/samples.test.ts の forum.html ケースで期待値固定
- 単体: tests/core/classify-rules.test.ts に再現 fixture を先に追加し失敗させてから直す
- 指標: make eval で分類指標を確認

## 見積もり
1（要チームでの見積もり）

## Definition of Done
- [x] 全 BDD シナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] ドキュメント更新済み（本 PBI に実装記録）

## 実装記録（2026-10-30）
- fixture 先行: tests/core/classify-rules.test.ts に (01)参加者名 の text 欄 → fullName の再現 fixture（positives 表）と kana 兄弟欄（(02)参加者名フリガナ）の pipeline 回帰を makeMeta で追加。参加者名欄が null（未分類）で RED を確認してから src/core/classify-rules.ts の FULL_NAME に 参加者名 を足し、GREEN（212 テスト）を確認。kana 欄は resolveKana の帰属で fullNameKana のまま不変。
- samples/forum.html: 都道府県 select を実ページどおり（placeholder 都道府県選択 + 北海道・東京都、option value は名称そのもの）に整備し、先頭コメントを最終状態の文言に変更。サイト内検索欄 name="s" 2 欄は未分類のまま残す。
- tests/integration/samples.test.ts: forum.html ケースに期待値を固定し、重複していた 's' キー 2 つを削除（検索欄は plan に出ないため）。
- 期待値の差分: 作業案の 山田　太郎 / ヤマダ　タロウ（全角スペース結合）に対し実値は 山田 太郎 / ヤマダ タロウ（半角スペース結合）。結合区切りは planner が detectNameSeparator(placeholder) で決め、この欄は placeholder 空 → 既定の半角スペース。既存 pin と整合する（overseas-webform-joshibi の name_kana_last ヤマダ タロウ が同一ケース。single-field-form の全角 pin は placeholder 由来なので別物）ため実値を pin した。
- 検証: make eval は forum.html が ruleHits 6→7・llmFallbacks 3→2・fillable 4→5、集計 162/34/101 → 163/33/102。他 fixture の行は全行不変で劣化なし。tests/eval/corpus.eval.ts の基準値を 163/33/102 に更新。make check は exit 0（173 ファイル・2208 テストと期待失敗 1）。
- レビュー（2026-10-30）: タスクレビュー（spec 適合 + コード品質）で Approved。Critical・Important なし。2 つの差分（半角結合の pin・corpus.eval.ts 基準値更新）は機構・既存 pin・運用コメントの 3 点から検証済みで正当。残りは cosmetic（報告文の算数、既存 fixture の古い trim コメント、実ページ由来の重複 id="search"）で SDD 台帳に記録。make check の期待失敗 1 は既存の意図的マーカー（it.fails、tests/ai/loopback-octet-range.test.ts）。
