# PBI: 監査ログの書き込みと削除を単一コンテキストに集約して競合をなくす

状態: 実装済み（`make check` green。コードレビューはユーザー作業として残す）

## ユーザーストーリー
監査ログを確認・削除する利用者として、「削除」を実行した後に削除したはずの記録が復活したり、削除と同時に走った AI 呼び出しの記録が失われたりしてほしい、なぜなら監査ログは「外部プロバイダに何を送ったか」の証跡であり、勝手に復活・消失する証跡は信頼できないから

## 優先度
- 順位: 6 / 7
- RICE スコア: 1.0（Reach=5 / Impact=0.5 / Confidence=80% / Effort=2pt）
- 根拠: VulnHunter 監査の Code Quality #1。監査ログは設定ページの機能で到達する利用者は限られ（Reach=5）、競合は削除と AI 呼び出しが重なった瞬間だけの狭い窓（Impact=0.5）だが、機構自体は検証済みで修正方針も明確（Confidence=80%）。メッセージ型の追加と配線で 2pt 見積もり

## 背景
- VulnHunter 監査（`JushoAI_VULNHUNT_RESULTS_2026-10-10-051858/phase2b_output.md` の候補 #1 + #8、Gate 2a/3 で排除され Code Quality として採択）で発見。機構は検証済みで、2 インスタンス構成・per-instance キュー・呼び出し元 4/4 の確認まで済んでいる
- background（`src/entrypoints/background.ts:19`）と options ページ（`src/entrypoints/options/audit-section.ts:24`、`src/entrypoints/options/main.ts:293` が defaultDeps のままマウント）が**別々の AuditStore インスタンス**を持つ。background 側は AuditedClassifier の `record` 用、options 側は `list` / `clear` 用
- 直列化は各インスタンスごとの promise キューのみ（`src/ai/audit-log.ts:160`、record は `:174-175`、clear は `:190-191`）。`chrome.storage.local` にトランザクションはないため、**別コンテキスト間の read-modify-write は交差できる**
- 交差すると次の 2 つの破綻が起こる:
  - 復活: `record.read`（entries E を読む）→ `clear.write`（E を消す）→ `record.write`（E + 新規を書く）→ ユーザーが削除した E が storage に復活する
  - 喪失: `clear.read` → `record.write`（E + 新規）→ `clear.write`（空にする）→ 直前の記録が消える
- `src/ai/audit-log.ts:184-186` のコメントは「clear が in-flight の record と競合しても record を失わず、削除後に復活させない」という不変条件を主張するが、これは**単一インスタンス内でしか成立しない**。コンテキストをまたぐと守れない
- 具体的トリガーは現実に存在する: 監査ログページを開いたまま AI 分類が走る状況（`audit-section.ts:109` の「Always available: a new AI call can land while this page stays open.」コメントが想定している状況そのもの）
- 制約: 監査セクションの UX（件数表示・削除確認ダイアログ・TSV ダウンロード・再読み込みボタン、`audit-section.ts:103-148`）は不変。記録失敗時もフォーム入力を止めない既存挙動（`src/ai/audited-classifier.ts:59-61`）を維持。メッセージ経由にする場合は `src/messages.ts` の閉語彙シェイプ（`parseRequest` が `keys.length` で余分なキーを拒否する形、`src/messages.ts:109-124`）に従い、`sender.id` ゲート（`src/entrypoints/background.ts:36`）の配下に置く

## BDD受け入れシナリオ
Scenario: record と clear の交差でエントリが復活しない
  Given 監査ログに記録が保存されている
  When options ページで「ログを削除」を実行し、削除の書き込みの前後で background 側の record が交差する
  Then storage の最終状態に削除対象のエントリは残らない
  And 書き込みは単一の直列化点を通るため read-modify-write の交差が起こらない

