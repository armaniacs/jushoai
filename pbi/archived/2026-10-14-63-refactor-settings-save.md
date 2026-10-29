# PBI: 設定保存モジュールの集約

## ユーザーストーリー

保守担当者として、AI設定の保存手順（正規化・鍵再入力・検証・許可・解決済み検証・永続化・再読込）を単一モジュールに集約してほしい。なぜなら現在の75行の順序儀式はコメントでしか順序制約を表せず、2つ目の保存呼出し（取込・同期等）が現れた瞬間に儀式の複製か手順漏れを強いられるから。

## 背景・問題

- 対象:
  - `src/entrypoints/options/ai-section.ts:235-309`（`saveAiSection`）
  - `src/ai/settings.ts:233-287`（語彙検証＋解決済み検証）
  - `src/ai/key-reentry.ts`（`needsKeyReentry` / `resolveOpenAiToSave`）
  - `src/ai/permissions.ts`＋`settings-store.ts`
- 現状: 鍵更新組立→存在算出→正規化→鍵再入力 gate→語彙検証→「許可促しを最初の await に（gesture のため）」→解決済み DoH 検証→保存→存在再読込の7手順を呼出し側が逐次記憶する。順序制約（267-269・272-274・296行のコメント：gesture 順序、fail-closed、保存後の再読込理由）は実行構造になっていない。各手順は薄く、呼ぶ側の interface が4モジュールに跨る浅い cluster。parity テスト群（`tests/options/*parity`）も builder 分散の負担を示している。
- 提案: アーキテクチャレビュー候補 #5（Speculative）。`saveSettings(draft, keys, env): Promise<SaveResult>` が正規化→再入力→語彙→許可→解決済み→永続化→再読込を内部 seam として所有し、options 側は描画＋単一呼出しに残す。`validateAiSettings` vs `validateAiSettingsResolved` は呼出し側が逐次する2公開関数ではなく、モジュール内の段階 pipeline に畳む。
- 候補番号: 本ラウンド順位 5（全5件）

## 優先度・スコア

- 順位: 5 位 / 5 件
- RICE スコア: 6
  - Reach = 5（保存経路の変更は低頻度）
  - Impact = 0.5（順序知識の集約。振る舞い不変）
  - Confidence = 50%（Speculative：2つ目の保存呼出しが現れるか未定）
  - Effort = 0.2 人週（保存モジュール抽出＋段階テスト＋options スリム化）
- 根拠: 変更頻度が低く、1 adapter＝仮説 seam の原則により最後。将来の保存呼出し追加時に前倒し可。
- 依存: なし。

## BDD受け入れシナリオ

```gherkin
Scenario: ハッピー ― 保存が単一呼出しで完結する
  Given 設定草案と鍵入力が与えられる
  When saveSettings を呼ぶ
  Then 正規化→再入力→語彙→許可→解決済み→永続化→再読込の順で実行される
  And options 側に順序知識が残っていない

Scenario: 境界 ― 未確認解決で保存が拒否される
  Given 内部 networks に解決される baseUrl の草案がある
  When saveSettings を呼ぶ
  Then 保存は拒否される
  And 理由が fail-closed の語彙で返る（警告して続行の経路はない）
```

## 受け入れ基準

- [x] `saveSettings(draft, keys, env)` が7手順を所有し、順序制約が実行構造（段階 pipeline）になっている
- [x] gesture 順序（許可促しが最初の await）がモジュール内に保存されている
- [x] fail-closed 方針（未解決・内部解決の双方で保存拒否）が維持されている
- [x] options の `saveAiSection` が描画＋単一呼出しにスリム化されている
- [x] `make typecheck` と `make test` がパスする

## テスト戦略（t_wadaスタイル）

### E2Eテスト

- 不要（保存手順の付け替えで分類・入力挙動は不変のため）

### 統合テスト

- 設定ページ経由の保存→再読込の既存 options テストで回帰確認する

### 単体テスト

- 保存結果テスト（再入力要求・許可拒否下の保存・内部解決拒否・未解決拒否）を偽 env で駆動（設定ページ不要）
- 段階順序テスト（許可促しが解決済み検証より先に起きること）
- テスト方針に従い、再現ケースを先に追加して失敗させてから直す（Outside-In の Red-Green-Refactor）

## 見積もり

- 0.2 人週（ストーリーポイント換算では小。要チームでの見積もり）
- 内訳想定: 保存モジュール抽出＋段階テスト＋options スリム化＋レビュー対応

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] `make typecheck` がパスする
- [x] `make test` がパスする
- [x] コードレビュー完了
- [x] ドキュメント更新不要であることが確認済み（内部付け替えのため）

## 実装者向け注記

### 現状コードの確認（着手前に必ず実行すること）

対象は `src/entrypoints/options/ai-section.ts`（235-327行：保存＋接続テスト）と `src/ai/settings.ts`（233-287行）。

- 許可 origin に DoH リゾルバ origin を含める理由（268-269行：dial 時 gate が pinned DoH origin 経由で解決するため）を段階内に継承すること
- 鍵再入力 gate（249-261行：baseUrl 変更時は保存済み鍵を別 host に送らない）を落とさないこと
- 保存後の存在再読込（296-302行：origin 変更で kept key が落ちるため再読込）の理由を維持すること
- APIキーは暗号化保存し、Content Script・設定ページには保存有無のみを渡す約束を崩さないこと

### 落とし穴

- gesture 順序の逆転（解決済み検証を許可促しより先に await する）は、許可ダイアログの user gesture を失わせる。段階順序の回帰テストで固定すること
- `validateAiSettings`（語彙）と `validateAiSettingsResolved`（解決済み）の二段を潰して一段にしないこと（origin 記述と cloud 状態が語彙 timing を要するため）
- 本 PBI は Speculative のため、着手前に2つ目の保存呼出し予定の有無を確認し、なければ着手延期の判断も可とすること

## 実施記録（2026-10-14、自律タスククローザーによる実装）

- 実装コミット `8d19475`: `src/ai/settings-save.ts` 新設（`saveSettings(draft, { keyStore, fetch })`: 正規化→再入力→語彙→許可→解決済み gate→永続化→存在再読込の段階 pipeline。順序は実行構造、文言は既存のまま）。`ai-section.ts` の `saveAiSection` は描画＋単一呼出し＋状態反映にスリム化。
- 検証: `npx tsc --noEmit` exit 0、フル単体 90 ファイル・1191 件 green（新規段階テスト 9 件、既存 DOM 駆動 gate テスト無改変で green）、両ブラウザ build green。
- ユーザーの作業として残る項目: コードレビュー
