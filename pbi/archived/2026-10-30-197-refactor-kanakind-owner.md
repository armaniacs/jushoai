# PBI: kanaKind 付与の第 2 所有の削除

## ユーザーストーリー
開発者として、kanaKind 付与の所有を resolveKana に寄せたい、なぜなら mergeClassified の LLM 分岐の付与は直後の resolveKana 接尾ルールが冪等に上書きする pass-through で、kana.ts のコメントも移動前の場所（analyze.ts）を参照したままのため

## 優先度
- 順位: 8 / 13
- RICEスコア: 20（Reach=2 / Impact=0.5 / Confidence=100% / Effort=0.05人月）
- 根拠: 同一関数・冪等・観測点なしの純粋な pass-through 除去。193 と同バッチ可。依存なし

## BDD受け入れシナリオ
Scenario: kanaKind は resolveKana 接尾ルールから 1 回だけ付く
  Given LLM が lastNameKana を返す
  When runClassifyPipeline を実行する
  Then kanaKind は接尾ルールから付与され、merge 分岐の付与は存在しない

## 受け入れ基準
- [x] mergeClassified の kanaKind 付与（category.endsWith('Kana') → detectKanaKind）が削除される
- [x] kana.ts の stale コメント（「mirroring analyze.ts's」）の参照先が pipeline に是正される
- [x] mergeClassified の resolveKana 呼び出しは残る（カナ flip 自体の所有）
- [x] 既有テスト（kana-blind、fill-one、classify-pipeline）と `make check` が緑

## テスト戦略
- 単体: LLM 直返しカナ category の kanaKind が resolveKana 接尾ルールで付くことを pin（merge 直後の形状を pin する既存テストは無いため追加）
- 統合: classify-pipeline テストの category pin が不変であること

## 実装アプローチ
- pipeline.ts の LLM 分岐から kanaKind spread を外し、接尾ルール（kana.ts の `kanaKind === undefined` 付きバックフィル）を唯一の所有にする。コメントの参照先も直す

## 見積もり
0.05人月

## 技術的考慮事項
- 削除後も mergeClassified の resolveKana 呼び出しを外すと kanaKind だけでなくカナ flip 自体が消え、fill-one テストが落ちる（最大の落とし穴）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] ドキュメント更新済み
