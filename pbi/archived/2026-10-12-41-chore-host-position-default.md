# PBI: host の既定 position 宣言の重複を解消する

状態: 未着手（0.1.14 コードレビュー 2026-10-12 の Suggestions #6 から起票）
起票日: 2026-10-12

## ユーザーストーリー

保守担当者として、host の既定宣言が実際の挙動と一致していてほしい。なぜなら `createShadowHost` が `position: absolute !important` を設定するが、button と overlay の両消費者が直後に `fixed` で上書きしており、この既定は実質デッドだから。0.1.14 の左下配置の調査で、宣言と実挙動の食い違いが原因究明を難しくした。

## 優先度

- 順位: 2 / 全候補 5 件
- RICEスコア: 1.0（Reach=1 / Impact=0.5 / Confidence=100% / Effort=0.5）
- 根拠: 同点（1.0）の中で、誤読による再発（宣言と実挙動の食い違い）を防ぐ効果がある。他候補と独立

## BDD受け入れシナリオ

```gherkin
Scenario: 既定と実挙動が一致する
  Given `createShadowHost` を呼ぶ
  When  設定される宣言を確認する
  Then  position は、消費者が上書きする前提の値か、設定されていない

Scenario: ページ CSS に対する防御は維持される
  Given ページが `[data-jushoai]` に位置指定を当てている
  When  host を配置する
  Then  ページの宣言に勝つ
```

## 受け入れ基準

- [x] デッドな既定が削除されているか、残す理由がコメントに書かれている
- [x] `all: initial !important` と `z-index` による防御は変わらない
- [x] button / overlay の配置が従来どおりである（`tests/ui/host.test.ts` と `tests/ui/button.test.ts` を実態に合わせて更新）
- [x] `make check` が通る

## テスト戦略

- `tests/ui/host.test.ts` の断言を、残す宣言の集合に合わせて更新する
- 配置の実挙動は既存の Chrome E2E と配置の実測が担う

## 見積もり

0.5pt（要チームでの見積もり）

## Definition of Done

- [x] 全 BDD シナリオが自動テストとして実装されパスする
- [x] `make check` が通る
- [x] コードレビュー完了（ユーザー作業）

## 実施記録（2026-10-12、タスククローザの並列サブエージェントによる実装）

- 実装コミット `bc2a1d6`: `src/ui/host.ts` からデッドな `position: absolute !important` を削除し、コメントに「配置は消費者が所有する」契約（mountButton と createOverlayHost が直後に `position: fixed` を important 付きで書くこと、position 宣言が無い状態で座標だけ書くと static で inert になること）を追記。既存の「`all: initial !important` は座標も important 付きでリセットする」警告は不変
- `tests/ui/host.test.ts`: important 断言を `['all', 'z-index']` に絞り、`position` が空（設定されていない）ことを断言して削除を固定
- 呼び出し元の裏取り: `createShadowHost` は `src/ui/button.ts:34`（mountButton、39 行目で fixed important）と `src/ui/overlay.ts:7`（createOverlayHost、8 行目で fixed important）の 2 か所のみ。`tests/ui/button.test.ts`（fixed＋座標）と `tests/ui/overlay.test.ts`（fixed）は消費者側の断言で未変更のまま緑
- 検証: `npx vitest run tests/ui/host.test.ts tests/ui/button.test.ts` 10/10 緑。`make check` exit 0
- ユーザーの作業として残る項目: コードレビュー
