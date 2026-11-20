# PBI: モーダル選択の Promise 化を1つの module に

## 背景

`mountPanel`（`src/ui/panel.ts:28`）は lifecycle（host 生成・Escape・idempotent close・focus trap）を small interface の背後に置いた deep module で、この層は良い。しかしその上に必要な「モーダル選択 → `Promise<Decision>`」という interface が module 化されておらず、5つの adapter が同じ実装を書いている:

- `src/ui/mapping-panel.ts:21-31`（Escape → null）
- `src/ui/fill-one-panel.ts:18-28,81-91`（Escape → cancel）
- `src/ui/guest-panel.ts:35-45`（Escape → null）
- `src/ui/egress-panel.ts:23-47`（Escape → rule-only）

各 adapter が `let settled = false` + `settle()`（1回だけ resolve）、Escape/外側 close を安全側 default に落とす配線、actions 行の cancel/primary ボタンを `settle + handle.close()` に配線する実装を繰り返す。削除テスト: この共通部を module にして削除すれば、settle-once と default-on-Escape が5呼び出し箇所に再出現する ― 存在価値あり。

## ユーザーストーリー

開発者として、confirmDialog({ title, body, actions, defaultOnClose }) 形の1関数 interface を mountPanel の上に置き、settle-once と「選択なしで閉じたら決定なし」を implementation に隠したい、なぜなら安全側不変条件が5箇所に分散し、次に足すパネルが default 値の取り違えを起こしやすいため。

## 優先度

- 順位: 6位 / 10件
- RICEスコア: 21（Reach=5 / Impact=1 / Confidence=50% / Effort=0.12人月）
- 根拠: 「選択なしで閉じたら注入も送信も決定もしない」という安全側不変条件が1箇所に集中し（locality）、`mapping-panel.test.ts:36`・`fill-one-panel.test.ts:15`・`guest-panel.test.ts:27`・`egress-panel.test.ts:41` が同じ「Escape → 安全 default」を個別再検証している4テストが1実装+1テストに回収される（leverage）。a11y 配線に触れるため E2E 併用が前提で確信度50%。panel.ts 自体は触らない。依存なし（バッチ1）。
- 対象: src/ui/mapping-panel.ts:21-31、fill-one-panel.ts:18-28,81-91、guest-panel.ts:35-45、egress-panel.ts:23-47、src/ui/panel.ts（不触）

## BDD受け入れシナリオ

```gherkin
Scenario: 選択なしで閉じたら決定なし
  Given confirmDialog に集約された Promise 化 interface がある
  When Escape でモーダルを閉じる
  Then defaultOnClose で1回だけ resolve され、注入も送信も決定もしない

Scenario: 5パネルが同一 module の背後に収まる
  Given 4つのパネル adapter がある
  When confirmDialog 経由で動作する
  Then 既存の振る舞い（Escape 時の default 値）に差分がない
```

## 受け入れ基準

- [x] confirmDialog が1関数 interface として存在する
- [x] 4パネル（mapping/fill-one/guest/egress）が confirmDialog 経由になり、手写しの settled guard が消えている
- [x] 「選択なしで閉じたら決定なし」の不変条件が1箇所で検証されている
- [x] 既存テストが緑維持（E2E 併用で実挙動を確認）

## テスト戦略

- 単体: confirmDialog の settle-once と default-on-close を確認する
- 回帰: mapping/fill-one/guest/egress パネルの既存テスト一式を緑維持で確認する

## 見積もり

- 0.12人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
