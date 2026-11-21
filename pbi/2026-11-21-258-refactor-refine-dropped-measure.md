# PBI: refineDropped の計測源を dropped 数に寄せる

## ユーザーストーリー
eval 指標と send-set pin を読む保守者として、RulePipelineTrace の refineDropped が「refine が落とした欄数 (dropped.length)」そのものを数えていてほしい、なぜなら 現在は「refine 前後で id が消えた欄数」という代理計測であり、今日は消失経路が drop のみで一致するが、将来 refine に別の消失経路 (新たな除外ルール等) が加わると指標が黙って膨らみ、eval 指標の誤読に直結するから

## 優先度
- 順位: 13 / 13
- RICE スコア: 15 (Reach=1 / Impact=1 / Confidence=75% / Effort=0.1人週)
- 根拠: checking-team Domain Logic Expert (Medium) のうち、コメント契約の修正は d4a8177 で実施済み。本 PBI は残る実装側の選択肢 (計測源を refineWithDrops の戻り値から取る) を扱う。現在の消失経路が 1 つしかない以上、同値性が保たれている限り緊急性は低い (Confidence 75%)

## 出どころ
- checking-team 2026-11-21 Domain Logic Expert (Medium 🎯「refineDropped のドキュメント契約と実装の計測対象が一致していない」の実装側)。ラウンド台帳 `pbi/2026-11-21-00-backlog-checking-arch-round.md`
- 現状確認 (2026-11-21): src/core/classify-rules.ts の RulePipelineTrace 実装 (`refineDropped: resolved.filter((i) => !afterIds.has(i.meta.id)).length`)。コメントは「Fields that disappeared during refine (currently the only disappearance path is oversized-group drops)」に修正済み (d4a8177)

## ビジネス価値
- trace 契約が「ドキュメント上の意味」と「計測源」で自壊しなくなる。測定: refineDropped の計算が refineWithDrops の dropped.length から直接取られ、消失経路の追加に独立する

## BDD受け入れシナリオ

```gherkin
Scenario: 計測源が drop の数そのものである
  Given classifyRulePipelineWithTrace が trace を返す
  When  refine が欄を落とす (oversized ambiguous group)
  Then  trace.refineDropped が refineWithDrops の dropped 配列の長さに等しい

Scenario: drop 以外の消失経路を数えない
  Given 将来 refine 段に別の消失経路が加わる変更が来る
  When  その変更の実装者が refineDropped の計測源を読む
  Then  計測源が dropped 数に固定されているため、pin (retag 非算入) と整合した変更判断ができる
```

## 受け入れ基準
- [ ] refineDropped の計算が refineWithDrops の戻り値 (dropped 配列) から取られている
- [ ] 計測源変更は同値 (挙動不変) であることを pin で確認 (Wave 3 が追加した retag 非算入 pin と send-set 系 trace pin が緑)
- [ ] コメントが計測源の変更に整合している (「Fields the refine dropped」等 — d4a8177 の現コメントから自然に更新)
- [ ] `make eval` 3 passed (eval/metrics.ts は trace を消費するため指標値が不変)
- [ ] `make check` 緑

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 追加なし

### 統合テスト
- send-set.test.ts の trace pin (refineDropped の値) が無変更で緑 (同値性の証拠)

### 単体テスト
- refineWithDrops の dropped 配列長と trace.refineDropped の一致を pin するテストを 1-2 件追加 (drop あり/なし)

## 実装アプローチ
- **Outside-In**: pin 先行 (現行値との一致 pin) → 計算経路の変更 → pin 緑
- **Red-Green-Refactor**: 一致 pin を書く (現在も緑のはず) → 計算を dropped.length に寄せ → pin が緑のまま変わらないことを確認
- **リファクタリング**: resolve 前後の id 集合演算が不要になれば簡潔化 (ただし resolve の他用途がある場合は残す)

## 見積もり
0.1人週（要チームでの見積もり）

## 技術的考慮事項
- 依存関係: なし。252 (run 脊髄) と独立
- テスタビリティ: trace は純粋関数の戻り値で pin 可能
- 非機能要件: eval 指標の値は不変 (同値計測)

## 実装者向け注記

### 現状コードの確認
（2026-11-21 作成時に現存確認済み。着手時に再確認すること）
```bash
grep -n "refineDropped" src/core/classify-rules.ts src/eval/metrics.ts tests/core/send-set.test.ts
grep -n "refineWithDrops" src/core/classify-rules.ts | sed -n '1,6p'
```

### 実装手順
1. classifyRulePipelineWithTrace 内の refineDropped 計算箇所と refineWithDrops の戻り値 (dropped 配列) を読む
2. 一致 pin (drop あり: dropped.length = refineDropped、drop なし: 0) を tests/core に追加
3. 計算を dropped.length から取る形に変更
4. send-set 系 trace pin + make eval で指標不変を確認
5. make check

### 落とし穴
- **同値性は 2026-11-21 の深掘りで確認済み**: refineWithDrops の dropped.push は group ループで 1 欄 1 push (fieldId 毎、classify-rules.ts の oversized-group 処理) のため dropped.length = 落とした欄数。旧 PBI 原文の「1 欄が複数 SplitDrop に跨る場合の数え方」の曖昧性は解消済み
- resolve の id 集合演算が他の目的 (refineChanged など) で使われている場合、そちらは残す (本 PBI は refineDropped の計測源だけを寄せる)
- refineWithDrops の dropped は SplitDrop 群 — 計測源変更後も「id が消えた欄数」との同値を pin が担保する (Wave 3 の retag 非算入 pin が red になったら計測源変更を止めて再確認)
- eval/metrics.ts の指標名・算出は変えない (trace 契約の同値変更のみ)

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする (一致 pin 1-2 件 + 既存 trace pin)
- [ ] テストカバレッジが基準を満たす (既存網 + 追加 pin)
- [ ] コードレビュー完了（GitHub PR での approve を必須とする）
- [ ] リファクタリング完了（グリーン後・未使用になった集合演算の整理まで)
- [ ] ロールバック手段の検討（同値計測への変更。eval 指標が変わったら即 revert する手順を PR 説明に明記)
- [ ] ドキュメント更新済み（本 PBI の実装記録に計測源変更の同値性根拠を記録）
