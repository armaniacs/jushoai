# PBI: 分類カバレッジ拡張（汎用select・日付・会社・カスタム）

## ユーザーストーリー
日本式フォームを使う利用者として、会社名・部署・生年月日・汎用select・カスタム項目も正しい欄に入ってほしい、なぜなら現状は除外・未分類で注入されず手入力が残るから

## 優先度
- 順位: 3 / 7
- RICEスコア: 426.7（Reach=800 / Impact=2 / Confidence=80% / Effort=3人週）
- 根拠: 影響範囲最大級。ローカル学習ループ（130）の前提になるため先行。依存なし

## BDD受け入れシナリオ
Scenario: 会社・部署・日付が分類される
  Given 会社名・部署・生年月日欄のあるフォーム
  When 「JushoAIで入力」を押す
  Then 各欄が対応カテゴリでプレビューされ承認後に注入される

Scenario: 対象外は安全に除外される
  Given checkbox・hidden・submit等の操作要素
  When 走査する
  Then 分類せず注入もしない（現行の除外方針を維持）

## 受け入れ基準
- [x] 新カテゴリ追加時は`CATEGORIES`・prompt schema・`parseLlmOutput`を同時更新する → 会社・部署（PBI-119）・生年月日1欄（PBI-118）・汎用select（PBI-41）を同時更新済み。`parseLlmOutput`はCATEGORIESのallow-listで検証するため新カテゴリも自動で通る
- [x] 正規表現テストが落ちたら期待値ではなく正規表現を直す → テスト方針として運用中。corpusのfixture修正は`make eval`の指標とセット
- [x] 対象URLを持つ場合は`make addurl URL=<url>`から始め最小再現fixture＋期待値を埋める → 本PBIはtarget URLなし。`samples/`に会社・日付の再現フォームがあり`tests/integration/samples.test.ts`で固定
- [x] radioはname単位1欄・checkbox対象外・hidden除外の方針を崩さない → `radio-policy.ts`＋走査除外は現行のまま（`tests/core/radio-policy.test.ts`・`exclusions.test.ts`）

## 実装記録（2026-10-23）

- **カバレッジ部分は先行PBIで実装済み**: 会社名・会社の部署（PBI-119: `company` / `companyDepartment`）、生年月日1欄（PBI-118: `birthday`、text・type=date両対応）、汎用select（PBI-41: 性別・年代を`isAllowedRadioCategory`で共有、残りはselect専用）。`CATEGORIES`・prompt schema・`parseLlmOutput`・planner・profileは同時更新済み。
- **カスタム対応付けはチェーン先のPBI-138**（ドメイン欄のカスタム対応付け）で実装する。本PBIのBDDシナリオ「対象外は安全に除外される」は現行の走査除外方針（checkbox対象外・hidden除外・submit等操作要素除外・radio name単位1欄）で固定済み。
- 検証: `make eval` exit 0（corpus 3テスト、ruleHits 141/168 = 83.9%）。`make check` exit 0。
- ドキュメントのみのコミット（コード変更なし）。

## テスト戦略
- E2E: 実フォームでの注入確認（React/Vueのsetter＋イベント発火を含む）
- 統合: `tests/integration/samples.test.ts`へ新規fixtureケース追加
- 単体: `tests/core/`に`makeMeta` fixtureを先に追加し失敗させてから直す

## 見積もり
8（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする（会社・日付・汎用selectはPBI-118/119/41で実装、対象外除外は既存の走査方針で固定）
- [ ] コードレビュー完了
- [x] ドキュメント更新済み（本PBIに実装記録。カスタム対応付けはPBI-138に委譲）
