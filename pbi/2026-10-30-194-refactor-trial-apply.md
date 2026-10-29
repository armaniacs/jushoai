# PBI: 試用サンプル適用の with* トリオの 1 関数化

## ユーザーストーリー
開発者として、試用サンプル適用の片側/両側の差を引数に落とした 1 関数にまとめたい、なぜなら withTrialProfile / withTrialAddress / withTrialBoth が「selectImportTargets → blank 判定 → 適用 → 先頭差し替え」を 3 重複させ、「第1カードを fork せず修復する」規律がコメント 2 か所＋実装 3 か所に散在するため

## 優先度
- 順位: 5 / 13
- RICEスコア: 32（Reach=2 / Impact=1 / Confidence=80% / Effort=0.05人月）
- 根拠: 差分が「どのリストを書き換えるか」に集約でき、単体 parity で固定できる。依存なし

## BDD受け入れシナリオ
Scenario: 空リストから両側 trial は 1 枚ずつ構築する
  Given プロファイル・住所とも 0 件
  When 両側 trial を実行する
  Then 各側に 1 枚作って埋める（現行どおり・自動保存しない）

Scenario: 非 blank の第1カードは fork せず blank 欄だけ埋める
  Given 値の入った第1カードがある
  When trial を実行する
  Then in-place 修復で blank 欄だけが埋まる（現行 3 関数と新 1 関数の parity 単体で pin）

## 受け入れ基準
- [ ] 1 関数に束ねられ、片側/両側の差が引数になる（3 重複削除）
- [ ] 配列差し替えの差（空リスト時 1 枚構築 vs 先頭挿入）が現行どおり
- [ ] prefecture 不一致（ADDRESS_BLANK_KEYS に prefecture が無いが trial は埋める）は現状維持（コメント記録のまま・別 PBI）
- [ ] e2e 4 本（trial toast 文言・card 数 1 含む）と `make check` が緑

## テスト戦略
- 単体: 現行 3 関数と新 1 関数の parity を tests/options/ に新規固定（現状単体テスト参照ゼロのため）
- E2E: runOptionsTrialInput / runOptionsZeroCountTrial / runOptionsPerSideGuide の既存 pin が成立すること
- 構造: trial は validate しない（save 側 saveBoth/onSaveSide が担う）ことをコメント 1 か所に寄せる

## 実装アプローチ
- 「sample を片側 or 両側に適用する」1 関数に束ね、対象リスト（profiles/addresses/両方）を引数に落とす

## 見積もり
0.05人月

## 技術的考慮事項
- 空リスト時の 1 枚構築 vs 先頭挿入の差し替え差を一律にすると、e2e 'recovers through trial after deleting the last profile' の 0 枚復帰で card 2 枚化・toast 文言変化が起きて落ちる（最大の落とし穴）

## Definition of Done
- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み
