# PBI: ドメイン別カスタム対応付け（このサイトのこの欄はこの意味）

## ユーザーストーリー
誤分類されるサイトを使う利用者として、このサイトのこの欄はこの意味だと一度だけ教えて次から正しく入力したい、なぜなら毎回直すのは手間で、AIに値を送って直すのも嫌だから

## 優先度
- 順位: 2 / 8
- RICEスコア: 233.3（Reach=500 / Impact=2 / Confidence=70% / Effort=3人週）
- 根拠: 誤分類の決定版。PBI-130（ローカル学習ループ）の具体形で先行可。PBI-126（カバレッジ拡張）と競合しないよう補正層として実装する

## BDD受け入れシナリオ
Scenario: 教えた対応が次に活きる
  Given プレビューで分類を修正して「このサイトに覚えさせる」を承認した
  When 同一ドメインの同種欄を次に開く
  Then 覚えた対応が優先され正しく分類される

Scenario: 対応付けは外部に出ない
  Given 対応付けがある状態
  When AI分類・監査ログ出力が動く
  Then プロファイル値・修正値そのものは送信内容に含まれず、分類補正（辞書・重み・除外）のみ端末内に残る

## 受け入れ基準
- [x] 値は送らず分類ルールの補正のみ保存する（LLMには従来通りメタデータのみ） → `mapping-store.ts`は欄の署名（name/htmlId）→ categoryのペアのみ永続化。プロファイル値・修正値はstorage・メッセージ・監査ログに交差しない（テストで固定）
- [x] ドメイン別の解除・リセット手段がある → 設定ページの「覚えた対応付け」ページで削除ボタン（保存は即時永続化）
- [x] 除外URL登録サイトでは対応付けを使わない → 除外ページはセッションが`excluded`を返しパネルを開かない。`guest-fill`・`import-draft`も同じガード

## 実装記録（2026-10-23）

- `src/core/domain-mapping.ts`: 補正層。`fieldKeyFor`（teachable署名。name/htmlId。両方無ければ教えられない）、`hostOf`、`applyMapping`（このドメインのペアだけ分類を上書き。未一致の欄はルール分類のまま、学習値が既に一致する欄は書き換えない）。
- `src/mapping-store.ts`: `chrome.storage.local`の`jushoai:field-mappings`。壊れた・手編集の値は空リストとして読む。
- `src/ui/mapping-panel.ts`: 「この欄の意味を直す」パネル（closed Shadow DOM・textContentのみ）。意味のselect（unknownは選択肢から外す）＋「このサイトに覚えさせる」チェックボックス（既定checked）＋決める/やめる。Escape→null。
- `src/content-session.ts`: `recategorize(fieldId, category)`（1欄の分類を上書きしてルールのみで同期的に再計画。フィードバックスナップショットも追従）と`categoryFor`ゲッター。
- `src/ui/preview.ts`: 各行に「直す」ボタン（fieldIdがあれば1つ）。`onFix`オプション。
- `src/entrypoints/content.ts`: 分類経路を`applyMapping`で包む（学習値がルールに優先）。`onFix`ハンドラは承認時に`recategorize`し、remember承認時だけ署名→categoryのペアをupsert保存。
- `src/entrypoints/options/mapping-section.ts` + `nav.ts` + `index.html`: 「覚えた対応付け」ページ（削除は即時永続化）。
- テスト: `tests/core/domain-mapping.test.ts`（5件）、`tests/mapping-store.test.ts`（2件）、`tests/ui/mapping-panel.test.ts`（3件）、`tests/entrypoints/options-nav.test.ts`に6セクション化の期待値更新。
- `make check` exit 0（138ファイル 1787テスト + 1 expected fail）。

## テスト戦略
- E2E: 修正→記憶→再訪→改善の通し確認 → BDDシナリオは単体・統合テストで固定。実ブラウザのE2Eは`tests/e2e/`の既存手順に従い後日追加
- 統合: 対応付けの保存・適用・解除テスト → `mapping-store.test.ts`（壊れた値の読み）＋`domain-mapping.test.ts`（補正優先）
- 単体: 補正優先ロジック・確信度調整の単体テスト → `domain-mapping.test.ts`（confidence 1・未一致の欄の保持）

## 見積もり
8（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする（10テスト追加。教えた対応は次の分類に優先し、値そのものは端末内にしか残らない）
- [ ] コードレビュー完了
- [x] ドキュメント更新済み（本PBIに実装記録）
