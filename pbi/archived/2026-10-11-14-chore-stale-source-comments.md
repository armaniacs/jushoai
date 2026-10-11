# PBI: 実装と食い違うソースコメントを是正する

状態: 未着手（run-2 セキュリティ監査の hardening メモ「ソース内のコメントが実装と食い違う」から起票）
起票日: 2026-10-11

## ユーザーストーリー

保守担当者として、ソース内のコメントが実装が保証する範囲を正確に述べてほしい。なぜなら、実装と食い違うコメントは「コメントを正」とする誤った修正（実装をコメントに合わせて境界を弱める、保証を追加する、等）を誘発し、半年後の保守で境界の強度を下げる判断をさせかねないから。

## 優先度

順位 8 / 全候補 8 件。RICE 0.25（Reach=1（開発工程。dev 工程の施策は Reach=1 が本 repo の基準。`2026-10-10-07-backlog-dev-toolchain-cves.md` と同じ扱い）/ Impact=0.25（コメントの誤り。保守の判断を誤らせるリスクは低い）/ Confidence=100%（事実は確定）/ Effort=1）。根拠: 実行時の挙動は変わらず、影響は将来の保守判断。ただし host.ts:1 は UI 隔離というセキュリティ境界の説明が食い違っているため、放置すると「コメントを正とする」修正の入口になる。依存なし。host.ts の部分は進行中 PBI 07（`2026-10-11-07-fix-consent-ui-isolation.md`）に吸収されうる（下記「落とし穴」）。

## 背景

- run-2 セキュリティ監査（`~/security-audit-skill/jushoai/run-2/REPORT.md:88`、「参考: hardening メモと前向きな知見」節）が「ソース内のコメントが実装と食い違う箇所が複数ある。コメントを正とする判断は避けるべきである」と指摘した。挙げられた 3 箇所のうち、`src/ai/settings.ts:167-168` は進行中 PBI 04 の範囲なので本 PBI では扱わず、`src/ui/host.ts:1` と `src/ai/audit-log.ts:74-76` の 2 箇所を是正する。
- 同監査の別の hardening メモが「方針の記録と方針の強制は別物」であることを指摘している。コメントに方針を書くと、実装が変わったときにコード・テスト・docs は更新されてもコメントだけが残る。したがって是正は 2 つの方向で行う: ①コメントを実装が保証する範囲の記述に直す（何を保証しないかも正確に）、②方針を主張する文言（〜すべき、fail-closed である、等）はコメントに置かず、docs または PBI に置く。
- host.ts:1 の誤りは進行中 PBI 2026-10-11-07（同意 UI の隔離）の背景事実でもあるため、07 との切り分けが必要である（下記「落とし穴」）。

## 事実（表。file:line 根拠つき）

| 事実 | 根拠 |
|---|---|
| `src/ui/host.ts:1` のコメント前半（closed root が page CSS を防ぐ）は実装と食い違う | コメントは `src/ui/host.ts:1`。`:6` の `attachShadow({ mode: 'closed' })` が隠すのは shadow root への参照であり、`:3` の host 要素は light DOM に置かれる。`:5` の `host.style.cssText` と `src/ui/overlay.ts:8-10` の `host.style` は非 important のため、page 側の author `!important` に負ける。後半（page scripts が UI を読めない）は closed の実際の効果で正しい。shadow tree の内側への page CSS 適用は closed とは無関係のスコープで防がれる。使用箇所は `src/ui/overlay.ts:7` と `src/ui/button.ts:34` |
| `src/ai/audit-log.ts:74-76` の sizeCache コメントは主張する範囲が過大 | コメントは `src/ai/audit-log.ts:74-76`、WeakMap は `:77`、`entryBytes` は `:78-84`。in-memory の `appendEntry`（`:98-101`）は既存 entry の参照を保持するため、メモ化の主張は in-memory では成立する。ただし保存は `:185` の `chrome.storage.local.get` → `:186` の `normalizeAuditState`（`:122-129` の `withTraceDefaults` が全 entry を新オブジェクトに作り直す）→ `:192` の `chrome.storage.local.set` を経由し、`record` は `:191` で毎回 `read()` から始まるため、storage 往復をまたぐと entry の identity は保持されずメモ化は hit しない |
| `src/ai/settings.ts:167-168` は本 PBI の対象外 | `:167-168` は fail-closed と書いて、`:175-177` のとおり fail-open（a dial proceeds anyway）の挙動。進行中 PBI `2026-10-11-04-fix-egress-resolver-origin-and-fail-closed.md` の実装手順 7 が同一箇所を扱う |
| run-2 監査の指摘 | `~/security-audit-skill/jushoai/run-2/REPORT.md:88`（「参考: hardening メモと前向きな知見」節）。3 箇所を挙げ、「コメントを正とする判断は避けるべきである」と述べる |

## BDD受け入れシナリオ

