# PBI: egress ゲートの入力修復と、宣言・要求・使用の一致検査（ラウンド台帳）

状態: 未着手（子 PBI 2 件。run-2 セキュリティ監査の所見と 30 のなぜなぜ分析から起票）
起票日: 2026-10-11

## ユーザーストーリー

OpenAI 互換 API を設定する利用者として、保存した接続先が分類のたびに実際に検証された状態で走ってほしい。なぜなら、検証の仕組み自体は実装されているのに、その検証が使うリゾルバへの許可を拡張機能が一度も要求していないため、検証が既定で働いていない可能性があるから。

## 背景

- run-2 セキュリティ監査（`~/security-audit-skill/jushoai/run-2/`）の所見 `jushoai/ai/egress-unverified-verdict-dispatches-fetch` が、未確認の解決結果のまま API キー付きで dispatch される経路を `needs_validation` として残した。決定的な blocker は「DoH リゾルバの origin が host permission として一度も要求されていない」ことである。
- 同監査の 30 のなぜなぜ分析（`WHY-30-EGRESS-FAIL-CLOSED.md`）が、この blocker の意味を確定させた。**fail-closed を要求している成果物はアーカイブ済み PBI 1 件だけ**で、ソースコメント（`src/ai/settings.ts:181-182`、`:251-252`）・`CHANGELOG.md:20`・`site/content/{ja,en}/` の 3 ページ・テスト名は、すべて fail-open を意図的な escape hatch として明記している。つまり判断の正体は「コードのバグ」ではなく、**方針が 4 か所に別々に書かれ、そのうち 1 か所だけが古い**ことである。
- したがって修正は 2 段になる。①検証の入力を成立させ（許可の要求）、方針を fail-closed に揃える。②方針を 1 か所に書き、宣言・要求・使用の食い違いを `make check` が検出する形にする。

## 事実（`0650fbf` 時点で確認済み）

| 事実 | 根拠 |
|---|---|
| リゾルバ origin は要求されていない | `src/ai/settings.ts:130` の `DOH_ORIGIN` を参照するのは `:147` の fetch のみ。要求は `src/entrypoints/options/ai-section.ts:269` の 1 か所、contains は `src/llm/handle-message.ts:57` の 1 か所で、どちらも `originPatternsFor`（provider origin のみを返す）を渡す |
| 宣言と要求が別ファイル・別関心 | `wxt.config.ts:18` は `https://*/*` を optional として宣言するだけ。要求する集合は `src/ai/permissions.ts:21-28` が決める |
| 方針の記録が 4 か所に分散 | アーカイブ済み PBI（fail-closed を要求、`[x]` 済み）／ソースコメント（escape hatch）／CHANGELOG と docs 3 ページ（fail-open を明示）／テスト（`escape hatch` を固定） |
| 3 点照合の検査は存在しない | `tests/build/` は `firefox-manifest.build.ts` のみ。宣言・要求・使用を突き合わせる検査は無い |

## 子 PBI と順位

| 順位 | 施策 | PBI | RICE | type | 根拠 | 依存 |
|---|---|---|---|---|---|---|
| 1 | リゾルバ origin の要求と fail-closed 化 | `2026-10-11-04-fix-egress-resolver-origin-and-fail-closed.md` | 9.0 | fix | 検証が既定で不活性な状態を解消し、方針を要件記録に戻す。影響は API キーと欄メタデータの配送先 | なし |
| 2 | 宣言・要求・使用の一致検査と方針の単一ソース化 | `2026-10-11-05-feat-declaration-request-use-check.md` | 0.5 | feat | 同型の欠陥（制御はあるが入力が届かない）を CI で検出する。利用者には直接届かない | なし（ただし実施順は子 04 の後。下記） |

## 採点の前提

- Reach: 期間（拡張機能のアクティブ利用 1 か月）あたりの相対到達率（1〜100）。全候補を同じ基準で推定
- Impact: 3=圧倒的 / 2=大きい / 1=中 / 0.5=小 / 0.25=極小
- Confidence: 修正が意図どおり効く確信度（%）
- Effort: ストーリーポイント
- RICE = Reach × Impact × Confidence ÷ Effort

子 04 は Reach=10（カスタム base URL を設定する層。悪用には攻撃側の DNS 支配が必要）/ Impact=2 / Confidence=90% / Effort=2 → 9.0。子 05 は利用者に届かない開発工程の施策なので Reach=1（`2026-10-10-07-backlog-dev-toolchain-cves.md` と同じ扱い）/ Impact=1 / Confidence=100% / Effort=2 → 0.5。

## 実施順序の制約（順位と実施順は別）

- 順位は RICE 順だが、**実施は子 04 → 子 05 の順**とする。子 05 の一致検査は子 04 が入るまで Red になり、`make check` を緑に保てないため。子 05 を先に着手する場合（先に落ちるテストを書く Outside-In の形）は、子 04 と同じコミットで緑にすること。
- **子 04 の中にも順序がある: 許可の要求 → fail-closed。** 逆順にすると DoH 未許可のまま分類が全停止し、`0a5372b` が直した wedge を再発させる。
- 子 04 の許可要求は保存時のユーザー操作（`ai-section.ts` の保存ボタン）からしか行えない。`requestHostPermission` は user gesture を要するという既存の制約（`src/ai/permissions.ts:43`）を維持する。

