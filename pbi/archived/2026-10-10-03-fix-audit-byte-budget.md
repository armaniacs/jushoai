# PBI: 監査ログのサイズ予算をバイト長で計上する

状態: 実装済み（`make check` green。コードレビューはユーザー作業として残す）

## ユーザーストーリー
CJK を含むフォームで AI 分類を使い、監査ログを長期利用する利用者として、監査ログのサイズ予算が実際のストレージ消費（UTF-8 バイト）と一致してほしい、なぜなら文字数計上のままだとクォータ超過で監査記録が静かに止まり、外部 AI への送信内容を検証する透明性が失われるから

## 優先度
- 順位: 3 / 7
- RICEスコア: 12.0（Reach=15 / Impact=1 / Confidence=80% / Effort=1pt）
- 根拠: VulnHunter 監査の Code Quality #2 で、機構（文字数 vs UTF-8 バイトの不一致）はソース検証済み。到達はユーザー操作ゲート付きで、被害は監査記録の一時滞留（最大 7 日で自己修復）に限られるため Impact は低い。一方、修正は 1 ファイルの 1 関数とテスト追加で Effort 最小。トレースビューア PBI（実装済み）で 1 レコードが大きくなり、CJK 主体の本拡張では予算到達が現実的なため Confidence は高い

## 背景
- VulnHunter 監査（`JushoAI_VULNHUNT_RESULTS_2026-10-10-051858/phase2b_output.md` 候補 #2、VULN-002）で指摘された。Gate 2a/3 でセキュリティ欠陥としては排除され、Code Quality（実欠陥・分類違い）として扱う。機構は検証済み: `entryBytes`（`src/ai/audit-log.ts:65`）は `String.length`（UTF-16 コードユニット数）を合算するが、chrome.storage.local のクォータは直列化後の UTF-8 バイトで課金され、CJK は ≈ 3 バイト/文字
- Firefox のクォータは 5MB。「4,000,000 文字」の予算は CJK 主体の内容だと実バイトで 12MB に達しうるため、コメント（`src/ai/audit-log.ts:5-9`）が意図する「クォータを下回る」保証が崩れる
- クォータ超過時の被害: `chrome.storage.local.set` が失敗し続け、記録エラーは `src/ai/audited-classifier.ts:59-61` の catch で握り潰されるため、監査記録が静かに止まる。保持ポリシー（7 日）で最大 7 日間の滞留後に自己修復するが、その間の監査は欠落する
- トレースビューア PBI（`pbi/2026-10-09-01-feat-audit-trace-viewer.md`、実装済み）で 1 レコードが大きくなった（全文プロンプト + 2,000 文字応答）。本拡張は日本語フォーム向けで request/response に CJK が混ざる確率が高く、予算到達は現実的
- 監査ログは「外部 AI に何を送ったか」を利用者が検証するための透明性機能であり、記録が止まるとその価値が失われる

## BDD受け入れシナリオ
Scenario: CJK の記録はバイト長で計上される
  Given 監査ログに日本語中心の request/response を持つ記録がある
  When 記録のサイズを計上する
  Then 計上値は TextEncoder で直列化した UTF-8 バイト長であり、文字数より大きい

Scenario: 予算超過時に古いものから削除される
  Given CJK 文字列の大きな記録で合計が予算を超えている
  When 新しい記録を追記する
  Then 古い記録から順に削除され、合計が AUDIT_MAX_BYTES 以内に収まる

Scenario: ASCII と CJK の混在で境界を守る
  Given ASCII のみの記録と CJK を含む記録が混在している
  When 予算ちょうどと 1 バイト超過の境界で追記する
  Then 予算内の記録は保持され、超過分だけ古いものから落ちる

Scenario: 保持と上限の挙動は従来どおり
  Given 8 日前の記録と 1,001 件の記録がある
  When 新しい記録を追記する
  Then 期限切れと 1,000 件超の古い記録は従来どおり削除され、監査レコードのフィールド形状は変わらない

Scenario: 保存に失敗しても入力は止まらない
  Given ストレージへの書き込みが失敗する状態にある
  When AI 分類を実行する
  Then 分類結果は返り、監査記録の失敗は握り潰される（既存挙動）

## 受け入れ基準
- [x] `entryBytes`（`src/ai/audit-log.ts:65`）が `TextEncoder` で直列化した UTF-8 バイト長を返す（`request` + `response` + 固定オーバーヘッド 256 の構成は維持）
- [x] `pruneEntries` / `withinByteBudget`（`src/ai/audit-log.ts:56-81`）の計上単位が UTF-8 バイトに揃い、予算超過時に古い記録から削除される
- [x] CJK 文字列でバイト長 > 文字数になることをテストで固定する
- [x] ASCII と CJK の混在ケースと、予算ちょうどの境界をテストで固定する
- [x] 保持期間 7 日・上限 1,000 件の挙動は不変である
- [x] `AuditEntry` のフィールド形状・TSV 出力・設定ページビューアに影響しない
- [x] `AUDIT_MAX_BYTES` の定数値とコメント（`src/ai/audit-log.ts:5-9`）が、Firefox 5MB クォータに対して安全側の UTF-8 計上として更新されている
- [x] 保存失敗時も入力を止めない既存挙動を維持する

