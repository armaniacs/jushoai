# PBI: settings-store の保存失敗の識別可能性を store 群と揃える

## ユーザーストーリー
AI 設定の保存を触る保守者として、settings-store の保存失敗が学習系 store と同じ識別可能性を持つ (または「なぜ持たないか」が記録されていてほしい、なぜなら kv-store (PBI-153) が「store 書き込み失敗は識別可能な型で上がる」規律を作ったのに settings-store だけ生の chrome.storage rejection が上がり、store 群の失敗処理が不揃いだから

## 優先度
- 順位: 3 / 6
- RICE スコア: 14 (Reach=2 / Impact=1 / Confidence=70% / Effort=0.1人週)
- 根拠: 2026-11-21 DRY/KISS 調査 (D3)。実害は限定的 (呼び出し側 settings-save.ts が独自の失敗処理を持つ) だが、store 群の型付きエラー規律の穴。複合構造 (settings + 暗号化キーの入れ子) のため KvSpec への機械的適合が自明でなく、導入 or 判断記録の 2 択を含む

## 出どころ
- DRY/KISS 調査 2026-11-21 (D3)。ラウンド台帳 `pbi/2026-11-21-01-backlog-drykiss-round.md`
- 現状確認 (2026-11-21): src/ai/settings-store.ts が chrome.storage.local.get/set を生で使用。kv-store.ts は「store 書き込み失敗は識別可能に (PBI-153・PBI-23 先例)」を単一所有

## ビジネス価値
- store 群の失敗処理の不揃いが解消される (または意図として固定される)。測定: settings-store の save が typed error を上げる (または WHY コメントで非適合理由が固定)

## BDD受け入れシナリオ

```gherkin
Scenario: 保存失敗が識別可能な型で上がる
  Given settings-store に型付き保存失敗 (例: AiSettingsSaveError) が導入された
  When  chrome.storage が拒否する
  Then  呼び出し側は原因を識別でき、生 rejection ではなく typed error で受ける

Scenario: 既存の失敗処理と矛盾しない
  Given settings-save.ts が保存失敗を catch して文言化している
  When  typed error が導入される
  Then  settings-save.ts の既存の失敗文言とロールバック (permission rollback) の意味論は不変
```

## 受け入れ基準
- [ ] **方式選択を実装記録に残す**: (a) 型付き保存失敗を導入する (kv-store の KvStoreSaveError に準拠した形、または AI 固有の error class) / (b) 「なぜ KvSpec に適合しないか (複合構造・鍵ライフサイクル・origin チェック)」を WHY コメントで settings-store.ts に固定する
- [ ] (a) の場合: settings-store の set 経路が typed error を上げ、settings-save.ts の catch が二重変換にならない (既存の文言化は維持)
- [ ] 挙動不変 (鍵ライフサイクル: undefined 保持 / '' 削除 / origin チェックでの key 削除は無変更)
- [ ] `make check` 緑 + focused (tests/ai 配下の settings 系) 緑

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 追加なし

### 統合テスト
- 既存の settings 保存系 pin が緑

### 単体テスト
- (a) の場合: typed error の発生 1-2 件 (storage 拒否を fake して assert)
- (b) の場合: 追加なし (判断記録)

## 実装アプローチ
- **Outside-In**: 呼び出し側 (settings-save.ts) の失敗処理から逆算し、必要な識別可能性の粒度を決める
- **Red-Green-Refactor**: (a) の場合は fake storage で RED → 導入 → GREEN
- **リファクタリング**: (b) を選んだ場合は実装ゼロで判断記録のみ

## 見積もり
0.1人週（要チームでの見積もり）

## 技術的考慮事項
- 依存関係: なし
- テスタビリティ: chrome.storage の fake は tests/ai 配下に既存
- 非機能要件: 鍵の暗号化ライフサイクル・origin チェック (鍵が endpoint に追従しない規律) は絶対に触らない

## 実装者向け注記

### 現状コードの確認
（2026-11-21 作成時に現存確認済み。着手時に再確認すること）
```bash
grep -n "chrome.storage" src/ai/settings-store.ts
grep -n "KvStoreSaveError\|KvStoreReadError" src/kv-store.ts | sed -n '1,4p'
grep -n "catch" src/ai/settings-save.ts | sed -n '1,6p'
```

### 実装手順
1. settings-store.ts の saveAiSettings の set 経路と settings-save.ts の catch を読み、現状の失敗の流れを書き出す
2. (a)/(b) を判断: 呼び出し側が識別可能性を必要としているか (現状の catch が原因別処理をしているか) で決める
3. (a): error class を新設し set を wrap。catch 側の instanceof 分岐は最小に
4. (b): readStored/saveAiSettings の冒頭に非適合理由の WHY コメント (複合構造・鍵ライフサイクル・origin チェック)
5. focused + make check

### 落とし穴
- 鍵のライフサイクル (undefined 保持・'' 削除・origin チェックでの key 削除) は VULN-001 系の意図 — エラー導入の際もこの経路を絶対に変えない
- settings-save.ts の permission rollback (settings-save.ts:142 の console.warn) との相互作用を壊さない
- (a) で error class を作るとき、KvStoreSaveError を import して使い回さない (意味が違う: AI 設定 vs 学習状態。同じ形でも別 class)

## Definition of Done
- [x] BDD シナリオが自動テスト (または判断記録) として検証される
- [x] テストカバレッジが基準を満たす ((a) は追加 pin / (b) は既存網)
- [ ] コードレビュー完了（GitHub PR での approve を必須とする）
- [x] リファクタリング完了（(a) は導入まで / (b) は記録まで）
- [x] ロールバック手段の検討（(a) は error 型追加のみで revert で完結 / (b) は該当なし）
- [x] ドキュメント更新済み（本 PBI の実装記録に方式選択の根拠を残す）
