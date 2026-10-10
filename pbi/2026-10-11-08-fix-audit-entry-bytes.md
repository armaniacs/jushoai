# PBI: 監査ログの容量計上を「保存される記録全体」に広げ、pageUrl を予算計上に含める

状態: 未着手（run-2 セキュリティ監査の所見 1 `audit-log-byte-budget-excludes-page-controlled-pageUrl`（`~/security-audit-skill/jushoai/run-2/` の NEEDS-VALIDATION.md 所見 1、REPORT.md 推奨アクション 1）と、アーカイブ済み PBI `pbi/archived/2026-10-10-03-fix-audit-byte-budget.md` の残課題から起票）
起票日: 2026-10-11

## ユーザーストーリー

監査ログを長期利用する利用者として、監査ログの容量計上が実際に保存される記録全体（pageUrl を含む）と一致してほしい、なぜなら計上から漏れた pageUrl が伸び続けると実バイトが予算を超えたまま保存が行われ、記録が静かに止まって外部 AI への送信内容を検証する透明性が失われるから。

## 優先度

順位 2 / 全候補 8 件。RICE 18.0（Reach=40 / Impact=1 / Confidence=90% / Effort=2pt）。根拠: 監査ログは AI 呼び出しごとに記録されるため、AI 判定を使う層に届く（Reach=40）。計上の漏れは確定していて、機構（UTF-8 計上・メモ化・prune）は実装済みなので Confidence は高い。被害は「記録が静かに止まる・欠落する」問題の防止（Impact=1）。修正は 1 ファイルの計上関数とテスト追加が中心で Effort=2。依存なし。

## 背景

- run-2 セキュリティ監査の所見 1 `audit-log-byte-budget-excludes-page-controlled-pageUrl`（`NEEDS-VALIDATION.md:9`、`REPORT.md:41`）は、`entryBytes` が page 制御で無上限の `pageUrl` を測らないことを candidate として残した。同監査の推奨アクション 1（`REPORT.md:68`）が修正の方向性を確定させた。
- アーカイブ済み PBI `pbi/archived/2026-10-10-03-fix-audit-byte-budget.md` が計上単位（文字数 → バイト）は直したが、計上対象を request + response に留めたため、pageUrl の抜けを残した。
- pageUrl はページが支配する文字列である。`sanitizePageUrl` は origin + pathname を返し長さ上限がなく、`history.pushState` で pathname は長くなりうる。Content Script から background へは `sender.tab?.url` がそのまま渡される。
- 計上漏れの影響: 保存される blob の実バイトが予算を超えた状態になり、`chrome.storage.local.set` が失敗した場合は記録の失敗が握り潰されて記録が静かに止まる。prune が「予算内に収まっている」を保証するのは計上が正しい場合だけで、漏れがあるとその保証が崩れる。

## 事実（`0650fbf` 時点で確認済み）

| 事実 | 根拠 |
|---|---|
| `AuditEntry` は 16 フィールドで、pageUrl を含む | `src/ai/audit-log.ts:30-47`（`:31-46` が id 〜 durationMs の 16 フィールド、`:37` が pageUrl） |
| `entryBytes` は request + response + 256 のみで、pageUrl を含む残り 14 フィールドは予算外 | `src/ai/audit-log.ts:78-84`（合算は `:81`）。固定 256 は per-entry の JSON オーバーヘッドの近似（`:64-69` のコメント） |
| 予算と件数の上限 | `src/ai/audit-log.ts:11`（`AUDIT_MAX_BYTES = 4_000_000`）、`:4`（`AUDIT_MAX_ENTRIES = 1000`） |
| 予算超過分は古い記録から落ちる | `src/ai/audit-log.ts:58-62`（`pruneEntries`）、`:86-96`（`withinByteBudget`） |
| 保存は get → appendEntry → set の直列化 | `src/ai/audit-log.ts:184-187`（`read`、get は `:185`）、`:189-197`（`record`、`:191` が appendEntry、`:192` が set）、`:180-181`・`:194-195` が直列化のキュー |
| pageUrl は `sanitizePageUrl`（origin + pathname、長さ上限なし）で入る | `src/llm/handle-message.ts:163`、`src/feedback/issue-url.ts:20-27`（origin + pathname は `:23`）、`src/entrypoints/background.ts:63`（`sender.tab?.url` をそのまま渡す） |
| pageUrl は ctx の展開で記録に流れる | `src/ai/audited-classifier.ts:18`（`AuditContext` に pageUrl）、`:47-58`（`record` に展開） |
| 既存テストは request の長さだけで限界を測り、pageUrl を考慮しない | `tests/ai/audit-log.test.ts:36-48`、`:65-107`（`byte budget accounting (UTF-8)` の describe はすべて request のみ。`:45` は `AUDIT_MAX_BYTES - 256 - 3` で境界を作る） |
| TSV に `page_url` 列があり、ヘッダをテストが固定する | `src/ai/audit-log.ts:139-142`（`:140` が page_url）、`tests/ai/audit-log.test.ts:141-143`・`:172-175` |
| ビューアは `list()` が返す記録だけを表示し、記録の失敗は握り潰される | `src/entrypoints/options/audit-section.ts:130-137`、`src/ai/audit-log.ts:199-201`、`src/ai/audited-classifier.ts:59-61` |

