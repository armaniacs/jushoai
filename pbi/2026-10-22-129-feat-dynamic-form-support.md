# PBI: 動的フォーム対応（iframe・Shadow DOM・SPA再走査）

## ユーザーストーリー
モダンな申込フォームを使う利用者として、後から描画される欄や埋め込み欄にもボタンが出て入力したい、なぜなら現状は静的フォーム中心で動的欄が取りこぼされるから

## 優先度
- 順位: 6 / 7
- RICEスコア: 100（Reach=400 / Impact=2 / Confidence=50% / Effort=4人週）
- 根拠: 価値は大きいが確信度低・工数大。PBI-123（iframe調査）が前提のため後置。クロスオリジンiframeは不可の可能性あり

## BDD受け入れシナリオ
Scenario: 後描画フォームに追従する
  Given 初期表示後にJSで追加されるフォーム
  When MutationObserver相当の再検出が働く
  Then ボタンが出て分類・プレビュー・注入できる

Scenario: 取れない埋め込みは説明する
  Given クロスオリジン等で走査できない埋め込み
  When ボタンを押す
  Then 注入せず理由と手動入力への案内を出す

## 受け入れ基準
- [x] 同一オリジン外のDOMには触らない（権限・隔離を崩さない）（content.ts の defineContentScript は matches のみで allFrames 指定なし→MV3 既定でトップフレームのみ注入。設計書 2026-10-21-iframe-design.md:15 が manifest に all_frames キーなしを確認済み）
- [x] 再走査の無限ループ・多重ボタンを起こさない（prefilter isRelevantMutation/shouldSyncForMutations＋署名一致スキップ＋500ms debounce の2段＋コンテナ単位 mounted map・planMounts。tests/entrypoints/content-sync-prefilter.test.ts 7件＋tests/dom/mount-plan.test.ts 4件が緑）
- [ ] 対象URLを持つ場合は`make addurl`→最小再現fixture→期待値の手順を守る

## テスト戦略
- E2E: 実ブラウザでの後描画・埋め込みフォーム確認（HEADLESS可）
- 統合: `samples/`へ動的再現フォーム追加
- 単体: jsdomでの走査・検出テスト

## 見積もり
8（要チームでの見積もり）

## Definition of Done
- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [ ] ドキュメント更新済み

## 実装記録（2026-10-27 残置判断）

- 後描画フォームへの追従（シナリオ1）は既存実装で担保済み: content.ts の sync() が prefilter+署名付きの MutationObserver 再走査で destroy/mount を行う。多重ボタンは mounted map（コンテナ単位）で防ぎ、無限ループは prefilter（無関係バッチ除外）と署名一致スキップの2段で防ぐ（受け入れ基準1・2は既存実装で担保）
- 同一オリジン外のDOMには触らない: content script はメインフレームのみ（WXT 既定）で、クロスオリジン iframe には注入しない
- クロスオリジン埋め込みは README「対応しないもの」に対象外として記録済み（PBI-123 の調査結果）
- 残る差分（取れない埋め込みを押したときの説明表示の強化）は、自身の優先度欄の通り Effort 4人週・Confidence 50% で、着手条件（PBI-123 の調査記録を材料にした設計判断）が未到来のため backlog として残置する（92 storage-pick-hardening の先行例に倣う。新規実装はしない）
