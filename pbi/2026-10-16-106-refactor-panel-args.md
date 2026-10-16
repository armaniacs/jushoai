# PBI: mountPanelの対話名とfocus対象を明示引数化する

## ユーザーストーリー

開発者として、新規パネルでa11yとfocusを間違えられないようにしたい。現状はh2 scrapeと`.primary`走査の暗黙規約で、見出し変更がaria-labelに連動しPII混入の余地があるため。

## 優先度

- 順位: 4位 / 8件
- RICEスコア: 125（Reach=10 / Impact=2 / Confidence=50% / Effort=0.08人月）
- 根拠: a11yの構造的是正。依存なし。
- 出典: architecture-review 候補3(Strong)

## BDD受け入れシナリオ

```gherkin
Scenario: 対話名が引数で固定される
  Given 任意の見出し文言でパネルを開く
  When 対話名を確認する
  Then 引数で渡した名が付き、h2書換の影響を受けない

Scenario: focus対象が明示される
  Given primary相当を指定して開く
  When 初期focusを確認する
  Then 指定対象に当たる
```

## 受け入れ基準

- [x] `accessibleName` 相当の明示引数でh2 scrapeをやめる
- [x] focus対象が引数・明示指定になる（`.primary`走査の暗黙規約を消す）
- [x] close契約（冪等・onClose1回・render失敗時不発）が文書＋テストになる
- [x] 既存の呼出（preview・guide）とテストを更新し緑維持

## テスト戦略

- E2E相当: 実ブラウザで対話名と初期focusを確認する
- 統合: 開く→閉じるの一連を確認する
- 単体: 引数あり・なし・render例外の分岐を網羅する

## 見積もり

- 0.08人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] `make check` が通る
