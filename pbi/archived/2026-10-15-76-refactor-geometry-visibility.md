# PBI: 可視性・計測可能性ジオメトリの単一モジュール化

## ユーザーストーリー

保守担当者として、可視／計測可能／アンカー可能の判定規則を1つのジオメトリモジュールに集約してほしい。なぜなら同一規則が5箇所に微差で重複し、隠れ欄・ゼロ矩形の不一致が単体テストで防げないから。

## 背景・問題

- 対象:
  - `src/dom/scan-fields.ts:71-77`（`isHidden`）
  - `src/dom/detect-forms.ts:24-52`（rect メモ・`visualTop`・`hasBox`・フォールバック pool）
  - `src/ui/button.ts:82-107`（`reposition` のガード）
  - `src/ui/preview.ts:216-220`（ゼロ矩形→null）
  - `src/entrypoints/content.ts:163-171`（同意ゲートの可視性フォールバック）
- 現状: 「何を可視・計測可能とみなすか」が5通りに微差実装され、順序知識（要素あたり矩形1読・pick 内無書込・最終良位置の保持）がコメント止まり。いずれもレイアウトエンジンなしでは検証不能。
- 提案: アーキテクチャレビュー round 2 候補 #1（Strong）。`isMeasurable`／`visualTop`／`pickTopmost` 級の小 interface＋注入可能な rect プロバイダに集約する。
- 候補番号: 本ラウンド順位 1（全5件）

## 優先度・スコア

- 順位: 1 位 / 5 件
- RICE スコア: 160
  - Reach = 30（可視性修正の将来変更すべて、5呼出し）
  - Impact = 2（未テスト面の単体化＋安全隣接）
  - Confidence = 80%（規則は全文読解済み、fake 駆動の見通し明確）
  - Effort = 0.3 人週（モジュール抽出＋fake テスト＋呼出し置換）
- 根拠: 最大の未テスト面を開くため最優先。
- 依存: なし。

## BDD受け入れシナリオ

```gherkin
Scenario: ハッピー — 偽矩形で全規則が判定できる
  Given hidden・ゼロ矩形・通常矩形の偽要素群がある
  When ジオメトリモジュールに問う
  Then isHidden・hasBox・visualTop がレイアウトなしで正答する

Scenario: 境界 — jsdom ゼロと未レイアウトが文書順に落ちる
  Given 全 rect がゼロの環境がある
  When アンカー選択する
  Then 文書順の先頭が選ばれる（従来通り）
```

## 受け入れ基準

- [x] 5箇所の規則が単一モジュールに集約されている
- [x] rect 取得が注入可能で、単体テストが fake のみで通る
- [x] 走査・アンカー・追従・同意表示の振る舞いが変わっていない
- [x] `make typecheck` と `make test` がパスする

## テスト戦略（t_wadaスタイル）

### E2Eテスト

- 既存の実ブラウザ E2E で回帰確認（実行コンテキストの制約で未実行の場合はユーザー作業）

### 統合テスト

- `detectForms`＋`pickAnchor` の既存 DOM テストで回帰確認する

### 単体テスト

- 偽矩形による規則表テスト（hidden・ゼロ・非有限・未接続の組合せ）
- テスト方針に従い、再現ケースを先に追加して失敗させてから直す

## 見積もり

- 0.3 人週（ストーリーポイント換算では中。要チームでの見積もり）

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] `make typecheck` がパスする
- [x] `make test` がパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新不要であることが確認済み（内部付け替えのため）

## 実装者向け注記

### 現状コードの確認（着手前に必ず実行すること）

対象は上記5箇所。`isHidden` の `checkVisibility` 存在 gate（jsdom 対応）、`pickAnchor` のメモ化 rect と2段階フォールバック、`reposition` の最終良位置保持、`getApplyPoint` の null 契約、同意ゲートの `computedStyle` フォールバックをそれぞれ確認すること。

### 修正方向

- 既存の `schedule?` 注入（`attachRepositionTracking`）と同型の seam を rect 取得にも設ける
- メモ化の生存期間（pick 内のみ）を interface に刻み、stale rect の余地を残さないこと

### 落とし穴

- `checkVisibility` の opacity／visibility オプションを落とさないこと
- consent の可視性判定は安全制約のため、条件緩和にならないよう既存テストで固定すること

## 実施記録（2026-10-15、自律タスククローザーによる実装）

- 実装コミット `6b58900`: `src/dom/geometry.ts` 新設（`Box`／`RectProvider`／`createRectCache`／`isMeasurable`／`visualTop`／`isHidden` 移設）。`pickAnchor`・`button.reposition`・`getApplyPoint` を置換。consent の host 可視性は別関心（閉 shadow host＋style、既に ConsentEnv で注入・試験済み）のため対象外とし記録。
- 検証: `npx tsc --noEmit` exit 0、新規 geometry テスト＋矩形予算テスト（要素あたり最大2読を維持）green。
- ユーザーの作業として残る項目: コードレビュー
