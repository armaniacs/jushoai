# PBI: 宣言・要求・使用の一致検査を `make check` に入れ、egress の方針を単一ソースにする

状態: 未着手
起票日: 2026-10-11
親: `2026-10-11-03-backlog-egress-gate-round.md`（順位 2）

## ユーザーストーリー

この拡張機能を保守する開発者として、manifest が宣言するオリジン・コードが要求するオリジン・実際に fetch するホストの食い違いを `make check` で検出したい。なぜなら、ダイヤル時の検証が「実装されているのに既定で働いていない」状態が、テストがすべて緑のまま 3 コミットぶん残っていたからである。制御の有無はコードで分かるが、制御の入力が届くかは誰も見ていなかった。

## 優先度

順位 2 / RICE 0.5（Reach=1 / Impact=1 / Confidence=100% / Effort=2pt）。根拠: 利用者に直接届かない開発工程の施策なので Reach を 1 とする（`2026-10-10-07-backlog-dev-toolchain-cves.md` と同じ扱い）。同型の欠陥を CI で検出する。依存なし。ただし実施は子 04 の後（検査は子 04 が入るまで Red になるため。先に着手する場合は子 04 と同一コミットで緑にする）。

## 背景

- run-2 監査の 30 のなぜなぜ分析（`~/security-audit-skill/jushoai/run-2/WHY-30-EGRESS-FAIL-CLOSED.md`）の根因は「**方針を記録する成果物と方針を強制する成果物が分離し、同期の担い手が人間の記憶だけ**」である。egress の fail-open は、ソースコメント・`CHANGELOG.md:20`・docs 3 ページ・テスト名の 4 か所で意図として明記されていた一方、fail-closed を要求したアーカイブ済み PBI `2026-10-10-04-fix-egress-dns-validation.md:49` は `[x]` のまま更新されず、その乖離を検出する仕組みが無かった。
- 同じ形の欠陥が他にもある。`originPattern`（`src/ai/settings.ts:219-222`）は port を落とすため、1 つの port への同意が同一 host の全 port への許可になる。Gemini 経路は `createGeminiClassifier`（`src/ai/http-classifiers.ts:268-269`）に egress を渡さない（宛先が compile-time 定数なので実害は無いが、その判断はどこにも記録されていない）。いずれも「宣言・要求・使用」を突き合わせれば視界に入る。
- したがって本 PBI は、**三方の一致と方針の単一ソースを、`make check` が検証する形にする**。個別の欠陥を潰すのではなく、この種の乖離が緑のまま残らないようにする。

## BDD受け入れシナリオ

```gherkin
Scenario: 要求集合からリゾルバの origin が抜けると検査が失敗する
  Given クラウドプロバイダを設定した利用者を表すサンプル設定がある
  When  要求集合からリゾルバの origin を外す
  Then  一致検査は失敗し、どの origin が要求されていないかを示す

Scenario: 宣言・要求・使用が揃っていれば検査が通る
  Given 接続先の origin とリゾルバの origin が要求集合に含まれている
  When  一致検査を実行する
  Then  検査は通り、ビルドと manifest の検査も緑のままである

Scenario: manifest の宣言が要求集合を下回ると検査が失敗する
  Given manifest の optional_host_permissions がリゾルバの origin を包含しない
  When  一致検査を実行する
  Then  宣言と要求の食い違いとして検査が失敗する

Scenario: 方針の宣言と実際の挙動が食い違うと検査が失敗する
  Given 方針は「確認できない解決結果ではダイヤルしない」と宣言している
  When  リゾルバに到達できない条件でゲートを評価する
  Then  ゲートは拒否を返し、宣言と挙動が一致していると判定される
```

## 受け入れ基準

- [x] `tests/build/host-permission-coverage.build.ts` が追加され、`make test-build`（`npm run test:build`）で実行される
- [x] fetch 先の一覧をテスト内に書き写さず、コードから import して 1 か所から取っている（新しい fetch 先を足したときに検査が追随する）
- [x] クラウドプロバイダ（openai / gemini）について「fetch 先の集合 ⊆ 要求集合」を断言している
- [x] リゾルバの origin を要求集合から外すと検査が落ちることを、実際に外して確認している
- [x] `none` / `built-in` では要求集合が空であることを断言している（ネットワークを使わないプロバイダに許可を求めない）
- [x] Chrome と Firefox の両方の `dist/*/manifest.json` について、宣言が要求集合を下回らないことを断言している
- [x] egress の方針が `src/ai/settings.ts` の 1 か所に宣言され、ゲートの実挙動がその宣言と一致することを断言している
- [x] `make check` が通る

## テスト戦略（t_wadaスタイル）

### ビルド検査（本 PBI の本体）
- `tests/build/host-permission-coverage.build.ts`: 三方一致（宣言 / 要求 / 使用）と方針の単一ソース。`environment: 'node'`（`vitest.build.config.ts`）で動く
- 既存の `tests/build/firefox-manifest.build.ts` と同じく `dist/*/manifest.json` を読む。`make test-build` は `build` に依存するので manifest は存在する

