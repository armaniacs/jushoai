# PBI: 緩和境界の WHY コメントを office に単一所有させる

## ユーザーストーリー
会社語彙を緩和・追加する保守者として、「カナ文脈・誕生文脈は緩和対象外」「複合ラベルは分解しない (誤注入より不注入)」という理由が 1 箇所に書いてあってほしい、なぜなら 同じ WHY が src/core/classify-rules.ts (officeField ゲート前) と src/core/classify-vocab-office.ts (officeEligible / entries 前) に別の言葉で書かれており、次に語彙を緩和する人が 2 か所の物語を同時に更新する必要があるから

## 優先度
- 順位: 9 / 13
- RICE スコア: 25 (Reach=2 / Impact=1 / Confidence=90% / Effort=0.05人週)
- 根拠: checking-team Refactoring Evangelist (Low)。抽出の目的である locality がコメント層で部分的に損なわれている状態。コメントのみの zero-risk 修正

## 出どころ
- checking-team 2026-11-21 Refactoring Evangelist (Low)。ラウンド台帳 `pbi/2026-11-21-00-backlog-checking-arch-round.md`
- 現状確認 (2026-11-21): src/core/classify-rules.ts:137-142 と src/core/classify-vocab-office.ts:8-21, 119-132 に同主題の WHY コメント

## ビジネス価値
- 緩和境界の理由が単一所有になり、語彙緩和時の更新漏れが防げる。測定: 緩和理由を語るコメント節が office module に 1 箇所のみ

## BDD受け入れシナリオ

```gherkin
Scenario: 緩和理由の読者が 1 箇所だけで完結する
  Given 緩和境界の WHY コメントが office 語彙 module に単一所有されている
  When  classify-rules.ts の officeField ゲート箇所を読む
  Then  ゲートが語彙 module の eligibility 述語に委譲している旨の 1〜2 行のみで、理由の全文は無い

Scenario: 理由の内容が失われない
  Given コメント統合を行う
  When  統合後の office module のコメントを読む
  Then  「カナ文脈・誕生文脈は緩和対象外」「複合ラベルは分解しない (誤注入より不注入)」の 2 点がどちらも読める
```

## 受け入れ基準
- [ ] 緩和境界の WHY の全文が src/core/classify-vocab-office.ts (officeEligible / officeKanaEligible の属する位置) に集約されている
- [ ] src/core/classify-rules.ts の該当箇所 (137-142) が委譲を示す 1〜2 行に縮約されている
- [ ] コメントのみの変更 (コード・正規表現・確度は 1 文字も変えない)
- [ ] `make check` 緑

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 追加なし (コメントのみ)

### 統合テスト
- 既存全テストが緑 (無変更)

### 単体テスト
- 追加なし。検証は grep (分断箇所 0 件) + 目視確認

## 実装アプローチ
- **Outside-In**: 読者 (緩和する人) の航路を想定し、office module を読めば完結する形に寄せる
- **Red-Green-Refactor**: なし (挙動不変)
- **リファクタリング**: 文言の再構成のみ。理由の意味を変えない

## 見積もり
0.05人週（要チームでの見積もり）

## 技術的考慮事項
- 依存関係: なし。249 (規約整合) と同じくコメント系で、同 PR に含めてもよい
- テスタビリティ: 検証は grep + 目視
- 非機能要件: 78 桁以内・CP932 禁止文字なし

## 実装者向け注記

### 現状コードの確認
（2026-11-21 作成時に現存確認済み。着手時に再確認すること）
```bash
grep -n "緩和\|relax\|compound" src/core/classify-rules.ts | sed -n '1,8p'
grep -n "officeEligible\|officeKanaEligible" src/core/classify-vocab-office.ts | sed -n '1,6p'
```

### 実装手順
1. 両所のコメントを並べ、意味の重複と差分を確定する
2. 全文を office module (officeEligible の直上) に寄せ、classify-rules.ts 側を委譲の 1〜2 行に縮約
3. 意味の喪失がないことを 2 点 (カナ・誕生の対象外 / 複合ラベル不分解) で確認
4. make check (lint を通す)

### 落とし穴
- コメント翻訳時に「なぜ」を落とさないこと (過去の fix wave で ID 除去時に理由を保持した慣行)
- 縮約側 (classify-rules.ts) に officeField ゲートの挙動説明が別途必要なら 1 行追加してよい (ゲート自体の説明と緩和理由は別物)

## Definition of Done
- [ ] BDD シナリオの検証手順 (目視 + grep) がパスする
- [ ] テストカバレッジが基準を満たす (既存網・無変更)
- [ ] コードレビュー完了（GitHub PR での approve を必須とする）
- [ ] リファクタリング完了（該当なし — コメントのみ）
- [ ] ロールバック手段の検討（該当なし — revert で完結）
- [ ] ドキュメント更新済み（本 PBI の更新がそのまま該当）
