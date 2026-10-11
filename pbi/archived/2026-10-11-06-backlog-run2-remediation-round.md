# PBI: run-2 監査の残り lead と hardening の対応（ラウンド台帳）

状態: 未着手（子 PBI 8 件。run-2 セキュリティ監査の残り needs_validation 3 件、hardening note、REPORT の推奨アクションから起票）
起票日: 2026-10-11

## ユーザーストーリー

拡張機能の利用者として、プレビューの承認・監査ログ・接続先の検証・リリース経路が「制御はあるのに検証や入力が届かない」状態にならないようにしたい。なぜなら run-2 監査の残り lead は、いずれもソース上は制御の破れが確定しているのに、その帰結がブラウザやリポジトリ設定の事実に依存して未決のまま残っているから。

## 背景

- run-2 セキュリティ監査（`~/security-audit-skill/jushoai/run-2/`）は needs_validation 4 件を残した。1 件（`jushoai/ai/egress-unverified-verdict-dispatches-fetch`）は進行中ラウンド `2026-10-11-03`（子 04・05）が扱う。本ラウンドは残り 3 件（監査ログの pageUrl 会計、egress 30 秒キャッシュ、consent host の CSS/hit-testing）と、hardening note（Gemini 経路の egress 不在、`originPattern` の port 粒度、陳腐化したコメント）、REPORT 推奨アクション 5（リリース経路）を範囲にする。
- 4 件とも severity 未付与。「ソース上は確定、帰結は外部事実に依存」の形で、owner の観測または設計判断で決着する lead である。
- 監査が学んだ「方針の記録が複数箇所に分散し 1 か所だけ古い」事故（`WHY-30-EGRESS-FAIL-CLOSED.md`）を繰り返さないため、本ラウンドの子 PBI は判断の記録を 1 か所に置くことを受け入れ基準に含める。

## 事実（`0650fbf` 時点・起票時に再確認済み）

| 事実 | 根拠 |
|---|---|
| 監査ログの計上は request+response+256 のみで、pageUrl と他 14 フィールドが予算外 | `src/ai/audit-log.ts:30-47`（AuditEntry 16 フィールド）、`:78-84`（entryBytes、合算は :81）。pageUrl は `src/llm/handle-message.ts:163` の `sanitizePageUrl`（origin+pathname、長さ上限なし — `src/feedback/issue-url.ts:20-27`） |
| egress 検証の解決は 30 秒キャッシュされ、後続 dial は再検証しない | `src/ai/settings.ts:132`（EGRESS_TTL_MS）、`:188-216`（per-instance cache。コメント :188-190、Map :192、cache.set :213）。`src/entrypoints/background.ts:26` が SW 生涯で 1 instance。`tests/ai/egress-dns.test.ts:172`・`:183`・`:320`・`:376` が挙動を固定 |
| 検証と実際の接続は別々の名前解決 | `site/content/ja/privacy.md:32`（「完全には排除できません」を明記）。resolve-and-pin の follow-up PBI は存在しない（`pbi/archived/2026-10-10-04-fix-egress-dns-validation.md:79`） |
| 同意 UI の host は非 important の inline CSS のみで、適用前の可視性検証が無い | `src/ui/host.ts:1`（コメントは誤り）、`:5`（cssText）。`src/ui/overlay.ts:8-10`。`src/entrypoints/content.ts:134-152`（onApply、applyPlan は :136） |
| host 権限の pattern は port を落とす（Chrome は port を含められる。Firefox が含められないため、同じコードで両ブラウザを動かす選択） | `src/ai/settings.ts:218-222`。使用は保存した baseUrl に限定されるが、この判断と結果の記録は無い |
| Gemini 経路は egress を渡さず、理由の記録も無い | `src/llm/handle-message.ts:118`、`src/ai/http-classifiers.ts:268-269`。宛先は定数 `src/ai/types.ts:53-54` |
| リリース workflow は environment 承認なし・`--ignore-scripts` なし・`persist-credentials` 未指定 | `.github/workflows/release.yml:7-8`・`:15`・`:24`。pages.yml は environment（`:25-28`）と `--ignore-scripts`（`:40`）を持つ |
| ソースコメントが実装と食い違う箇所が複数ある | `src/ui/host.ts:1`、`src/ai/audit-log.ts:74-76`。settings.ts:167-168 は進行中 04 の範囲 |