## 受け入れ基準

- [x] 子 PBI 2 件の実装が完了（04: `b709b35`、05: `e8754c5`）。アーカイブは利用者の確認（04 の実機確認・再監査・レビュー最終承認、05 のレビュー最終承認）の後に残る
- [x] `make check` が緑（exit 0、typecheck、79 テストファイル / 1055 passed、build 検査 2 ファイル / 12 passed、両ブラウザ build、manifest 検査、web-ext lint errors 0）
- [x] egress の方針（fail-closed）が 1 か所に書かれ、コード・テスト・docs がそこを参照している（`EGRESS_UNVERIFIED_POLICY` の単一宣言）
- [x] 宣言（manifest）・要求（`requiredHostOrigins`）・使用（fetch 先）の三者が一致していることを `make check` が検証する（`tests/build/host-permission-coverage.build.ts`）
- [x] 監査記録 `jushoai/ai/egress-unverified-verdict-dispatches-fetch` の blocker 1（リゾルバ origin が要求されていない）が解消されている。blocker の再確認は再監査で行う（利用者の作業）
- [x] アーカイブ済み PBI `2026-10-10-04-fix-egress-dns-validation.md` の合格基準 `:49`（fail-closed）が実装と一致する

## テスト戦略（t_wadaスタイル）

- 単体: `tests/ai/permissions.test.ts` に `requiredHostOrigins` の集合を、`tests/ai/egress-dns.test.ts` に到達不能時の block を固定する
- 統合: `tests/options/ai-section-egress-gate.test.ts` に保存経路の hard error を、`tests/ai/http-classifiers.test.ts` に dispatch が起きないことを固定する
- ビルド検査: `tests/build/host-permission-coverage.build.ts` を新設し、`make test-build` に載せる

## 実装者向け注記

### 現状コードの確認（着手前に実行し、済み）

```bash
grep -rn "dns.google" --include=*.ts .        # → src/ai/settings.ts:130 の定義のみ
grep -rn "originPatternsFor\|requestHostPermission\|permissions.request\|permissions.contains" src/
#   → src/ai/permissions.ts:21,44 / src/llm/handle-message.ts:57 / src/entrypoints/options/ai-section.ts:268-269
ls tests/build/                                # → firefox-manifest.build.ts のみ
```

→ リゾルバ origin を要求する箇所、および三者一致の検査は、いずれも**未実装**である。実装済みの検証機構（`createEgressCheck` / `verdictOf` / `validateBaseUrlResolved`）は存在するので、作り直しではなく配線と方針の変更になる。

### 落とし穴

- `originPatternsFor`（`src/ai/permissions.ts:21-28`）に `DOH_ORIGIN` を足すと、`tests/ai/permissions.test.ts:13-16` の `toEqual` が落ちるうえ、関数の意味（provider の origin を返す）が変わる。**別関数 `requiredHostOrigins(s)` を足し、呼び出し 2 か所を差し替える**方を推奨する。
- `handle-message.ts:57` の contains を広げると、リゾルバの許可が無い間は AI 状態が `permission-missing` になる。これは fail-closed として正しい挙動だが、**利用者には「なぜ dns.google への許可が要るのか」が説明されないと混乱する**。設定ページの文言（`site/content/{ja,en}/ai-providers.md`）に理由を書くこと。
- 両方の言語の docs を同時に直すこと。`site/check.ts` が日英のキーと H2 の数的一致を検査し、片方だけ直すと `make site` が落ちる。
- テストに残る escape hatch の記述も方針の記録の一部である。`tests/ai/egress-dns.test.ts:4` の説明コメントと `:309` のテスト名が該当し、`:145`・`:156`・`:391` は `lets ... proceed unverified` という名前で同じ挙動を固定している。fail-closed に合わせて書き換えないと、同じ乖離を作り直す。
- 可用性の副作用を直視すること。許可が通っても、**ネットワーク自体がリゾルバを塞いでいる環境（企業プロキシ等）では fail-closed がクラウド機能を全停止させる**。`0a5372b` が直した wedge はこれである。詳細は子 04 の「未決の設計判断」を参照。

## 見積もり

4pt（子 04 = 2pt、子 05 = 2pt。要チームでの見積もり）

## Definition of Done

- [x] 子 PBI 2 件の全 BDD シナリオが自動テストとして実装されパスする
- [x] `make check` が通る
- [x] 方針（fail-closed）が 1 か所に書かれ、そこからコード・テスト・docs が導かれている
- [ ] 監査記録の blocker が解消され、再監査で確認できる
- [x] ドキュメント更新済み（日英の ai-providers / privacy / troubleshooting、CHANGELOG）
