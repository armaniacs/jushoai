# 400/422→rejected 判定の集約

種別: fix
優先度: 順位 1/4、RICE 8.0（Reach=4 / Impact=1 / Confidence=1.0 / Effort=0.5）
根拠: 互換リトライと失敗理由分類の2箇所が同じ 400/422 ペアを別々に知っており、片方だけ変わりやすい
依存: なし（先行実施）

## ユーザーストーリー

AI分類の保守者として、拒否ステータスの定義を1箇所で変えたい。なぜなら再試行条件と理由分類が別ファイルで同じ数値を繰り返しているから。

## 背景

現状、400/422 を rejected 系として扱う知識が3箇所に分散している:

- `src/ai/http-classifiers.ts:112`: `const isRejection = (status: number) => status === 400 || status === 422;` が互換リトライ条件を定義している
- `src/llm/handle-message.ts:135`: `runTest` が `HttpRequestError` の `status === 400 || status === 422` を `rejected` に分類している
- `src/llm/handle-message.ts:167`: `ai-classify` が `HttpRequestError` の `status === 400 || status === 422` を `rejected` に分類している

`http-classifiers.ts` 側の定義を変えても `handle-message.ts` 側の2分岐は追随しない。逆も同様である。

## BDDシナリオ

### 1. 400/422 は rejected になる

```gherkin
Given AI provider が 400 または 422 を返す
When ai-classify または ai-test を実行する
Then reason は rejected になる
And 互換リトライ条件の判定と一致する
```

### 2. 401 は auth のままである

```gherkin
Given AI provider が 401 を返す
When ai-classify または ai-test を実行する
Then reason は auth のままである
And rejected には分類されない
```

## 受け入れ基準

1. 拒否ステータスの判定が単一の共有定義から参照される
2. 400 と 422 がともに rejected として扱われる
3. 401/403 が auth 扱いのまま変わらない
4. 既存テストが green を維持する
5. `tests/entrypoints/handle-message.test.ts` の期待値更新が必要なら本PBI範囲に含む
6. 互換リトライの振る舞いが変わらない

## テスト戦略

- `tests/ai/` に拒否判定の単体テストを追加する（400/422 → rejected、401 → 非 rejected）
- `tests/entrypoints/` の該当テスト（`handle-message.test.ts`）で `ai-classify` / `ai-test` の `rejected` / `auth` 分岐を確認する
- 実行は `vitest run` で対象ファイルを指定し、最後に全体テストで green を確認する

## 見積もり

0.5pt

## DoD

- [x] 拒否判定が1箇所に集約されている
- [x] BDDシナリオの2件がテストで裏付けられている
- [x] 既存テストが green である
