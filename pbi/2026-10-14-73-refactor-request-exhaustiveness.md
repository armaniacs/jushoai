# PBI: AiRequest switch の網羅性ガード

## ユーザーストーリー

保守担当者として、`handleMessage` の要求種別 switch に網羅性ガードを付けてほしい。なぜなら新しい要求種別を `AiRequest` に足しても現状コンパイラが黙り、未処理で `undefined` 返却になるから。

## 背景・問題

- 対象: `src/llm/handle-message.ts` の `switch (req.type)`（4ケース、default なし）
- 現状: `parseRequest` が null を弾くため未知形状は `undefined` 早期返却されるが、`AiRequest` union 自体への種別追加は switch のフォールスルーを誰も検出しない。
- 提案: 型監査所見 #3。`default` 節に `never` 代入ガードを付け、種別追加時にコンパイルエラーで検出する。振る舞いは不変。
- 候補番号: 本ラウンド順位 3（全4件）

## 優先度・スコア

- 順位: 3 位 / 4 件
- RICE スコア: 40
  - Reach = 5（メッセージ種別の将来追加）
  - Impact = 0.5（未処理種別のコンパイル時検出）
  - Confidence = 80%（1行級の型付け替え）
  - Effort = 0.05 人週（ガード追加＋既存テスト回帰のみ）
- 根拠: 同点帯では順位2のリスク軽減を優先し後に配置。
- 依存: なし。

## BDD受け入れシナリオ

```gherkin
Scenario: ハッピー — 既存4種別の応答が変わらない
  Given ai-status／ai-download／ai-classify／ai-test の各要求がある
  When handleMessage で処理する
  Then 従来通りの応答になる

Scenario: 境界 — 未知形状は従来通り undefined になる
  Given AiRequest に合致しないメッセージがある
  When handleMessage で処理する
  Then undefined が返る（parseRequest の早期返却は不変）
```

## 受け入れ基準

- [ ] `default` 節に `never` 代入ガードがある
- [ ] 既存4種別の応答・フォールバックが変わっていない
- [ ] 既存の handleMessage テストがすべてパスする
- [ ] `make typecheck` と `make test` がパスする

## テスト戦略（t_wadaスタイル）

### E2Eテスト

- 不要（型付け替えのため）

### 統合テスト

- 不要（振る舞い不変のため）

### 単体テスト

- 新規テストは不要（既存の形状テストが全分岐を覆っている）。種別追加時の検出は型検査が担う

## 見積もり

- 0.05 人週（ストーリーポイント換算では最小単位。要チームでの見積もり）
- 内訳想定: ガード追加＋既存テスト回帰のみ

## Definition of Done

- [ ] 全BDDシナリオが自動テストとして実装されパスする（既存契約の green をもって充足）
- [ ] `make typecheck` がパスする
- [ ] `make test` がパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新不要であることが確認済み（内部付け替えのため）

## 実装者向け注記

### 現状コードの確認（着手前に必ず実行すること）

対象は `src/llm/handle-message.ts` の switch 文。

- `parseRequest` の null 早期返却は変えないこと（未知形状の `undefined` 返却は維持）
- `background.ts` の if-chain は sender 分岐と混在のため本 PBI の対象外。手を出さないこと
- 関連テストは `tests/entrypoints/handle-message.test.ts` の形状テスト（未知形状の `undefined` 断言）

### 落とし穴

- `never` ガードの変数名は未使用扱いにならない形にすること（代入のみで参照なしのため、`noUnusedLocals` の設定次第で注意。void 評価等の回避策は型検査の green で確認すること）
