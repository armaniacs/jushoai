# PBI: 除外クイック登録の配線を dismiss-flow module に抽出する

## ユーザーストーリー
除外まわりを触る保守者として、ダイアログの配線 (単一ハンドル管理・候補生成・register / undo の deps 組み立て・banner 復帰) が 1 つの module にまとまっていてほしい、なぜなら register / undo の純粋連鎖は抽出済みだがその呼び出し配線が content.ts 内に 5 callback × 2 chain のインライン巣として残り、除外まわりの PBI のたびに content.ts と dismiss-dialog.ts の 2 箇所を触り、表示遷移 (busy → success → undo) が e2e でしか検証できないから

## 優先度
- 順位: 8 / 13 → **残置 (着手条件発火型)** (2026-11-21 深掘りで格下げ)
- RICE スコア: 35 (Reach=3 / Impact=2 / Confidence=85% / Effort=0.25人週) — ただし Reach の前提が更新された (下記)
- 根拠: dismiss-dialog.ts は直近 300 コミットで src 内 1 位の 12 変更 (PBI-227/228/234/237/238/241/243/244 が連続) — **この頻度は終息した除外 PBI 波 (227-244) を反映しており、次の除外系 PBI は未定**。深掘り 2026-11-21 の判断: 着手条件発火型に格下げし、次の除外系 PBI が起票された時点で本 PBI を再採点して着手判断する

## 出どころ
- アーキテクチャレビュー 2026-11-20 候補 3 (Worth exploring / local-substitutable)。ラウンド台帳 `pbi/2026-11-21-00-backlog-checking-arch-round.md`
- 現状確認 (2026-11-21): src/entrypoints/content.ts 497-559 付近に配線、src/ui/dismiss-dialog.ts 330 行、src/content/exclusion-register.ts 102 行

## ビジネス価値
- 除外まわりの変更が 1 module に収まる (locality)。測定: 次の除外系 PBI の diff から content.ts が消える
- 表示遷移 (busy → success → undo) を jsdom で検証でき、e2e flake 依存が減る。測定: 表示遷移の pin が tests/ui 配下で実行される

## BDD受け入れシナリオ

```gherkin
Scenario: 登録から undo までが jsdom で検証される
  Given dismiss-flow module が配線を所有し、deps (register / undo / banner 復帰) が注入できる
  When  除外候補ダイアログで登録が成功する
  Then  busy → success 表示 → undo 実行 → バナー復帰の一連が jsdom テストで pin される

Scenario: content.ts の呼び出しは 1 行である
  Given dismiss-flow module が存在する
  When  content.ts の該当箇所を読む
  Then  onDismiss 呼び出し 1 行のみで、dialog deps の組み立ては読めない
```

## 受け入れ基準
- [ ] **着手条件**: 次の除外系 PBI (除外リスト・クイック登録・バナー周り) が起票されたとき、本 PBI を RICE 再採点のうえ着手する。起票がなければ残置を継続する
- [ ] ダイアログ単一ハンドル管理・候補生成・register / undo deps 組み立て・banner 復帰と schedule が 1 つの module (例: src/content/dismiss-flow.ts) に集約されている
- [ ] content.ts 側の該当箇所が onDismiss 呼び出し 1 行相当に痩せている
- [ ] 表示遷移 (busy → success → undo → banner 復帰) の jsdom テストが追加されている
- [ ] 既存 pin 維持 (PBI-234: role=alert 生存・再武装・クリック無視 / 237: a11y / 241: ライター競合 / 244: undo hint・自動クローズ)
- [ ] 2026-11-14 banner-dismiss 設計書の単一ハンドル規律・undo は登録値の exact 削除・restoreFocus 契約は不変
- [ ] `make check` 緑 + `make eval` 3 passed

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 既存 e2e (除外クイック登録シナリオ) で回帰確認。追加なし (flake 依存を減らすのが目的)

### 統合テスト
- tests/integration の実ダイアログ + 実チェーン + 実ストア pin (PBI-244 が作った網) を flow interface に張り替え

### 単体テスト
- dismiss-flow の表示遷移 (busy → success → undo → banner 復帰) を deps モックで 6-10 件
- schedule / 単一ハンドル規律 (再オープン時の前ハンドル破棄) を 2-4 件

## 実装アプローチ
- **Outside-In**: 表示遷移テスト (jsdom で現行は書けない形) を flow 対面で先に書き RED → 配線移動 → GREEN
- **Red-Green-Refactor**: 5 callback × 2 chain の deps 組み立てを 1 つの deps オブジェクトに畳み、既存 pin が緑のまま移動
- **リファクタリング**: content.ts 側は onDismiss 1 行に。新たな pass-through を作らない (deletion test 合格を目指す)

## 見積もり
0.25人週（要チームでの見積もり）

## 技術的考慮事項
- 依存関係: なし。248 / 249 と独立
- テスタビリティ: deps 注入の local-substitutable。ダイアログ DOM は既存 dismiss-dialog テストの jsdom 構成を再利用
- 非機能要件: 挙動不変 (単一ハンドル・自動クローズ・restoreFocus の意味論)

## 実装者向け注記

### 現状コードの確認
（2026-11-21 作成時に現存確認済み。着手時に再確認すること）
```bash
grep -n "openDismissDialog\|onDismiss" src/entrypoints/content.ts | sed -n '1,10p'
grep -n "showRegisterSuccess\|onUndo" src/ui/dismiss-dialog.ts | sed -n '1,8p'
ls tests/ui/dismiss-dialog.test.ts tests/content/exclusion-register.test.ts tests/integration/exclusion-undo.test.ts
```

### 実装手順
1. content.ts の配線 (497-559 付近) を依存の流れで分類: dialog 操作 / register deps / undo deps / banner 復帰
2. dismiss-flow module に配線を移し、deps は 1 つの注入オブジェクトに (callbacks の出所は content.ts から受ける)
3. 表示遷移の jsdom テストを flow 対面で追加 (RED → 移動 → GREEN)
4. content.ts を onDismiss 1 行に痩身化
5. 既存 pin (234/237/241/244) を全実行し、無変更で緑であることを確認
6. make check + make eval

### 落とし穴
- 単一ハンドル規律 (2026-11-14 設計書) は「同時 1 ダイアログ・再オープンで前ハンドル破棄」— flow 内で守る規律として書き、content.ts 側の schedule 呼び出しとの兼ね合いを壊さない
- undo は登録値の exact 削除 (PBI-241 の merge 方式保存との境界) — undoRegisteredExclusion の契約を変えない
- PBI-244 の成功表示 (undo ボタン・15 秒自動クローズ・フォーカス規律) は dismiss-dialog 側で完結している — flow は触らず配線だけを集約する
- バナー復帰 (dismissed.remove + schedule) のタイミングが e2e pin と揃うように、現行の呼び出し順序を保存して移動する

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする (表示遷移 jsdom + 統合 pin)
- [ ] テストカバレッジが基準を満たす (flow 単体 6-10 + 統合)
- [ ] コードレビュー完了（GitHub PR での approve を必須とする）
- [ ] リファクタリング完了（グリーン後・content.ts 痩身化まで）
- [ ] ロールバック手段の検討（挙動不変の配線移動。e2e が red になったら配線順序の保存漏れを疑い、revert で戻せる構成を PR 説明に明記）
- [ ] ドキュメント更新済み（CONTEXT.md の「除外」項に dismiss-flow の所在を 1 行追記）
