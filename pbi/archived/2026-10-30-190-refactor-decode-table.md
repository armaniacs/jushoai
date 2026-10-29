# PBI: decodeRequestResult を REQUEST_WIRE_KEYS 表駆動にする

## ユーザーストーリー
開発者として、decode の型別分岐を REQUEST_WIRE_KEYS 表駆動の単一アームにまとめたい、なぜなら表が allow-list の正準に据えられているのに decode（5 連続 arm）と encodeRequest（6 arm switch）が手書きのまま残り、新 wire 型追加のたびに表＋decode＋encode＋NOTE の 4 箇所編集が復活するため

## 優先度
- 順位: 1 / 13
- RICEスコア: 112（Reach=7 / Impact=1 / Confidence=80% / Effort=0.05人月）
- 根拠: 表は既在、単純5型の arm 削減は純粋機械的で低リスク。依存なし。最初に着手

## BDD受け入れシナリオ
Scenario: 型ごとに同一規律で拒否される
  Given 未知キー・欠落キー・version ずれのリクエスト
  When decodeRequestResult を実行する
  Then 表走査 1 アームから malformed/version が返る（挙動は既存 pin どおり）

Scenario: round-trip が保たれる
  Given 正常なリクエスト
  When encodeRequest → decodeRequestResult を通す
  Then 既存テストの期待値どおりに復元される

## 受け入れ基準
- [x] decodeRequestResult の単純5型が表走査 1 アームになる
- [x] ai-classify 特殊 arm（fields 配列検証・oversize・chunk parse）は残る
- [x] encodeRequest も表駆動に寄せる（ai-classify の fields 刻印は維持）
- [x] `make check` が緑（extra key→malformed、legacy v 無し許容、chunk sanity の既存 pin 含む）

## テスト戦略
- 単体: tests/messages.test.ts の既存 pin がそのまま成立すること
- 統合: gateway 経路（decodeErrorToClassifyFailure）の語彙接続が不変であること
- 構造: 新 wire 型追加が表 1 行で済むことを型（REQUEST_WIRE_KEYS の key 網羅）で固定

## 実装アプローチ
- decode の 5 arm を `REQUEST_WIRE_KEYS` 走査の 1 アームに置き換える。v を除く filter（legacy 無印許容）は走査の前段に置く
- ai-classify は非対称な検証（withChunk 判定・oversize・parseSchedule）を持つため表外の特別 arm として残す

## 見積もり
0.05人月

## 技術的考慮事項
- DecodedAiRequest は Exclude+A で書かれているため、表走査の返り値は型ごとの builder か正しい cast で組み立てる
- hasOnlyKeys は keys.length 比較なので、v を除く filter を忘れると legacy 無印リクエストが全滅する（最大の落とし穴）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み
