# PBI: egress 検証結果のキャッシュを per-call に戻す（Service Worker 生涯にわたる 30 秒キャッシュの廃止）

状態: 未着手（run-2 セキュリティ監査の所見 2 `jushoai/ai/egress-ttl-cached-verdict-dispatches-fetch`（`~/security-audit-skill/jushoai/run-2/NEEDS-VALIDATION.md:19-25`）と推奨アクション 3（同 `REPORT.md:74`）から起票）
起票日: 2026-10-11

## ユーザーストーリー

カスタム base URL で OpenAI 互換 API を設定する利用者として、保存した接続先の検証が分類のたびにその時点の解決結果で行われた状態で走ってほしい。なぜなら、検証結果が 30 秒間（Service Worker が生きている間はそれ以上）持ち越されるため、1 回目の検証の後に接続先が内部アドレスへ解決されるように変わっても、窓が切れるまでの分類は API キーと欄メタデータを内部アドレスへすり抜けさせてしまうから。

## 優先度

順位 3 / 全候補 8 件。RICE 8.0（Reach=10（カスタム base URL を設定するクラウド AI 層）/ Impact=2（検証をすり抜ける 30 秒の窓を閉じる）/ Confidence=80%（機構は既存テストで確定、効果も監査の独立検証で確定。ただし SW 生存などのプラットフォーム事実が未確定）/ Effort=2pt）。

根拠: Reach=10 は順位 1（`2026-10-11-04-fix-egress-resolver-origin-and-fail-closed.md`）と同じクラウド AI 層。Impact=2 は「per-call なら捕まる flip を 30 秒許す」窓の修正で、悪用には攻撃側の DNS 支配が必要。Confidence=80% は機構が既存テストで確定（`tests/ai/egress-dns.test.ts:172`、`:183`、`:320`、`:376`）し、per-call 化の効果（内部アドレスを返し始めた flip を後続 dial で捕まえる）も run-2 の独立検証で確定（`REPORT.md:29`）している一方、「Service Worker が 30 秒生存するか」「ブラウザの接続時解決が flip を拾うか」はプラットフォーム事実として未確定（`NEEDS-VALIDATION.md:21`）だから。Effort=2 はキャッシュ 1 つとテスト 4 件の書き換えで、`ResolveDeps` / `HttpDeps.egress` の既存 seam をそのまま使える。

## 背景

- run-2 監査の所見 2: 30 秒キャッシュされた verdict が後続 send の dial 判断そのものになり、per-call TTL（アーカイブ済み PBI の合格基準）なら捕まる flip を 30 秒許す（`~/security-audit-skill/jushoai/run-2/REPORT.md:43` の候補一覧）。run-1 では「split-horizon では per-dial 再解決でも公開アドレスが返る」として棄却されたが、run-2 の Phase 5 独立検証がこれを覆し、needs_validation として再分類された（同 `REPORT.md:29`）。
- 推奨アクション 3 は「TTL を per-call に戻すか、resolve-and-pin を実施する」と二者択一で書き、「PBI `:47` が要求する per-call TTL に合わせるだけでも、キャッシュ由来の 30 秒窓は消える。恒久対策は resolve-and-pin」としている（同 `REPORT.md:74`）。
- アーカイブ済み PBI `2026-10-10-04-fix-egress-dns-validation.md:47` は「解決結果は呼び出しに紐づく TTL でキャッシュされ、1 classify あたりの DNS ルックアップは 1 回に保たれる」と要求した。この文言は「呼び出しに紐づく（per-call）」だが、実装は check インスタンスに紐づく Map で、background が 1 instance per SW lifetime を持つため、窓は classify ではなく SW 生涯にわたる。この乖離は run-2 のレポートも記録している（同 `REPORT.md:89`）。
- キャッシュは意図的な導入である。コメントが「the background owns one instance per SW lifetime, so one lookup per host spans every classify」と明記し（`src/ai/settings.ts:188-190`）、`background.ts` と `handle-message.ts` のコメントも同じ lifetime を明示する（`src/entrypoints/background.ts:23-25`、`src/llm/handle-message.ts:25-27`）、日英 docs も「解決結果は TTL（30 秒）でキャッシュされ」と書く（`site/content/ja/ai-providers.md:29`、`site/content/ja/privacy.md:32`）。つまり修正はバグ直しではなく、意図された可用性コストを順位 1（fail-closed 化）と同じ枠で見直す方針変更である。

