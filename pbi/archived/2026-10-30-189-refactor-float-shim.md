# PBI: float-layerのshim化

## ユーザーストーリー
開発者として、float-layerをre-export shimに痩せさせたい、なぜならNoticeCenter集約後に透過層として残存し、新旧2名とテスト二重化の維持コストだけが残っているため

## 優先度
- 順位: 9 / 9
- RICEスコア: 36（Reach=8 / Impact=0.5 / Confidence=90% / Effort=0.1人月）
- 根拠: 機械的置換で低リスクだが効果も小さい。依存なし

## BDD受け入れシナリオ
Scenario: 新規参照が新名のみになる
  Given 通知呼び出しがある
  When 参照先を読む
  Then notice-center直参照である

Scenario: テストが一本化される
  Given 通知テストがある
  When 実行する
  Then 新名経路のみで緑である

## 受け入れ基準
- [x] 呼び出し側が新名直参照になっている
- [x] テストが新名に一本化されている
- [x] float-layerがshim化されている

## テスト戦略
- E2E: 通知表示の回帰確認
- 統合: オプション画面の通知経路
- 単体: 既存テストの緑維持

## 見積もり
- 0.1人月

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み
