# PBI: 除外競合時のreason保持をACに明記する

## 背景

`createFillSession` は `start()` 後の除外分岐でも `failureReason` を運び（`src/content-session.ts:152-154`）、呼び出し側 `src/entrypoints/content.ts:216` が `button.showError` する。つまり「除外パネルなし＋エラー表示あり」の組み合わせが仕様だが、PBI-45 の受け入れ基準にこの1行がなく、意図通りか偶然か将来の読み手に分からない。テスト `carries the failure reason even when an exclusion landed mid-classify` は既に存在する。

## ユーザーストーリー

開発者として、除外競合時も reason を運ぶ仕様を AC に明記したい、なぜなら現状はテストだけにあって意図が文書化されておらず、将来「除外時は表示不要」と誤って消されるため。

## 優先度

- 順位: 5位 / 7件
- RICEスコア: 26.7（Reach=2 / Impact=0.5 / Confidence=80% / Effort=0.03人月）
- 根拠: 誤削除を防ぐ文書化。実装はテスト済みで、作業は PBI-45 への AC 追記（または本 PBI での意図記録）のみ。

## BDD受け入れシナリオ

```gherkin
Scenario: 除外競合時も失敗理由が失われない
  Given 分類中に除外条件が成立した実行がある
  When session.start() が返る
  Then { excluded: true, failureReason } で理由が運ばれ、呼び出し側がエラー表示できる

Scenario: 意図が文書に残る
  Given 将来の開発者が除外分岐を読む
  When PBI-45 の受け入れ基準を見る
  Then 除外時も reason を運ぶことが意図通りと分かる
```

## 受け入れ基準

- [x] `pbi/2026-10-18-45-refactor-session-apply.md` に除外競合時の reason 保持の AC が1行以上追記される（または本 PBI が意図記録として台帳に残る）
- [x] 既存テスト `carries the failure reason even when an exclusion landed mid-classify` が対応テストとして参照される
- [x] 振る舞い変更なし（テスト緑維持）

## テスト戦略

- 既存: 上記テストがパスすること（追加テスト不要）
- 回帰: `tests/content-session.test.ts` を緑維持で確認する

## 見積もり

- 0.03人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする（既存テストの参照で可）
- [x] コードレビュー完了
- [x] `make check` が通る
