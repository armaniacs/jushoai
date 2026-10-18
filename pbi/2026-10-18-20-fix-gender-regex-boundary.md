# PBI: GENDER正規表現のsexに単語境界を付ける

## ユーザーストーリー

英語ページ利用者として、Essex等の地名・語彙を含む欄が性別に誤確定されないようにしてほしい、sex部分一致でgender 0.7確定するため。

## 優先度

- 順位: 20位 / 20件
- RICEスコア: 133（Reach=5 / Impact=1 / Confidence=80% / Effort=0.03人月）
- 根拠: sexの部分一致がEssex等の英語name/idをgender 0.7で誤確定させる。1行の境界修正で解消する。依存なし。
- 出典: checking-team Ethics Low、src/core/classify-rules.ts:58

## BDD受け入れシナリオ

```gherkin
Scenario: Essex等を含む欄はgenderに確定しない
  Given nameやlabelにEssex等を含む欄がある
  When ルール分類を実行する
  Then genderに確定せず未分類または本来の分類になる

Scenario: sex単独・gender表記は従来通り分類される
  Given labelやnameがsex単独またはgender表記の欄がある
  When ルール分類を実行する
  Then genderに0.7（legendは0.65）で分類される
```

## 受け入れ基準

- [x] GENDER正規表現のsexに単語境界が付きEssex等の部分一致が解消されている
- [x] sex単独・gender表記（性別/せいべつ/ジェンダー/gender）が従来通りgenderに分類される
- [x] 英語fixture（Essex等のname/id・label）が追加されgender誤確定の回帰が保護されている
- [x] 既存テスト（classify-rulesのgender・dispatch parity・gender-classify-contract）が緑維持

## テスト戦略

- 単体: Essex等のnegativesとsex単独・gender表記のpositivesの分類を網羅する
- 統合: 英語fixtureの欄がgenderに誤確定しない一連を確認する
- E2E: 対象外（正規表現の1行修正のため単体・統合で担保する）

## 見積もり

- 0.03人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] `make check` が通る