## 事実（着手前に再読し、行番号を検証済み）

| 事実 | 根拠 |
|---|---|
| TTL は 30 秒で、解決結果は check インスタンスごとの Map にキャッシュされる | `src/ai/settings.ts:132`（`EGRESS_TTL_MS = 30_000`）、`:191-192`（`createEgressCheck` が既定 `ttlMs` と `Map` を 1 つ持つ） |
| SW 生涯にわたることをコメントが意図として明記する | `src/ai/settings.ts:188-190`（「the background owns one instance per SW lifetime, so one lookup per host spans every classify (including compat retries) until the TTL expires」） |
| キャッシュヒット時は解決し直さず、持ち越したアドレスで送信判断が終わる | `src/ai/settings.ts:199-203`（`hit && hit.expires > now` なら `verdictOf(hit.addresses)` を返す） |
| 解決不能・失敗（empty set）も TTL でキャッシュされる | `src/ai/settings.ts:204-214`（catch した失敗を空配列のまま `:213` で `cache.set` し、「The empty set is cached, so one TTL window pays at most one resolution delay」） |
| background は 1 instance を生成し deps に渡す | `src/entrypoints/background.ts:23-26`（コメント「One gate per SW lifetime」と `const egress = autoEgress()`）、`:61`（`egress,` を deps に渡す） |
| 分類は dial 直前に egress を呼び、キャッシュに当たると実解決をせずに送信判断が終わる | `src/ai/http-classifiers.ts:189-197`（`send` が `:197` で `await this.deps.egress(target)`）、`:199-201`（`!verdict.ok` で block）、`:206`（fetch） |
| 保存時の検証は呼び出しごとに新しい check を生成する（キャッシュは分類経路にだけ効く） | `src/ai/settings.ts:247-250`（`validateBaseUrlResolved` が `createEgressCheck(deps)(lexical.url)` を毎回生成） |
| 既存テスト 4 件が現行のキャッシュ挙動を固定している | `tests/ai/egress-dns.test.ts:172`（「caches resolutions per check instance until the TTL expires」）、`:183`（「caches the unreachable verdict so one TTL window pays one delay」）、`:320`（「costs one lookup per classify including the compat retry」）、`:376`（「shares the egress cache across successive messages through one deps.egress」） |
| アーカイブ済み PBI の合格基準が per-call を要求する（`[x]` のまま乖離が残る） | `pbi/archived/2026-10-10-04-fix-egress-dns-validation.md:47`（「解決結果は呼び出しに紐づく TTL でキャッシュされ、1 classify あたりの DNS ルックアップは 1 回に保たれる」） |
| 内部アドレス直指定・ループバック・公開 IPv4 リテラルは解決なしで判断される | `src/ai/settings.ts:195-198`（loopback / lexical internal / IPv4 リテラルの高速パス） |
| 監査の出典 | `~/security-audit-skill/jushoai/run-2/NEEDS-VALIDATION.md:19-25`（所見 2。`:23` に flip ケースの追加手順）、同 `REPORT.md:29`、`:43`、`:74`、`:89` |

## BDD受け入れシナリオ

```gherkin
Scenario: 2 回目の分類でも接続先を解決し直す
  Given 同じ接続先への分類が 2 回行われる
  When  1 回目の検証の後に接続先が内部アドレスへ解決されるように変わる
  Then  2 回目の分類は送信を行わない
  And   残りの欄はルール分類だけで続く

Scenario: 解決不能の判定も次の分類に持ち越されない
  Given 1 回目の検証で接続先の解決ができなかった
  When  2 回目の分類の前に接続先が内部アドレスへ解決されるように変わる
  Then  2 回目の分類は送信を行わない

Scenario: 解決が回復した接続先には 2 回目の分類で送信する
  Given 分類が 2 回行われ、1 回目の検証で接続先の解決ができなかった
  When  2 回目の分類の前に解決が公開アドレスで回復する
  Then  2 回目の分類は通常どおり送信を行う

Scenario: 内部アドレス直指定やループバックは従来どおり解決なしで判断される
  Given 接続先が内部ネットワークのアドレス直指定である
  When  分類を実行する
  Then  送信は行われず、余分な名前解決も行われない

Scenario: 公開エンドポイントへの連続分類は従来どおり送信する
  Given 公開のエンドポイントが保存済みである
  When  同じ接続先への分類が 2 回行われる
  Then  2 回とも送信が行われ、名前解決も 2 回行われる
```

