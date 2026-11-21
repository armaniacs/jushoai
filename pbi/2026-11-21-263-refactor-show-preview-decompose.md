# PBI: showPreview の配線をセクションに分解する

## ユーザーストーリー
プレビューを触る保守者として、plan 行描画・同意・replan・AI ガイド配線が関数内セクション (helpers) に分かれていてほしい、なぜなら 約 282 行の 1 関数では配線の 1 箇所を変えるだけでも全体を読む必要があり、プレビューは fill 経路の末端として変更頻度が高いから

## 優先度
- 順位: 5 / 6
- RICE スコア: 14 (Reach=2 / Impact=2 / Confidence=70% / Effort=0.2人週)
- 根拠: 2026-11-21 DRY/KISS 調査 (K2)。plan 行描画 (renderRow 60 行) は既に分離済みで、残りは配線の塊。分解は読みやすさの改善で、挙動は不変

## 出どころ
- DRY/KISS 調査 2026-11-21 (K2)。ラウンド台帳 `pbi/2026-11-21-01-backlog-drykiss-round.md`
- 現状確認 (2026-11-21): src/ui/preview.ts:222 の showPreview が 222 行目からファイル末尾 (502 行) までの 1 関数

## ビジネス価値
- 配線変更の diff が該当セクションに収まる。測定: 次にプレビュー配線を触る PBI の diff が変更セクションに限定される

## BDD受け入れシナリオ

```gherkin
Scenario: 配線の変更 diff がセクションに収まる
  Given showPreview が plan 描画・同意・replan・AI ガイド配線のセクション helpers に分解されている
  When  replan 配線を変更する
  Then  変更 diff が replan セクションに限定される

Scenario: 既存 pin は無変更で緑である
  Given 分解を行う
  When  tests/ui 配下の preview pin を走らせる
  Then  全 pin が無変更で緑 (表示・同意・replan の意味論不変)
```

## 受け入れ基準
- [ ] showPreview がセクション helpers (plan 描画 / 同意配線 / replan / AI ガイド配線) に分解され、本体は呼び出しと状態の受け渡しのみになっている
- [ ] module 外への新規 export を作らない (関数内 helpers)
- [ ] 既存 pin (tests/ui/preview 系) が無変更で緑
- [ ] `make check` 緑

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 追加なし

### 統合テスト
- 既存のプレビュー系 pin が緑

### 単体テスト
- 既存 pin が全責務を既にカバーするため追加なし (分解で穴が見つかった場合のみ追加)

## 実装アプローチ
- **Outside-In**: pin の分布から自然な切断面を決める
- **Red-Green-Refactor**: 既存 pin が GREEN のまま移動
- **リファクタリング**: PBI-112 (テストヘルパー) の流儀を踏襲 — state の受け渡しを増やさない

## 見積もり
0.2人週（要チームでの見積もり）

## 技術的考慮事項
- 依存関係: なし (259/260 と独立)
- テスタビリティ: 既存 pin 網
- 非機能要件: 同意の適用直前検証 (consent-check)・相互排他 (PBI-04 overlay) の意味論は不変

## 実装者向け注記

### 現状コードの確認
（2026-11-21 作成時に現存確認済み。着手時に再確認すること）
```bash
grep -n "function showPreview" src/ui/preview.ts
wc -l src/ui/preview.ts
grep -n "renderRow" src/ui/preview.ts | sed -n '1,4p'
```

### 実装手順
1. showPreview 内を責務で色分けする (plan 描画ループ / 同意 / replan / AI ガイド / パネル共通)
2. 自然な切断面ごとに関数内 helpers に移動 (state はクロージャか 1 つの context オブジェクトで)
3. 既存 pin 全実行 → make check
4. 分解後の関数が 60 行以内に収まらないセクションがあれば、それは切断面が誤り — 無理に小さくしない

### 落とし穴
- 同意 (consent) の適用直前検証と egress パリティの周辺は意味論が繊細 — 移動のみで条件式を書き換えない
- renderRow との境界を動かさない (既に分離済みの単位を尊重)
- preview は AI ガイドと相互排他 (PBI-04) — パネル生成順序の変更が意味を変えないよう、移動はコード位置のみ

## Definition of Done
- [x] 全 BDD シナリオが自動テストとして実装されパスする (既存 pin 全部無変更)
- [x] テストカバレッジが基準を満たす (既存 pin 網)
- [ ] コードレビュー完了（GitHub PR での approve を必須とする）
- [x] リファクタリング完了（グリーン後・セクション化まで）
- [x] ロールバック手段の検討（挙動不変の関数内移動。revert で完結）
- [x] ドキュメント更新済み（本 PBI の実装記録）