## 子 PBI と順位

| 順位 | 施策 | PBI | RICE | type | 根拠 | 依存 |
|---|---|---|---|---|---|---|
| 1 | 同意 UI の隔離と適用直前の可視性検証 | `2026-10-11-07-fix-consent-ui-isolation.md` | 23.3 | fix | プレビュー承認は全利用者の必須経路。最小修正（important 付け＋適用前検証）で破壊経路を閉じる | なし |
| 2 | 監査ログの計上を記録全体に広げ pageUrl を有界化 | `2026-10-11-08-fix-audit-entry-bytes.md` | 18.0 | fix | 機構は実装済みで計上の漏れは確定。回帰テストは Red から始まる | なし |
| 3 | egress verdict キャッシュの per-call 化 | `2026-10-11-09-fix-egress-verdict-cache-ttl.md` | 8.0 | fix | 30 秒窓を閉じる小さな先手。既存テストが現行挙動を固定 | なし（10 の前に実施） |
| 4 | resolve-and-pin の実現可能性と恒久対策の確定 | `2026-10-11-10-backlog-resolve-and-pin.md` | 2.8 | backlog | 10-10-04:79 が follow-up に送ったまま無い。調査と判断の記録が本体 | 09 の後 |
| 5 | host 権限の port 粒度の説明と記録 | `2026-10-11-11-docs-host-permission-port-granularity.md` | 2.25 | docs | Firefox が match pattern に port を含めないため、同じコードで両ブラウザを動かす選択を port 落ちでしている。判断の記録が本体。05 が別 PBI を推奨 | 05 の後が自然 |
| 6 | Gemini 経路の egress 不在の記録 | `2026-10-11-12-fix-gemini-egress-consistency.md` | 1.25 | fix | 実害は無いが判断の記録が無い。05 の検査が視界に入れる | 05・09 の後が自然 |
| 7 | リリース経路の hardening | `2026-10-11-13-feat-release-pipeline-hardening.md` | 0.45 | feat | environment 承認・最小権限・手順の記録。repo settings 側は手作業 | なし |
| 8 | 陳腐化したコメントの是正 | `2026-10-11-14-chore-stale-source-comments.md` | 0.25 | chore | コメントを実装の範囲に。07 と同じ箇所を触る | 07 の後に吸収される可能性 |

## 採点の前提

- Reach: 期間（拡張機能のアクティブ利用 1 か月）あたりの相対到達率（1〜100）。全候補を同じ基準で推定。dev・リリース工程の施策は `2026-10-10-07-backlog-dev-toolchain-cves.md` と同じ Reach=1
- Impact: 3=圧倒的 / 2=大きい / 1=中 / 0.5=小 / 0.25=極小
- Confidence: 修正が意図どおり効く確信度（%）
- Effort: ストーリーポイント
- RICE = Reach × Impact × Confidence ÷ Effort

内訳: 07 = 100×1×0.70÷3、08 = 40×1×0.90÷2、09 = 10×2×0.80÷2、10 = 10×2×0.70÷5、11 = 5×0.5×0.90÷1、12 = 5×0.25×1.00÷1、13 = 1×1×0.90÷2、14 = 1×0.25×1.00÷1。

## 実施順序の制約（順位と実施順は別）

- **着手順の決定（2026-10-11、なぜなぜ分析による）: 既存の子 04 を先に着手し、05 → 07 の順とする。** RICE だけなら 07（23.3）が 04（9.0）に先行するが、順序は次の理由で覆る。①04 は子 05 を Red から解き放つ前提であり、egress 系列（09・10・12）の設計判断（per-call のコスト、受容の記録、Gemini の配線）の根になる依存がある。②04 は 2pt・Confidence 90% で完了時間が読めるのに対し、07 は未決の設計判断 4 件を含み着手から完了までの時間が読めない。③run-2 の 30 のなぜなぜ（`WHY-30-EGRESS-FAIL-CLOSED.md`）が「行動 1: 入力を直す（許可の要求）→ 行動 2: fail-closed → 行動 4: 記録と強制の同期」の行動順を既に導いており、04・05 がまさにそれに相当する。RICE は価値の相対比較であって緊急性の指標ではないため、依存と確実性が順序を覆す。**ただし 07 の未決の設計判断 4 件（top layer の採否、検証の置き場所、中止理由の表示場所、panel を閉じるか）は、04 の実装と並行に先に確定してよい** — 07 が触る `src/ui/` と `src/entrypoints/content.ts` は 04 の `src/ai/` と `src/entrypoints/options/` と完全に分かれているため競合せず、04 完了後の 07 の着手が滞留しない。以下の順序はこの決定を反映する。
- **09 → 10 の順。** 10 が恒久対策として成立した場合、09 は窓を閉じる先手になり、10 が per-dial 解決を固有に含めるなら 09 は吸収される。その判断を 10 の設計判断に記録する。
- **14 は 07 と同じ箇所（host.ts:1）を触る。** 07 を先に実施する場合は 14 が吸収される可能性がある。14 の注記に切り分けを書いた。
- 07・08・13 は依存なし。