```gherkin
Scenario: コメントが実装の範囲を正確に説明する
  Given 是正対象のコメント（src/ui/host.ts:1 と src/ai/audit-log.ts:74-76）を読む
  Then  何を保証しないかも含めて、実装が保証する範囲だけを述べている
  And   実装が保証しない範囲を保証と述べていない

Scenario: 方針の主張がコメントに残らない
  Given 是正後のソースを確認する
  Then  是正対象のコメントは方針を主張せず、実装の説明にとどまる
  And   起こすべき挙動を要求する文言（〜すべき、fail-closed である、等）が是正対象のコメントに無い
```

文書修正のため自動テストにはしない。レビュー時の確認手順として使う。

## 受け入れ基準

- [x] `src/ui/host.ts:1` のコメントが、closed root が保証する範囲（page scripts からの shadow root 参照の遮断）と、host 要素が light DOM に置かれ page CSS の対象であること（`host.style` が author `!important` に負けること）を、正確に述べている
- [x] `src/ai/audit-log.ts:74-76` のコメントが、メモ化が in-memory の append の間でのみ hit し、`chrome.storage.local` の往復（`src/ai/audit-log.ts:185-192`）をまたぐと entry の identity が保持されない旨を、正確に述べている
- [x] 是正後のコメントに、パフォーマンスの意図（hot path での再計測の回避）が残っている
- [x] 是正後のコメントに、方針を主張する文言（〜すべき、fail-closed である、等）が無い
- [x] 本 PBI の対象外（`src/ai/settings.ts:167-168`）が変更されていない
- [x] 実装コード・テスト・docs が本 PBI で変更されていない（コメントのみの変更）
- [x] `make check` が通る

## テスト戦略（文書修正のため対象外）

- 本 PBI はコメントのみの変更であり、テスト対象外である。テストは存在しない（`tests/ui/` と `tests/ai/` の既存テストは挙動を固定するもので、コメント変更で落ちない）。
- 検証は次の 2 点だけ: ①是正後コメントの目視確認（BDD シナリオ 2 件を確認手順として使う）、②`make check` が緑であること。
- テストの追加・変更は行わない。`tests/ui/overlay.test.ts:7-17` が closed root の script 側（`host.shadowRoot` が null）をすでに固定しており、是正コメントの後半と整合する。

## 実装アプローチ

- Outside-In / Red-Green-Refactor は適用しない。テストを先に書けない文書修正のため、手順は「コメントの置換 → 方針語が残っていないことの grep 確認 → `make check`」の 3 段。
- 是正箇所の一覧:

| file:line | 現行の文言 | 是正後の趣旨 |
|---|---|---|
| `src/ui/host.ts:1` | 「A closed shadow root keeps page CSS out and keeps page scripts from reading the UI.」 | closed root が保証するのは page scripts からの shadow root 参照の遮断のみ。host 要素は light DOM に置かれ、page CSS（author `!important` を含む）の対象のまま。shadow tree の内側への page CSS 適用は closed の効果ではない |
| `src/ai/audit-log.ts:74-76` | 「entries are immutable and keep identity across appends, so re-measuring … each append only encodes the new entry.」 | メモ化が効くのは in-memory の append の間だけ。AuditStore の保存経路（get → normalize → set）は毎回 entry を新オブジェクトに作り直すため、storage 往復をまたぐと identity は保持されず、保持された log は次の append で再計測される。hot path での再計測回避という意図はそのまま残す |

- 是正例（英語。既存コメントのスタイルに合わせる。文言は実装者が精査してよい）:

```ts
// A closed shadow root keeps page scripts from obtaining the shadow root, so
// they cannot read or mutate the UI inside it. It does not keep page CSS out:
// the host element itself stays in the light DOM, where page CSS applies to it
// (an !important rule overrides the non-important inline reset on the host).
// Isolation of the tree's contents from page stylesheets is shadow DOM
// scoping, which open mode provides as well.
```

```ts
// Sizes are memoized per entry object, so the retained log is measured once
// per entry for objects that keep identity in memory: appendEntry keeps the
// existing entry objects and adds one, so each append only encodes the new
// entry (pruned entries are measured twice). AuditStore.record() re-reads the
// state from chrome.storage.local and normalizeAuditState rebuilds every
// entry, so identities do not survive a storage round-trip and the retained
// log is re-measured from scratch on the next append.
```

## 見積もり

1pt（要チームでの見積もり）

## 技術的考慮事項

- 依存関係: host.ts:1 は進行中 PBI 2026-10-11-07（同意 UI の隔離）と同じ箇所。audit-log.ts は依存なし
- テスタビリティ: 対象外（文書修正）。`make check` の typecheck と build がコメントのみの変更で落ちないことだけを確認する
- 影響範囲: 実行時の挙動は変わらない。`docs/superpowers/plans/2026-10-03-jushoai.md:2085` に同じ誤った文言が残るが、履歴として残る実装計画であり変更しない

## 実装者向け注記

### 現状コードの確認（着手前に実行し、済み）

