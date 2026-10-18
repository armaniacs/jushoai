# PBI: フィードバック題名のホスト露出を抑える

## ユーザーストーリー

報告者として、社内ホスト名が公開GitHub issueの題名に不可逆公開されないようにしてほしい、本文は最小化済みだがtitleに完全形が入るため。

## 優先度

- 順位: 17位 / 20件
- RICEスコア: 160（Reach=5 / Impact=2 / Confidence=80% / Effort=0.05人月）
- 根拠: 社内ホスト名の不可逆公開の抑止。依存なし。
- 出典: checking-team Red Team Medium、src/feedback/issue-url.ts:63-71

## BDD受け入れシナリオ

```gherkin
Scenario: 題名から完全ホスト名が除去される
  Given 報告対象ページのホストが社内名・ポート付きである
  When フィードバックissueのURLを組み立てる
  Then titleにはeTLD+1またはハッシュ化された形だけが残り、完全ホスト名とポートが含まれない

Scenario: 本文の最小表示は維持される
  Given 報告対象ページが任意のURLである
  When フィードバックissueのURLを組み立てる
  Then body側の最小表示（publicPageLabel相当）は維持され、深いパス識別子が追加で露出しない
```

## 受け入れ基準

- [x] issueのtitleに完全ホスト名が含まれない（eTLD+1またはハッシュ・ポート除去のいずれか）
- [x] 不正URL・ホスト取得失敗時はtitleが安全なフォールバック（'unknown'等）になる
- [x] body側の最小表示（Page行・メタ断片化）が現行のまま維持される
- [x] 同意文言とtitle最小化の説明が整合している
- [x] 既存フィードバック関連テストが緑のまま通る

## テスト戦略

- 単体: 通常ホスト・ポート付き・社内名・不正URLのtitle組み立て分岐を網羅する
- 統合: issue URL組み立て→title/bodyパラメータ検証で露出の有無を確認する
- 回帰: 既存feedbackテスト群を緑のまま維持し、同意文言との整合を確認する

## 見積もり

- 0.05人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] `make check` が通る
