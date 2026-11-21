# PBI: 語彙 module の import 方向を機械検査に載せる

## ユーザーストーリー
語彙層を拡張する保守者として、語彙 module が classify-rules を import したら機械的に失敗してほしい、なぜなら dispatch-kit ← 語彙 ← classify-rules という非巡回 DAG が今日は計画の規約とレビュアーの目だけで守られており、1 辺の誤追加が循環依存として後になって型エラー・テスト失敗という遠い形で表面化するから

## 優先度
- 順位: 5 / 13
- RICE スコア: 55 (Reach=3 / Impact=2 / Confidence=80% / Effort=0.1人週)
- 根拠: checking-team System Architect が「循環の機械的防止がない」を Low で指摘。語彙 module は今後も追加 (office / birth / name / school / address / misc に続くドメイン) が想定され、禁止辺は規約として明文化済み (計画 Global Constraints 5・CONTEXT.md) だが検査がない

## 出どころ
- checking-team 2026-11-21 System Architect (Low)。ラウンド台帳 `pbi/2026-11-21-00-backlog-checking-arch-round.md`
- 現状確認 (2026-11-21): 語彙 module 7 ファイル (dispatch-kit + classify-vocab-* 6) が存在し、classify-rules → vocab 方向の import は 0 件 (健全)。禁止辺の検査なし

## ビジネス価値
- 層違反がコミット時に検出され、語彙追加のたびにレビュアーの目に頼らない。測定: 語彙 module から classify-rules への import を含むテストコミットが lint/検査で失敗する

## BDD受け入れシナリオ

```gherkin
Scenario: 禁止された import 辺が検出される
  Given 語彙 module (src/core/classify-vocab-*.ts) に対する層規約「classify-rules を import しない」が定義されている
  When  語彙 module が src/core/classify-rules.ts を import する変更を含むコミットで検査を走らせる
  Then  検査が失敗し、違反したファイルと辺が理由として報告される

Scenario: 正しい層構造では緑である
  Given 現行の DAG (dispatch-kit ← 語彙 ← classify-rules、語彙横断 3 辺のうち有効な office→birth と school→office) が存在する
  When  検査を走らせる
  Then  検査は緑であり、既存の横断 import は許可されていると報告される
```

## 受け入れ基準
- [ ] 語彙 module (dispatch-kit.ts + classify-vocab-*.ts) から src/core/classify-rules.ts への import を検出する機械検査が存在する
- [ ] 検査が `make lint` または `make check` の流れに組み込まれている
- [ ] 現行コードで検査が緑 (横断 import の office→birth / school→office は許可)
- [ ] 検査の意図 (なぜこの辺が禁止か) が検査定義のコメントか CONTEXT.md に 1 行ある
- [ ] `make check` 緑 + `make eval` 3 passed

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 追加なし

### 統合テスト
- 検査そのものを 1 件の単体テストにする (fixture 的な仮想ファイルツリーで違反辺を検出できること・正しい構造で緑であること)

### 単体テスト
- 検査関数の単体 (違反 1 辺 → 失敗・理由にファイル名、違反 0 → 緑)

## 実装アプローチ
- **Outside-In**: make lint に検査が乗る形 (開発者の既存フローに入る) を先に決め、逆算で実装
- **Red-Green-Refactor**: 違反 fixture で RED → 検査実装 → GREEN → 現行ツリーで緑確認
- **リファクタリング**: oxlint の no-restricted-imports (または同等設定) で済むなら自作検査を書かない

## 見積もり
0.1人週（要チームでの見積もり）

## 技術的考慮事項
- 依存関係: なし。249 (規約整合) の後にやると文書が揃う
- テスタビリティ: 検査ロジックは純粋関数 (パス一覧 → 違反一覧) にして単体テスト可能に
- 非機能要件: make check の実行時間を有意に増やさない (全ファイル走査は ls+grep 数回で済ませる)

## 実装者向け注記

### 現状コードの確認
（2026-11-21 作成時に現存確認済み。着手時に再確認すること）
```bash
grep -rn "classify-rules" src/core/classify-vocab-*.ts src/core/dispatch-kit.ts || true
ls src/.oxlintrc* .oxlintrc* 2>/dev/null; grep -n "lint" Makefile
```

### 実装手順
1. **repo には現在 oxlint 設定ファイルが存在しない** (Makefile:35 の `npx oxlint --deny-warnings` が defaults のみ)。.oxlintrc.json を新設する際、まず defaults の警告数が変わらないことを確認する (現行 lint 0 警告が設定導入で崩れないこと)
2. .oxlintrc.json に no-restricted-imports を設定: 語彙 module パターン (src/core/classify-vocab-*.ts, dispatch-kit.ts) → src/core/classify-rules.ts を禁止。oxlint の設定 schema と paths グロブ対応を確認する (npx oxlint --help、ドキュメント)
3. schema で表現できない場合のみ scripts/check-core-layers.mjs にフォールバック (Makefile lint ターゲットに連結)
4. 違反 fixture で RED を確認 → 現行ツリーで緑 → make check 全体

### 落とし穴
- 設定ファイル導入が oxlint の既定ルール集合に影響しないようにする (defaults からの逸脱は本 PBI の意図外 — PR 説明に確認結果を明記)
- dispatch-kit.ts は「kit ← 語彙」の葉として規約上特別 (kit が import するのは ./types だけ) — 禁止辺の対象に kit を含めるかは検査対象一覧で明示する
- 検査を classify-pipeline 層にも広げたくなるが、本 PBI は語彙層に限定 (他層は別 PBI で判断)
- oxlint --deny-warnings 運用があるため、warning ではなく error として設定する

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする (違反検出 + 正常緑)
- [ ] テストカバレッジが基準を満たす (検査関数の単体)
- [ ] コードレビュー完了（GitHub PR での approve を必須とする）
- [ ] リファクタリング完了（検査の make lint 組込みまで）
- [ ] ロールバック手段の検討（検査追加のみ。誤検出時は設定 1 行で緩和できることを PR 説明に明記）
- [ ] ドキュメント更新済み（CONTEXT.md の「優先順」項か実装計画 Global Constraints に検査の所在を 1 行追記）