## テスト戦略（t_wadaスタイル: 単体 / 統合）
- 単体（`tests/ai/audit-log.test.ts`）: UTF-8 計上の境界 — CJK 文字列でバイト長 > 文字数、ASCII は文字数と等しい、サロゲートペア（絵文字など）は UTF-16 2 ユニット = UTF-8 4 バイト、ASCII/CJK 混在、予算ちょうどで保持・1 バイト超過で最古を落とす、保持期間と 1,000 件上限が不変であること
- 統合: 既存の `AuditStore` + fake `chrome.storage.local` の方針に合わせ、CJK 主体の記録の追記連鎖で prune が正しく働くこと、append → list で計上が一貫すること

## 実装者向け注記
### 現状コードの確認（着手前に実行済み）
- `src/ai/audit-log.ts:65`: `const entryBytes = (e: AuditEntry): number => e.request.length + e.response.length + 256;` — `.length` は UTF-16 コードユニット数で、UTF-8 バイトではない
- `pruneEntries`（56-60 行目）と `withinByteBudget`（67-76 行目）は `entryBytes` 経由で同じ計上単位。呼び出し経路は `AuditStore.record`（158-177 行目）→ `appendEntry` → `pruneEntries` と、`AuditStore.list`（179-181 行目）
- `AUDIT_MAX_BYTES = 4_000_000`（9 行目）。コメント（5-8 行目）の意図は「エントリ数だけでは request/response の合計サイズを拘束できないため、chrome.storage.local のクォータ（Firefox 5MB、Chrome 10MB）を下回るバイト予算を設け、満杯でも今後の書き込みが詰まらないようにする」
- `request` は `buildPrompt` の全文、`response` は `AUDIT_RESPONSE_CLIP_LENGTH`（2,000 文字、16 行目）で切り詰め済み（トレースビューア PBI で追加）
- 保存失敗は `src/ai/audited-classifier.ts:59-61` の catch で握り潰され、入力は止まらない。クォータ超過で set が失敗し続けると blob は保持期間（`AUDIT_RETENTION_MS`、2 行目）か手動 clear まで縮まない
- 既存テスト `tests/ai/audit-log.test.ts` のバイト予算 2 ケースは ASCII（`'x'` の繰り返し）のため、UTF-8 計上でも文字数と等価であり、そのまま通るはず

### 実装手順
1. `src/ai/audit-log.ts` に `utf8Bytes(s: string): number`（`new TextEncoder().encode(s).length`）を追加する。TextEncoder は同期 API で、Service Worker と Node（vitest）のどちらでもグローバルに存在する
2. `entryBytes` を `utf8Bytes(e.request) + utf8Bytes(e.response) + 256` に変更する。`pruneEntries` / `withinByteBudget` は `entryBytes` 経由なので本体の変更は不要
3. `AUDIT_MAX_BYTES` まわりのコメント（5-9 行目）を UTF-8 計上に合わせて書き直す。定数値は Firefox の 5MB クォータに対して安全側に選ぶ（現状の 4,000,000 は 5MB の約 76% で、JSON 直列化の構造オーバーヘッド込みでも余裕がある。動かす場合は必ず実バイトで 5MB を下回る値にする）
4. `tests/ai/audit-log.test.ts` に CJK・混在・境界のテストを追加する
5. `make test`（単独なら `npx vitest run tests/ai/audit-log.test.ts`）と `make check` で確認する

### 落とし穴
- `withinByteBudget` は append と list のたびに全エントリの `entryBytes` を合算する。TextEncoder は文字列全体を encode するため計上コストは O(総バイト数)。1,000 件 × 数 KB なら実害はないが、レコードの巨大化で増幅する。`AuditEntry` へのバイト長キャッシュはフィールド形状変更に当たるため本 PBI では行わない
- chrome.storage.local のクォータは文字列単独ではなく JSON 直列化後の blob 全体（キー名・id・ISO 日時・エスケープ・配列構造込み）で課金される。+256 の固定オーバーヘッドは 1 エントリあたりの構造分の近似であり、構造フィールドは ASCII 中心のため UTF-8 計上に変えても概ね妥当。この近似であることをコメントに残す
- サロゲートペア（絵文字など）は UTF-16 で 2 コードユニット、UTF-8 で 4 バイト。文字数計上では過小評価されるため、テストに 1 ケース混ぜると計上の正しさを広く固定できる
- 既存テスト「keeps entries exactly at the byte budget」は `AUDIT_MAX_BYTES - 256 - 3` というマジックナンバー（予算より 3 少ない位置）で境界を作る。`AUDIT_MAX_BYTES` を動かす場合、この期待値の前提が崩れないか確認する
- クォータ割れは `record` の失敗として現れ呼び出し側で握り潰されるため、テストだけでは「実バイトでクォータ内に収まる」ことを検証できない。定数値を引き上げる場合は安全側余裕を保つ

## 見積もり
1pt（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] `make check` が green で通る（既存の ASCII ベースのバイト予算テストを含む全テストが非破壊）
- [ ] コードレビュー完了
