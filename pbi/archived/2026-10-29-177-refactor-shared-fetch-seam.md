# PBI: 検証層コントラクトの文書化とfetch統合

## ユーザーストーリー
開発者として、検証6層の対応表と共有fetchを整備したい、なぜなら層分割ルールとseam置き場が文書化されず、新層追加のたび場当たりconfigが増え、fetch実装が二重化しているため

## 優先度
- 順位: 9 / 12
- RICEスコア: 35（Reach=5 / Impact=1 / Confidence=70% / Effort=0.1人月）
- 根拠: OPT-4と同点だがリスク軽減効果で後行。依存なし

## BDD受け入れシナリオ
Scenario: fetchを使うCLIが単一実装を共有する
  Given 単発・一括のfixture生成経路がある
  When 通信が必要になる
  Then どちらも同一のfetch seamを通る

Scenario: 層の対応が読める
  Given 検証6層がある
  When 新層を追加・変更する
  Then 対応表を照合できる

## 受け入れ基準
- [x] shared-fetchが単発・一括の両CLIで使われている
- [x] 層対応表（config/include/make/実ブラウザ要否/network要否/check包含）が文書化されている
- [x] 既存CLIの振る舞いが変わらない

## テスト戦略
- E2E: 対象外
- 統合: CLIの疎通確認
- 単体: fetch seamのテスト

## 見積もり
- 0.1人月

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み