## BDD受け入れシナリオ

```gherkin
Scenario: 長い pageUrl の記録が容量計上から漏れない
  Given request と応答が最小の記録がある
  When  pageUrl が長い記録を追加する
  Then  容量計上に pageUrl が反映される
  And   上限を超えた分は古い記録から落ちる

Scenario: pageUrl を含む通常の記録は従来どおり保持される
  Given 通常の長さの request・応答・pageUrl を持つ記録がある
  When  記録を追加する
  Then  従来と同じ順序で保持される
  And   保持期間と記録数の上限の挙動は変わらない

Scenario: 日本語中心の記録の計上結果は変わらない
  Given 日本語中心の request と応答を持つ記録がある
  When  予算ちょうどと 1 バイト超過の境界で記録を追加する
  Then  従来と同じ境界で保持と削除が行われる
```

## 受け入れ基準

- [ ] 容量計上が「保存される記録全体（JSON 化した場合の UTF-8 長）」で測られ、pageUrl を含む全フィールドが計上対象になる
- [ ] request と response を最小にし pageUrl を長くした記録が容量計上に反映される（回帰テストを先に追加して Red を確認してから緑にする）
- [ ] pageUrl を含む記録が予算を超えたとき、古い記録から順に落ちる既存の挙動を維持する
- [ ] 保持期間 7 日・上限 1,000 件の挙動は不変である
- [ ] 日本語中心の request/response に関する既存の境界テスト（UTF-8 計上、混在、サロゲートペア）が変わらず通る
- [ ] 計上の増分コストは追記時に新規記録 1 回分で、既存のメモ化を維持する
- [ ] TSV の列構成（`page_url` を含む）と設定ページビューアの表示に影響しない
- [ ] pageUrl を含む境界のテストが `tests/ai/audit-log.test.ts` に追加されている
- [ ] `make check` が通る

## テスト戦略（t_wadaスタイル: 単体・統合）

### 単体テスト
- `tests/ai/audit-log.test.ts`（`appendEntry` の describe）: request と response を最小にし pageUrl を長くした記録が計上に反映されて落ちること（Red から始める）。pageUrl が予算内の記録は保持されること。pageUrl と日本語中心の request の混在で境界を守ること。pageUrl にサロゲートペアを含む記録が UTF-8 で 4 バイト計上されること
- `tests/ai/audit-log.test.ts`（`byte budget accounting (UTF-8)` の describe）: 既存の境界テストが pageUrl 計上後も同じ結果になること。境界の期待値は pageUrl 分を含めて作り直す

### 統合テスト
- `tests/ai/audit-log.test.ts`（`AuditStore` の describe）: 既存の fake `chrome.storage.local` を使った追記連鎖で、pageUrl 主体の記録の prune が正しく働くこと、append → list で計上が一貫すること
- 保存される状態を JSON 化した全体の UTF-8 長と計上値の合計を比較し、pageUrl 分の過小評価がどれだけかをテストで量る（監査の検証手順 2 に対応）

## 実装アプローチ

- **Outside-In の赤から開始**: まず `tests/ai/audit-log.test.ts` に「request と response を最小にし pageUrl を長くした記録が容量計上に反映される」テストを書いて**失敗を確認する**。現行実装は pageUrl を予算外に置くため、このテストは最初から Red になる
- **Red-Green-Refactor**: `entryBytes` を記録全体の計上に変えて緑にする。既存の境界テストの期待値を作り直して通ることを確認する
- **リファクタリング**: メモ化（`WeakMap`）と TextEncoder の共有を維持したまま、固定 256 の扱いを全体計上に合わせて決める。各レイヤーで緑になるたびに戻り値の意味とコメントを実装と一致させる

## 見積もり

2pt（要チームでの見積もり）

## 技術的考慮事項

- 依存関係: なし。アーカイブ済み PBI `2026-10-10-03-fix-audit-byte-budget.md` の続き（計上単位の文字数 → バイトは済み、pageUrl の抜けを残した）
- テスタビリティ: 既存の `draft()` ヘルパーと fake `chrome.storage.local` で足りる。新しいモック機構は不要
- 非機能要件: 計上は追記時に新規記録 1 回分だけの計測で済み（メモ化）、1,000 件 × 数 KB の合算コストは既存と同程度。CJK 主体の request/response では UTF-8 のバイト長が効く点は既存実装と同じ

## 実装者向け注記

### 現状コードの確認（着手前に実行し、済み）

