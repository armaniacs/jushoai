# PBI: 起動しないURLへその場で登録する

## ユーザーストーリー
JushoAI利用者として、邪魔な頁をその場で起動しないURLに登録したい、なぜなら設定画面を開いてURLを写す手間がないから

## ビジネス価値
- 登録の手間削減: X直後のダイアログで2択から選ぶだけにする
- 測定方法: 登録後に設定画面の起動しないURLへ追記され、開いたままの頁でも反映される

## BDD受け入れシナリオ

```gherkin
Scenario: このページだけを登録する
  Given X直後のダイアログが開いている
  When このページだけを選んで登録する
  Then 現在URLが起動しないURLへ追記され、バナーが出なくなる

Scenario: 配下全体を登録する
  Given X直後のダイアログが開いている
  When この配下全体を選んで登録する
  Then origin + 先頭1段のURLが追記され、同種の頁で出なくなる

Scenario: 重複と上限は既存理由を出す
  Given 登録済みか上限100件の状態がある
  When 登録する
  Then 既存の理由文がダイアログに出て、隠した状態は維持される
```

## 受け入れ基準
- [ ] 候補は「このページだけ」と「この配下全体」の2択で出る
- [ ] 例: スライドURLの配下候補は `https://docs.google.com/presentation/` になる
- [ ] 登録後は設定画面の起動しないURLに追記される
- [ ] 開いたままの頁でも `storage.onChanged` 経路で反映される
- [ ] 保存失敗時は理由が見え、ダイアログが閉じない
- [ ] `make check` が緑のまま

## テスト戦略(t_wadaスタイル)

### E2Eテスト
- なし(既存の samples 回帰網を使う。手動確認は設計書の手順どおり)

### 統合テスト
- 登録後に `isExcludedUrl` が真になり、`sync()` がマウントしないこと

### 単体テスト
- prefix 導出: スライドURL、クエリ付き、ルート直下
- `addExclusionEntry` の重複・上限・形式不正の理由維持

## 見積もり
3(小規模。候補生成1点と保存配線1点)

## 技術的考慮事項
- 依存関係: PBI-227の一時非表示の後に使う。単独でも動くこと
- テスタビリティ: 候補生成は `core/` の純関数にする
- 非機能要件: プロファイル値は送らない。URLだけを保存する

## 実装者向け注記

### 現状コードの確認
```bash
grep -n "addExclusionEntry\|normalizeExclusionEntry" src/core/exclusions.ts
grep -n "loadExcludedUrls\|saveExcludedUrls" src/exclusions-store.ts
grep -n "gate.refresh\|onChanged" src/entrypoints/content.ts
```
→ 保存関数はある。候補生成だけが新規

### 実装手順
1. `src/core/exclusion-prefix.ts` を足す(exact と prefix の生成)
2. `src/ui/dismiss-dialog.ts` を足す(2択と登録・取消の配線)
3. 保存は既存の load/add/save を通し、新規文言を作らない
4. 単体テストを先に書いてから実装する

### 落とし穴
- prefix は先頭1段までに固定し、段数選択を足さないこと
- ページ由来の文字列は `textContent` で入れること

## Definition of Done
- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] `make check` が緑
- [ ] 登録内容が設定画面と一致すること
