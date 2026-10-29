# PBI: content script のタブスコープメモリの所有者集約

## ユーザーストーリー
開発者として、タブスコープメモリ（guest・carryover・lastFailure）を 1 所有者に束ねたい、なぜなら「タブで消える・storage/監査/エクスポートには決して出ない」「guest は one-shot」という安全性に関わる規律が閉包変数 3 個＋コメント 4 か所以上＋FillFlow env コールバック 2 本に散在するため

## 優先度
- 順位: 12 / 13
- RICEスコア: 8（Reach=1.5 / Impact=1 / Confidence=80% / Effort=0.15人月）
- 根拠: 安全性規律の locality を 1 interface の裏に置く。one-shot snapshot 意味の保持が条件。依存なし

## BDD受け入れシナリオ
Scenario: guest は one-shot で消費される
  Given guest パネルで値が設定される
  When 適用が完了する
  Then guest が消費され、同タブの 2 回目の分類は stored data を使う

Scenario: carryover はどこにも出ない
  Given carryover が記録される
  When storage・エクスポート・監査ログを確認する
  Then carryover がどこにも現れない（単体テストで pin）

## 受け入れ基準
- [x] 1 所有者（src/content/tab-scope.ts）に set/merge/consume/peek が集まる
- [x] activeGuest は run 開始時 snapshot の意味を保つ（最新値参照に変えない）
- [x] FillFlowEnv 契約（recordCarryover の位置・順序）は不変
- [x] 「storage に出ない」規律を単体テストで pin
- [x] `make check` が緑

## テスト戦略
- 単体: 所有者オブジェクトの set/merge/consume/peek を pin（content.ts は defineContentScript 内で単体 import 不能のため src/content/ に切り出す）
- E2E: 既存シナリオが不変であること（guest シナリオは現状無し・手動確認項目として残る）

## 実装アプローチ
- 閉包変数 3 個の参照点（guest 設定・one-shot 消費・overlay snapshot・fill-one deps・recordCarryover・lastFailure）を所有者オブジェクトの操作に置き換え、寿命・破棄・非永続化の規律を 1 か所の doc コメントに寄せる

## 見積もり
0.15人月

## 技術的考慮事項
- activeGuest を「run 開始時 snapshot」から最新値参照に変えると one-shot 消費タイミングがずれ、自動テストが赤にならず手動確認で発覚する壊れ方をする（最大の落とし穴）
- carryover は fill-one と run の両方から () => 参照する。オブジェクト化時に getter 経由で取得タイミングを変えない

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み
