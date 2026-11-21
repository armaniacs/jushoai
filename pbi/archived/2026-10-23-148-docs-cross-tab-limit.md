# PBI: クロスタブの書き込み競合を既知の限界として明文化する

## ユーザーストーリー
拡張機能を保守する人として、upsertの書き込み競合の限界がコードと台帳に明文化されていてほしい、なぜならchrome.storageにトランザクションがなく、同一ホストを2タブで同時適用すると最後の書き込みが勝つことを知らずに競合バグと誤認するから

## 優先度
- 順位: 4 / 5
- RICEスコア: 500（Reach=20 / Impact=0.25 / Confidence=100% / Effort=0.01人週）
- 根拠: 動作は変わらないが、将来のレビューで競合バグと誤認するコストを減らす。コストが最小の対応

## 現象（レビュー指摘）
- `src/approval-store.ts` / `src/assignment-store.ts` / `src/mapping-store.ts` のupsert: load→merge→saveでシリアライズなし
- chrome.storageにトランザクションはなく、同一ホストを2タブで同時適用するとlast-writer-winsで他方の記録を消す
- upsert導入でマージは1箇所に集約され窓は縮んだが、限界は明文化されていない

## BDD受け入れシナリオ
Scenario: 限界がコードに明文化されている
  Given upsertを読む保守担当者
  When ストアファイルを開く
  Then クロスタブ競合の限界と、競合しない代替（onChangedでのマージ）がコメントに書いてある

## 受け入れ基準
- [x] 3ストアのupsertに、クロスタブ競合の限界と代替案をコメントで明記する → `approval-store.ts` / `assignment-store.ts` / `mapping-store.ts`のupsertに「Known limit (PBI-148)」コメントを追記
- [x] 本PBIの実装記録に、競合シナリオと将来の対処候補（`storage.onChanged`でのマージ）を記録する → 下記の通り

## 実装記録（2026-10-23）

- 3ストア（approval/assignment/mapping）のupsertに既知の限界をコメントで明記した。
- 競合シナリオ: 同一ホストのフォームを2タブで同時に承認適用すると、両者ともload→merge→saveで走り、chrome.storageにトランザクションがないため最後の書き込みが勝つ。他方の記録（ホスト→プロファイル割当て・承認記録・学習済み対応付け）が消える。
- 影響: 単一ユーザーのローカル拡張では稀（同じフォームを同時に2タブで適用するケース）。消えても次回の適用で再学習されるため、データ損失は一時的。
- 将来の対処候補: `chrome.storage.onChanged`で他タブの書き込みを検知してマージする、または単一writer（background経由）に寄せる。
- 動作の変更なし。`make check` exit 0。

## テスト戦略
- 単体: なし（コメントとドキュメントのみ）

## 見積もり
1（要チームでの見積もり）

## Definition of Done
- [x] 3ストアのコメント明記と本PBIの実装記録が済んでいる
- [x] `make check`が緑