## 受け入れ基準

- [ ] 分類（dial）ごとに接続先の名前解決が行われ、検証結果が次の分類に持ち越されない（Service Worker 生涯にわたる 30 秒キャッシュの廃止）
- [ ] 1 回目の検証の後に接続先が内部アドレスへ解決されるように変わった場合、2 回目の分類は送信を行わない
- [ ] 1 回目の検証で解決できなかった接続先が、2 回目の分類の前に内部アドレスへ解決されるように変わった場合も、2 回目の分類は送信を行わない
- [ ] 1 回目の検証で解決できなかった接続先が回復した場合、2 回目の分類は送信を行う（解決不能の判定が持ち越されない）
- [ ] 内部アドレス直指定・ループバック・公開 IPv4 リテラルは従来どおり名前解決なしで判断される（既存挙動を維持。`tests/ai/egress-dns.test.ts:96`、`:104`、`:112` の各ケースは変更しない）
- [ ] 現行のキャッシュ挙動を固定する既存テスト 4 件（`tests/ai/egress-dns.test.ts:172`、`:183`、`:320`、`:376`）が、分類ごとに解決し直す期待に書き換わっている
- [ ] キャッシュ機構が `src/ai/settings.ts` から除去され、`EGRESS_TTL_MS` と `ttlMs` 引数の在り方が「未決の設計判断」の決定に沿って反映されている
- [ ] 関連コメント 3 か所（`src/ai/settings.ts:188-190`、`src/entrypoints/background.ts:23-25`、`src/llm/handle-message.ts:25-27`）が per-call の記述に揃っている
- [ ] 日英の `ai-providers.md` と `privacy.md` の「解決結果は TTL（30 秒）でキャッシュされ」の記述が per-call の記述に揃っている
- [ ] `make check` が通る

## テスト戦略（t_wadaスタイル）

### 単体テスト（tests/ai/egress-dns.test.ts に追加・改修）

- 既存のキャッシュ固定 2 件を per-call の期待に書き換える:
  - `:172`「caches resolutions per check instance until the TTL expires」→ 連続呼び出しごとに解決し直す期待へ（TTL 経過の待ち時間が不要になり、テストが速くなる）
  - `:183`「caches the unreachable verdict so one TTL window pays one delay」→ 解決不能の判定が持ち越されない期待へ（回復の 2 面: 回復後に内部なら block、回復して公開なら送信判断が進む）
- flip の新規ケース: fake resolver が 1 回目に公開アドレス・2 回目に内部アドレスを返す形で、2 回目の検証が block になること。監査の所見 2 が求めた regression gate そのものである（`NEEDS-VALIDATION.md:23`）
- 解決不能回復の新規ケース: 1 回目が解決不能・2 回目の前に回復する形で、2 回目が新しい解決結果で判断されること
- loopback・内部直指定・IPv4 リテラルの解決なしパス（`:96`、`:104`、`:112`）は変更しない。fail-closed・escape hatch を固定する `:145`、`:156`、`:309`、`:391` は順位 1（04）の範囲なので触らない

### 統合テスト（tests/ai/http-classifiers.test.ts と tests/ai/egress-dns.test.ts に追加・改修）

- `tests/ai/http-classifiers.test.ts`: `HttpDeps.egress` に「1 回目 ok・2 回目 block」の fake を渡し、2 回目の classify で dispatch が起きないことと fetch が 1 回しか呼ばれないことを固定する（このファイルは現状 egress を渡すテストがないため、dial 前ゲートの断言を補う。`jsonResponse` の流儀に合わせる）
- `tests/ai/egress-dns.test.ts:320`「costs one lookup per classify including the compat retry」→ 互換再試行でも dial ごとに解決する期待へ（fake の `calls` 断言が 2 往復になる。`dohFetch` は `:21-42` でクエリ数を数えられる）
- `tests/ai/egress-dns.test.ts:376`「shares the egress cache across successive messages through one deps.egress」→ 「1 つの deps.egress を共有する」wire の断言は残しつつ、`handleMessage` の連続メッセージでも 2 回解決する期待へ書き換える

