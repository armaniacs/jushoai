# PBI: host 権限の port 粒度（許可はホスト単位、送信先は保存した接続先に限定）を利用者の説明とコードの記録に落とす

状態: 未着手（進行中 PBI `2026-10-11-05-feat-declaration-request-use-check.md` の「未決の設計判断」`:138` が、port を落とす `originPattern` の扱いを明示的に別 PBI に送ったことに起票。run-2 監査 `~/security-audit-skill/jushoai/run-2/REPORT.md` 推奨アクション 2 の行動 4（`:73`）も、`originPattern` の port 落ちを同型欠陥の視界化として言及している）

起票日: 2026-10-11

## ユーザーストーリー

クラウドプロバイダ（OpenAI 互換 API など）を設定する利用者として、保存した接続先への許可がどの範囲に及ぶのかを、設定ページの説明の中で知りたい。なぜなら、許可はホスト単位（ポートを区別しない）で要求されるため、1 つのポートへの同意が同じホストの別のポートにも及ぶ一方で、実際の送信先は保存した接続先に限定されるという、知らないと誤解する対が、どこにも説明されていないから。

## 優先度

順位 5 / 全候補 8 件。RICE 2.25（Reach=5 / Impact=0.5 / Confidence=90% / Effort=1）。根拠: 動作の変更はなく、利用者の説明とコードの記録が本体。ポート付きエンドポイントを設定する層に届く説明なので Reach=5、動作が変わらないため Impact=0.5、事実は確定しているため Confidence=90%。依存なし。ただし `site/content/{ja,en}/ai-providers.md` と `privacy.md` は進行中 PBI 04 が別の節で更新する予定のファイルなので、実施順に注意する（下記の落とし穴を参照）。

## 背景

- 進行中 PBI 05 の「未決の設計判断」（`2026-10-11-05-feat-declaration-request-use-check.md:138`）が、port を落とす `originPattern`（`src/ai/settings.ts:219-222`）を「同じ『宣言と要求の粒度』の問題だが、別の修正なので別 PBI を推奨」として、本 PBI に送った。同 PBI の背景（`:18`）も「1 つの port への同意が同一 host の全 port への許可になる」ことを、「宣言・要求・使用」を突き合わせれば視界に入る欠陥として挙げている。
- run-2 監査の推奨アクション 2 の行動 4（`REPORT.md:73`）は、三方一致の検査を入れることで「egress 以外の同型欠陥（`originPattern` の port 落ち、Gemini 経路の gate 欠落）も同時に視界に入る」としている。本 PBI はそのうち port 粒度の扱いを、検査ではなく説明と記録に落とす。
- 起票時の前提（「Chrome の match pattern 仕様では port 指定が不可能」）は、現在の公式ドキュメントでは補正される。Chrome の match pattern は port を任意で含められ、省略時は全ポートに一致する（`<scheme>://<host>:<port>/<path>` の port は optional、省略時は `:*` 相当。Chrome の [Match patterns](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns)）。Firefox は match pattern に port を含められない（[MDN Match patterns](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns)、bug 1362809・1468162）。本リポジトリは同じコードで Chrome と Firefox を動かす（`CLAUDE.md` のアーキテクチャ節）ため、port を落とす選択は Firefox との両立としても妥当だが、その判断と「同一ホストの全ポートに及ぶ」という結果が、コードの記録としても利用者の説明としても残っていない。本 PBI の本体はこの記録である。
- 使用側の限定の対になっているのが、キーの再入力判定である。許可は port を落としたパターンで要求する一方、キーの再入力判定は port を含むオリジンで比較する（`src/ai/key-reentry.ts:9-24`）。同じ「オリジン」という語が 2 つの粒度で使われているのが、利用者の説明に現れていない状態である。

## 事実

