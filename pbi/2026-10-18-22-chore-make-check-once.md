# PBI: make checkの二重ビルドをなくす

## ユーザーストーリー

開発者として、check1回でchrome/firefoxビルドが各2回走る無駄をなくし、こまめな検証を阻害しないようにしてほしい、なぜならWXTビルドが律速でcheck体感時間が約2倍になっているため。

## 優先度

- 順位: 22位 / 40件
- RICEスコア: 100（Reach=5 / Impact=1 / Confidence=80% / Effort=0.04人月）
- 根拠: checkの体感時間を短縮しこまめな検証を阻害しない。依存なし。
- 出典: checking-team DX Medium plans/2026-10-18-1430-review-1018a.md、.checking-team-tmp/1018a-20261018-142047/code-quality.md
- 対象: Makefile:43（check）、Makefile:31-32（test-build）、Makefile:28-29（lint-firefox）、Makefile:3（全ターゲット.PHONY）

## BDD受け入れシナリオ

```gherkin
Scenario: check1回でchrome/firefoxビルドが各1回だけ走る
  Given クリーンな状態である
  When make checkを実行する
  Then chromeビルドとfirefoxビルドが各1回だけ実行され、重複ビルドが走らない

Scenario: lint-firefoxは成果物を再利用する
  Given dist/firefox-mv3が既に存在する
  When lint-firefoxを実行する
  Then firefoxの再ビルドをせず既存成果物に対してweb-ext lintが実行される
```

## 受け入れ基準

- [x] `check`の依存から素の`build`を外す等により、1回の`check`でchrome/firefoxビルドが各1回だけ走る
- [x] `lint-firefox`が成果物再利用型になり、既存成果物がある場合は再ビルドしない
- [x] 変更範囲がMakefileの依存関係に収まり、検証内容（typecheck・test・両ブラウザbuild・manifest検査・web-ext lint）が欠落しない
- [x] 既存テストが緑維持

## テスト戦略

- ビルド検証: クリーン状態から`make check`相当の依存解決で各ビルドが1回だけ走ることを確認する
- ビルド検証: 成果物あり状態で`lint-firefox`が再ビルドせずlintを実行することを確認する
- ビルド検証: `check`通過後の成果物が従来と同等（両ブラウザのmanifest検査・lint完走）であることを確認する

## 見積もり

- 0.04人月

## Definition of Done

- [x] 全BDDシナリオが手動または自動で確認されパスする
- [x] コードレビュー完了
- [x] `make check` が通る（2026-10-18最終検証でEXIT:0を確認。作成時の一過性失敗は解消済み）
