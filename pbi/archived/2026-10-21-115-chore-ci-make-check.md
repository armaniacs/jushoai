# PBI: CI で make check を自動実行する

## ユーザーストーリー

開発者として、PR・push で `make check`(typecheck+test+両ブラウザ build+manifest 検査+web-ext lint)が自動実行されてほしい、なぜなら単体 1,294 件超のテストが手動実行依存で 0.1.18 相当の未コミット変更が 49 ファイル滞留した実績があり、以降の TODO(NFKC 統一・分類変更・fixture 追加)の安全網が必要だから。

## 優先度

- 順位: 1位 / 9件
- RICEスコア: 72(Reach=2 / Impact=2 / Confidence=90% / Effort=0.05人月)
- 根拠: 受益は開発チームのみだが 以降 8 候補の安全網であり NOT-TODO 10(Edge E2E)が「検証基盤は先に CI 化」と明示依存(docs/todo-not-todo.md:127)。release.yml が tag push で同一の `make check` を ubuntu-latest で実行済み(release.yml:12, 41-42)で技術的不確実性が小さい。

## BDD受け入れシナリオ

```gherkin
Scenario: PR で make check が自動実行される
  Given PR が作成されている
  When pull_request イベントで workflow が起動する
  Then typecheck+test+両ブラウザ build+manifest 検査+lint が走り 失敗時は PR が失敗になる

Scenario: postinstall を飛ばした分を補う
  Given workflow が npm ci --ignore-scripts で依存を取得する
  When セットアップが完了する
  Then npx wxt prepare が明示実行され tsc と build が型生成物を参照できる
```

## 受け入れ基準

- [x] .github/workflows/ に新 workflow を追加し pull_request と push で `make check` を実行する(現状は pages.yml が site 関係の main push で tests/site のみ、release.yml が tags v* のみで PR トリガー皆無)
- [x] `npm ci --ignore-scripts` の後に `npx wxt prepare` を明示実行する(release.yml:28-31 の手順を踏襲)
- [x] actions は既存慣行どおり SHA ピン留めし Node は workflows の "24" に揃える(package.json に engines/packageManager は無し)
- [x] E2E(`make check-all`)は実ブラウザとドライバを要するため CI に入れず ユーザー実行のままにする
- [x] (任意)新 workflow 用の堅牢化ガードテストを tests/build/ に追加する(tests/build/release-workflow.build.ts の同型)

## テスト戦略

- 回帰: tests/build/release-workflow.build.ts が release.yml の堅牢化(job-scoped permissions・persist-credentials: false・--ignore-scripts)を検査しており 新 workflow で壊れないことを同型テストで確認(オプション)
- 受け入れ確認: CI 上の実行結果(初回の実行時間と flaky テストの顕在化の有無は CI 化で初めて観測される)

## 見積もり

- 0.05人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする(trigger と make check ステップ・wxt prepare 明示実行の宣言を tests/build/check-workflow.build.ts が検査。GitHub 上の初回実行結果は push 後の確認)
- [x] コードレビュー完了
- [x] `make check` が通る