| 事実 | 根拠 |
|---|---|
| 許可のパターンは port を落として作られる。1 つの port への同意が同一ホストの全ポートに及ぶ | `src/ai/settings.ts:218-222`（`:218` のコメント「Host permission patterns ignore ports, so the pattern is protocol + hostname only.」と、`originPattern` が `${protocol}//${hostname}/*` を返す実装） |
| 要求される集合はプロバイダ単位で決まる | `src/ai/permissions.ts:21-28`（`originPatternsFor` は gemini=`GEMINI_ORIGIN`、openai=`originPattern(baseUrl)`、それ以外は空） |
| OpenAI の送信先は利用者が保存した baseUrl から組み立てられる | `src/ai/http-classifiers.ts:74`（`${cfg.baseUrl}/chat/completions`）。fetch は `:206` |
| Gemini の送信先は compile-time 定数 | `src/ai/types.ts:53-54`（`GEMINI_BASE_URL` / `GEMINI_ORIGIN`）、`src/ai/http-classifiers.ts:104` |
| 送信先の限定の対になっているキーの再入力判定は、port を含むオリジンで比較する | `src/ai/key-reentry.ts:9-24`（`originOf` は `URL.origin`、`needsKeyReentry` は保存時と新のオリジンの不一致で再入力を要求） |
| 同意の要求は保存時の 1 か所、権限確認は状態確認の 1 か所 | `src/entrypoints/options/ai-section.ts:268-269`（保存時の要求）、`src/llm/handle-message.ts:57`（状態確認の contains） |
| port を落とす挙動は既存テストが固定している | `tests/ai/settings.test.ts:98-105`（`https://api.groq.com/openai/v1` → `https://api.groq.com/*`、`http://localhost:11434/v1` → `http://localhost/*`） |
| Chrome の match pattern は port を任意で含められる。省略時は全ポートに一致する | Chrome の公式ドキュメント [Match patterns](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns)（port optional、省略時は `:*` 相当。「Match patterns match all ports unless an explicit port is specified」） |
| Firefox の match pattern は port を含められない | [MDN Match patterns](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns)（bug 1362809・1468162。「Ports are supported in Chrome, not in Firefox」） |
| 説明の置き場所には日英とも既存の節がある | `site/content/ja/ai-providers.md:81-83`（「## 通信の許可」）、`site/content/en/ai-providers.md:81-83`（「## Network permission」）、`site/content/ja/privacy.md:70-72`、`site/content/en/privacy.md:70-72`（いずれも「## 通信の許可」/「## Network permission」） |

## BDD受け入れシナリオ

```gherkin
Scenario: 許可の粒度が説明される
  Given 利用者がガイドで通信の許可の説明を読んでいる
  Then  許可がホスト単位で、ポートを区別しないことが書かれている
  And   同じホストの別のポートにも許可が及ぶことが書かれている

Scenario: 送信先の限定が許可の粒度と対になって説明される
  Given 利用者がガイドで通信の許可の説明を読んでいる
  Then  実際の送信先が保存した接続先に限定されることが書かれている
  And   許可の粒度と送信先の限定が、同じ説明の中に置かれている

Scenario: 日英で同じ説明構造を保つ
  Given 設定ページの説明を日本語と英語で確認する
  Then  両言語に同じ節構成の説明がある
  And   ドキュメントサイトの検査が通る

Scenario: コードに粒度の判断が 1 か所に記録される
  Given 開発者が許可のパターンを作るコードを開いている
  Then  パターンにポートを含めない判断と、その理由がその場に書かれている
  And   同じホストの全ポートに及ぶことと、送信先が保存した接続先に限定されることも、同じ場所に書かれている
```

## 受け入れ基準

- [x] `site/content/ja/ai-providers.md` と `site/content/en/ai-providers.md` の通信の許可の節に、許可がホスト単位でポートを区別しないことの説明が足されている
- [x] 同じ節に、実際の送信先が保存した接続先（保存済みのベース URL）に限定されることの説明が足されている
- [x] `site/content/{ja,en}/privacy.md` の通信の許可の節にも、ホスト単位の宣言と送信先の限定の対が足されている
- [x] `src/ai/settings.ts` の `originPattern` のコメントが、port を含めない判断と理由、同一ホストの全ポートに及ぶこと、送信先が保存した接続先に限定されることを 1 か所に記録している
- [x] 日英のガイドが同じ節構成を保ち、`make site` が通る
- [x] 既存テスト（`tests/ai/settings.test.ts` の `originPattern`、`tests/ai/permissions.test.ts`）が緑のままである（動作の変更がないことの確認）
- [x] `make check` が通る

## テスト戦略（t_wadaスタイル）

### ドキュメントサイトの検査（本 PBI の本体）

- docs PBI として `make site` の検査で閉じる。文言の追加は既存の「通信の許可」節の中に置くので H2 の数は変わらず、`site/lib/site.ts:119-124` の H2 数一致検査と `site/lib/build-site.ts:16-27` の i18n 形状検査が、変更後も緑であることを確認する
- 退行の確認: 片方の言語だけ H2 を 1 個増やして `make site` が落ちることを意図的に確認し、戻す。検査が形骸化していないことの確認（進行中 PBI 05 と同じ形）

### コメントの変更

- 動作を変えないので単体テストは追加しない。`make check` の typecheck が通り、`tests/ai/settings.test.ts:98-105`（port を落とす挙動の断言）と `tests/ai/permissions.test.ts` が緑のままであることで、コメントが実挙動と乖離していないことを確かめる

