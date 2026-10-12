# PBI: release workflow 検査の YAML パーサ導入を将来候補にする

状態: 未着手（コードレビュー 2026-10-11 の Suggestions #7 から起票。type: backlog）
起票日: 2026-10-11

## ユーザーストーリー

保守担当者として、release workflow の検査が workflow の成長に追随してほしい。なぜなら、現行のテキスト断言はインデント依存で、job 追加などで壊れやすいから。

## 優先度

- 順位: 7 / 全候補 8 件
- RICEスコア: 0.5（Reach=1 / Impact=0.5 / Confidence=100% / Effort=1）
- 根拠: dev 工程。現行検査は緑で実害なし。workflow が育つか、検査が誤検知したときに着手する

## BDD受け入れシナリオ

```gherkin
Scenario: 将来 workflow が育ったらパーサ化を検討する
  Given release workflow に job が増えたか検査が誤検知した
  When  本 PBI に着手する
  Then  YAML パーサの devDependency 化と断言の置換が行われる
```

## 受け入れ基準

- [x] 着手条件（job 追加・誤検知）が本 PBI に記録されている
- [x] 着手までは現行のテキスト断言を維持する

## テスト戦略

- 将来 PBI のため対象外

## 見積もり

1pt（要チームでの見積もり）

## Definition of Done

- [x] 着手条件が記録されている

## 実施記録（2026-10-12）

- スコープは「将来候補として着手条件を記録する」ことで、受け入れ基準と DoD は全項目 `[x]` 済み。実装は着手条件の発火（release workflow への job 追加、または検査の誤検知）まで行わない
- 着手条件は本ファイルに記録のまま（アーカイブ後も参照できる）。着手までは現行のテキスト断言（`tests/build/release-workflow.build.ts`）を維持する
- 検証: `make check` exit 0（2026-10-12。コード影響のない台帳整理のため、フル検証の green をそのまま根拠にする）
