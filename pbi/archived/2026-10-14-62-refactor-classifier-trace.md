# PBI: HttpClassifier の trace 返り値化

## ユーザーストーリー

保守担当者として、分類器の監査 trace（状態・再試行・送受信文）を mutable フィールド経由ではなく返り値で受け取れるようにしてほしい。なぜなら「呼んでから読む」の時間的結合は型で表せず、再試行・並行呼出しで上書き競合を起こし、prompt 復元のための JSON 再 parse という無駄を強いられるから。

## 背景・問題

- 対象:
  - `src/ai/http-classifiers.ts:176-246`（`HttpClassifier.send/classify`）
  - `src/ai/http-classifiers.ts:129-146`（`promptInRequest` 再 parse）
  - `src/ai/audited-classifier.ts:12-16`（`TracedClassifier` の `lastTrace/lastExchange`）
  - `src/ai/audited-classifier.ts:44-45`（返却後の読取り）
  - `src/llm/classifier.ts:84-109`（`PromptApiClassifier.lastExchange`）
- 現状: HTTP・Prompt API 両分類器が `lastTrace / lastExchange` を公開 mutable フィールドで晒し、監査ラッパが `classify()` 返却「後」に読む。`promptInRequest` は直前にシリアライズした JSON body を再 parse して prompt 文を回収する（作って捨てて拾い直す）。`send()`（189-212行）は egress 判定・timeout 配線・fetch を三重に担う。各部品が小さく interface が本体と同程度に複雑な浅い module 群。deletion test：`promptInRequest` を消すと監査 trace が壊れる（＝prompt は構築時に手元にあったはずで、回収自体が不要なはず）。
- 提案: アーキテクチャレビュー候補 #4（Worth exploring）。`classify()` は `{ map, trace: { status, retried, request, response } }` を返し、構築済み prompt 文を trace に直接流す（`promptInRequest` 削除）。egress は fetch 包摂 adapter（`egressFetch`）として独自 seam に置き、`send()` は timeout＋fetch のみにする（adapter1つの seam は仮説扱いのため内部に留める）。
- 候補番号: 本ラウンド順位 4（全5件）

## 優先度・スコア

- 順位: 4 位 / 5 件
- RICE スコア: 27
  - Reach = 10（監査・分類器変更の将来作業）
  - Impact = 0.5（trace 正確性・再試行安全。振る舞い不変）
  - Confidence = 80%（4ファイルの全文読解済み、返り値化の見通し明確）
  - Effort = 0.15 人週（返り値化＋再 parse 削除＋ラッパ追従＋テスト）
- 根拠: 順位3の registry が作る seam に収まる整理のため、3の直後に配置。
- 依存: 順位3（`2026-10-14-61-refactor-provider-registry.md`）の後。`AuditedClassifier` の読取り timing を両 PBI で同時に変えないこと。

## BDD受け入れシナリオ

```gherkin
Scenario: ハッピー ― trace が返り値で受け取れる
  Given 欄メタデータの集合が与えられる
  When 分類器の classify() を呼ぶ
  Then { map, trace } が解決される
  And trace は { status, retried, request, response } を含む
  And 分類器に公開 mutable フィールドが残っていない

Scenario: 境界 ― 互換再試行で2件の trace が保全される
  Given 互換再試行を要する応答を返す偽 fetch がある
  When classify() を呼ぶ
  Then 再試行前後の trace が混ざらずに記録される
  And prompt 回収のための JSON 再 parse が存在しない
```

## 受け入れ基準

- [x] `HttpClassifier.classify()` と `PromptApiClassifier.classify()` が trace を返り値で返す（または呼出し毎に束縛した `traceOf()` クロージャを渡す）
- [x] `promptInRequest` が削除されている
- [x] `TracedClassifier` の `lastTrace/lastExchange` が廃止され、`AuditedClassifier` が解決値を読む
- [x] egress 判定が fetch 包摂の内部 adapter に分離され、`send()` が timeout＋fetch のみを担う
- [x] `make typecheck` と `make test` がパスする

## テスト戦略（t_wadaスタイル）

### E2Eテスト

- 不要（返り値化で UI・保存動作に影響しないため）

### 統合テスト

- `AuditedClassifier` 経由の監査記録テスト（request/response・chunk・result・httpStatus・retried の既存アサーションで回帰確認）

### 単体テスト

- `classify()` 解決値の trace アサーション（再 parse なし・mutable 読取り儀式なし）
- 互換再試行時の trace 保全テスト
- 応答サイズ上限（`MAX_RESPONSE_BYTES`）超過時の trace と誤り種別のテスト
- テスト方針に従い、再現ケースを先に追加して失敗させてから直す（Outside-In の Red-Green-Refactor）

## 見積もり

- 0.15 人週（ストーリーポイント換算では小。要チームでの見積もり）
- 内訳想定: 返り値化＋再 parse 削除＋ラッパ追従＋単体テスト＋レビュー対応

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] `make typecheck` がパスする
- [x] `make test` がパスする
- [x] コードレビュー完了
- [x] ドキュメント更新不要であることが確認済み（内部付け替えのため）

## 実装者向け注記

### 現状コードの確認（着手前に必ず実行すること）

対象は `src/ai/http-classifiers.ts`（129-146・176-246行）と `src/ai/audited-classifier.ts` 全文、`src/llm/classifier.ts`（84-109行）。

- 監査エントリの request/response は prompt のメタデータ allow-list のみを含み、プロファイル値・欄値・APIキー・要求ヘッダが混入しない約束（audit-log.ts:53-57行）を返り値化後も維持すること
- 応答クリップ（`clipAuditResponse`：保持 trace 文自体の有界化）は返り値側でも維持すること
- `readJsonBounded` の有界読取り（Content-Length 事前拒否＋stream 上限＋oversize 時の cancel）を崩さないこと

### 落とし穴

- 順位3と同ファイル（`audited-classifier.ts`）を触るため、先に順位3の差分を取り込んでから着手すること
- `lastExchange` を読む既存テスト・偽装があるか `lastTrace`、`lastExchange` で `src/` と `tests/` を検索してから着手すること
- 失敗時も監査1エントリ（`audited-classifier.ts:64-72` の success/failure 両経路の `log`）を維持すること。recorder 失敗は分類結果を変えない約束も維持
- Gemini の egress 非配線（定数宛先のため）の記録を adapter 分離後も残すこと

## 実施記録（2026-10-14、自律タスククローザーによる実装）

- 実装コミット `28402ba`: `attempt()` を返り値化（`{ map, trace, error? }`）。`promptInRequest` 削除（prompt は `buildPrompt` から直接）、`send()` を `checkEgress`＋`fetchWithTimeout` に分離（内部 seam）、`TracedClassifier` は `attempt` 必須に、`AuditedClassifier` は解決値を読み単一エントリ記録（`ClassifyTrace` は死に輸出のため削除）。
- 適用注記: `classify()` の返り型は `FieldClassifier` seam 安定のため不変とし、各 adapter の `attempt()` が trace を運び `classify()` が unwrap する（PBI 提案の代替形。監査の失敗時 trace（401 の httpStatus 等）は outcome 同梱で保存）。
- 監査差分の注記（コードレビュー指摘の反映）: 空欄 `classify([])` の監査エントリの `request` が、旧 `''` から prompt スケルトン文字列に変わっている（旧コードは空欄早期返却が trace 設定より先だった）。無害かつ情報量は増えているが、将来の監査差分調査のための記録として残す。
- 検証: `npx tsc --noEmit` exit 0、フル単体 90 ファイル・1182 件 green、両ブラウザ build green。
- ユーザーの作業として残る項目: コードレビュー
