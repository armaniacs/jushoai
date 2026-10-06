# storage UUID生成のフォールバック

- 種別: fix
- 優先度: 順位 2/6
- RICE: 6.4（Reach=2 / Impact=2 / Confidence=0.8 / Effort=0.5）
  - 根拠: `crypto.randomUUID` が無い文脈での移行失敗の実害解消。設計判断（フォールバック方式）が残るため Confidence 0.8
  - 依存: なし
- 見積もり: 0.5pt

## ユーザーストーリー

拡張機能の利用者として、どのブラウザ文脈でも設定移行が壊れないでほしい、なぜならレガシー単一プロファイルからの移行時に UUID 生成で例外が出ると設定全体が読めなくなるから。

## 背景

`src/storage.ts:55-73` の `migrateData` は、ID の無い `profile` と `address` に対して `crypto.randomUUID()` で ID を付与する。

- `src/storage.ts:62`: `id: p.id || crypto.randomUUID()`
- `src/storage.ts:69`: `id: a.id || crypto.randomUUID()`

`crypto.randomUUID` が未定義の文脈（非セキュア文脈・レガシー実行環境など）では上記2箇所で例外が発生し、`migrateData` 全体が失敗して保存済み設定が読み出せなくなる。UUID 生成は `core/` の決定的処理ではなく `src/storage.ts` の移行処理に直結するため、フォールバックが無いと移行の単一障害点になる。

## BDDシナリオ

### 1. `randomUUID` がある文脈では従来通り移行できる

```gherkin
Given crypto.randomUUID が利用できる
When ID の無いレガシー単一プロファイルと address を migrateData に渡す
Then profile と address に UUID が付与され、profile の label は メインになる
```

### 2. `randomUUID` が無い文脈でも移行が壊れない

```gherkin
Given crypto.randomUUID が未定義である
When ID の無いレガシー単一プロファイルと address を migrateData に渡す
Then 例外なく移行が完了し、profile と address に一意な ID が付与される
```

### 3. 既存 ID はフォールバック時も保持される

```gherkin
Given crypto.randomUUID が未定義である
When ID 付きの profiles と addresses を migrateData に渡す
Then 既存の id と profileId の関連付けは変更されない
```

## 受け入れ基準

1. `crypto.randomUUID` が未定義でも `migrateData` が例外を投げず、ID 無し入力に一意な ID を付与すること
2. `crypto.randomUUID` が利用できる文脈では従来通りの移行結果と変わらないこと
3. フォールバック生成の ID が `profile` 間・`address` 間で重複せず、`profileId` の関連付けが壊れないこと
4. 既存の移行テスト（`tests/storage.test.ts`）が green を維持すること
5. 新規テストで `randomUUID` あり/なし両文脈の移行をカバーすること

## テスト戦略

- `vitest`（`make test`）で実行する
- 配置先: `tests/storage.test.ts` に `crypto.randomUUID` あり/なし両文脈の `migrateData` ケースを追加する
- `randomUUID` なし文脈は `crypto.randomUUID` の一時的な退避・復元、または `vi.stubGlobal` による `crypto` 差し替えで再現する
- 既存の `tests/storage.test.ts` の移行ケースが green であることを確認する

## DoD

- [x] 受け入れ基準の全項目を満たすこと
- [x] `tests/storage.test.ts` の新規・既存ケースが green であること
- [x] 実装が `migrateData` のフォールバックに限定され、他の移行仕様を変更していないこと
