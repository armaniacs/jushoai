# PBI: E2E の Chrome 起動フラグを CI に限定する

状態: 未着手（0.1.14 コードレビュー 2026-10-12 の Suggestions #5 から起票）
起票日: 2026-10-12

## ユーザーストーリー

保守担当者として、テスト用ブラウザの隔離機構が不必要に無効化されないでほしい。なぜなら `startChromeDriver` が `--no-sandbox` を無条件に付けており、ローカル実行でもブラウザのサンドボックスが無効になるから。

## 優先度

- 順位: 1 / 全候補 5 件
- RICEスコア: 1.0（Reach=1 / Impact=0.5 / Confidence=100% / Effort=0.5）
- 根拠: 同点（1.0）の中でリスク軽減効果が最も高い。テストが開くのはローカルの fixture のみで実害は薄いが、無条件の緩和は次に読む人が理由を問えない。他候補と独立

## BDD受け入れシナリオ

```gherkin
Scenario: ローカル実行ではサンドボックスを維持する
  Given CI の指定がない
  When  Chrome の E2E を起動する
  Then  --no-sandbox は付かない

Scenario: 制限環境では起動できる
  Given コンテナや CI で実行する
  When  Chrome の E2E を起動する
  Then  --no-sandbox が付き、ブラウザが起動する
```

## 受け入れ基準

- [x] `--no-sandbox` は CI（または明示した環境変数）のときだけ付く
- [ ] 既定の `make e2e-chrome` が従来どおり緑である（この実行コンテキストは Chrome にとって制限環境のため sandbox 有効の実起動を実施できない。通常ターミナルでの確認はユーザー作業。実施記録参照）
- [x] 理由（コンテナで sandbox が使えない）がコメントに残っている
- [x] `make check` が通る

## テスト戦略

- 起動フラグの組み立てを純粋関数に切り出し、環境の入力に対する引数の集合を単体で断言する（ブラウザ起動なしで検証できる形にする）
- 実起動は既存の Chrome E2E が担う

## 見積もり

0.5pt（要チームでの見積もり）

## Definition of Done

- [x] 全 BDD シナリオが自動テストとして実装されパスする
- [x] Chrome E2E が緑（`E2E_NO_SANDBOX=1 HEADLESS=1 make e2e-chrome` で 5/5。実施記録参照）
- [x] `make check` が通る
- [ ] コードレビュー完了（ユーザー作業）

## 実施記録（2026-10-12、タスククローザによる実装）

- 実装コミット `2a35d9a`: `tests/e2e/chrome-flags.ts`（新規、純粋関数 `chromeLaunchArgs(env)`）+ `tests/e2e/chrome-flags.test.ts`（新規、env→引数集合の単体断言 6 件）+ `tests/e2e/harness.ts`（`startChromeDriver` を `options.addArguments(...chromeLaunchArgs())` に置換）
- テスト: Red（純粋関数不在で import 失敗）→ Green（6/6）。`make check` exit 0（typecheck、テスト 88 ファイル 1166 passed + 2 期待失敗、両ブラウザ build、manifest 検査 17 件、lint 0 エラー）
- E2E: `E2E_NO_SANDBOX=1 HEADLESS=1 make e2e-chrome` で 5/5 緑（2 回確認。別実行で 1 回タイムアウトの flake があり再実行で緑）。この実行コンテキストは Chrome にとって制限環境（ネストしたサンドボックス。crashpad の `Operation not permitted` と Chrome 単体 `--headless=new` の起動失敗「Failed to create a unique user data directory」で確認）のため、sandbox 有効の実起動はこのコンテキストからは実施できない
- 制限環境での起動は PBI の BDD シナリオどおり明示環境変数で可能になり、通常環境では sandbox が維持される（`chrome-flags.test.ts` が env→引数の対応を固定）。以後フラグを変えるときは純粋関数と単体テストを先に直す
- ユーザーの作業として残る項目: コードレビュー、通常ターミナルでの `make e2e-chrome`（sandbox 有効）の起動確認
