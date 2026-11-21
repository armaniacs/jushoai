# PBI: content-session facade を剥がす

## ユーザーストーリー
fill 経路を触る保守者として、content-session の pass-through 層が消えて createFillFlow に一本化されてほしい、なぜなら 全メソッドが fill-flow への委譲で、caller は Session* 系と FillFlow* 系の二重 interface を学ばされ、apply 形状の変更が毎回 facade の翻訳層に乗るから

## 優先度
- 順位: 2 / 13
- RICE スコア: 80 (Reach=3 / Impact=2 / Confidence=95% / Effort=0.1人週)
- 根拠: content-session.ts (167 行) は自らのコメントが互換目的 (PBI-178 の triple-arg apply 形状保持) と明言する pure pass-through で、deletion test に不合格。削除は 167 行の実質的な減量であり、facade 翻訳層の保守が消える

## 出どころ
- アーキテクチャレビュー 2026-11-20 候補 5 (Worth exploring)。ラウンド台帳 `pbi/2026-11-21-00-backlog-checking-arch-round.md`
- 現状確認 (2026-11-21): src/content-session.ts:95 に「One classify → preview → apply flow (PBI-178: FillFlow facade)」コメント、全メソッドが fill-flow 委譲

## ビジネス価値
- caller が学ぶ interface が 2 種 → 1 種。測定: Session* 系シンボルの src 内参照が 0 件
- apply 形状変更の際の翻訳層修正が消える。測定: apply 形状に触る PBI の diff から content-session.ts が消える

## BDD受け入れシナリオ

```gherkin
Scenario: caller が実 interface を直に使う
  Given fill 経路の caller (content.ts / preview-bind / tests) が存在する
  When  caller の import と呼び出しを見る
  Then  createFillFlow に一本化されており content-session の import は存在しない

Scenario: フローの型が独立した家を持つ
  Given SessionPanel / SessionClassifyResult の型定義が src/content/fill-types.ts に住んでいる
  When  preview-bind・run-env・tests が型を参照する
  Then  参照先が fill-types であり content-session への型依存は存在しない

Scenario: 分類補助も正しい seam に住む
  Given classifyWithReason が content-session から提供されていた
  When  facade を剥がす
  Then  classifyWithReason は classify-pipeline 側から提供され、fill 経路の module からは消えている
```

## 受け入れ基準
- [ ] SessionPanel / SessionClassifyResult の型定義が src/content/fill-types.ts (新設) に移設されている (深掘り 2026-11-21 で確定: 型定義は content-session.ts:86 に住み、preview-bind・run-env・tests 4 ファイルが参照 — これが facade 削除の実質的な本体)
- [ ] src/content-session.ts が削除されている (createFillSession / Session* 系 export を含む)
- [ ] 実行時 caller (src/entrypoints/content.ts:378 の createFillSession 呼び出し 1 箇所) が src/content/fill-flow.ts の createFillFlow 直呼びに移行している (深掘りで実行時 caller は 1 箇所と確認済み)
- [ ] classifyWithReason は classify-pipeline 側に移設され、fill-flow からは消えている (現消費者: src/content/run-env.ts:7)
- [ ] 挙動不変 (既存 pin: tests/content 系・tests/integration が緑、`make eval` 3 passed)
- [ ] `make check` 緑

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 追加なし (既存 make check-all の注入シナリオが回帰網)

### 統合テスト
- tests/content / tests/integration の既存 pin (consent → inject → persist → carryover の順序) が無変更で緑

### 単体テスト
- fill-flow の既存テスト 3 ファイルを flow interface に一本化 (facade 経由のテストがあれば import 先を張り替え)

## 実装アプローチ
- **Outside-In**: caller 側 (preview-bind / run-env) から createFillFlow 直呼びに書き換え、最後に content-session.ts を削除
- **Red-Green-Refactor**: caller 書き換えごとに typecheck + focused test、削除後に make check
- **リファクタリング**: 剥がした結果、fill-flow の apply 形状が caller に露出する箇所があれば preview-bind 側の薄い関数に寄せる (新 facad e は作らない)

## 見積もり
0.1人週（要チームでの見積もり）

## 技術的考慮事項
- 依存関係: なし。252 (run 脊髄) の前にやっておくと run-env 側の書き換えが 1 回で済む
- テスタビリティ: flow interface の既存 pin 網がそのまま保護網
- 非機能要件: 挙動不変 (呼び出し経路の削減のみ)

## 実装者向け注記

### 現状コードの確認
（2026-11-21 作成時に現存確認済み。着手時に再確認すること）
```bash
grep -rn "createFillSession\|content-session" src/ tests/ --include="*.ts"
grep -n "facade" src/content-session.ts
```

### 実装手順
1. src/content/fill-types.ts を新設し、SessionPanel / SessionClassifyResult (content-session.ts:86 系) を移す。preview-bind (型 import) / run-env / tests の参照先を張り替え
2. src/entrypoints/content.ts:378 の createFillSession 呼び出しを createFillFlow 直呼びに置換 (実行時 caller はここ 1 箇所のみ)
3. run-env.ts の classifyWithReason import を classify-pipeline 側に張り替え (提供側も移設)
4. src/content-session.ts を削除し、make check

### 落とし穴
- PBI-178 の経緯 (triple-arg apply 形状を保持した理由) を plans/ 実装記録で読むこと — 保持理由が今も有効なら剥がしは保留し、その判断を本 PBI に記録する
- facade が隠していた apply 形状の複雑さが caller に露出する — 新しい pass-through を作らず、caller 側の呼び出し箇所を最小化する方向で整理する
- fill-types.ts は 252 (run 脊髄) で run-env を再編する際に所属を再確認する中間着 — 型を core/types.ts に昇格するかは 252 のスパイクで判断する
- tests/ に Session* 系の helper がある場合、flow 直呼びに置き換える (helper の改名だけで済ませない)

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする (import 解決 + 既存 pin 維持)
- [ ] テストカバレッジが基準を満たす (既存網維持)
- [ ] コードレビュー完了（GitHub PR での approve を必須とする）
- [ ] リファクタリング完了（グリーン後・content-session.ts 削除まで）
- [ ] ロールバック手段の検討（revert で完結する純粋な呼び出し経路変更。挙動不変であることを PR 説明に明記）
- [ ] ドキュメント更新済み（CONTEXT.md の用語に fill-flow / facade 廃止の現状を反映）