## 実装アプローチ

- **Outside-In の赤から開始**: まず利用者に見える挙動（分類 2 回目の送信判断）から。`tests/ai/http-classifiers.test.ts` に「1 回目 ok・2 回目 block の egress で 2 回目の dispatch が起きない」期待を書いて**失敗を確認する**。次に `tests/ai/egress-dns.test.ts` のキャッシュ固定 4 件（`:172`、`:183`、`:320`、`:376`）を per-call 期待に書き換えて**失敗を確認する**
- **Red-Green-Refactor**: 外側の期待が赤のまま `src/ai/settings.ts` の cache 除去で緑にする。リファクタリングでコメント 3 か所・日英 docs・`EGRESS_TTL_MS` と `ttlMs` 引数の在り方を決める
- **実装の最小差分**: `createEgressCheck` から `cache` と TTL 経過判定を落とし、`resolveHostAddresses` の結果をそのまま `verdictOf` に渡す形にする。`EgressCheck` の形と `HttpDeps.egress` の wire（`background.ts:26`、`:61`）は変えない。保存時の `validateBaseUrlResolved` は既に呼び出しごとに新 check を生成しているため、分類が保存時と同じ per-call に揃う

## 見積もり

2pt（要チームでの見積もり）

## 技術的考慮事項

- **実施順序の制約**: 本 PBI（順位 3）を先に実施し、その後に `2026-10-11-10-backlog-resolve-and-pin.md`（順位 4）を実施する。順位 4 が恒久対策（検証済みアドレスへの接続）として成立した場合、本 PBI は「窓を閉じる先手」になる。順位 4 の実装に per-dial の再解決が固有に含まれるなら本 PBI は吸収されうるが、順位 4 が間に合わない間の 30 秒窓を本 PBI が閉じる。この関係は下記「未決の設計判断」にも書いた
- **順位 1（04、fail-closed 化）との順序**: 04 が `verdictOf` の意味論と escape hatch テスト群を変えるため、実施順が前後する場合は期待値の二重改修に注意する。本 PBI が先の場合、04 は per-call を前提に escape hatch 群を書き直すことになる
- **テスタビリティ**: `ResolveDeps` と `HttpDeps.egress` の既存 seam をそのまま使える。新しいモック機構は不要。`dohFetch` fake の `calls` 断言（`tests/ai/egress-dns.test.ts:21-42`）で解決回数を機械的に確かめられる
- **非機能要件（レイテンスの明記）**: キャッシュ廃止により、分類ごとに DoH 往復（A/AAAA の 2 クエリ、タイムアウトは `DOH_TIMEOUT_MS`）が入る。20 欄分割の複数呼び出しでは呼び出しごとに解決するため、DoH のレイテンス分だけ分類が遅くなる。リゾルバが塞がれている環境では分類ごとにタイムアウトまで待つ可能性があり、この可用性コストは順位 1（fail-closed 化）と同じ根である。保存時の検証は既に呼び出しごとに解決しているため、分類と保存の挙動はそろう方向になる

## 実装者向け注記

### 現状コードの確認（着手前に実行し、済み）

```bash
sed -n '128,216p' src/ai/settings.ts   # TTL 定数 / resolveHostAddresses / verdictOf / createEgressCheck のキャッシュ
sed -n '247,259p' src/ai/settings.ts   # 保存時ゲート（validateBaseUrlResolved は呼び出しごとに新 check）
sed -n '20,30p' src/entrypoints/background.ts   # autoEgress() 1 instance / deps への受け渡し
grep -n "egress" src/ai/http-classifiers.ts     # send の dial 前ゲート（:190-201）と autoEgress（:251-254）
grep -n "caches\|costs one lookup\|shares the egress cache" tests/ai/egress-dns.test.ts
#   → :172 / :183 / :320 / :376 が現行のキャッシュ挙動を固定している
```

