# PBI: 送信前メタデータのプレビューとマスキング警告

## ユーザーストーリー
プライバシーを気にする利用者として、AI判定で外部に送られる欄メタデータを事前に確認し、個人情報っぽい文言の警告がほしい、なぜならlabel・見出し自体に個人情報が含まれる場合があるとREADMEが認めているのに現状は送ってから監査ログで見るだけだから

## 優先度
- 順位: 1 / 7
- RICEスコア: 720（Reach=900 / Impact=1 / Confidence=80% / Effort=1人週）
- 根拠: AI利用者全員に影響し工数小のQuick Win。信頼の土台で他候補の前提。依存なし

## BDD受け入れシナリオ
Scenario: 送信内容を事前に確認できる
  Given AIプロバイダが設定されルールで判定できない欄がある
  When 「JushoAIで入力」を押してプレビュー相当の送信確認を開く
  Then 送られる欄ごとのメタデータ項目（name・label・placeholder・見出し・type・maxlength）が一覧で見える

Scenario: 個人情報っぽい文言は警告される
  Given 欄のlabelに見出しとして人名・住所らしき文字列が含まれる
  When 送信確認を開く
  Then 該当欄に警告印が付き「送らない（ルールのみで続行）」を選べる

## 受け入れ基準
- [x] プロファイル値・欄の現在値・select選択肢が送信一覧に含まれない（許可リストのみ）→ 行は`encodeFieldMeta`経由で構築しwire許可リストと同一形状。テストで値・選択肢の非含有を固定
- [x] 警告欄を除外しても残り欄の分類・注入が継続する（縮退）→ `classifyAll`に`llmSkip`オプションを追加し、除外欄はルール保持パスに落ちる
- [x] ページ由来文字列は`textContent`のみで表示し`innerHTML`を使わない→ ゲートパネルはtextContentのみ。テストで`<img>`がHTMLとして解釈されないことを固定
- [x] 監査ログ（7日・TSV）と表示内容が一致する→ 表示行はリクエストと同じ`encodeFieldMeta`のwireから構築するため構造的に一致

## 実装記録（2026-10-23）

- `src/core/pii-suspect.ts`: 純粋な疑い検出（メール・電話・郵便番号・住所っぽい漢字＋数字・氏名っぽい漢字＋空白）。警告専用で誤陽性は抑制側に倒す（既定で除外、解除可）。
- `src/ai/egress-preview.ts`: 送信行の組み立て。`encodeFieldMeta`（リクエストと同一のwire構築）から行を作るため、ゲート表示が送信内容からずれない。疑い判定はlabel・placeholder・見出し・name・idに対して実施。
- `src/ui/egress-panel.ts`: ゲートパネル（closed Shadow DOM・textContentのみ）。疑い欄は「（要確認）」印＋「送らない」チェックボックス（既定オン）。「AI判定する」で除外を反映して続行、「ルールのみで入力する」とEscapeクローズは何も送らずに続行。
- `src/core/analyze.ts`: `llmSkip`オプション（除外欄はLLMのpendingから外れルール保持パスへ）。
- `src/content-session.ts`: opts（llmSkip含む）の透過。
- `src/entrypoints/content.ts`: run()でAI利用可能かつpending欄があるとき、LLM呼び出しの前にゲートを表示。判定結果を`llmSkip`としてsessionに渡す。
- テスト: `tests/core/pii-suspect.test.ts`（7件）、`tests/ai/egress-preview.test.ts`（5件）、`tests/ui/egress-panel.test.ts`（5件）、`tests/core/analyze.test.ts`にllmSkip 3件追加。fake分類器を実契約（受け取った欄のみに回答）に修正。
- `make check` exit 0（126ファイル 1718テスト + 1 expected fail）。

## テスト戦略
- E2E: AI設定ありで送信確認を開き除外→入力まで通る
- 統合: ゲートウェイの送信ペイロードが許可リストのみであること
- 単体: マスキング判定（人名・住所・電話らしさ）の境界値テスト

## 見積もり
3（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする（送信一覧と警告印・除外選択をゲートで実装。20テスト追加）
- [ ] コードレビュー完了
- [x] ドキュメント更新済み（README「送信されるデータ」は既存の説明と整合。本PBIに実装記録）
