# PBI: messaging 衛生 (open-options codec 経由化 + decode 1 回化 + alias 撤去)

## ユーザーストーリー
メッセージ型を追加する保守者として、送信は builder 経由・decode は 1 回という規律が守られてほしい、なぜなら openOptionsRequest builder が在るのに本番 3 箇所が手書き raw 送信 (version なし・legacy 許容で偶然動作) し、同一メッセージが background と handleMessage で 2 回 decode され、新メッセージ型 1 個の追加に 4 module の知識が要るから

## 優先度
- 順位: 3 / 13
- RICE スコア: 75 (Reach=4 / Impact=2 / Confidence=90% / Effort=0.1人週)
- 根拠: メッセージ型は拡張の運用で継続的に増える (過去に open-options・audit-clear・export 系が追加)。追加経路が 1 本になれば version stamp が全メッセージに乗り、decode 二重の保守コストが消える

## 出どころ
- アーキテクチャレビュー 2026-11-20 候補 6 (Worth exploring)。ラウンド台帳 `pbi/2026-11-21-00-backlog-checking-arch-round.md`
- 現状確認 (2026-11-21): raw 送信 src/entrypoints/content.ts:193, 257, 494 / decodeRequest 2 回 (src/entrypoints/background.ts:61 と src/llm/handle-message.ts:52) / deprecated alias 3 個 (src/llm/background-gateway.ts、PBI-51 で deprecated 化)

## ビジネス価値
- 新メッセージ型の追加経路が 1 本になる。測定: 次にメッセージ型を足す PBI の diff が messages.ts + 2 末端 (sender / receiver) だけで完結
- decode 2 回 → 1 回、version なし送信 0 件。測定: grep で手書き sendMessage が content.ts から消える

## BDD受け入れシナリオ

```gherkin
Scenario: 設定ページを開く要求が builder 経由で送られる
  Given content.ts に openOptionsRequest builder が存在する
  When  利用者が「設定を開く」導線を触る (データなし・panel 隅・ゲート)
  Then  3 箇所すべて openOptionsRequest() 経由で送信され、version 付き wire が流れる

Scenario: メッセージは 1 回だけ decode される
  Given background がメッセージを受信した
  When  sender 検証を通って handleMessage に渡る
  Then  decodeRequest は handleMessage の 1 箇所でのみ走り、background での事前 decode は存在しない
```

## 受け入れ基準
- [ ] content.ts の raw 送信 3 箇所 (193 / 257 / 494 付近) が openOptionsRequest() 経由に置換されている
- [ ] decodeRequest が handleMessage の 1 箇所のみで走る (open-options / audit-clear の処理は deps 注入で handleMessage 側に寄せ、background の到達不能 case を削除)
- [ ] src/llm/background-gateway.ts の deprecated alias 3 個が撤去されている (消費者なしを grep で確認のうえ)
- [ ] wire 形式・sender 検証 (background での sender.id 確認位置) は不変
- [ ] `make check` 緑 + `make eval` 3 passed

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 追加なし (既存 e2e が設定ページ導線を通るため回帰網として機能)

### 統合テスト
- tests/integration のメッセージ系 pin (builder → background → handleMessage の往復) に「decode 1 回」を pin する spy テストを 1 件追加

### 単体テスト
- openOptionsRequest の wire 形状 pin (version 付き・既存 builder テストの枠組み)
- deprecated alias 撤去後の import 解決 (typecheck)

## 実装アプローチ
- **Outside-In**: content.ts の 3 箇所から置換 (赤: builder 未使用を grep で確認 → 緑: 置換後の focused test) → decode 統合 → alias 撤去
- **Red-Green-Refactor**: 手順ごとに make check を 1 回ずつ (コミットは最後にまとめ可)
- **リファクタリング**: 到達不能 case 削除後に handleMessage の deps 一覧を読み、新 case 名が既存の網羅性ガード (AiRequest switch 相当) に乗ることを確認

## 見積もり
0.1人週（要チームでの見積もり）

## 技術的考慮事項
- 依存関係: なし。246 (messages 語彙分割) と同時にやると相性がよい
- テスタビリティ: wire 契約は既存 pin 済み。decode 統合は呼び出し回数の spy で pin 可能
- 非機能要件: Firefox event page でのメモリ状態前提に変更なし (wire 不変のため)

## 実装者向け注記

### 現状コードの確認
（2026-11-21 作成時に現存確認済み。着手時に再確認すること）
```bash
grep -n "sendMessage" src/entrypoints/content.ts
grep -c "decodeRequest" src/entrypoints/background.ts src/llm/handle-message.ts
grep -rn "deprecated" src/llm/background-gateway.ts
```

### 実装手順
1. messages.ts の openOptionsRequest builder の wire 形状を確認し、3 箇所の raw 送信を置換
2. background.ts の decodeRequest 呼び出しを撤去し、sender 検証のみに縮める
3. handleMessage.ts に open-options / audit-clear の case を deps 注入で追加し、background 側の case 処理を移す
4. 到達不能 case (decode 済み msg が再 decode される分岐) を削除
5. background-gateway の deprecated alias を消費者 grep のうえ撤去
6. 全体を make check

### 落とし穴
- sender 検証の位置を動かさないこと (background で sender.id を見る規律は 2026-10-11 egress 系 PBI の意図)
- audit-clear は単一 AuditStore キューの規律がある (並行 clear の race) — deps 注入で処理を移す際、キュー規律を壊さない
- legacy 許容 (version なし受容) は wire codec の意図的な緩和 — 本 PBI では送信側だけ正規化し、受容側の広さは変更しない (2026-10-18-34 の wire versioning 経緯を読む)

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする (builder 経由 pin + decode 1 回 spy)
- [ ] テストカバレッジが基準を満たす (既存網 + 追加 2 件)
- [ ] コードレビュー完了（GitHub PR での approve を必須とする）
- [ ] リファクタリング完了（グリーン後・到達不能 case と alias の撤去まで）
- [ ] ロールバック手段の検討（wire 不変の配線変更。revert で完結することを PR 説明に明記）
- [ ] ドキュメント更新済み（AGENTS.md のアーキテクチャ節のメッセージング記述が現状と一致するか確認・必要なら 1 行修正）
