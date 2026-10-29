# PBI: NFKC 正規化を norm/clean の 2 本立てに統一する

## ユーザーストーリー

保守担当者として、trim を含む正規化を共有ヘルパー clean(NFKC+trim)に寄せてほしい、なぜなら eras/genders/prefectures/profile が各々 .trim() と組合せて正規化を再実装しており TODO 5〜8 の横断実装時に修正漏れ・意味の揺れが起きるから(レビュー指摘 D)。

## 優先度

- 順位: 2位 / 9件
- RICEスコア: 64(Reach=8 / Impact=0.5 / Confidence=80% / Effort=0.05人月)
- 根拠: 分類・整形の全正規化パスに及ぶ内部統一。振る舞い変更ゼロの保守性改善のみだが TODO 6/7/8 の変換実装が触る正規化の基点になるため変換系の前に着手する。clean は genders.ts:5 に未エクスポートで既存(昇格で API 形状が確定)。分類パス側の入口集約は既に実装済み(pbi/2026-10-18-07-refactor-nfkc-once.md)で 残るはオプション・プロファイル matcher 側の置換が本体。

## BDD受け入れシナリオ

```gherkin
Scenario: trim 系正規化が clean に寄せられる
  Given eras/genders/prefectures/profile が trim と組合せて正規化を再実装している
  When 共有の clean(NFKC+trim)に置換する
  Then tests/core/normalize-parity.test.ts が期待値無変更で緑を維持する

Scenario: 意味の違いが保持される
  Given norm は NFKC+toLowerCase で trim しない
  When ルールマッチとオプション・プロファイル値マッチを比較する
  Then ルールは case-insensitive ローマ字値は case 保持(width-fold のみ)が保たれる
```

## 受け入れ基準

- [x] 意図を固定する fixture を先行追加(tests/core/)してから置換する(tests/core/clean-semantics.test.ts 8テスト。置換前から緑を確認)
- [x] genders.ts:5 のローカル clean を共有ヘルパーに昇格し eras/genders/prefectures/profile の trim 系正規化(約 15 箇所)を clean ベースに寄せる(eras 7 + prefectures 1 + profile 6 + 昇格 1。digits は NFKC+\D が空白を落とすため trim が no-op であり独立のまま、WHY コメントに判断を記録)
- [x] literals.ts:8-10 の所有コメント(Trim-bearing normalization stays owned by the matchers)を更新する(WHY コメントに置換。clean を norm の隣に昇格し 2 本立ての契約を 1 ファイルで可視化、併合禁止も記録)
- [x] tests/core/normalize-parity.test.ts を期待値無変更で維持する(✓ 期待値無変更で緑)
- [x] `make check` が通る

## テスト戦略

- 単体: normalize-parity.test.ts(期待値無変更)+ 意図固定 fixture(tests/core/)
- 回帰: `make check` green

## 見積もり

- 0.05人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする(clean-semantics.test.ts が意味の違いを機械的に守り normalize-parity.test.ts が併合禁止を検査)
- [ ] コードレビュー完了
- [x] `make check` が通る
