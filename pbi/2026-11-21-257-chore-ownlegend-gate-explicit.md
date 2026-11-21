# PBI: ownLegend の legend 側ゲート既定値を明示化する

## ユーザーストーリー
dispatch-kit を触る保守者として、ownLegend の legend 側ゲートの既定挙動が読める形で明示されていてほしい、なぜなら 現在 `legendGate = legendExtra ?? extra` という既定 (gate 未指定時は own 側ゲートが legend 側にもそのまま適用される) が式の形でしか書かれておらず、ownLegend 語彙ペアを追加する人が「own に gate を付けると legend にも効く」ことに気づかず隠れた挙動として受容してしまうから

## 優先度
- 順位: 12 / 13
- RICE スコア: 18 (Reach=2 / Impact=1 / Confidence=80% / Effort=0.1人週)
- 根拠: checking-team Blue Team (Low)。ownLegend は語彙ペア追加の主要入口 (権利: 0.7 / 見出し: 0.65 のグラデーションを 1 箇所で展開) で、暗黙適用は利便性と引き換えに読みにくさを生んでいる。修正はドキュメント化かパラメータ分離の 2 択で、意味論は不変

## 出どころ
- checking-team 2026-11-21 Blue Team (Low)。ラウンド台帳 `pbi/2026-11-21-00-backlog-checking-arch-round.md`
- 現状確認 (2026-11-21): src/core/dispatch-kit.ts:37 (`const legendGate = legendExtra ?? extra`)、ownLegend 利用箇所は語彙 module 群で 14 箇所以上

## ビジネス価値
- 語彙ペア追加時に own/legend 双方のゲート挙動が明示的になり、意図しない legend 側緩和・締め付けを防ぐ。測定: ownLegend の契約コメントまたはシグネチャから既定挙動が読める

## BDD受け入れシナリオ

```gherkin
Scenario: own 側 gate が legend 側に効くことが読める
  Given ownLegend の契約 (コメントまたは型) が明示されている
  When  語彙ペア追加者が extra を指定して ownLegend を呼ぶコードを書く
  Then  legend 側にも同じ gate が適用されることが契約から分かり、legendExtra で上書きできることが分かる

Scenario: 既存の語彙ペアは挙動不変である
  Given 14 箇所以上の ownLegend 呼び出しが存在する
  When  明示化 (コメントまたはパラメータ分離) を適用する
  Then  全語彙ペアの分類結果と `make eval` 3 passed が無変更で緑である
```

## 受け入れ基準
- [ ] ownLegend の legend 側ゲート既定値 (`legendExtra ?? extra`) が契約コメントまたは型で明示されている (例: "legendGate defaults to extra — the own-side gate applies to the legend side unless overridden")
- [ ] 既定の暗黙適用が望ましくない語彙ペアが存在する場合、legendExtra を明示する変更は挙動が変わるため本 PBI では行わない (発見したら記録のみ)
- [ ] 意味論不変 (全 ownLegend 呼び出し・`make eval` 3 passed)
- [ ] `make check` 緑

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 追加なし

### 統合テスト
- 既存 pin (gender-classify-contract 等の own/legend 挙動) が緑

### 単体テスト
- dispatch-kit の ownLegend 契約 pin を 2-3 件追加 (extra 指定時の legend 側適用・legendExtra 上書き・未指定時の両側自由)

## 実装アプローチ
- **Outside-In**: 語彙ペア追加者の視点で「extra を書いたら何が起きるか」を契約に昇格させる
- **Red-Green-Refactor**: 契約 pin RED → (コメントのみなら即 GREEN) → pin GREEN
- **リファクタリング**: パラメータ分離 (ownGate / legendGate を必須化) は 14 箇所の呼び出し変更を伴う — 意味論不変の下で最小修正 (コメント + pin) を第一選択にする

## 見積もり
0.1人週（要チームでの見積もり）

## 技術的考慮事項
- 依存関係: なし
- テスタビリティ: ownLegend は純粋関数 (MatcherEntry 群を返す) で pin しやすい
- 非機能要件: 挙動不変 (コメント・テストのみの第一案)

## 実装者向け注記

### 現状コードの確認
（2026-11-21 作成時に現存確認済み。着手時に再確認すること）
```bash
grep -n "legendGate" src/core/dispatch-kit.ts
grep -rn "ownLegend(" src/core/classify-vocab-*.ts | wc -l
```

### 実装手順
1. dispatch-kit.ts の ownLegend を読み、legendGate = legendExtra ?? extra の意味を 14 箇所の呼び出しと突き合わせる
2. 契約コメント (英語・非自明 WHY) を ownLegend の docstring 位置に追加
3. ownLegend の契約 pin (extra → legend にも効く / legendExtra で上書き / 未指定 → 両側自由) を tests/core に追加
4. make check + make eval

### 落とし穴
- パラメータ分離 (必須化) に動くと 14 箇所の呼び出しが変わり挙動リスクが増す — 本 PBI ではしない (したい場合は別 PBI として設計から始める)
- 「暗黙適用が望ましくないペア」を発見したら、legendExtra を足す変更は挙動変更 (eval pin が red になりうる) — 本 PBI 内でやらず、eval pin 更新の意図を記録した別 PBI にする

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする (契約 pin 2-3 件)
- [ ] テストカバレッジが基準を満たす (ownLegend 契約 + 既存 own/legend pin)
- [ ] コードレビュー完了（GitHub PR での approve を必須とする）
- [ ] リファクタリング完了（該当なし — 第一案はコメント + pin）
- [ ] ロールバック手段の検討（該当なし — pin 追加とコメント。revert で完結）
- [ ] ドキュメント更新済み（CONTEXT.md の dispatch キット項に ownLegend の gate 既定を 1 文追記）
