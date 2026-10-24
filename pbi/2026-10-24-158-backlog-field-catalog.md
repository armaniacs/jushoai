# PBI: Profile/Address フィールド語彙を core の catalog に集約する

## 背景

「key → label → placeholder → input type」という Profile/Address の語彙が2ファイルに写っている:

- `src/ui/guest-panel.ts:16-31`（FIELDS/ADDRESS_FIELDS — 13欄中6欄の意図的な subset）
- `src/entrypoints/options/main.ts:19-41`（PROFILE_FIELDS/ADDRESS_FIELDS — カード定義13欄）

placeholder は同一（山田/ヤマダ/yamada@example.com/09012345678、1000001/東京都/千代田区/千代田1-1/千代田ビル101）。guest は subset だが、kana label の文言差（`セイ` vs `セイ（フリガナ・ふりがな入力可）`）が subset 選択なのか更新漏れなのか interface 上は分からない。新しい Profile 欄（会社名・部署は PBI で追加済み）を足すとき、「guest に載せるか」の判断が語彙の重複に埋もれ、片側更新の drift が起こる。

## ユーザーストーリー

開発者として、core/ 側（DOM に依存しない純粋データ）に field catalog（key/label/placeholder/type の1表 + guest に載せる欄の集合）を置き、options のカードと guest パネルの両方が参照するようにしたい、なぜなら語彙の二重管理が片側更新の drift を起こし、新しい欄の追加コストが倍になるため。

## 優先度

- 順位: 9位 / 10件
- RICEスコア: 5（Reach=2 / Impact=0.5 / Confidence=50% / Effort=0.10人月）
- 根拠: 語彙の追加・変更が1表に集中し（locality）、`tests/ui/guest-panel.test.ts` が「guest は表の定められた subset であること」を1テストで pin でき、options 側の card-builders-parity 系テストと共通 fixture を共有できる（leverage）。ただし guest の kana label 文言差は意図的な可能性があるため、文言差の扱い（列として明示する）を決めてから着手する確信度50%。options/main.ts に触れるため候補151の後に直列158。
- 対象: src/ui/guest-panel.ts:16-31、src/entrypoints/options/main.ts:19-41、core/（新規 catalog）、tests/ui/guest-panel.test.ts

## BDD受け入れシナリオ

```gherkin
Scenario: guest パネルが catalog の subset から出る
  Given core/ に field catalog がある
  When guest パネルを構築する
  Then guest 欄の集合が catalog で定められた subset と一致し、文言差は列として明示される

Scenario: 新しい Profile 欄の追加が1表で済む
  Given catalog に新しい欄を追加する
  When options のカードと guest パネルを構築する
  Then 両側が自動的に同じ語彙を使い、片側更新の drift が起こらない
```

## 受け入れ基準

- [ ] core/ に field catalog（key/label/placeholder/type + guest 集合）が存在する
- [ ] guest パネルと options のカードが catalog 経由になっている
- [ ] kana label の文言差が列として明示されている
- [ ] guest は catalog の subset であることを1テストで pin している
- [ ] 既存テストが緑維持

## テスト戦略

- 単体: guest が catalog の定められた subset と一致することを確認する
- 回帰: guest-panel / card-builders-parity の既存テスト一式を緑維持で確認する

## 見積もり

- 0.10人月

## Definition of Done

- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] `make check` が通る