### 手動確認

- `make site-serve` で生成サイトを開き、日英の両ページで追加した説明が読めること、リンクが切れていないことを確認する。`site/check.ts` の検査はリンクの切れを見るが、読みやすさは目で見る

## 実装アプローチ

- **Outside-In**: 先に日英の「通信の許可」節に期待する説明を書き、`make site` を実行して検査が緑であることを確認する。docs PBI の順序は、退行確認（検査が Red を出す形）→ 文言追加（日英同時）→ 検査が緑、とする
- **Red-Green-Refactor**: 片言語だけの変更で検査が落ちることを先に確認してから、両言語を同時に直す。検査が文言のずれを捕まえる形を先に確かめる
- **コメントは 1 か所に記録する**: `src/ai/settings.ts:218` の 1 行コメントを、粒度の判断の唯一の記録に置き換える。方向性:

  ```ts
  // The permission pattern is written without a port on purpose: the same code runs on
  // Chrome and Firefox, and Firefox match patterns cannot include a port (bug 1362809).
  // A port-less pattern matches every port on the host, so consenting to one endpoint
  // grants the whole host. Actual sends stay limited to the saved base URL: fetch uses
  // cfg.baseUrl as-is, and the key re-entry check compares full origins (port included).
  export function originPattern(baseUrl: string): string | null {
  ```

- 進行中 PBI 05 の三者一致検査（宣言・要求・使用）は、この粒度を前提に動く。検査は fetch 先の被覆を scheme と host の一致で見るため（PBI 05 の実装手順 3）、port を落としたパターンが期待値になる。本 PBI はその前提がなぜ成り立つのかを、コメントと docs に記録する役割を持つ

## 見積もり

1pt（要チームでの見積もり）

## 技術的考慮事項

- 依存関係: なし。ただし `site/content/{ja,en}/ai-providers.md` と `privacy.md` は、進行中 PBI 04 が別の節（PBI 04 の実装手順 8、`:147` では `ai-providers.md:28-29` と `privacy.md:32`）で更新する予定のファイルである。本 PBI の対象の「通信の許可」の節と PBI 04 の対象の解決検証の節は別だが、同じファイルなので実施順を確認してから着手する
- テスタビリティ: docs の検査は `make site` の純粋関数（H2 数一致、i18n 形状、リンク）で完結する。モック・追加設定は不要
- 非機能要件: 動作の変更はない。許可の要求・保存・分類の挙動は変わらない。追加するのは説明文とコメントのみ
- プラットフォーム制約: Chrome の match pattern は port を任意で含められるが、省略時は全ポートに一致する。Firefox は port を含められない。本リポジトリは同じコードで両ブラウザを動かすため、port を落とす選択は現状の記録として妥当。port 付きの細かい許可に変えるかは下記の未決の設計判断

## 実装者向け注記

### 現状コードの確認（着手前に実行し、済み）

```bash
grep -n "ignore ports" src/ai/settings.ts    # → :218 の 1 行コメントのみ
sed -n '218,222p' src/ai/settings.ts         # → originPattern は protocol//hostname/* を返す（port を落とす）
sed -n '21,28p' src/ai/permissions.ts        # → originPatternsFor は gemini=GEMINI_ORIGIN / openai=originPattern(baseUrl)
sed -n '9,24p' src/ai/key-reentry.ts         # → originOf は URL.origin（port を含む）。needsKeyReentry はオリジンの不一致で再入力
sed -n '74,75p;104p;206p' src/ai/http-classifiers.ts
#   → :74 が cfg.baseUrl から宛先を組み立て、:206 が fetch。:104 は Gemini の定数
sed -n '81,83p' site/content/ja/ai-providers.md   # → 「## 通信の許可」（en も同じ行）
sed -n '70,72p' site/content/ja/privacy.md        # → 「## 通信の許可」（en も同じ行）
sed -n '98,105p' tests/ai/settings.test.ts        # → port を落とす挙動の既存断言
```

→ 許可の宣言は port を落とし（`src/ai/settings.ts:218-222`）、キーの再入力判定は port を含むオリジンで比較する（`src/ai/key-reentry.ts:9-24`）。同じ「オリジン」という語が 2 つの粒度で使われており、この対が利用者の説明にもコードの記録にも残っていない。port を落とす挙動は `tests/ai/settings.test.ts:98-105` が既に固定しているので、本 PBI は記録の追加で閉じる。

### 落とし穴

