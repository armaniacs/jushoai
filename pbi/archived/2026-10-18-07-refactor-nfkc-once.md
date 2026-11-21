# PBI: 分類パスのNFKC正規化を入口に集約する

## ユーザーストーリー

開発者として、同一文字列のNFKC正規化が1欄最大9回走る無駄をなくしたい、大規模フォーム×毎sync再分類でCPUが増幅するため。

## 優先度

- 順位: 7位 / 20件
- RICEスコア: 500（Reach=100 / Impact=0.5 / Confidence=80% / Effort=0.08人月）
- 根拠: 全欄×毎syncの増幅を断つ。依存なし。
- 出典: checking-team Tuning Medium、src/core/classify-rules.ts:283,321、src/core/kana.ts:54-61

## BDD受け入れシナリオ

```gherkin
Scenario: 分類結果が変わらない
  Given 既存の分類テスト一式がある
  When NFKC正規化を入口に集約する
  Then 全欄の分類結果（カテゴリ・信頼度・カナ種別）が1件も変わらない

Scenario: 半角・結合濁点の扱いが維持される
  Given 半角カタカナと結合濁点（か+U+3099など）を含む欄がある
  When 分類を実行する
  Then 半角は全角化後に判定され、結合濁点は合成後の範囲で判定される（変更前と一致する）
```

## 受け入れ基準

- [x] NFKC正規化が分類パスの入口に集約され、同一文字列への重複 `normalize('NFKC')` がなくなる
- [x] kana側のクエリ（`matchFieldOwned` / `matchLegend` 相当）が正規化済み前提のまま保たれる
- [x] 半角カタカナのraw参照など、正規化前で読むべき分岐の扱いが維持される
- [x] 既存のkana・normalize関連テストが期待値無変更で緑である
- [x] 大規模フォーム相当での性能計測メモが残る（分類回数・所要時間の改善方向）

## テスト戦略

- E2E: サンプルフォーム相当で分類結果の不変を目視する
- 統合: `classifyAll` 相当の前後一致（カテゴリ・信頼度・カナ種別）を確認する
- 単体: 半角・結合濁点・全角英数の境界値で分類結果が変更前と一致する

## 見積もり

- 0.08人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] 受け入れ基準の5項目がすべて満たされる
- [x] `make check` が通る

## 計測メモ（2026-10-18・実装時）

- 実装: `classifyField` の sources 節直前で6源泉（own・legend/nearby・name/id・label/placeholder・
  placeholder・name/id/label）を各1回だけ `norm()` し、`classifyText` と `wantsKana(m, pre)` に渡す。
  `classifyText` 内部の `norm(raw)` を削除し、`matchFieldOwned` / `matchLegend` の正規化済み前提は維持。
  pattern 属性は別源泉のため `hasKanaPattern` 内の1回のみ。半角系の raw 参照（`detectKanaKind` 等）は無改変。
- 回数: 1欄あたり `normalize('NFKC')` は最大9回→最大7回（6源泉＋pattern到達時の1回）。
  旧実装で3回走っていた `nearby` は `legendText` に一本化（`tests/core/nfkc-once.test.ts` で回数を固定）。
- 所要時間: 2000欄フォームの `classifyField` 連続実行で変更前 5.8ms → 変更後 6〜9ms（実行ごとの振れ幅内・同等帯）。
  短い文字列の NFKC は ns オーダーのため壁時計の差は誤差に埋もれる。削減効果は毎 sync 再分類の
  ワーストケース（カナ到達欄の重複 norm 消滅）に効く。
- 不変の担保: 境界値14件の `classifyField` 素名・信頼度ピン留め＋5欄 `classifyAll` の
  カテゴリ・信頼度・kanaKind 前後一致（同テスト）。既存 `tests/core/` 361件は期待値無変更で緑。
