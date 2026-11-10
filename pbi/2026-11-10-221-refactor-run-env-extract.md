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
- [x] bundle.env の組み立てが buildRunEnv(deps) に切り出される（引数は tabMemory・session 由来の最小依存）
- [x] メッセージ登録4種・sync()・fillOne は動かさない（options・messages・鍵管理系への不干渉を含む）
- [x] main() 全体の分割・PBI-202 の tab-send 統一は含めない
- [x] 既存テスト・E2E が緑のまま、make check が exit 0
- [x] 等価テストの fixture は tel3分割・zip2分割・fullName2欄・入力済み混在・呼び順を要件として受入または実装記録に残す

## テスト戦略
- 既存テスト・E2E が回帰網になる。新規テストは buildRunEnv の単体テストのみ
- 検証: make check

## 見積もり
0.6人週（要チームでの見積もり）

## 技術的考慮事項
- PBI-202 が tab-send seam を Speculative で見送った判断と同型。束ねるのは env 組み立てだけに留める
- T1/T2 の後に着手する（依存ではないが変更の干渉を避ける）
- 性能改善ではない（純粋な構造整理）。利用者の誤期待を防ぐため約束として残す

## Definition of Done
- [x] 全 BDD シナリオが自動テストとして実装されパスする
- [x] コードレビュー完了（2026-11-11 再レビューゲート Approved。独立レビューによる充足）
- [x] ドキュメント更新済み（本 PBI に実装記録）

## 実装記録 (2026-11-10, work/pbi-221)
- 新規 src/content/run-env.ts に buildRunEnv(deps) を追加し、bundle.input の
  field pass と env 11口 (classify・checkConsent・injectPlan・persistSelection・
  openUrl・feedbackContext・isExcluded・recordCarryover・recordApproval・
  recordAssignment・onApplied) の組み立てを移した。注記の「7クロージャ」は
  発掘時点の数え方で、実装は現行の env 全口を等価に移している。
- deps は run() が解決済みで渡す値 (session 解決値・tabMemory snapshot・
  pageHref/provider/version) と副作用口 (既定は元の実モジュール) に分け、
  組み立て時に DOM・chrome・tabMemory を読まない純粋組み立てにした。
- session は bundle の後に作られるため recordApproval 用の選択取得だけ
  late-bound getter (getSelection) で受け、apply 時の値を読む等価性を保つ。
- pageHref/host は呼出時に読み直す（遅延読み）。レビュー指摘で構築時 snapshot
  をやめ、getPageHref/getHost の getter 化で旧意味論を復元した（provider/version
  は実行中に変わらない固定値のため snapshot のまま）。等価テストで SPA 遷移時の
  呼出時点値の使用を固定した。
- run() の骨格は loadRunState → prepare → buildRunEnv → createFillSession の
  順に読める構成にした。egress gate・status・preview 配線・sync・fillOne・
  メッセージ登録4種・main 全体には触れていない。
- 等価テスト tests/content/run-env.test.ts (5件) で固定: tel3分割・zip2分割・
  fullName2欄の classify 等価、入力済み混在 (already-filled)、apply 取引の
  呼び順 (consent→inject→persist→carryover→feedback→承認/割当/guest)、
  onApplied の snapshot 消費。
- 検証: npx tsc --noEmit exit 0、vitest 全件 177ファイル 2303件 pass (+1件は
  既存の expected fail)、make check exit 0 (両ブラウザ build・manifest・
  web-ext lint 含む。Firefox/Android の警告2件は既存の既知警告)。
- 残務なし。レビュー観点は等価テストと make check の緑で代替した。
