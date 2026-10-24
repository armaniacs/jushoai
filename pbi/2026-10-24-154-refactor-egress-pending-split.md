# PBI: egress pending 分割を1つの所有に寄せる

## 背景

「ゲートが表示する pending = classifyAll が実際に送る集合」という interface の不変条件（`src/core/egress-plan.ts:5-8`、`src/entrypoints/content.ts:269-271` が2箇所で明言）が、**2つの並行実装**で維持されている:

- `src/core/egress-plan.ts:24` — `metas.filter(m => !isConfident(classifyField(m)))`
- `src/core/analyze.ts:28-33` — `ruled.filter(r => !isConfident(r.cls))` + llmSkip フィルタ

PBI-145（0203ce9）は llmSkip 導入の際に両方を同時修正（lockstep）する必要があった。テストは `tests/core/egress-plan.test.ts` と `tests/core/analyze.test.ts:337` で**互いに独立**に手組み期待値で検証しており、クロス parity テストが無い。isConfident / ACCEPT_THRESHOLD（`src/core/classify-rules.ts:9,13`）の意味論が変わるか、分割条件が増えると、2実装を lockstep で直す義務はコメントだけが担う。

ドリフトするとゲートが静かに過小（または過大）報告し、過大の方向はメタデータの意図しない送信（プライバシー方向）になる。

## ユーザーストーリー

開発者として、classify → confident フィルタ → llmSkip フィルタの pending 分割を1関数としてエクスポートし、planEgress と classifyAll の両方から呼びたい、なぜならプライバシー不変条件がコメント強制でしか守られておらず、ドリフトするとゲートが意図しない送信を過小報告するため。

## 優先度

- 順位: 5位 / 10件
- RICEスコア: 27（Reach=2 / Impact=1 / Confidence=80% / Effort=0.06人月）
- 根拠: プライバシー不変条件がコメント強制から自動検証に変わり（locality）、PBI-145 型の lockstep 修正が消える。parity テストの前例がリポジトリに既にある（pipeline-entry.test.ts:46-48、classify-dispatch-parity.test.ts、normalize-parity.test.ts）ので手法は nothing new。差分は core 内で小さめ。依存なし（バッチ1）。
- 対象: src/core/egress-plan.ts:5-8,24、src/core/analyze.ts:28-33、src/entrypoints/content.ts:269-289

## BDD受け入れシナリオ

```gherkin
Scenario: ゲートは送信を過小報告しない
  Given pending 分割を1関数に集約した実装がある
  When planEgress と classifyAll を同じ metas で実行する
  Then 両者の pending 集合が一致し、ゲートが classifyAll が実際に送る集合を正確に表示する

Scenario: llmSkip が増えても lockstep 修正が不要
  Given 分割条件が1関数に集中している
  When 新しい分割条件（llmSkip 型）を足す
  Then planEgress と classifyAll の両方が自動的に同じ条件を使う
```

## 受け入れ基準

- [ ] pending 分割（classify → confident フィルタ → llmSkip フィルタ）が1関数としてエクスポートされている
- [ ] planEgress と classifyAll の両方がその関数経由になっている
- [ ] planEgress(...).pending と classifyAll が attempt する集合の parity テストが追加されパスする
- [ ] 既存テストが緑維持

## テスト戦略

- 単体: pending 分割関数の confident / llmSkip / pending の3区分を確認する
- 回帰: egress-plan / analyze の既存テスト一式を緑維持で確認する

## 見積もり

- 0.06人月

## Definition of Done

- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] `make check` が通る
