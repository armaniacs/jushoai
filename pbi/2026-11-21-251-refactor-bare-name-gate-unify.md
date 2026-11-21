# PBI: bare-name ゲート 3 件の共有述語統合

## ユーザーストーリー
分類語彙を保守する人として、「label・nearby が空の input」判定が 1 箇所にあってほしい、なぜなら isSearchBox / isCompanyByName / isEmailByName の 3 ゲートが同一の約束事 (label/nearby が空 + placeholder は空条件に含めない) を 3 モジュールに別々の言葉で書いており、1 か所だけ条件を変えると 3 ゲートの空欄解釈が割れて過去に潰した誤分類系の回帰が起きるから

## 優先度
- 順位: 6 / 13
- RICE スコア: 45 (Reach=3 / Impact=2 / Confidence=70% / Effort=0.15人週)
- 根拠: checking-team Refactoring Evangelist が Low で指摘。3 ゲートは過去の誤分類修正 (PBI-224 検索窓・225 name=company・229 name=email) の産物で、回帰が実在する領域。統合の価値は「約束事の単一所有」だが、ゲート間に差分があると共通化が失敗するため信頼度は 70%

## 出どころ
- checking-team 2026-11-21 Refactoring Evangelist (Low)。ラウンド台帳 `pbi/2026-11-21-00-backlog-checking-arch-round.md`
- 現状確認 (2026-11-21): src/core/classify-vocab-misc.ts:25 (isSearchBox) / src/core/classify-vocab-name.ts:35 (isEmailByName) / src/core/classify-vocab-office.ts:114 (isCompanyByName)

## ビジネス価値
- 空欄解釈 (label/nearby 空・placeholder 非含有) の変更が 1 箇所で完結し、3 ゲートが同時に整合する。測定: 空欄解釈に触る PBI の diff が 1 module になる

## BDD受け入れシナリオ

```gherkin
Scenario: 3 ゲートが同一の空欄解釈を共有する
  Given 共有述語 (例: bareNameField) が dispatch-kit に存在する
  When  空欄解釈の定義を読む
  Then  label と nearby の空判定と「placeholder は条件に含めない」理由が 1 箇所に書かれている
  And   3 ゲート (isSearchBox / isCompanyByName / isEmailByName) は共有述語を呼び出している

Scenario: placeholder 付き欄は素名ゲートに入らない
  Given label・nearby が空で placeholder に「検索キーワード」等の例示が付いた欄が存在する
  When  分類が走る
  Then  検索窓・会社名・email の素名ゲートはいずれも発火しない (現行挙動と同一)
```

## 受け入れ基準
- [ ] dispatch-kit (または同等の共有位置) に空欄解釈の共有述語が追加され、placeholder 非含有の WHY が 1 箇所に書かれている
- [ ] 3 ゲートが共有述語経由に置換され、ゲート固有の部分 (語彙判定) だけが各 module に残っている
- [ ] 既存 pin (tests/core/search-box-exclusion.test.ts, tests/core/name-company.test.ts, tests/core/name-email.test.ts) が無変更で緑
- [ ] 挙動不変 (`make eval` 3 passed)
- [ ] `make check` 緑

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 追加なし (既存 make check-all の分類シナリオが回帰網)

### 統合テスト
- 3 ゲートを横断する「label/nearby 空 + placeholder 有無」のパラメトリック pin を 1 件追加 (3 ゲートの空欄解釈が同一であることを型でなくテストで固定)

### 単体テスト
- 共有述語の境界 (label 空/nearby 非空・両方空・placeholder 有無) を 4-6 件

## 実装アプローチ
- **Outside-In**: 3 ゲートの現行差分を先に確定し、共有部分の形を決めてから述語を書く
- **Red-Green-Refactor**: 述語テスト RED → 述語実装 → 3 ゲート置換 → 既存 pin GREEN
- **リファクタリング**: ゲート固有部分 (語彙正規表現の test) は各 module に残す

## 見積もり
0.15人週（要チームでの見積もり）

## 技術的考慮事項
- 依存関係: なし。249 の後にやると文書状態が揃う
- テスタビリティ: 述語は純粋関数 (FieldMeta → boolean) で makeMeta fixture がそのまま使える
- 非機能要件: 挙動不変 (eval pin で保護)

## 実装者向け注記

### 現状コードの確認
（2026-11-21 作成時に現存確認済み。着手時に再確認すること）
```bash
grep -n -A 3 "isSearchBox" src/core/classify-vocab-misc.ts
grep -n -A 3 "isCompanyByName" src/core/classify-vocab-office.ts
grep -n -A 3 "isEmailByName" src/core/classify-vocab-name.ts
```

### 実装手順
1. 3 ゲートの本体を並べ、label/nearby/placeholder 条件の差分を表にする
2. 差分がなければ共有述語 bareNameField(m) を dispatch-kit に追加し 3 ゲートを置換
3. 差分があれば共通部分だけ括り出し、差分条件はゲート側に残す (無理な一本化をしない)
4. パラメトリック pin + 述語単体テストを追加
5. make check + make eval

### 落とし穴
- 3 ゲートは過去の誤分類修正の積み重ね (PBI-224/225/229) で、一見同じでも placeholder 条件の有無など差分がある可能性が高い — 差分表を作らずに一本化しない
- dispatch-kit に置くと kit の依存に types が増える程度で済むが、語彙 module が持つ方が自然なら misc に置いて name/office から import する選択肢もある (import 方向の層規約は守る: vocab → vocab は可)
- eval pin が red になったら挙動が変わっている — 共有化で挙動は変えないこと

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする (パラメトリック pin + 述語単体)
- [ ] テストカバレッジが基準を満たす (述語境界 + 既存 3 テストファイル)
- [ ] コードレビュー完了（GitHub PR での approve を必須とする）
- [ ] リファクタリング完了（グリーン後・旧 inline 条件の除去まで）
- [ ] ロールバック手段の検討（挙動不変。eval pin が red になったら共有化を一旦止め差分表を再確認する手順を PR 説明に明記）
- [ ] ドキュメント更新済み（本 PBI の実装記録に差分表と判断を記録）