## 受け入れ基準

- [ ] 子 PBI 8 件が完了し、アーカイブされる
- [x] `make check` が緑
- [x] run-2 の残り needs_validation 3 件（監査ログの pageUrl 会計、egress 30 秒キャッシュ、consent host の CSS/hit-testing）の blocker が、実装・記録・受容のいずれかで解消される
- [x] 各判断の記録（egress の恒久対策、port 粒度、Gemini の egress 不在）が 1 か所に置かれ、privacy.md（日英）と矛盾しない
- [x] リリース経路の hardening 手順が docs/release.md に記録されている

## テスト戦略（t_wadaスタイル）

- 各子 PBI のテスト戦略に従う。横断の検査は進行中 05 の三者一致検査（宣言・要求・使用）が担う
- 07 の hit-test 検証は jsdom の layout 制約があるため注入依存にし、実機確認は `samples/` で手動（`CLAUDE.md` の手動確認方針）
- 13 の workflow 検査は `tests/build/`（environment: 'node'）に置く案

## 実装者向け注記

### 現状コードの確認（着手前に実行し、済み）

```bash
grep -n "entryBytes" src/ai/audit-log.ts          # → :78-84 の request+response+256 のみ
grep -n "EGRESS_TTL_MS" src/ai/settings.ts        # → :132 の 30 秒。:188-216 が per-instance cache
grep -n "egress" src/llm/handle-message.ts        # → openai は渡し、gemini は渡さない
sed -n 7,24p .github/workflows/release.yml        # → permissions contents: write のみ、persist-credentials 未指定
```

### 落とし穴

- **重要宣言の cascade。** inline `!important` は author stylesheet の `!important` に勝つ（重要宣言での逆転は origin 間のみで、specificity は保持される）。ただし page script による `host.style` の直接書き換えや host 要素の remove は止められないため、適用直前の検証（子 07 の (c)）が実質の防御になる。
- **回帰テストが Red から始まる項目がある。** 子 08 の pageUrl 計上は現行実装が保持しているため、テストはまず落ちる。Outside-In の赤として使う。
- **既存テストが現行挙動を固定している。** 子 09 は `tests/ai/egress-dns.test.ts:172`・`:183`・`:320`・`:376` の書き換えを伴う。進行中 04 も同じファイルの escape-hatch 系テストに触れるため、実施順が前后する場合は期待値の二重改修に注意する。
- **site の日英一致。** 子 11 の文言は `site/content/{ja,en}/` を同時に直さないと `make site` が落ちる。
- **判断の記録は 1 か所。** 子 10・11・12 は「実装しない/直せない」判断を記録する PBI を含む。記録を複数箇所に置くと、監査が指摘した「1 か所だけ古い」事故を再生産する。

## 見積もり

17pt（07=3、08=2、09=2、10=5、11=1、12=1、13=2、14=1。要チームでの見積もり）

## Definition of Done

- [ ] 子 PBI 8 件の全 BDD シナリオが自動テストとして実装されパスする（実機確認を含む項目は手動確認を完了する）
- [x] `make check` と `make site` が通る
- [x] run-2 の残り needs_validation 3 件が再監査で決着できる状態（実装・記録・受容のいずれか）になっている
- [x] ドキュメント更新済み（privacy / ai-providers / release、日英。how-it-works に対象の記述はなく更新不要であることを確認済み）
