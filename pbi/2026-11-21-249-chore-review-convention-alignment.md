# PBI: レビュー発見の規約整合 (タスク ID・CONTEXT.md・コメント桁)

## ユーザーストーリー
コードベースを航路にする人 (新人・AI エージェント) として、コメントと文書がプロジェクト規約に整合していてほしい、なぜなら タスク ID 付きコメントは時間とともに意味を失い (AGENTS.md は「理由の記述に留める」)、CONTEXT.md の用語集が実コードと 1 対 1 で対応しないと語彙の二重定義・独自命名が再発するから

## 優先度
- 順位: 4 / 13
- RICE スコア: 70 (Reach=4 / Impact=1 / Confidence=95% / Effort=0.05人週)
- 根拠: 4 つの指摘がすべてコメント・文書のみの zero-risk 修正で、語彙追加者が最初に読む文書 (CONTEXT.md / AGENTS.md / dispatch-kit) の品質に直結する

## 出どころ
- checking-team 2026-11-21 Documentation Architect (Low ×2) + SDD classify-vocab extraction 最終レビュー deferred 3 件。ラウンド台帳 `pbi/2026-11-21-00-backlog-checking-arch-round.md`
- 現状確認 (2026-11-21): tests/core/classify-rules.test.ts:824, 891 の describe 名に (PBI-219) / CONTEXT.md:9 の dispatch キット項に Matcher 欠落 (列挙 4/5)・横断 import 例のずれ / classify-rules.ts に PBI- コメント 28 件 / src/core/classify-vocab-misc.ts と -name.ts に 78 桁を超えるコメント行複数

## ビジネス価値
- 規約違反が 0 件になり、用語集が実コードの信頼できるスナップショットになる。測定: `grep -rn "PBI-" src/` が 0 件、CONTEXT.md のシンボル列挙と dispatch-kit.ts の export が一致

## BDD受け入れシナリオ

```gherkin
Scenario: 新規参入者が用語集から実コードへ航路できる
  Given CONTEXT.md の dispatch キット項がシンボルを列挙している
  When  参入者が列挙されたシンボルを dispatch-kit.ts で探す
  Then  列挙 (DispatchCtx / Matcher / MatcherEntry / matchAs / ownLegend) は export と 1 対 1 で対応する
  And   語彙横断 import の代表例が実態 (office が birth の BIRTH_CTX で companyKana をゲート) と一致する

Scenario: コメントからタスク ID が検出されない
  Given AGENTS.md はコメントへのタスク ID 記載を禁止している
  When  src/ と tests/ のコメントを走査する
  Then  PBI-XXX / PBI-XXX 系のトークンが src/ から検出されない
  And   テストの describe 名にも ID が付いていない (行動の記述だけで選択できる)
```

## 受け入れ基準
- [ ] tests/core/classify-rules.test.ts:824, 891 の describe 名から `(PBI-219)` が除去されている (行動記述は維持)
- [ ] CONTEXT.md の dispatch キット項に `Matcher` が加わり、横断 import の代表例が「office が birth の BIRTH_CTX で companyKana をゲート」に修正されている
- [ ] src/ 内のコメントから PBI-XXX / T2 / F1 等のタスク ID トークンが除去されている (classify-rules.ts 28 件を含む。WHY の理由部分は保持)
- [ ] src/core/classify-vocab-misc.ts / -name.ts の 78 桁超コメント行が折り返されている (約 80 桁以内)
- [ ] `make check` 緑 (コメントのみの変更だが oxlint --deny-warnings を通す)

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 追加なし (コメント・文書のみ)

### 統合テスト
- 既存全テストが無変更で緑 (describe 名変更で `vitest -t` の既存手順が壊れないことを確認)

### 単体テスト
- 追加なし。検証は grep (PBI- 0 件) + CONTEXT.md 列挙と dispatch-kit export の突合

## 実装アプローチ
- **Outside-In**: 読者側 (CONTEXT.md → dispatch-kit) の整合から直し、次にコメント走査
- **Red-Green-Refactor**: なし (挙動不変)。検証コマンドで確認して完了
- **リファクタリング**: タスク ID 除去時に「理由だけが残る」形に書き直す (空白削除でなく文章の再構成)

## 見積もり
0.05人週（要チームでの見積もり）

## 技術的考慮事項
- 依存関係: なし (着手順自由)
- テスタビリティ: 検証は grep ベース (BDD 自動テスト化は 1 行コメント変更のため断念し、検証手順でパスする — 過去の docs-only PBI 205/206 と同じ扱い)
- 非機能要件: CP932 禁止文字の持ち込みなし (pbi-sweep の慣行)

## 実装者向け注記

### 現状コードの確認
（2026-11-21 作成時に現存確認済み。着手時に再確認すること）
```bash
grep -n "PBI-219" tests/core/classify-rules.test.ts
grep -n "Matcher" CONTEXT.md
grep -rn "PBI-" src/ --include="*.ts" | wc -l
awk 'length > 78 {print FILENAME":"FNR}' src/core/classify-vocab-*.ts
```

### 実装手順
1. describe 名 2 件の `(PBI-219)` を除去 (行動記述部分はそのまま)
2. CONTEXT.md dispatch キット項に Matcher を追加し、横断 import 例を BIRTH_CTX に差し替え
3. classify-rules.ts の 28 件 + その他 src/ のタスク ID トークンを除去 (理由文は保持し、ID と経緯への参照だけを落とす)
4. 78 桁超コメント行を約 80 桁以内に折返し (意味の分割で折返し位置を選ぶ)
5. make check + grep 検証

### 落とし穴
- vitest の `-t` 選択子運用 (AGENTS.md のテスト実行手順) がある — describe 名は行動の語句を保ち、ID だけ落とすこと
- タスク ID 除去は pbi-sweep (e1c43f3) や PBI-245 でも実施済みの領域がある — 「今回の行だけ」に限定せず src/ 全体を grep で掃く (ただし git blame で古い慣行を追う必要はない。現状 0 件が目標)
- cp932 混入に注意 (絵文字・拡張漢字を持ち込まない)

## Definition of Done
- [ ] BDD シナリオの検証手順 (grep 突合) がパスする
- [ ] テストカバレッジが基準を満たす (既存網・無変更)
- [ ] コードレビュー完了（GitHub PR での approve を必須とする）
- [ ] リファクタリング完了（該当なし — 文書・コメントのみ）
- [ ] ロールバック手段の検討（該当なし — revert で完結）
- [ ] ドキュメント更新済み（本 PBI の更新がそのままドキュメント更新）