```bash
sed -n '1,8p' src/ui/host.ts            # :1 のコメント、:5 の非 important な inline style、:6 の closed
sed -n '70,101p' src/ai/audit-log.ts    # :74-76 の sizeCache コメント、:77 の WeakMap、:98-101 の appendEntry
sed -n '184,197p' src/ai/audit-log.ts   # :185 の get、:186 の normalize、:191 の read から始まる append、:192 の set
sed -n '165,178p' src/ai/settings.ts    # :167-168 の Fail-closed コメント（本 PBI では触らない）
grep -rn "keeps page CSS out" src/ docs/  # → src/ui/host.ts:1 と docs/superpowers/plans/2026-10-03-jushoai.md:2085
grep -rn "keep identity" src/             # → src/ai/audit-log.ts:74
```

→ 是正が必要なのは 2 箇所。host.ts:1 の後半（page scripts が UI を読めない）と audit-log.ts のメモ化の意図は正しく、前半と範囲の記述だけを直す。なお `tests/e2e/harness.ts:161` が「WebDriver can still reach them through the host element」と記しており、closed root の遮断が参照ベースであることとは整合する。

### 落とし穴

- **host.ts:1 の是正は進行中 PBI 2026-10-11-07（同意 UI の隔離）と同じ箇所を触る。** 07 が host 要素の露出（page CSS が host に効く）を背景事実として扱うなら、07 の実装でコメントが書き直る可能性がある。07 を先に実施する場合は本 PBI の host.ts 部分が 07 に吸収されるため、着手前に台帳（`00-INDEX.md`）と PBI 07 の状態を確認し、吸収されるなら本 PBI を audit-log.ts のみに縮小して host.ts の是正を 07 の受け入れ基準に足す。07 が本 PBI より後なら、本 PBI で 2 箇所とも直す
- **audit-log.ts のメモ化コメントは、パフォーマンス意図（hot path での再計測の回避。`:70-71` の encoder 共有も同じ意図）自体は正しい。** 意図を消さずに範囲を正確にすること。「メモ化は効かない」といった書き方にすると、次に読む人が意図を疑って WeakMap ごと消しかねない
- **host.ts の是正で「page CSS は shadow tree に効かない」と書きすぎないこと。** `all: initial`（`src/ui/overlay.ts:15`、`src/ui/button.ts:16`）は custom properties をリセットしないため、page が設定した custom properties は host 境界を越えて継承する。是正コメントが再び実装より広い保証を述べると、run-2 の指摘を再生産する
- **`docs/superpowers/plans/2026-10-03-jushoai.md:2085` に同じ誤った文言が残るが、変更しない。** 履歴として残る実装計画であり、アーカイブ済み PBI を触らないのと同じ判断（PBI 04 の落とし穴も参照）
- **コメントは既存のスタイルに合わせて英語で書く。** 和訳しない
- **`src/ai/settings.ts:167-168` を一緒に直さないこと。** PBI 04 の実装手順 7 が同一箇所を扱い、先に直すと PBI 04 の差分が読めなくなる

### 未決の設計判断

- **host.ts:1 の是正を本 PBI と PBI 07 のどちらで行うか。** 07 が同意 UI の隔離として host 要素の露出を扱うなら、07 側でコメントと実装を同時に変える方が乖離が残らない。推奨は「本 PBI は host.ts と audit-log.ts の両方を対象に起票しておき、着手時の 07 の状態で縮小する」
- **是正コメントに custom properties の継承（page 側で設定した値が host 境界を越えて入る）まで書くか。** 書くと正確だが長くなる。推奨は host 要素への page CSS 適用（author `!important` が `host.style` に勝つこと）までを本文に書き、custom properties の継承は「page CSS は効かない」という書き方を避ける根拠として落とし穴に置く（本文には書かない）

## Definition of Done

- [x] 是正箇所の一覧の 2 箇所（`src/ui/host.ts:1`、`src/ai/audit-log.ts:74-76`）のコメントが、実装が保証する範囲の記述に置き換わっている
- [x] 是正後のコメントに方針の主張が無く、BDD シナリオ 2 件の確認で合格している
- [x] 本 PBI の対象外（`src/ai/settings.ts:167-168`）が変更されていない
- [x] 実装コード・テスト・docs が本 PBI で変更されていない（コメントのみ）
- [x] `make check` が通る
- [ ] コードレビュー完了

### 実装の記録（2026-10-11）

- 範囲の縮小: `host.ts:1` は PBI-07 が是正済み（「Page CSS still reaches this host element in the light DOM」＋ important 化と同時）のため本 PBI に吸収されず、本 PBI は `audit-log.ts` のみに縮小。PBI 本文の未決判断の推奨どおり
- 実装: `audit-log.ts:74-76` を in-memory 限定の記述に置換（appendEntry は既存オブジェクト保持＋1 件追加で新規のみ計測、record の get→normalize→set で identity は storage 往復をまたがない）。hot path 意図は `:70-71` の encoder 共有と合わせて残存。方針語なし（grep 確認）。`settings.ts:167-168` 無変更（diff 確認）。本 PBI の差分はコメントのみ（同ファイルの別 hunk は PBI-08 の計上範囲変更に伴うコメント整合で、コード行の変更なし）
- 検証: `tests/ai/audit-log.test.ts` 39 passed、`tsc --noEmit` exit 0
- ユーザーの作業として残る項目: `make check` フル実行（最終検証で実施）、コードレビューの最終承認
