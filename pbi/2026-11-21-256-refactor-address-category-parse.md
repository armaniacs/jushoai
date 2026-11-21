# PBI: address カテゴリ構築を型保護に載せる

## ユーザーストーリー
分類語彙を保守する人として、海外住所欄の `address${n}` カテゴリ構築が型検査で守られていてほしい、なぜなら matchAs(`address${addrLine[1]}` as Category) は文字列補間の結果を cast で通しており、Category 側のリネーム・構造変更がコンパイルエラーとして検出されず、型保護の外に穴が開いているから

## 優先度
- 順位: 11 / 13
- RICE スコア: 20 (Reach=2 / Impact=1 / Confidence=80% / Effort=0.1人週)
- 根拠: checking-team Blue Team (Low)。Category の値集合は core/types.ts で定義されており、address1〜address4 は ADDR_LINE 正規表現の capture group との対応で成り立つ。この対応関係を型で表現する小さな保護で、将来のリネーム事故を防ぐ

## 出どころ
- checking-team 2026-11-21 Blue Team (Low)。ラウンド台帳 `pbi/2026-11-21-00-backlog-checking-arch-round.md`
- 現状確認 (2026-11-21): src/core/classify-vocab-address.ts の address-line-own / address-line-legend 2 entries で補間 + as Category を使用

## ビジネス価値
- カテゴリ名変更・構造変更が型エラーとして検出される。測定: as Category の cast が classify-vocab-address.ts から消える

## BDD受け入れシナリオ

```gherkin
Scenario: 不正な address 番号が型で拒まれる
  Given addressCategory のような型保護付きの構築関数が存在する
  When  capture group の取り得ない値を渡すコードを書く
  Then  typecheck が失敗する

Scenario: 現行の分類挙動は不変である
  Given 海外住所欄 (address_1..4) の分類パスが存在する
  When  構築関数に置換する
  Then  既存 pin (address1〜address4 の分類) と `make eval` 3 passed が無変更で緑である
```

## 受け入れ基準
- [ ] capture group の値 (1〜4) を Category に写像する型保護付き関数 (例: addressCategory(n)) が追加されている
- [ ] classify-vocab-address.ts の 2 entries が構築関数経由になり、`as Category` cast が消えている
- [ ] 挙動不変 (既存 address 系 pin・`make eval` 3 passed)
- [ ] `make check` 緑

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 追加なし

### 統合テスト
- 既存の海外住所 pin (tests/core の address 系・samples fixture) が緑

### 単体テスト
- addressCategory の境界 (1〜4 は Category を返す・それ以外は null または型レベルで不可) を 2-4 件

## 実装アプローチ
- **Outside-In**: entries から見た望ましい呼び出し形 (addrLine[1] を渡して Category が返る) を先に決める
- **Red-Green-Refactor**: 関数単体テスト RED → 実装 → entries 置換 → GREEN
- **リファクタリング**: runtime ガード (null 返し) にするか型レベル (テンプレートリテラル型) にするかは、ADDR_LINE の capture group が文字列で来る点から runtime ガードが素直

## 見積もり
0.1人週（要チームでの見積もり）

## 技術的考慮事項
- 依存関係: なし
- テスタビリティ: 純粋関数で makeMeta fixture 不要
- 非機能要件: 挙動不変 (map のキー集合は ADDR_LINE の capture と厳密一致させる)

## 実装者向け注記

### 現状コードの確認
（2026-11-21 作成時に現存確認済み。着手時に再確認すること）
```bash
grep -n "as Category" src/core/classify-vocab-address.ts
grep -n "ADDR_LINE" src/core/classify-vocab-address.ts
grep -n "address" src/core/types.ts | sed -n '1,6p'
```

### 実装手順
1. core/types.ts の Category で address 系の値集合を確認する
2. classify-vocab-address.ts 内 (または types 隣接) に addressCategory(n: string): Category | null を追加 (ADDR_LINE の capture と Category の対応表)
3. 2 entries を構築関数経由に置換し、null 時は matchAs を返さない (現行: capture が取れないとそもそも match しない — 意味論を保存)
4. 単体テスト追加・make check + make eval

### 落とし穴
- capture group は string で来る — number に変換するなら Number() の NaN ガードが必要 (Number(raw) 安全化の過去慣行: profiles PBI で同種の対応あり)
- Category の address 系が addressFull / addressNoPref / address1-4 / building 等を含む混在集合である点に注意 — 対応表は addr 番号のみを写像する

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする (型レベルは typecheck、runtime は単体)
- [ ] テストカバレッジが基準を満たす (構築関数単体 + 既存 address pin)
- [ ] コードレビュー完了（GitHub PR での approve を必須とする）
- [ ] リファクタリング完了（グリーン後・cast 除去の確認まで）
- [ ] ロールバック手段の検討（挙動不変。revert で完結）
- [ ] ドキュメント更新済み（本 PBI の実装記録に対応表を記録）
