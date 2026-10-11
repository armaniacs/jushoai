# PBI: 同意検証の実 DOM 経路をテスト可能にする

状態: 未着手（コードレビュー 2026-10-11 の Suggestions #2 から起票）
起票日: 2026-10-11

## ユーザーストーリー

保守担当者として、同意ゲートの実 DOM 経路（host 中心・可視性フォールバック・viewport 判定）がテストで固定されていてほしい。なぜなら、現行は fake 経由のみで、実経路がカバレッジの盲点になっているから。

## 優先度

- 順位: 4 / 全候補 4 件
- RICEスコア: 0.4（Reach=1 / Impact=0.5 / Confidence=80% / Effort=1）
- 根拠: dev 工程。jsdom に layout がない制約のため Confidence=80%。他候補と独立

## BDD受け入れシナリオ

```gherkin
Scenario: 実 DOM 経路が fake なしで検証される
  Given 実 DOM に host が置かれている
  When  既定の依存で検証する
  Then  接続・可視性の分岐が固定される

Scenario: jsdom で測れない部分が分離される
  Given layout を要する問い合わせがある
  When  設計を見直す
  Then  注入可能な依存として切り出されている
```

## 受け入れ基準

- [x] `defaultConsentCheckDeps` に document/window を注入できる形になり、jsdom で動く範囲がテストされている
- [x] layout を要する範囲とそうでない範囲の境界がコメントに記録されている
- [x] `make check` が通る

## テスト戦略

- 単体: 注入した document/window の fake で実経路の分岐を固定する（`elementFromPoint` 等の layout 依存は fake のまま）

## 見積もり

1pt（要チームでの見積もり）

## Definition of Done

- [x] 全 BDD シナリオが自動テストとして実装されパスする
- [x] `make check` が通る
- [x] コードレビュー完了
