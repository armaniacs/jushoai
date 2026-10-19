# PBI: overlay/host コメント重複のdrift対策

## ユーザーストーリー
保守担当者として、overlay と host の重複したCSS解説コメントを一元化したい、なぜなら片方だけ更新されると解説が矛盾（drift）して誤った修正を誘発するから。

## 優先度（順位・RICE・根拠・依存）
- 順位: 9位 / 9件
- RICE スコア: 20
  - Reach: 5
  - Impact: 0.25
  - Confidence: 80%
  - Effort: 0.05人週
- 根拠: 可読性のみの改善であり最後の優先度。
- 依存: なし（54と同領域）

## BDD受け入れシナリオ

```gherkin
Scenario: ハッピー ― 重複解消で意味が保存される
  Given 保守担当者がオーバーレイの配置仕様を確認している
  When 重複解説が一元化された後のコードコメントを読む
  Then left unset の理由（left+right+width 過剰拘束でLTRは right が落ちる）と all:initial リセットの関係が正しく理解できる

Scenario: 境界 ― 将来の片方更新で矛盾しない
  Given 共通解説が host.ts に寄せられ overlay 側が参照のみになっている
  When 将来 all:initial や配置仕様が変更される
  Then 更新箇所が1か所だけで済み、両ファイルの解説が矛盾しない

Scenario: 境界 ― overlay 側の参照が迷子にならない
  Given overlay 側のコメントが参照のみの1行になっている
  When 新規参加者が overlay.ts を読む
  Then 参照先（host.ts の共通解説）にたどり着ける
```

## 受け入れ基準
- [x] `src/ui/overlay.ts:8-16` の left unset 9行解説と `src/ui/host.ts:11-16` の all:initial 解説の重複が解消されている
- [x] 共通解説の正本が1か所にあり、もう一方は参照のみである
- [x] left+right+width 過剰拘束（LTRでは right が落ちる）という意味内容が失われていない
- [x] 振る舞い変更なし（コメントのみの変更である）

## テスト戦略

### E2Eテスト
- 対象外（コメントのみの変更のため）

### 統合テスト
- 対象外

### 単体テスト
- 対象外（既存テストのグリーンを維持することのみ確認する）

## 見積もり
0.05人週（要チームでの見積もり）

## Definition of Done
- [x] 重複コメントが解消され、意味内容が保存されている
- [x] 既存テストがグリーンである
- [ ] コードレビュー完了
- [x] ドキュメント更新不要であることを確認済み

## 実装者向け注記
- 対象: `src/ui/overlay.ts`（8-16行目の left unset 9行解説）と `src/ui/host.ts`（11-16行目の all:initial 解説）
- 現状の確認:
  - overlay 側の解説は内容として正しい（left+right+width 過剰拘束で LTR は right が落ちる）
  - host 側の all:initial 解説と内容が重複しており、片方更新で drift するリスクがある
- 修正方向: 共通解説を host.ts に寄せ、overlay 側は参照のみの1行化とする
- 落とし穴:
  - 意味を削りすぎないこと（特に「left を important 付きで書くと過剰拘束になる」理由は残すか、正本への参照でたどれること）
  - 振る舞い変更は行わないこと（コメント整理のみ）

## 実施記録（2026-10-13、自律タスククローザーによる実装、PBI 54 と同一コミット）

- 実装コミット `02564fb`: 正本を `host.ts` に集約（`left` 過剰拘束の意味を追記）し、`overlay.ts` 側を 1 行参照化。振る舞い変更なし。
- 検証: `npx tsc --noEmit` exit 0、既存テスト green。
- ユーザーの作業として残る項目: コードレビュー