Scenario: record と clear の交差で直前の記録が失われない
  Given 削除の実行とほぼ同時に AI 分類が走る
  When clear が完了するまで待つ
  Then clear の開始以降に書かれた記録が最終状態に残る（clear の直列化順序に従う）

Scenario: 監査セクションの既存操作は従来どおり
  Given 監査ログに複数の記録がある
  When 件数表示・TSV でダウンロード・ログを削除・最新のログを読み込むをそれぞれ使う
  Then どの操作も修正前と同じ表示・同じ結果になる

Scenario: 記録の失敗はフォーム入力を止めない
  Given 監査ログの保存先に障害がある
  When AI 分類が失敗も含めて 1 呼び出し 1 記録を試みる
  Then 記録の失敗が分類の結果に影響せず、フォーム入力は続行する

## 受け入れ基準
- [x] 監査ログへの書き込み（`record`）と削除（`clear`）が単一の直列化点（background の AuditStore キュー）を通る
- [x] options ページの削除は runtime メッセージ経由で background の AuditStore に委譲され、options 側に AuditStore インスタンス（書き込み経路）が残らない
- [x] `record` と `clear` の交差をシミュレートしても、削除済みエントリの復活も直前記録の喪失も起こらない
- [x] 監査セクションの既存 UX（件数表示・削除確認ダイアログ・TSV ダウンロード・再読み込み）が不変で、既存テストも green のまま
- [x] 新メッセージ型が `parseRequest` の閉語彙シェイプ（単一キー、余分なキーは null）に従い、`sender.id` ゲートの配下で処理される
- [x] 記録失敗時もフォーム入力を止めない挙動（`audited-classifier.ts:59-61`）と、削除失敗時の「ログを削除できませんでした。」表示（`audit-section.ts:141`）が維持される

## テスト戦略（t_wadaスタイル）
- 単体: `tests/ai/audit-log.test.ts` に交差の回帰テストを追加。既存の chrome モック（`:157-166`、`set` が `await Promise.resolve()` で yield するため未直列化の read-modify-write が交差する）を使い、修正前は「2 インスタンスで record と clear を `Promise.all` で走らせると復活/喪失する」ことを先にレッドで固定する。`tests/messages.test.ts` に新メッセージ型の parse ケースを追加する
- 統合: `tests/entrypoints/audit-section.test.ts` に削除がメッセージ経由で委譲されるケースを追加し、監査セクションの既存操作（ダウンロード・削除・再読み込み）が壊れないことを検証する。`tests/entrypoints/handle-message.test.ts` に background が audit-clear を受けて `AuditStore.clear()` を呼ぶケースを追加する

## 実装者向け注記
### 現状コードの確認（着手前に実行済み）
- `src/ai/audit-log.ts:158-193` が AuditStore。`:160` に per-instance の promise キュー、`record` は `:169-177`（`:174-175` で直列化）、`clear` は `:183-193`（`:190-191` で直列化）。`:184-186` のコメントが主張する不変条件は単一インスタンス内でのみ成立する。clear は `nextId` を保持して id を再利用しない（`:188`）
- `src/entrypoints/background.ts:19` が background 側のインスタンス（handleMessage の deps 経由で AuditedClassifier の `record` に使われる）。`:34-36` の `sender.id` ゲートが全メッセージの入り口で、`:37-40` に `open-options` の直処理の前例がある
- `src/entrypoints/options/audit-section.ts:24` が options 側のインスタンス（`defaultDeps` 内）。`main.ts:293` が `mountAuditSection(auditPage)` を deps 未指定で呼ぶため注入されていない。削除ハンドラは `:139-142` で `deps.store.clear()` を呼び、失敗時に「ログを削除できませんでした。」を表示。`:5-10` の deps 型は `Pick<AuditStore, 'list' | 'clear'>`。`:30` のコメントの方針で純粋ヘルパーは store 非依存
- `src/messages.ts:109-124` の `parseRequest` が `keys.length` チェックで閉語彙を強制し、余分なキー付きのメッセージは null になる
- `src/ai/audited-classifier.ts:59-61` の catch が記録失敗を握りつぶしてフォーム入力を止めない
- `tests/ai/audit-log.test.ts:153-187` に AuditStore の既存テスト。`:162` の chrome モックの `set` が yield するため交差の再現にそのまま使える

