# PBI: プロバイダ試行の成否組立の registry 内一元化

## ユーザーストーリー
開発者として、試行結果→応答の折り畳み（auth 記帳＋reason 組立）を registry 内 1 箇所にまとめたい、なぜなら HttpAuthError → authBlock.record + 'auth' が 3 箇所に在り、test() の bad-response→network 非対称が 2 コメントで凍結され、プロバイダ追加のたびに 4 か所読み比べが発生するため

## 優先度
- 順位: 3 / 13
- RICEスコア: 64（Reach=4 / Impact=1 / Confidence=80% / Effort=0.05人月）
- 根拠: 同ファイル内の純粋折り畳み。test() 非対称はテスト未固定のため本 PBI で pin する。依存なし

## BDD受け入れシナリオ
Scenario: 401 は 1 箇所の折り畳みで record+'auth' を返る
  Given adapter の試行が HttpAuthError を投げる
  When classify・test のどちらの経路でも折り畳む
  Then authBlock.record と reason 'auth' が 1 箇所の経路から出る

Scenario: unknown error の写像が経路別に明示される
  Given adapter の試行が未知の error を投げる
  When 折り畳む
  Then classify は bad-response、test は network（対応表 1 行・テスト pin 済み）

## 受け入れ基準
- [ ] auth 記帳が 1 箇所の折り畳みになる（3 箇所削除）
- [ ] record は instanceof HttpAuthError 判定のまま（reason 文字列判定にしない）
- [ ] test() 非対称の写像が対応表 1 行になり、テストで pin される（現状未固定）
- [ ] select の ignoreAuthFailure（dial 前 'auth'・record なし）と test() 成功時の clear は不変
- [ ] `make check` が緑（classify 401→auth+record+status auth-error+invalidate の既存 pin 含む）

## テスト戦略
- 単体: tests/llm/provider-registry.test.ts に test() 経路の unknown→network ケースを追加して pin
- 統合: TestResponse wire 形状（options UI の reason 消費）が不変であること
- 構造: 試行→応答の折り畳み 1 箇所 + 経路別写像の対応表

## 実装アプローチ
- adapter の試行結果（throw と outcome.error の両経路）を 1 か所で応答に折り畳む registry 内 module を新設し、非対称は引数（経路名）で明示する

## 見積もり
0.05人月

## 技術的考慮事項
- record を reason==='auth' 文字列判定に置き換えると、failureReason 'auth' を返すだけの adapter で record が発火する（最大の落とし穴）
- 'rejected'（400/422）と compat 再試行条件の同値共有は触らない

## Definition of Done
- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み
