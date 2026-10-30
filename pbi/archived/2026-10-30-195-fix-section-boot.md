# PBI: options list section の boot 骨格の所有者集約

## ユーザーストーリー
設定画面の利用者として、読み込み失敗時に空のページではなく通知を見たい、なぜなら exclusion/mapping は `void deps.load().then(...)` が catch なしで、load 失敗が unhandled rejection になり h2 すら出ない完全な空白ページのままになるため

## 優先度
- 順位: 6 / 13
- RICEスコア: 27（Reach=2 / Impact=2 / Confidence=100% / Effort=0.15人月）
- 根拠: 実在の不整合（unhandled rejection＋空白 UI）を直接消す。audit 側に正解前例（try/catch＋通知）が実在。依存なし

## BDD受け入れシナリオ
Scenario: load 失敗時に通知が出る
  Given deps.load が拒否する状態
  When 起動しないURLページを開く
  Then 空リスト＋「読み込めませんでした」通知が出る（unhandled rejection なし・保存は編集可能）

Scenario: mapping も同じ骨格を通る
  Given deps.load が拒否する状態
  When 覚えた対応付けページを開く
  Then 同一の boot 骨格から通知が出る

## 受け入れ基準
- [x] list section の boot 骨格（load→render→失敗通知）が 1 所有者に集約される
- [x] exclusion/mapping で load 失敗時に通知が出る（tests/options/ に reject stub で新規固定）
- [x] 既有の保存失敗時 entries 保持と audit 現行文言（「ログを読み込めませんでした。」）は不変
- [x] mapping の remove 時 `void deps.save(entries)`（catch なし）も後始末される
- [x] `make check` が緑

## テスト戦略
- 単体: load 失敗は tests/options/ に reject stub で新規固定（現状 load 失敗テスト不在のため）
- 統合: audit の refresh（正解前例）と文言が不変であること
- 構造: 新 section 追加が deps 宣言だけで済むことを型で固定

## 実装アプローチ
- boot 骨格（load→state→render→失敗通知）を単一所有者（audit 側の refresh を正解に）に寄せ、section は load/save の deps 宣言だけにする
- 失敗通知文言は監査側に揃える（「読み込めませんでした。」系）

## 見積もり
0.15人月

## 技術的考慮事項
- guide-visibility / card-builders-parity / select-builders-parity の 3 テストが main.ts を mock 付きで import しており、mount 系シグネチャ変更・「load 解決後 render」順序をずらすと真っ先に落ちる（最大の落とし穴）
- exclusion テストは「load 解決後の render」に依存するため、boot 骨格を同期 render にしない

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み
