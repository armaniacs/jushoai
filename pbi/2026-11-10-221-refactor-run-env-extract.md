# PBI: content.ts の run env 組み立てを純粋関数に抽出する

## ユーザーストーリー
開発者として、次の run 横断機能を8つ目のクロージャとして足さずに済ませたい、なぜなら現在は FillBundle env の7クロージャが run() 内で毎回組み立てられ、記録系の畳み込みがすべてこの1箇所に生える構造だから

## 優先度
- 順位: 4 / 5
- RICEスコア: 7.0（Reach=3 / Impact=2 / Confidence=70% / Effort=0.6人週）
- 根拠: 次の run 横断機能追加時のコピー防止。開発者向けで利用者価値は間接。main 全体の分割はスコープ外とし確信度を確保

## 出どころ
- 発掘報告書 `.superpowers/sdd/backlog-discovery-2026-11-10.md` テーマ3
- `src/entrypoints/content.ts:241-313`（egress ゲートから classify 準備。run 前半）
- `src/entrypoints/content.ts:342-440`（bundle 組み立て。env 7クロージャ）
- `src/entrypoints/content.ts:500-561`（sync()。署名・planMount・avoid 再収集の3役）
- `src/entrypoints/content.ts:127-135`（main() の状態束）

## BDD受け入れシナリオ
Scenario: env 組み立てが関数になる
  Given buildRunEnv(deps) 純粋関数
  When run() を実行する
  Then 従来と同一の FillBundle が組み立てられる

Scenario: run() が短くなる
  Given 抽出の前後
  When run() の本体を読む
  Then loadRunState・prepare・buildRunEnv・createFillSession の4行で順序が読める

## 受け入れ基準
- [ ] bundle.env の組み立てが buildRunEnv(deps) に切り出される（引数は tabMemory・session 由来の最小依存）
- [ ] メッセージ登録4種・sync()・fillOne は動かさない
- [ ] main() 全体の分割・PBI-202 の tab-send 統一は含めない
- [ ] 既存テスト・E2E が緑のまま、make check が exit 0

## テスト戦略
- 既存テスト・E2E が回帰網になる。新規テストは buildRunEnv の単体テストのみ
- 検証: make check

## 見積もり
0.6人週（要チームでの見積もり）

## 技術的考慮事項
- PBI-202 が tab-send seam を Speculative で見送った判断と同型。束ねるのは env 組み立てだけに留める
- T1/T2 の後に着手する（依存ではないが変更の干渉を避ける）

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録）
