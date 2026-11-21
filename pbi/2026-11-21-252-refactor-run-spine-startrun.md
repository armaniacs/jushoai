# PBI: run() の脊髄を startRun module として深化する

## ユーザーストーリー
content.ts を触る保守者として、「1 回の run の始まり方」(loadRunState → AI status / download → classifier 選定 → egress ゲート → guest 解決 → buildRunEnv → session 生成) が 1 つの深い module にまとまってほしい、なぜなら egress ゲートの「見るもの = 送るもの」という不変条件が content.ts / run-env.ts / egress-plan.ts / pipeline.ts の 4 箇所に割れて 3 ファイル + parity テストでしか守られず、RunEnvDeps が 25+ フィールドで interface が wiring とほぼ同幅になっているから

## 優先度
- 順位: 7 / 13
- RICE スコア: 40 (Reach=5 / Impact=3 / Confidence=85% / Effort=0.4人週)
- 根拠: アーキテクチャレビューの Strong 候補。effort が本ラウンド最大のため RICE 上は 7 位だが、PBI-179/181 の不変条件を 1 interface でテストできるようになるテスト面の価値が最大。PBI-247 (facade 剥がし) の後に着手すると run-env 側の書き換えが 1 回で済む

## 出どころ
- アーキテクチャレビュー 2026-11-20 候補 2 (Strong / local-substitutable)。ラウンド台帳 `pbi/2026-11-21-00-backlog-checking-arch-round.md`
- 現状確認 (2026-11-21): src/entrypoints/content.ts 712 行 (run() 相当 244-438)・src/content/run-env.ts 196 行 (RunEnvDeps 25+ フィールド)・src/core/egress-plan.ts 49 行

## ビジネス価値
- gate→send 不変条件 (PBI-179/181) を 1 つの interface でテストでき、3 ファイル + parity テストの分担が解消される。測定: gate 不変条件のテストが 1 module に集約され、RunEnvDeps のフィールド数が約 10 に減る
- content.ts が composition root (mount / observe / メッセージルーティング / panel 隅) に専念する。測定: run 起点変更の diff が 1 module に収まる

## BDD受け入れシナリオ

```gherkin
Scenario: egress ゲートが見た集合と送信集合が一致する
  Given AI プロバイダが有効で、egress ゲートが送信欄集合を決めた
  When  run の起動段が分類パイプラインを回す
  Then  pipeline に渡る送信欄集合が、ゲートが見た集合と 1 つの interface で同一であることがテストされる

Scenario: content.ts は mount と配線だけを知る
  Given startRun module が run 起動段を所有している
  When  content.ts の run 相当コードを読む
  Then  mount / observe / メッセージルーティング / panel 隅管理のみで、起動段の詳細 (loadRunState・classifier 選定・guest 解決) は読めない
```

## 受け入れ基準
- [ ] run 起動段 (loadRunState → AI status / download → classifier 選定 → egress ゲート → guest 解決 → buildRunEnv → session 生成) が 1 つの module に集約されている
- [ ] RunEnvDeps のフィールド数が約 10 に減っている (副作用口のみ注入)
- [ ] gate→send 一致のテストが 1 module で実行される (既存 parity テストの知見は維持し、配置を集約)
- [ ] content.ts の骨格は呼び出し 1 行相当の可読性を維持 (PBI-221 の意図)
- [ ] 挙動不変 (`make eval` 3 passed・既存 e2e pin 維持)
- [ ] `make check` 緑

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 既存 make check-all (注入シナリオ) で回帰確認。追加なし

### 統合テスト
- gate→send 一致を startRun に対して 1 件統合テスト (deps を注入した実連鎖) として書く (parity テストの後継)

### 単体テスト
- 起動段の分岐 (AI 無効・プロバイダ切替・guest 有無・SPA 遷移) を deps モックで 8-12 件
- RunEnvDeps の縮小後フィールドの意味 pin