### 実装手順
1. 先にレッド: `tests/ai/audit-log.test.ts` に「別々の AuditStore インスタンスの record と clear が交差すると復活/喪失する」再現テストを書き、現状では破綻することを確認する
2. `src/messages.ts` の `AiRequest` に `{ type: 'audit-clear' }`（単一キー）を追加し、`parseRequest` に `keys.length === 1` の分岐を足す。`tests/messages.test.ts` に parse ケースを追加する
3. background で audit-clear を受けて `AuditStore.clear()` を呼び、成功/失敗を sendResponse する。配置は `background.ts` の直処理（`open-options` の前例）か `llm/handle-message.ts` の deps 経由かを選ぶ。どちらも `sender.id` ゲートの配下に来ることを確認する
4. options 側は `main.ts` で messaging-backed の `clear` を deps に注入する（`mountAuditSection` のシグネチャと `AuditSectionDeps` は変えずに済む形が望ましい）。`list` は読み取り専用で競合の原因にならないため options ローカルのままでよい（書き込みだけ単一化するのが最小変更）
5. 交差テストを委譲後の構造に合わせて green にする（下記落とし穴参照）。監査セクションの既存テストも更新が必要か確認する
6. `make test` で全テスト green、必要なら `make check` まで

### 落とし穴
- 修正後は「2 インスタンスの交差」自体が構造的に成立しなくなる: 交差テストは「options 側の書き込み経路が消えた」ことで green になる。テストの読み替えは「複数の record と 1 つの clear が単一キューで交差しても復活/喪失しない」形にする。レッド段階だけ 2 インスタンスで再現し、グリーン段階のテスト構成を実装前に決めておくこと
- `AuditSectionDeps` の型は `Pick<AuditStore, 'list' | 'clear'>`: messaging-backed オブジェクトはこの形状を満たせばよく、`AuditStore` インスタンスである必要はない。型を緩めるときは `list` まで background 経由にするかどうかを最初に決める（本 PBI の最小変更は clear のみ委譲）
- Firefox は background が event page: runtime メッセージは event page を起床させるので委譲は機能する。AuditStore の状態は `chrome.storage.local` にあり in-memory の `authFailed` / `compat` とは無関係なので、event page の再起動前提は崩さない
- `parseRequest` は `keys.length === 1` を強制する: `{ type: 'audit-clear', ... }` のように将来キーを足すと null になる。拡張するなら `parseSchedule`（`src/messages.ts:99-107`）と同様の分岐追加が必要
- `clear` の `nextId` 保持（`audit-log.ts:188`）と id 再利用防止の既存テスト（`tests/ai/audit-log.test.ts:174-186`）を壊さないこと
- 記録失敗の握りつぶし（`audited-classifier.ts:59-61`）と削除失敗表示（`audit-section.ts:141`）を維持すること。メッセージ経由の clear が失敗した場合も同じ表示を出す
- 代替案（採用しなかった側の選択肢として把握しておく）: `chrome.storage.local` に version を導入して compare-and-set で clear と record のインターリーブを検知・再試行する方法。単一コンテキスト化の方が書き込み経路が 1 つになり構造的に単純なため、本 PBI は委譲を主案とする

## 見積もり
2pt（要チームでの見積もり）

## Definition of Done
- [x] record と clear の交差の回帰テスト（単体 + メッセージ委譲の統合）が green で、監査セクションの既存テスト（ダウンロード・削除）も不変
- [x] `make check` が通る
- [x] グラフの更新（`graphify update .`）まで完了している