```bash
sed -n '1,101p' src/ai/audit-log.ts      # 定数（:4, :11）、AuditEntry（:30-47）、pruneEntries（:58-62）、
                                          # entryBytes（:78-84）、withinByteBudget（:86-96）
grep -n "sanitizePageUrl" src/            # → src/feedback/issue-url.ts:20（定義）、src/llm/handle-message.ts:163（呼び出し）
grep -rn "pageUrl" src/entrypoints/       # → src/entrypoints/background.ts:63 / src/entrypoints/options/audit-section.ts:64,84
grep -n "byte budget\|AUDIT_MAX_BYTES" tests/ai/audit-log.test.ts
#   → :36, :44（appendEntry の 2 ケース）、:65（describe）以降はすべて request のみ
```

→ 計上の機構（UTF-8・メモ化・prune）は実装済みで、**未実装なのは「計上を記録全体に広げる」1 点**である。作り直しではなく計上範囲の変更になる。

### 落とし穴

- **この PBI の回帰テストは Red から始まる。** 現行実装は pageUrl を予算外に置くため、「request と response を最小にし pageUrl を長くした記録が容量計上に反映される」テストはまず失敗する。Outside-In の赤として使い、緑にした経過がテスト名から分かるようにする
- **既存の境界テストの期待値は pageUrl を含まない前提で作られている。** `tests/ai/audit-log.test.ts:45`（`AUDIT_MAX_BYTES - 256 - 3`）や `:85-97`（1,333,247、999,482 などの引き算）は、既定の draft の pageUrl（`https://example.com/form`）が計上外であることに依存する。全体計上に切り替えると境界が pageUrl 分ずれて落ちるため、期待値を固定値の引き算で作るやり方を見直すこと
- **メモ化は「記録オブジェクトが不変」であることが前提**（`src/ai/audit-log.ts:74-77` のコメント）。`appendEntry`（`:99`）と `withTraceDefaults`（`:122-129`）は必ず新しいオブジェクトを作るため、現状は維持されている。全体計上に変えるときもこの前提を壊さない
- **JSON 化による全体計上は記録ごとに 1 回**（メモ化で済む）。ただし配列構造とキー名は記録単位の計上に含まれないため、外側の構造分の近似が要る（下記「未決の設計判断」）
- **(b) を採る場合、監査ログの TSV ダウンロードに `page_url` 列があるためダウンロード内容が変わる**（`src/ai/audit-log.ts:140`）。列名・ヘッダを固定する既存テスト（`tests/ai/audit-log.test.ts:141-143`、`:172-175`）は列構成が同じなら通るが、上限内に収まる値を固定するテストを足すこと。ビューア（`src/entrypoints/options/audit-section.ts:64`・`:84`）の表示も変わる
- **予算超過時の挙動（古い記録から落ちる）は維持する。** 落ちた記録は UI に出ない: ビューア（`src/entrypoints/options/audit-section.ts:130-137`）は `list()`（`src/ai/audit-log.ts:199-201`）が返す記録だけを表示し、記録の失敗は `src/ai/audited-classifier.ts:59-61` の catch で握り潰される。計上漏れがあると、表示件数が伸びなくなるだけで利用者には分からない

### 未決の設計判断

- **(b) ingest 時に pageUrl を長さ制限するか。** 入口は `src/llm/handle-message.ts:163` か `src/ai/audited-classifier.ts` 側か。採ると TSV の `page_url` 列の値とビューアの表示が変わるため、BDD シナリオ（「上限を超える pageUrl は入口で有界になる」）と受け入れ基準を足す。推奨は **(a) のみを本 PBI とする**。計上の正しさと入口の有界化は別の懸念で、(b) は記録内容を変えるため範囲が広がる。採る場合は別 PBI として起票する
- **計上の単位をどう定義するか。** 「JSON 化した記録 1 件分の UTF-8 長」は key 名・エスケープ込みで正確だが、配列構造とキー名は別の近似が要る。「全フィールド値の UTF-8 長 + 既存の固定 256」は既存の近似をそのまま使えるが、key 名分が過小になる。どちらにするかは実装時に決めて、`src/ai/audit-log.ts` のコメント（`:64-69`）を実装と一致させる
- **ブラウザ側の未検証の事実**（`chrome.storage.local.set` の実際の課金方式と quota、`sender.tab.url` が populate されるか・切られるか、`history.pushState` で pathname がどこまで伸びうるか）は run-2 監査が未検証として残している（`NEEDS-VALIDATION.md:11`）。本 PBI の計上の正しさはこれらに依存しないが、(b) の上限値を決めるときに参照すること

## Definition of Done

- [ ] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] 回帰テストが先に Red であることを確認してから締めている（テスト名に pageUrl の計上を含める）
- [ ] `make check` が通る
- [ ] 計上の単位が `src/ai/audit-log.ts` の 1 か所に書かれ、コメントが実装と一致している
- [ ] 既存の境界テスト（UTF-8 計上、混在、サロゲートペア、AuditStore の一貫性）が非破壊で通る
- [ ] コードレビュー完了
- [ ] (b) の採否が決定して記録されている（採る場合はシナリオと受け入れ基準を本 PBI に追加、または別 PBI を起票）