## 実装アプローチ
- **スパイク先行 (2026-11-21 の深掘りで確定)**: 着手前に 1 日のスパイクを行い、(1) run() の移動対象関数一覧、(2) RunEnvDeps の副作用口分類と縮小後の目論見 (25+→約10 が実現可能か)、(3) gate→send 不変条件の現状 (どのテストが分担しているか)、(4) deps 縮小が実現不能だった場合の割り切り案 (gate 集約のみで interface 広域は維持) を出す。1 スプリントで完了できないと判断したらスパイク分離 (classifier 選定〜session 生成のみ先行) に分割する
- **Outside-In**: gate→send 統合テスト (失敗する形の意図) → startRun module の interface 決定 → 起動段移動 → content.ts の痩身化
- **Red-Green-Refactor**: 既存 pin を保ったまま移動 (挙動不変)、テストの集約は移動後
- **リファクタリング**: RunEnvDeps の 25+ フィールドを副作用口 (storage / fetch / UI / 遅延 URL) に分類し、注入面を約 10 に

## 見積もり
0.4人週（要チームでの見積もり）

## 技術的考慮事項
- 依存関係: 247 (facade 剥がし) の後が望ましい。単独着手も可
- テスタビリティ: deps 注入の local-substitutable 分類。SPA 遷移の遅延 URL 読み (getPageHref / getHost) は遅延 getter のまま注入
- 非機能要件: 挙動不変。AI 無効時の early-return 挙動・同意ゲート・メッセージルーティングの意味論は不変

## 実装者向け注記

### 現状コードの確認
（2026-11-21 作成時に現存確認済み。着手時に再確認すること）
```bash
grep -n "function run\|interface RunEnvDeps" src/entrypoints/content.ts src/content/run-env.ts
grep -rn "egress" src/classify-pipeline/pipeline.ts src/core/egress-plan.ts | sed -n '1,10p'
grep -n "parity" tests/core/send-set.test.ts tests/core/*.test.ts 2>/dev/null | sed -n '1,5p'
```

### 実装手順
1. run() (244-438) を起動段の関数呼び出し列として書き出し、決定 / 組立 / 実行を分類する
2. startRun module (例: src/content/start-run.ts) に起動段を移す (既存 pin が緑のまま移動)
3. RunEnvDeps を副作用口に再分類し、注入面を約 10 に縮小 (消費者 grep で未使用を除去)
4. gate→send 統合テストを startRun に対して書き、旧 parity テストを置換または集約
5. content.ts を痩身化し、骨格呼び出し 1 行に
6. make check + make eval + (可能なら) make check-all

### 落とし穴
- PBI-221 が run() 骨格の可読性を意図的に作った (4 行で読める) — 骨格は startRun 呼び出し 1 行に置き換わる形で維持し、骨格を潰さない
- 遅延 URL 読み (getPageHref / getHost / getSelection) は SPA 遷移時に意味が変わる — 起動時に値を固定化しない (遅延 getter のまま)
- fill-flow 側の不変条件 (注入は必ずプレビュー経由・入力済み上書きしない) は本 PBI の対象外 — 触らない
- スパイクで deps 縮小が実現不能と判明したら gate 集約のみに縮小する (割り切り案をスパイク成果物として本 PBI に記録)
- スパイク時点で fill-types.ts (247 の産物) の SessionPanel 系所属を最終判断する (fill-types のままか core/types.ts 昇格か)
- 0.4 人週は本ラウンド最大。スパイクの成果で 1 スプリントに収まらないと判断したらスパイク分離して再見積もり

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする (gate→send 統合 + 起動段分岐)
- [ ] テストカバレッジが基準を満たす (統合 1 + 単体 8-12 + 既存網)
- [ ] コードレビュー完了（GitHub PR での approve を必須とする）
- [ ] リファクタリング完了（グリーン後・RunEnvDeps 縮小と旧 parity テスト集約まで）
- [ ] ロールバック手段の検討（挙動不変の移動だが面が広い — startRun 未使用を段階的にリリースするのではなく、revert 1 コミットで戻せるよう移動と痩身化を同 PR に含める。問題発覚時の切り戻し手順を PR 説明に明記）
- [ ] ドキュメント更新済み（CONTEXT.md に startRun 相当の用語 (run 起動段) を追加・AGENTS.md のアーキテクチャ節を現状に整合）
