# PBI: Firefoxでbuilt-in無言none化を通知する

## ユーザーストーリー

Firefox利用者として、Chrome側データを移行したのにAI補助が無効に見える理由（Prompt APIなし）に気づけるようにしてほしい、なぜならFirefoxにはPrompt APIがなく`normalizeAiSettings`が保存済みの`built-in`を無言で`none`に落とすため、設定が勝手に戻ったように見えて混乱するから。

## 優先度

- 順位: 32位 / 40件
- RICEスコア: 25（Reach=5 / Impact=0.5 / Confidence=50% / Effort=0.05人月）
- 根拠: 移行時の混乱を防ぐ小規模なUX改善。依存なし。
- 出典: checking-team Legacy Low
- 対象: src/ai/settings.ts:11-26、src/ai/settings-store.ts:19-29

## BDD受け入れシナリオ

```gherkin
Scenario: Firefoxでbuilt-in保存値を読み込むと注意が表示される
  Given Firefoxビルドでprovider=built-inの保存値がある
  When normalize前後の差分（built-in→none）を検出して読み込むとき
  Then 設定UIにPrompt APIが無い旨の注意が表示され、providerはnoneとして動作する

Scenario: 注意を見た利用者はクラウドプロバイダに切り替えられる
  Given Firefoxでbuilt-in無効化の注意が表示されている
  When 利用者がopenai/geminiを選択して保存するとき
  Then 注意は消え、選択したプロバイダがそのまま保持される（書き戻しでbuilt-inに戻らない）
```

## 受け入れ基準

- [x] Firefoxでbuilt-in保存値の読み込み時にnormalize前後差分を検出できること
- [x] 差分検出時にPrompt APIなしの旨の注意が設定UIに表示されること
- [x] 注意表示後もproviderはnoneとして安全に動作すること
- [x] クラウドプロバイダへの切り替え保存後は注意が消え書き戻しが起きないこと

## テスト戦略

- 単体: Firefox条件でbuilt-in入力がnoneに正規化され差分検出できることを確認する
- 単体: 非Firefox条件では差分なし・注意なしとなることを確認する
- 回帰: `make check` が通ることを確認する

## 見積もり

- 0.05人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
