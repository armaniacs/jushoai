# PBI: プレビューテストのモック3重複をヘルパーに寄せる

## ユーザーストーリー

開発者として、attachShadow の open mode スパイと PreviewRow ファクトリを共有ヘルパーに寄せたい、なぜなら3ファイルに複製された「import 時に1回だけ capture（spy 再帰防止）」の不変条件がコメント×3で管理されており、新テストを書くたびにどれか1つから写す必要があるため。

## 優先度

- 順位: 2位 / 4件
- RICEスコア: 33（Reach=2 / Impact=0.5 / Confidence=100% / Effort=0.03人月）
- 根拠: Quick Win。3ファイルは「shadow root を開いて検査する」という同じ理由で同時に変わる候補なので共通化は過剰にならない。他候補との依存なし。

## BDD受け入れシナリオ

```gherkin
Scenario: スパイの組み立てが1箇所に寄る
  Given 3つのテストファイルが同一の attachShadow スパイを複製している
  When tests/helpers.ts に attachOpenShadow を置く
  Then 3ファイルがヘルパーを使い、spy 再帰防止がコメントではなくコード1箇所になる

Scenario: row ファクトリが1箇所に寄る
  Given 3つのテストファイルが row() を個別に定義している
  When makeRow を helpers に寄せる
  Then テストの期待値が変わらず緑を維持する
```

## 受け入れ基準

- [x] tests/helpers.ts に attachOpenShadow（spy 設定 + root 返却 + restore）が定義されること
- [x] preview.test.ts・preview-feedback.test.ts・preview-bind.test.ts がヘルパーを使うこと
- [x] row ファクトリが寄せられること（preview-bind の display 既定値の差は引数で保つ）
- [x] 既存テストが緑維持

## テスト戦略

- 回帰: `make check` green（テストの期待値は変えない）

## 見積もり

- 0.03人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