→ キャッシュは per-instance の Map 1 つ（`src/ai/settings.ts:192`）で、background が 1 instance per SW lifetime を持つ（`src/entrypoints/background.ts:23-26`）。保存時の `validateBaseUrlResolved` は呼び出しごとに新 check を生成するため、キャッシュは分類経路にだけ効いている。作り直しではなく cache 除去とテストの書き換えになる。

### 落とし穴

- **現行のキャッシュ挙動を固定するテストは 4 件ある。** `tests/ai/egress-dns.test.ts:172`（TTL 経過の待ちを含む per-instance キャッシュ）、`:183`（解決不能判定のキャッシュ）、`:320`（互換再試行込み 1 ルックアップ）、`:376`（連続メッセージでのキャッシュ共有）。削除・書き換えになるテストを列挙して 1 つ残さないこと。`:376` は「1 つの deps.egress を共有する」こと自体は正しい wire の事実なので、期待値（fake の `calls`）だけを変える
- **解決不能（empty set）の判定も持ち越されなくなる。** 回復シナリオの両面をテストで固定すること: 回復して公開なら送信する / 回復後も内部なら block する。片方だけだと fail-open・fail-closed の取りこぼしが読めない
- **進行中 PBI 04（fail-closed 化）が egress の挙動を変える。** `verdictOf` の意味論と `:145`、`:156`、`:309`、`:391` の期待が変わるため、実施順が前後する場合は期待値の二重改修に注意する。escape hatch という語を固定する既存テスト名（`:309` 付近）と冒頭コメント（`:4`）は 04 の範囲なので**本 PBI では触らない**
- **loopback・内部直指定・IPv4 リテラルの解決なし高速パス（`src/ai/settings.ts:195-198`）を壊さないこと。** `http://127.0.0.1` のローカル開発パスが死ぬ。per-call 化は「名前解決が要るホスト」にだけ効く
- **遅延の再発を直視すること。** DoH が遅い・塞がれている環境では分類ごとに `DOH_TIMEOUT_MS` まで待つことになる。20 欄分割の複数呼び出しで待ちが繰り返される。順位 4（resolve-and-pin）が恒久対策なので、本 PBI は窓を閉じる先手としてレイテンスを許容するかをチームで確認する
- **fake timers を増やさないこと。** キャッシュ廃止により TTL 経過の待ち（`:178`、`:189` の `setTimeout`）が不要になる。per-call のテストは実タイマーで足りる

### 未決の設計判断

- **キャッシュの廃止と TTL の大幅短縮のどちらにするか。** 推奨は**廃止**（(a)）。アーカイブ済み PBI `:47` の要求（per-call）の字義どおりで、run-2 の独立検証（`REPORT.md:29`）が「per-call なら flip を後続 dial で捕まえられる」と確定させている。大幅短縮（(b)）は窓を狭めるだけで閉じず、必要な TTL を決める実測材料もない
- **`EGRESS_TTL_MS` と `ttlMs` 引数を落とすか残すか。** 推奨は**落とす**。使われない定数と引数は「キャッシュがまだある」という誤解を生み、今回の乖離（アーカイブ済み PBI `:47` と実装の不一致）を再生産する。`EgressVerdict` の `verified` フラグの扱いは 04 の「未決の設計判断」に含まれるため本 PBI では触らない
- **本 PBI と 2026-10-11-10（resolve-and-pin）の吸収関係。** 順位 4 が先に成立し、実装に per-dial の再解決が固有に含まれるなら本 PBI は吸収されうる。ただし順位 4 の主題は「検証済みアドレスへの接続」で、再解決のタイミングが自明ではないため、**本 PBI を先に緑にして順位 4 に統合する**方を推奨する。順位 4 が先に成立した場合は本 PBI を吸収済みとして閉じ、台帳に記録する

## Definition of Done

- [ ] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] `make check` が通る
- [ ] 現行キャッシュ挙動を固定するテスト 4 件（`tests/ai/egress-dns.test.ts:172`、`:183`、`:320`、`:376`）が per-call の期待に書き換わっている
- [ ] コード・テスト・日英 docs から「TTL（30 秒）キャッシュ」の記述が消えている
- [ ] コードレビュー完了
- [ ] リファクタリング完了（`EGRESS_TTL_MS` と `ttlMs` 引数の扱いを決定して反映）