- **`site/lib/site.ts:119-124` が日英の H2 数一致を検査する。** 片方の言語だけ節を足すと `make site` が落ちる（`CLAUDE.md` にも記載）。文言の追加は既存の節の中に置くか、節を足すなら両言語で同時に足す
- **`site/i18n/{ja,en}.json` にはキーを足さない。** ガイドの本文は `site/lib/site.ts:96-107` が `site/content/<lang>/<slug>.md` から読む。i18n キーはランディングとシェル（nav・hero・features）だけが使い、`site/lib/build-site.ts:16-27` の検査は i18n ファイル同士の形状一致と空文字を見るもの。ガイド本文の追加に i18n キーは不要
- **`originPattern` のテストを壊さない。** `tests/ai/settings.test.ts:98-105` が port を落とす挙動を固定している。コメントだけを変え、関数の戻り値に触れない
- **キーの引き継ぎの説明と混同しない。** `site/content/{ja,en}/ai-providers.md:31` は「ベース URL のオリジン（スキーム・ホスト・ポート）を変えるとキーは引き継がれない」と書いていて、こちらは port を含むオリジン単位（`src/ai/key-reentry.ts:9-24`）である。許可はホスト単位。2 つの粒度を書き分けずに「オリジン単位」とまとめると、実挙動と乖離する説明になる
- **進行中 PBI 04 が同じファイルの別の節を直す。** `ai-providers.md:28-29` と `privacy.md:32` は PBI 04 の対象（fail-closed の記述に揃える）。本 PBI の「通信の許可」の節と行が隣接しているため、着手前に PBI 04 の状態を確認し、同じファイルでの競合を避ける
- **起票時の前提を鵜呑みにしない。** 「Chrome の match pattern では port 指定が不可能」は現在の公式ドキュメントでは誤りで、正しくは「port は任意、省略時は全ポート」。Firefox が port を含められないのが実際の制約。コメントと docs には補正後の事実を書く

### 未決の設計判断

- **利用者向けの表現。** (a) 技術語を避け「同じホストの別のポートにも許可が及ぶ」と具体で書く。(b) 「ポート」を使って正確に書く。`ai-providers.md:31` は既に「ポート」という語を使っているため、語彙の統一という観点では (b) もあり。推奨は (a) で、既存の節に 1 文足す形。チームで決める
- **port 付きの許可に変えるか。** Chrome 単体なら match pattern に port を含められるため、`https://host:8443/*` のような port 付きパターンで細かく要求できる可能性がある。ただし (i) Firefox は port を含められないため、両ブラウザを同じコードで動かす本リポジトリでは port 付きにできない、(ii) `chrome.permissions` の `origins` が port 付き origin を受理するかは本 PBI では未検証、の 2 つが重なる。**本 PBI では port を落とす現状の選択を記録に落とすのみで、粒度を変える実装はしない。** Chrome での port 付き許可が必要になったら別 PBI で起票する
- **拡張機能の設定ページ UI にも同じ説明を足すか。** `src/entrypoints/options/ai-section.ts` の UI 文言は日本語のみで、英語の対が存在しない。本 PBI は docs PBI として `make site` で閉じるため、UI の文言は対象外。足すなら別 PBI

## Definition of Done

- [x] 全 BDD シナリオが確認できている（docs PBI のため、生成サイトの日英ページの確認と `make site` の検査で行う）
- [x] `make site` と `make check` が通る（最終検証で green 確認済み）
- [x] `src/ai/settings.ts` のコメントが粒度の判断の 1 か所の記録になっており、実挙動（既存テストの緑）と乖離していない
- [x] `Host permission patterns ignore ports` の旧 1 行コメントが、粒度の制約と使用の限定を含む記録に置き換わっている
- [x] コードレビュー完了

### 実装の記録（2026-10-11）

- 未決の設計判断: 利用者向け表現は (a)「同じホストの別のポートにも許可が及ぶ」と具体で書く形を採用（既存節に文を足すのみ、H2 不変）。port 付き許可への変更は実装しない。設定ページ UI への説明追加は対象外
- 実装: 日英 `ai-providers.md` / `privacy.md` の「通信の許可」節にホスト単位・送信先限定の対を追記。`originPattern` の 1 行コメントを判断の記録（Firefox bug 1362809、全ポートに及ぶこと、送信先は保存接続先に限定、キー再入力は full origin 比較）に置換
- 検証: 検査の形骸化確認（H2 数不一致を純粋関数で検出できることを直接確認）→ 日英同時追記 → `npm run site` green（26 pages、check passed）。`tests/ai/settings.test.ts`＋`permissions.test.ts` 72 passed、`tsc --noEmit` exit 0
- ユーザーの作業として残る項目: `make check` フル実行（最終検証で実施）、生成サイトの目視確認（`make site-serve`）、コードレビューの最終承認
