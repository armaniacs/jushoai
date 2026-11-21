# PBI: messages.ts を wire codec に戻す (失敗語彙・表示定数の移設)

## ユーザーストーリー
拡張の保守者として、messages.ts が wire codec (envelope + builders + encode/decode) だけを持っていてほしい、なぜなら 失敗語彙 (ClassifyFailure / TestFailure) の変更が wire を触らない 8 module にも messages.ts を経由させ、表示定数 (META_CLIP_LENGTH) が wire ですらない居場所にあり、「wire 契約」と「attempt 語彙」と「表示定数」の 3 種の読者が 1 ファイルに混在しているから

## 優先度
- 順位: 1 / 13
- RICE スコア: 85 (Reach=5 / Impact=2 / Confidence=90% / Effort=0.2人週)
- 根拠: 失敗語彙は attempt seam (core/classifier.ts 隣接) の正しい居場所を持つが、今日は messages.ts 経由で 8 module が消費する。core/classifier.ts 自身のコメントが「message 語彙を core に持ち込まない」と語彙の居場所が messages でないことを主張している。interface 36 → 約 15 export への縮小は語彙追加時の読む面積を直接減らす

## 出どころ
- アーキテクチャレビュー 2026-11-20 候補 4 (Worth exploring)。`/var/folders/.../architecture-review-20261120-190001.html` + ラウンド台帳 `pbi/2026-11-21-00-backlog-checking-arch-round.md`
- 現状確認 (2026-11-21): src/messages.ts 358 行・export 36 (全 repo 最大)・importer 25

## ビジネス価値
- 失敗理由の語彙変更が wire を経由しなくなる (locality)。変更の測定: 失敗語彙を触る PBI で messages.ts が diff に入らないこと
- codec 契約コメントの読者が wire を触る人だけになる。測定: messages.ts の export 数 36 → 約 15

## BDD受け入れシナリオ

```gherkin
Scenario: 失敗語彙の変更が wire に触れない
  Given 失敗語彙 (ClassifyFailure / TestFailure / fold 群) が core/classifier 隣接の module に住んでいる
  When  保守者が失敗理由の文言・構造を変更する
  Then  変更 diff に src/messages.ts が含まれない
  And   wire 形式 (envelope・builders・encode/decode) は無変更のままテストが緑である

Scenario: wire の変更が 1 箇所で完結する
  Given messages.ts が envelope + MetaWire codec のみを export している
  When  保守者が wire キーを 1 個追加する
  Then  変更は messages.ts とその codec テストだけで完結する
```

## 受け入れ基準
- [ ] 失敗語彙 (ClassifyFailure / TestFailure / asClassifyFailure / decodeErrorToClassifyFailure 等の fold 群) が **src/core/classifier-failures.ts (新設)** に移設されている (なぜなぜ分析 30 本で確定した移設先。`plans/2026-11-21-whywhy-246-messages-vocab.md`)
- [ ] META_CLIP_LENGTH が prompt / feedback の消費側 module に移設されている (現在の消費者: src/llm/prompt.ts と src/feedback/issue-url.ts)
- [ ] messages.ts の export が約 15 個以下 (envelope + builders + encode/decode + 移行用 re-export)
- [ ] wire 形式自体は不変 (既存の messages 系テストが無変更で緑。wire キー集合の変更は本 PBI では行わない — 2026-10-04 設計書 / PBI-175 の規約)
- [ ] `make check` 緑 + `make eval` 3 passed

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 追加なし (挙動不変のため既存の make check-all 網で代用)

### 統合テスト
- 既存の messages codec テスト・background-gateway テストが無変更で緑であること (wire 契約不変の証拠)

### 単体テスト
- 移設した失敗語彙 module の fold 群を検査するテストを messages 系から移設・改名 (挙動は同一、import 先だけ変わる)
- META_CLIP_LENGTH 消費側 (prompt / feedback) の既存テストが緑

## 実装アプローチ
- **Outside-In**: まず移設先 module の interface (export 一覧) を決め、既存テストの import 先を張り替えてから移動 (RED は import 解決失敗として自然に観測)
- **Red-Green-Refactor**: re-export で移行し全テスト緑を確認 → importer を新 module へ張り替え → re-export 削除
- **リファクタリング**: codec 契約コメントが messages.ts の先頭に単独で残る形に整理

## 見積もり
0.2人週（要チームでの見積もり）

## 技術的考慮事項
- 依存関係: なし (単独着手可)。248 (messaging 衛生) と同時着手すると相性がよい
- テスタビリティ: wire 契約は既存テストが pin 済み。移設は import 経路の変更のみ
- 非機能要件: Firefox build で import.meta.env.FIREFOX 分岐が messages 系に無いことを確認 (現状なし)

## 実装者向け注記

### 現状コードの確認
（2026-11-21 作成時に現存確認済み。着手時に再確認すること）
```bash
grep -c "^export" src/messages.ts
grep -rn "META_CLIP_LENGTH" src/ tests/
grep -rn "ClassifyFailure\|TestFailure" src/ --include="*.ts" | grep -v "src/messages.ts"
```

### 実装手順
1. src/core/classifier.ts を読み、失敗語彙の消費者一覧 (8 module) を grep で確定する
2. **src/core/classifier-failures.ts を新設**し、語彙定義・fold 群・テストを移す (移設先は 2026-11-21 のなぜなぜ分析で確定済み。llm 側には置かない — core 消費者の依存方向が逆転する)
3. messages.ts からは `export ... from './...'` の re-export を 1 commit だけ残し、テスト緑を確認
4. importer を張り替え (sed でなく 1 module ずつ typecheck で確認)、re-export を削除
5. META_CLIP_LENGTH を prompt.ts / feedback 側へ移設 (片方が両方消費していないか grep で確認)

### 落とし穴
- re-export 残置のし忘れ (interface 縮小の目的が消える)。最終 commit の前に `grep -c "^export" src/messages.ts` で数を確認
- wire キー集合 (REQUEST_WIRE_KEYS 表, PBI-190 実装) は触らない — 表駆動 decode の既存 pin が red になる
- 失敗語彙を src/llm/ から import している caller がある場合、core → llm 方向の依存を作らないこと (core は DOM・LLM 非依存)

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする (wire 契約不変の pin + 失敗語彙移設の import 解決)
- [ ] テストカバレッジが基準を満たす (既存網維持・E2E は既存 make check-all で代用)
- [ ] コードレビュー完了（GitHub PR での approve を必須とする）
- [ ] リファクタリング完了（グリーン後・re-export 撤去まで）
- [ ] ロールバック手段の検討（挙動不変の import 再配置のため revert で完結。wire 形式は無変更であることを PR 説明に明記）
- [ ] ドキュメント更新済み（CONTEXT.md の語彙所在に失敗語彙の新所在を 1 行追記）
