# PBI: matcher 本体の inline 正規表現を module-level 定数に寄せる (監査込み)

## ユーザーストーリー
分類パイプラインを触る保守者として、DISPATCH matcher 本体内の正規表現リテラルが module-level 定数として宣言されていてほしい、なぜなら 語彙 module 抽出後に「module-level so no per-field allocation」(欄ごとの走査で正規表現を再割当しない) という契約が半端に達成されており、matcher 本体に inline リテラルが残っていると欄数 × entry 数の走査で不要な割当が発生しうるから

## 優先度
- 順位: 10 / 13
- RICE スコア: 22 (Reach=2 / Impact=1 / Confidence=80% / Effort=0.1人週)
- 根拠: checking-team Tuning Expert (Low)。フォーム走査のたびに分類パイプラインが走るホットパスだが、inline リテラルの実害 (割当回数) は小さい可能性が高く、まず監査で該当箇所を確定する

## 出どころ
- checking-team 2026-11-21 Tuning Expert (Low)。ラウンド台帳 `pbi/2026-11-21-00-backlog-checking-arch-round.md`
- 現状確認 (2026-11-21 深掘りで確定): eligibility ガード本体に inline 正規表現リテラル 3 箇所 — src/core/classify-vocab-office.ts:38 (/部署名/)・:60 (/部署名/)・:73 (/役職/ と /部署/)。正規表現リテラルは評価のたびに新 RegExp オブジェクトを生成するため、欄ごとに呼ばれるこれらのガードで per-field 割当が実在する

## ビジネス価値
- 契約 (module-level 宣言) が全語彙で達成され、欄ごとの不要な正規表現割当が消える。測定: 語彙 module の matcher 関数本体内に正規表現リテラルが 0 件

## BDD受け入れシナリオ

```gherkin
Scenario: matcher 本体に inline リテラルが残らない
  Given 語彙 module の DISPATCH matcher 本体を走査する検査手順がある
  When  監査を実行する
  Then  matcher 関数本体内の正規表現リテラルは 0 件 (定数化済み) か、残す理由が記録されている

Scenario: 挙動は不変である
  Given 定数化 (または監査での保留判断) を行う
  When  全テストと eval corpus を走らせる
  Then  既存 pin と `make eval` 3 passed が無変更で緑である
```

## 受け入れ基準
- [ ] 語彙 module 6 ファイルの matcher 本体を走査し、inline 正規表現リテラルの一覧を作成している
- [ ] 該当があった場合: module-level 定数へ寄せ、名前が語彙 (何にマッチするか) を示す
- [ ] 該当がなかった場合、または残す判断の場合: 監査結果と判断理由を本 PBI の実装記録に残す
- [ ] 挙動不変 (`make eval` 3 passed・既存 pin 無変更)
- [ ] `make check` 緑

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 追加なし

### 統合テスト
- 既存 pin (classify-dispatch-parity 等) が緑 (意味論不変の証拠)

### 単体テスト
- 追加なし (定数化は挙動不変)。定数の意味を pin する既存テストがあればそれを用いる

## 実装アプローチ
- **Outside-In**: 検査手順 (grep で matcher 本体のリテラル検出) を先に作り、全量を監査
- **Red-Green-Refactor**: なし (挙動不変)
- **リファクタリング**: 定数化時は regex の構築タイミングが変わるだけ (1 回のみ) で、意味は不変

## 見積もり
0.1人週（要チームでの見積もり）

## 技術的考慮事項
- 依存関係: なし
- テスタビリティ: 定数化は eval pin で保護 (正規表現本体は 1 文字も変えない)
- 非機能要件: 分類ホットパスの割当削減 (小)。測定を重視するなら node で 1 欄あたりの割当回数を計測して前後比較

## 実装者向け注記

### 現状コードの確認
（2026-11-21 作成時に現存確認済み: 契約コメントは在るが inline リテラル一覧は未確定。着手時に監査すること）
```bash
grep -rn "module-level" src/core/classify-vocab-*.ts
# matcher 関数本体内のリテラル検出: match: (ctx) => ... 内の /.../ を目視 + grep で列挙
grep -n "test(\|match(" src/core/classify-vocab-*.ts | sed -n '1,30p'
```

### 実装手順
1. 語彙 module 6 ファイルの DISPATCH matcher 本体を読み、inline 正規表現リテラルを列挙する (何にマッチするか・どの entry が使うか)
2. 列挙した各リテラルを module-level 定数に寄せる (名前は語彙を示す・DISPATCH の語彙定数の隣に置く)
3. 1 欄あたり割当が消えたことを確認したい場合、小さな計測スクリプトで前後比較して実装記録に残す
4. make check + make eval

### 落とし穴
- 定数化の際に正規表現の書き換え (最適化) をしたくなるが禁止 — 本体は 1 文字も変えず、宣言位置だけ動かす
- 監査で「inline のままでよい」(1 回しか使わない・欄ごと条件で構築が必要等) と判断したら、判断理由を記録し無理に定数化しない
- 契約コメント (module-level ...) が過剰宣言になっていないかも確認 (実際に per-field allocation がない箇所のコメントはそのままでよい)

## Definition of Done
- [ ] BDD シナリオの検証手順 (監査 0 件 or 全定数化) がパスする
- [ ] テストカバレッジが基準を満たす (既存 pin 維持)
- [ ] コードレビュー完了（GitHub PR での approve を必須とする）
- [ ] リファクタリング完了（定数化した場合は旧 inline 箇所の除去まで）
- [ ] ロールバック手段の検討（挙動不変。revert で完結）
- [ ] ドキュメント更新済み（監査結果を本 PBI の実装記録に残す）
