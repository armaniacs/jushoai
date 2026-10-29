# PBI: fill 注入モジュールの深化（順序・ guard・振分けの一元化）

## ユーザーストーリー

保守担当者として、注入の順序・ guard・radio 解決を単一 fill モジュールに集約してほしい。なぜなら `applyPlan`（when・順序・option）と `fill.ts`（how）が分離し、zip-last 等の順序知識が DOM なしでは検証できないから。

## 背景・問題

- 対象:
  - `src/dom/apply-plan.ts:6-41`（zip-last、`isStillEmpty`、radio 解決、guard 群）
  - `src/dom/fill.ts:5-30`（native setter＋event 3連 ×2）
  - `src/entrypoints/content.ts:390`（唯一の本番 `fill` adapter）
- 現状: `applyPlan(plan, byId, fill)` の `fill` コールバック seam に対応する本番 adapter が1つのみ（仮説 seam）。呼出し側は radio 振分けと `byId` 形状を知る必要がある。zip-last 規則は module-private の `Set` で、テストは実 DOM 充填経由のみ。
- 提案: アーキテクチャレビュー round 2 候補 #2（Worth exploring）。順序・guard・radio 解決・setter 振分けを `fillPlan(plan, targets)` 級の狭 interface に集約し、setter・event は内部 seam にする。代替として純粋部（zip-last 分割＋emptiness 述語）の内遷も可。
- 候補番号: 本ラウンド順位 3（全5件）

## 優先度・スコア

- 順位: 3 位 / 5 件
- RICE スコア: 40
  - Reach = 10（一括注入の将来呼出し）
  - Impact = 1（順序・guard の単一ソース化）
  - Confidence = 80%（対象は特定済み、fake 駆動の見通し明確）
  - Effort = 0.2 人週（モジュール抽出＋fake テスト）
- 根拠: 順序知識の単体化のため中位。
- 依存: なし（順位4の前提）。

## BDD受け入れシナリオ

```gherkin
Scenario: ハッピー ― 偽ターゲットで順序と結果が検証できる
  Given zip 含みの plan と偽ターゲット群がある
  When fillPlan で注入する
  Then zip が最後に注入され、欄ごとの成否が返る

Scenario: 境界 ― 入力済み・未接続・不一致は注入しない
  Given 入力済み欄・未接続要素・一致 option なしの radio がある
  When fillPlan で注入する
  Then いずれも注入されず理由が分かる
```

## 受け入れ基準

- [x] 順序・guard・radio 解決・setter 振分けが単一モジュールに集約されている
- [x] `fill` コールバックの仮説 seam が解消されている（または純粋部の内遷で代替）
- [x] prototype setter 経由の実装が維持されている（`el.value =` 直代入にしない。React/Vue 対応）
- [x] input／change／blur の3連発火が維持されている
- [x] `make typecheck` と `make test` がパスする

## テスト戦略（t_wadaスタイル）

### E2Eテスト

- 既存の実ブラウザ E2E で回帰確認。ユーザー実行で緑を確認（2026-10-15）。

### 統合テスト

- session→apply 経路の既存テストで回帰確認する

### 単体テスト

- plan＋偽ターゲット駆動の順序・成否テスト（prototype setter 不要）
- テスト方針に従い、再現ケースを先に追加して失敗させてから直す

## 見積もり

- 0.2 人週（ストーリーポイント換算では小。要チームでの見積もり）

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] `make typecheck` がパスする
- [x] `make test` がパスする
- [x] コードレビュー完了
- [x] ドキュメント更新不要であることが確認済み（内部付け替えのため）

## 実装者向け注記

### 現状コードの確認（着手前に必ず実行すること）

対象は上記3箇所。zip-last の理由（ページ側 lookup 上書き回避）、`isStillEmpty` の select 偽装（`isUntouchedSelect` 再利用）、radio の value 一致＋disabled 除外を確認すること。

### 落とし穴

- `LAST_CATEGORIES`（zip 系）の集合を変えないこと
- `fillRadio` の checked setter 経路を `fillField` に統合しないこと（セマンティクスが違う）
- `byId` の未接続・入力済みガードを落とさないこと

## 実施記録（2026-10-15、自律タスククローザーによる実装）

- 実装コミット `aa9e5b0`: `src/dom/apply-plan.ts` を `src/dom/fill-plan.ts` に深化（`FillTarget` 抽象＋`fillPlan` の outcomes 返却＋`targetsFromControls` 束縛）。`content.ts` の注入経路を置換。旧 `applyPlan` は削除しテストを移行。prototype setter 経路と3連発火は維持。
- 検証: `npx tsc --noEmit` exit 0、移行テスト＋outcomes 断言（detached・missing・no-option 含む）green。
- ユーザーの作業として残る項目: コードレビュー