### 単体テスト
- 方針の挙動そのものは `tests/ai/egress-dns.test.ts`（子 04）が固定する。本 PBI は重複を避け、**宣言と挙動の一致**だけを検査する

### 退行の確認
- 検査を入れた後、`requiredHostOrigins` から `DOH_ORIGIN` を一時的に外して落ちることを確認してから戻す（検査が形骸化していないことの確認）

## 実装アプローチ

- **Outside-In**: まず一致検査を書いて現状 Red を確認する。子 04 が入っていれば緑になる。単独で先に着手する場合は、子 04 と同じコミットで緑にする
- **Red-Green-Refactor**: 検査 → 実装 → 検査が通る、の順。検査自体が「常に緑」になっていないかを、意図的に壊して確認する

## 見積もり

2pt（要チームでの見積もり）

## 技術的考慮事項

- 依存関係: 子 04（`requiredHostOrigins` と方針の単一ソースが入っていること）
- テスタビリティ: `tests/build` は `environment: 'node'` で `chrome` が存在しない。`src/ai/settings.ts` と `src/ai/permissions.ts` は module scope で `chrome` に触れない（`chrome.permissions` は既定引数なので呼び出し時に評価される）ため、`DOH_ORIGIN` / `originPatternsFor` / `requiredHostOrigins` は安全に import できる。`hasHostPermission` などを呼ぶと落ちるので呼ばない
- 非機能要件: 検査は純粋関数と `dist/` の読み取りだけで完結し、ネットワークに出ない。ビルド時間への影響は無視できる

## 実装者向け注記

### 現状コードの確認（着手前に実行し、済み）

```bash
ls tests/build/                                # → firefox-manifest.build.ts のみ（一致検査は未実装）
cat vitest.build.config.ts                     # → include: ['tests/build/**/*.build.ts']
grep -n "test-build" Makefile                  # → build build-firefox の後に npm run test:build
grep -rn "dns.google" --include=*.ts .         # → src/ai/settings.ts:130 の定義のみ
```

→ 三方一致の検査は**未実装**。`Makefile` と `vitest.build.config.ts` の既存の配線に乗るので、追加の設定変更は不要（新ファイルを置くだけで実行される）。

### 実装手順

1. `tests/build/host-permission-coverage.build.ts` を作り、まず「fetch 先 ⊆ 要求集合」を断言して**現状 Red を確認する**
2. fetch 先をコードから取る。テスト内に URL を列挙しない:

   ```ts
   import { readFileSync } from 'node:fs';
   import { describe, expect, it } from 'vitest';
   import { DOH_ORIGIN } from '../../src/ai/settings';
   import { originPatternsFor, requiredHostOrigins } from '../../src/ai/permissions';
   import { DEFAULT_AI_SETTINGS, type AiSettings } from '../../src/ai/types';

   const read = (dir: string) => JSON.parse(readFileSync(`dist/${dir}/manifest.json`, 'utf8'));
   const sample = (provider: AiSettings['provider']): AiSettings => ({
     ...DEFAULT_AI_SETTINGS,
     provider,
     openai: { baseUrl: 'https://api.openai.com/v1', model: 'm' },
   });
   // fetch 先はコードから取る。書き写すと新しい fetch 先に追随しない。
   const fetchTargets = (s: AiSettings): string[] => [...originPatternsFor(s), DOH_ORIGIN];
   ```

3. 包含を断言する。`fetchTargets(s)` の各要素が `requiredHostOrigins(s)` のいずれかに包含されること（`scheme://host/*` の形なので、scheme と host の一致で足りる）。`openai` と `gemini` の両方で回す
4. `none` / `built-in` は `requiredHostOrigins` が空であることを断言する
5. manifest の検査を足す。`dist/chrome-mv3` と `dist/firefox-mv3` について、`requiredHostOrigins(sample('openai'))` の各パターンが `optional_host_permissions` ∪ `host_permissions` のいずれかに包含されること。**これは「宣言が要求を下回っていない」ことの確認**であり、依存が無いことを保証するものではない（下記の落とし穴を参照）
6. 方針の単一ソースを断言する。`src/ai/settings.ts` が方針を 1 つだけ export していること、および `createEgressCheck` を fake な `ResolveDeps` で評価した結果がその宣言と一致すること（内部解決 → `internal: true`、到達不能・空応答 → `internal: false`、公開 → `ok: true`）。**これが「宣言と挙動が食い違えない」形の検査**になる
7. `make test-build` を実行し、緑を確認する
8. `requiredHostOrigins` から `DOH_ORIGIN` を一時的に外して検査が**落ちる**ことを確認し、戻す

### 落とし穴

