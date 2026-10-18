# PBI: 適用の組み立て順序をsessionに集約する

## 背景

`src/entrypoints/content.ts` の `run()` が classify / checkConsent / injectPlan / persistSelection 等 8 閉包を `SessionEnv` として組み立て、順序制約の depth が呼び出し側組立に reside する。`content-run` / `content-session` の純粋切出しはテスト容易だが実欠陥（stale snapshot・除外競合・failureReason 上書き）は `run()` に残る。

## ユーザーストーリー

開発者として、適用順序を session モジュールの背後に集約し、`run()` は意図だけ渡す形にして順序バグの居場所を一箇所にしたい、なぜなら組み立て順序が呼び出し側にあるままでは stale snapshot・除外競合・failureReason 上書きの実欠陥が `run()` に残り、純粋切出しのテスト容易性が順序バグに届かないため。

## 優先度

- 順位: 5位 / 7件
- RICEスコア: 25（Reach=10 / Impact=1 / Confidence=50% / Effort=0.20人月）
- 根拠: 適用順序の居場所を一箇所に集約する分割リファクタ。PBI-42 と同 content.ts のため実装は直列（42 の後）。

## BDD受け入れシナリオ

```gherkin
Scenario: 適用順序がsessionモジュールの背後に集約される
  Given run()がSessionEnvの8閉包を組み立てている
  When 適用順序（consent→inject→persist→feedback→display）をsession側に移すとき
  Then run()は意図だけ渡し、順序の変更はsessionモジュール1箇所で済む

Scenario: 順序バグの再現がrun()のDOMなしで決まる
  Given stale snapshot・除外競合・failureReason上書きの再現条件がある
  When sessionモジュールにfake Envを注入して適用順序を実行するとき
  Then run()側のDOM配線なしに順序違反が検出できる
```

## 受け入れ基準

- [x] 適用順序（consent→inject→persist→feedback→display）が session モジュール側に所有されている
- [x] `src/entrypoints/content.ts` の `run()` が順序を知らず意図だけを渡す形になっている
- [x] stale snapshot・除外競合・failureReason 上書きの順序制約が session 側の単一箇所で表現されている
- [x] 除外競合時（start 後に除外成立）も failureReason が失われず `{ excluded: true, failureReason }` で運ばれる（PBI-52で意図を固定。テスト `carries the failure reason even when an exclusion landed mid-classify` が対応）
- [x] `src/content-session.ts`・`src/content-run.ts` の公開境界を越えた順序知識が `run()` に残っていない
- [x] 既存テストが緑維持

## テスト戦略

- 単体: session に fake Env を注入し、consent→inject→persist→feedback→display の順序違反を検出できることを確認する
- 単体: stale snapshot・除外競合・failureReason 上書きの再現条件が DOM なしで決まることを確認する
- 回帰: 既存の content-run / content-session テスト一式を緑維持で確認する

## 見積もり

- 0.20人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