- **`optional_host_permissions` は `https://*/*` なので、包含検査だけでは何でも通る。** 一致検査の本体は手順 3（要求集合が fetch 先を覆っているか）である。手順 5 を単独で置くと「宣言が広いから緑」という無意味な検査になる。位置づけを取り違えないこと
- **テスト内に URL を列挙しない。** `https://dns.google/resolve` をテストに書き写すと、実装側の定数を変えても検査が追随せず、検査だけが古い事実を主張し続ける（＝今回の乖離の再生産）。必ず `DOH_ORIGIN` を import する
- **`tests/build` は `environment: 'node'`** で `chrome` が無い。`hasHostPermission` / `requestHostPermission` を呼ぶと落ちる。import は安全（`chrome.permissions` は既定引数なので呼び出し時に評価される）
- **`IS_FIREFOX` は `import.meta.env.FIREFOX === true`**（`src/ai/browser-target.ts:4`）。vitest には define が無いので常に非 Firefox になる。Firefox 側の分岐を検査したい場合は `isFirefox` 引数を明示的に渡すか、`dist/firefox-mv3/manifest.json` を見る形にする
- **`dist/` が無いと落ちる。** 既存の `firefox-manifest.build.ts` と同じ前提で、`make test-build` は `build` に依存するため問題にならない。`npm run test:build` を単独で叩くと落ちる
- **検査を「常に緑」にしない。** 手順 8 の破壊確認を必ず行う。この種の検査は、対象が存在しなくなっても assert が消えれば静かに緑になる
- 方針を定数で持つか、`verdictOf` のコメントで持つかは未決である。**定数にする場合は、それを読む分岐が実在する形にすること**（誰も参照しない定数は、方針を 1 か所に書いたことにならない）。子 04 の「未決の設計判断」と併せて決める

### 未決の設計判断

- **方針の表現形式。** (a) `src/ai/settings.ts` に `export const EGRESS_UNVERIFIED_POLICY = 'block' as const` を置き、`verdictOf` と保存時ゲートがそれを読む。(b) 定数は置かず、`verdictOf` のコメントを唯一の宣言とし、挙動をテストで固定する。(a) は「1 か所に書く」を字義どおり満たし child 05 が断言しやすいが、値を 1 つしか使わない定数は形骸化しやすい。(b) は軽いが、宣言の場所がコメントなので検索性が劣る。**推奨は (a) で、`'block'` 以外の値を型に含めない**（値を増やすときは型と全読者を同時に変える必要が出るため、乖離が起きにくい）
- **port を落とす `originPattern`（`src/ai/settings.ts:219-222`）を本 PBI で扱うか。** 同意が host 単位に広がる件は同じ「宣言と要求の粒度」の問題だが、別の修正なので**別 PBI を推奨**。本 PBI では検査の対象を fetch 先の被覆に限定し、port の粒度は扱わない

## Definition of Done

- [x] 全 BDD シナリオが自動テストとして実装されパスする
- [x] `make test-build` と `make check` が通る
- [x] 検査を意図的に壊して落ちることを確認済み（`requiredHostOrigins` からリゾルバを外すと「fetch target https://dns.google/resolve を要求する pattern が無い」旨で落ちることを確認）
- [ ] コードレビュー完了
- [x] 方針の表現形式を決定して反映（(a) を採用: `EGRESS_UNVERIFIED_POLICY`（`'block' | 'proceed'` 型、値は `'block'`）を settings.ts に export し、`verdictOf` が値を読む分岐を実在させ、build 検査が宣言と挙動の一致を断言する

### 実装の記録（2026-10-11）

- 実装: `tests/build/host-permission-coverage.build.ts`（7 tests）を追加。`make test-build` の配線（`vitest.build.config.ts` の include、`environment: 'node'`）は既存のまま（新ファイルを置くだけで実行される）
- 使用集合はコードから取る: openai は保存した接続先（`originPatternsFor`）＋ダイヤル前のゲートが解決するリゾルバ（`DOH_ORIGIN`）、gemini は compile-time 定数（`GEMINI_ORIGIN`）のみ（ダイヤル時のゲートを渡さない判断は `pbi/2026-10-11-12` に記録済み）。テストに URL を書き写していない
- 方針の単一ソース: `EGRESS_UNVERIFIED_POLICY`（PBI 04 のコメント宣言を置き換え）を `verdictOf` が読む分岐とし、build 検査が「宣言の値」と「到達不能時の verdict」の一致を断言する
- 破壊確認: `requiredHostOrigins` からリゾルバを外すと「covers every fetch target for openai」が `https://dns.google/resolve` を要求 pattern が覆っていない旨で落ちることを確認し、戻した
- 検証: `make check` exit 0（typecheck、79 テストファイル / 1055 passed、build 検査 2 ファイル / 12 passed、両ブラウザ build、manifest 検査、web-ext lint errors 0）
- 未決 2 件の決定: 方針の表現形式は (a)（上記）。port を落とす `originPattern` の扱いは本 PBI では扱わず、`pbi/2026-10-11-11`（docs）が判断と結果の記録を担う
- ユーザーの作業として残る項目: コードレビューの最終承認
