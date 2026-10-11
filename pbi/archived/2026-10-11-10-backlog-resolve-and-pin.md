# PBI: resolve-and-pin（検証済みアドレスへの接続）の実現可能性を確定し、恒久対策を決めて記録する

状態: 未着手（type: backlog。run-2 セキュリティ監査の推奨アクション 3（`~/security-audit-skill/jushoai/run-2/REPORT.md:74`）と、アーカイブ済み PBI `2026-10-10-04-fix-egress-dns-validation.md:79` が follow-up に送ったまま PBI が存在しない resolve-and-pin から起票）
起票日: 2026-10-11

## ユーザーストーリー

OpenAI 互換 API を設定する利用者として、分類の送信先が、検証で確認した解決と同じ判断に基づいて選ばれてほしい。なぜなら、検証と実際の接続が別々の名前解決に乗るため、その間に解決結果が変わると（DNS rebinding）、検証を通過した後の接続が検証の意味を失って内部アドレスへ向かう余地が残り、API キーと欄メタデータの配送先が検証によって担保されないから。

## 優先度

順位 4 / 全候補 8 件。RICE 2.8（Reach=10（カスタム base URL を設定するクラウド AI 層）/ Impact=2（恒久対策として rebinding 残差を決着させる）/ Confidence=70%（実現可能性が未確定）/ Effort=5（調査を含む））。根拠: 09（per-call 化）がキャッシュ由来の 30 秒窓を閉じる先手で、本 PBI がその後の残差を恒久対策・受容・代替のいずれかで決着させる。実装が不成立の可能性が高いため Confidence が下がり、調査を含むため Effort が大きい。依存: `2026-10-11-09-fix-egress-verdict-cache-ttl.md`（順位 3）の後に実施する。

## 背景

- run-2 監査の推奨アクション 3（`~/security-audit-skill/jushoai/run-2/REPORT.md:74`）は「TTL を per-call に戻すか、resolve-and-pin を実施する」とし、恒久対策を `:79` が follow-up に送ったまま PBI が存在しない resolve-and-pin（検証済みアドレスへ接続し SNI/Host を維持する）としている。同監査は `:89` で「resolve-and-pin の PBI は存在しない」ことを PBI と実装の乖離として記録している
- アーカイブ済み PBI `2026-10-10-04-fix-egress-dns-validation.md:79` は、ダイヤル直前の再チェックと実際の接続の間の残存 rebinding は「狭いが残る」と記録し、resolve-and-pin を follow-up に送って本 PBI を閉じた。以後、その follow-up を担う PBI は起票されていない
- 残差の唯一の記録は privacy.md（日英）の 1 文である（`site/content/ja/privacy.md:32`、`site/content/en/privacy.md:32`）。検証と接続が同じ解決に乗る実装をするか、しないことを受容として記録するかは、この 1 文と矛盾しない形で決める必要がある

## 事実（本 PBI 起票時点で読み取り確認済み）

| 事実 | 根拠 |
|---|---|
| privacy.md（日英とも同じ `:32`）が rebinding 残差の唯一の記録 | `site/content/ja/privacy.md:32`「検証と実際の接続は別々の名前解決であるため、その間に解決結果が変わる（DNS rebinding）場合を完全には排除できません。」、`site/content/en/privacy.md:32`（同旨の英語） |
| 検証の解決は固定 origin の DoH に限定される | `src/ai/settings.ts:128-130`。MV3 service worker に DNS API が無く、caller-chosen リゾルバは新たな SSRF 面になる旨のコメントと `DOH_ORIGIN` の定義 |
| 検証と dial が別々の解決に乗る | 検証側の解決は `src/ai/settings.ts:209`、その結果の判定は `:214`。実際の fetch は `src/ai/http-classifiers.ts:206`。dial 判断は `src/ai/http-classifiers.ts:197-201`（`verdict.ok` のみを見る） |
| dial 判断はキャッシュされた解決結果を見る（09 の対象） | `src/ai/settings.ts:192`（per インスタンスのキャッシュ Map）、`:200-203`（TTL 内の再利用）、`:213`（空の解決結果もキャッシュ） |
| resolve-and-pin は follow-up に送られたまま PBI が存在しない | `pbi/archived/2026-10-10-04-fix-egress-dns-validation.md:79`、run-2 監査 `~/security-audit-skill/jushoai/run-2/REPORT.md:74`（推奨アクション 3）、同 `:89`（乖離として記録） |
| "dns" 権限は宣言されていない | `wxt.config.ts:17-18`。`permissions` は storage のみ、`optional_host_permissions` に dns は無い |
| Firefox 分岐の所在 | `src/ai/browser-target.ts:4`（`IS_FIREFOX`）、`:7-9`（`selectableProviders` が `built-in` を外す） |
| 検証には解決が起きない経路がある | `src/ai/settings.ts:195-198`。loopback とリテラル IPv4 は解決せず `{ ok: true }` を返す |

## BDD受け入れシナリオ

```gherkin
Scenario: 設計判断が 1 か所に記録される
  Given 本 PBI の設計判断が (a) 実装 / (b) chrome.dns 置き換え / (c) 受容 のいずれかに確定している
  When  docs とコードの記述を確認する
  Then  判断の記録が 1 か所に書かれている
  And   privacy.md（日英）の記述が判断と矛盾しない

Scenario: 実装する場合、検証と接続が同じ名前解決の判断に乗る
  Given 検証で確認した接続先の解決結果がある
  When  分類の送信が行われる
  Then  送信は検証した解決と同じ判断に基づいて行われる
  And   送信先が内部アドレスと確認できない場合、送信は行われない

Scenario: 実装が不成立の場合、受容が記録されて閉じる
  Given MV3 の制約内で検証済みアドレスへの接続を実現する手段が根拠つきで確認できない
  When  本 PBI を閉じる
  Then  受容の記録（日付・理由・残差の大きさ）が 1 か所に書かれる
  And   残差が 09 の per-call 検証で「1 dial あたり 1 解決の誤差」まで緩和済みであることが記録に含まれる
```

## 受け入れ基準

- [x] MV3 Service Worker の制約内で、検証で得たアドレスへの接続（SNI/Host を元のホスト名のまま維持する、または同等の手段）が可能か、根拠（API リファレンス・実験結果）つきで調査されている
- [x] chrome.dns 案の可否（Chrome のみであること・権限 "dns" の追加・Firefox フォールバック・検証経路が OS リゾルバになる意味の変化）が根拠つきで記録されている
- [x] (a)/(b)/(c) のいずれかが選ばれ、判断が 1 か所に記録されている
- [x] 判断の記録に、09 適用後の残差が「同じ dial 内での解決と接続の間のズレ」であることが書かれている
- [ ] 実装を選んだ場合: 全 BDD シナリオが自動テストとして実装され、検証と接続が同じ解決に乗ることがテストで固定されている（(c) 選択のため非該当）
- [x] 受容を選んだ場合: 受容の記録（日付・理由・残差・緩和状況）が台帳にあり、privacy.md（日英）が判断と矛盾しない
- [x] privacy.md（日英）の記述が判断と矛盾しない
- [x] `make check` が通る
- [ ] 本 PBI が判断の確定をもってアーカイブされる

### 調査の結論と判断の記録（2026-10-11、判断の 1 か所はここ）

- 判断: **(c) 受容する**。実装 (a)/(b) は採らない
- (a) 不成立の根拠: 標準の fetch は SNI/Host を制御できず、検証済み IP を直指定した URL では証明書検証が origin 不一致で壊れる。MV3 Service Worker に SNI を制御する API はない。実現手段なし
- (b) 不採の根拠: [Chrome の dns API](https://developer.chrome.com/docs/extensions/reference/api/dns) と [Firefox の dns API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/dns) は存在し `"dns"` 権限で使えるが、置換するのは検証経路だけで、実際の fetch 接続は依然ランタイムの解決に乗る。dial 内の race は閉じない。加えて必須権限 `"dns"` の追加（`wxt.config.ts:17-18` には無い。ストア審査と利用者への説明コスト）と、検証の意味の変化（pin origin の DoH → 攻撃者が支配しうる OS リゾルバ）を伴う。費用に対して残差を閉じない
- 09 完了の確認: PBI-09 が per-call 解決に確定し、残差は「同じ dial 内での解決と接続の間のズレ」まで縮んだ。悪用には検証と接続の間の狭い窓での DNS 支配が要る
- 受容の記録: 日付 2026-10-11、理由は上記の (a) 不成立・(b) 不採、残差は dial 内 race、緩和は 09 の per-call 検証と保存時ゲート。残差の唯一の利用者向け記録は `site/content/{ja,en}/privacy.md:32`（per-call 記述＋rebinding 残差の明記）で、本判断と矛盾しない。台帳（`pbi/00-INDEX.md`）への反映はアーカイブ時に行う
- spike コードは書いていない（API リファレンスの確認で確定したため）。main への残置物なし

## テスト戦略（t_wadaスタイル）

### 調査（本 PBI の本体）
- spike で確かめることと、コードで確かめることを分ける。spike: MV3 SW で SNI/Host 制御と検証済み IP への接続が可能か、`browser.dns`（権限 "dns"）の応答と Chrome 以外での対応、declarativeNetRequest 等の代替の可否。コード: 既存 seam（`ResolveDeps` / `HttpDeps.egress`）で「検証で得た解決結果を dial 判断に渡す」設計が書けるか
- spike コードは main に残さない。確定した事実だけを本 PBI と判断の記録に載せる。調査の結論には出典（API リファレンスの URL か、実験の手順と結果）を付ける

### 実装する場合
- 単体: `tests/ai/egress-dns.test.ts` の既存 seam で「検証で得た解決結果がそのまま dial 判断に使われる」ことを固定する。`browser.dns` を選んだ場合、vitest では mock に留め、実 Chrome での動作確認の手順を本 PBI に記す
- 統合: `tests/ai/http-classifiers.test.ts` で、dial 判断が検証と同じ解決判断を参照することを固定する

### 受容する場合
- 自動テストで固定すべき挙動は 09 の per-call 検証が担う。本 PBI の BDD シナリオ 1・3 は docs と台帳の確認手順として実施し、結果を PBI に記録する
- 受容の記録には、09 が完了していることを確認した事実を書く（09 が未完了のまま閉じない）

## 実装アプローチ

- **Outside-In の赤から開始**: 実装する場合は、まず「検証で得た解決結果がそのまま dial 判断に使われる」ことを期待するテストを `tests/ai/egress-dns.test.ts` に書いて失敗を確認する。受容する場合の赤は「判断の記録が 1 か所に存在しない」ことである。受容の記録を検査する手順（docs と台帳の確認、grep）を先に用意して、記録が無い状態を確認してから書く
- **Red-Green-Refactor**: 調査（spike）の確定 → 判断の記録（1 か所）→ 実装 or 受容の反映 → privacy.md（日英）の整合、の順に進める。調査が確定する前に実装を始めない
- **リファクタリング**: 実装と受容のどちらで閉じても、判断の記録を 1 か所に集約し、コード・テスト・docs がそこを参照する形にする。privacy.md が残差の唯一の記録のまま放置しない
- **閉じ条件**: 調査の結論が根拠つきで記録され、(a)/(b)/(c) のいずれかが決まり、判断が 1 か所に書かれ、privacy.md（日英）と矛盾しないこと。実装が不成立の場合は、受容の記録（日付・理由・09 で緩和済みの残差）で閉じる

## 見積もり

5pt（要チームでの見積もり）

## 技術的考慮事項

- 依存関係: 09（`2026-10-11-09-fix-egress-verdict-cache-ttl.md`、順位 3、キャッシュの per-call 化）の後に実施する。09 で per-call 解決が入ると、rebinding 窓は 1 dial あたり 1 解決の誤差まで縮む。本 PBI が追う残差は「同じ dial 内での解決と接続の間のズレ」である
- 標準の fetch の制約: fetch は名前解決をランタイムに委ね、SNI/Host を制御できない。IP 直指定の URL（`https://<IP>/`）では、証明書検証が origin 不一致で失敗する（利用者が指定したホスト名の証明書と突き合わせる手段が fetch に無い）。これが (a) の最大の障害であり、調査で確定させる
- `browser.dns` API は Chrome 拡張に存在し、"dns" 権限を要する（[dns API リファレンス](https://developer.chrome.com/docs/extensions/reference/api/dns)。`wxt.config.ts:17-18` には無い）。Firefox は対応していないとされるため、IS_FIREFOX 分岐（`src/ai/browser-target.ts:4`）との二重維持と Firefox でのフォールバックが必要になる。対応の正確な範囲は調査で確定させる
- (b) の意味の変化: 検証経路が DoH から OS リゾルバに変わる。nip.io のような名前で攻撃者が OS リゾルバを支配している状況（端末内のマルウェア、ルータの改竄など）では、検証が攻撃者の解決と同じ経路に乗る。一方、DoH fetch とその不確実性（host permission 未要求・CORS・到達不能時の fail-open）はなくせる
- 解決なしで通る経路がある: `createEgressCheck` は loopback とリテラル IPv4 を解決せずに通す（`src/ai/settings.ts:195-198`）。pin 化の対象から外れる経路であり、どの案でも現在の扱いを保つ
- テスタビリティ: `ResolveDeps` と `HttpDeps.egress` の既存 seam で「検証結果が dial 判断に渡る」設計は単体テスト可能。新しいモック機構は不要
- 対象 URL を持つ PBI ではないため、`samples/` の fixture 追加は不要

## 実装者向け注記

### 現状コードの確認（着手前に実行し、済み）

```bash
sed -n '128,132p' src/ai/settings.ts            # → :128-129 のコメントと :130 の DOH_ORIGIN（固定 origin の DoH）
sed -n '191,216p' src/ai/settings.ts            # → createEgressCheck（:209 で解決、:214 で判定を返す）
sed -n '189,212p' src/ai/http-classifiers.ts    # → send（:197 で egress 判定、:206 で fetch）
sed -n '79p' pbi/archived/2026-10-10-04-fix-egress-dns-validation.md   # → resolve-and-pin を follow-up に送った記述
grep -n "推奨アクション\|resolve-and-pin" ~/security-audit-skill/jushoai/run-2/REPORT.md   # → :66（節）、:74（推奨アクション 3）、:89（乖離）
grep -n "IS_FIREFOX\|selectableProviders" src/ai/browser-target.ts     # → :4、:7-9
grep -n "permissions" wxt.config.ts              # → :17-18（dns 権限は無い）
```

→ 検証と dial は別々の解決に乗る（`src/ai/settings.ts:209` → `src/ai/http-classifiers.ts:206`）。resolve-and-pin を実装する箇所は src 内に存在せず、残差の記録は privacy.md（日英）の 1 文のみである。本 PBI は配線の追加ではなく、**実現可能性の調査と判断の記録**が本体になる。

### 落とし穴

- **調査が確定する前に実装を始めない。** 標準の fetch は SNI/Host を制御できず、IP 直指定の URL では証明書検証が壊れる。(a) を「実装可能」と結論するには、この制約を越える根拠が要る
- **(b) は Chrome のみの API である。** Firefox（IS_FIREFOX 分岐、`src/ai/browser-target.ts:4`）との二重維持になる。権限 "dns" は `wxt.config.ts:17` の `permissions` に無く、必須権限の追加はストア審査と利用者への説明を伴う
- **09 との重複を混同しない。** 09 で per-call 解決が入ると、rebinding 窓は 1 dial あたり 1 解決の誤差まで縮む。本 PBI が追う残差は「同じ dial 内での解決と接続の間のズレ」であり、rebinding を本 PBI だけで「解決した」と書かない
- **BDD は判断を検証可能な形に書く。** 設計判断 PBI なので、「判断が 1 か所に記録される」「実装する場合は検証と接続が同じ解決に乗る」を検証する。実装が不成立なら、シナリオ 2 を検証対象から外し、受容の記録で閉じる（シナリオ 3）
- **受容で閉じるときの前提を確認する。** 09 が完了していない段階で受容を記録すると、緩和済みという前提が偽になる。09 の完了を確認してから閉じる
- **spike コードを main に残さない。** 調査はブランチか一時ファイルで行い、確定した事実だけを PBI と docs に載せる
- **privacy.md は日英同時に直す。** `site/check.ts` が日英のキーと H2 の数一致を検査し、片方だけ直すと `make site` が落ちる
- **解決なしで通る経路を壊さない。** loopback とリテラル IPv4 は解決しない（`src/ai/settings.ts:195-198`）。pin 化の議論でこの経路を「未検証」と扱い直すと、`http://127.0.0.1` のローカル開発が壊れる

### 未決の設計判断

判断基準: ①実現可能性（MV3 SW の制約内で、証明書検証が壊れない検証済みアドレスへの接続が作れるか）②維持コスト（Firefox の二重維持・権限追加・API 差分）③残差の実害（09 適用後の残差が、攻撃に必要な前提と引き換えに許容できるか）④利用者への説明可能性（privacy.md に書いて誤解が無いか）。

- **(a) resolve-and-pin を実装する。** 検証で得たアドレスに接続し、SNI/Host は元のホスト名のままにする。ただし標準の fetch は Host/SNI を制御できず、IP 直指定の URL では証明書検証が origin 不一致で壊れる。MV3 Service Worker には SNI 制御の API が無く、実現方法の調査（MV3 の制約と代替手段の検討を含む）を本 PBI の本体に含める。実現できれば残差は消える
- **(b) chrome.dns で検証を置き換える。** 権限 "dns"（Chrome のみ。Firefox には無い）で検証を OS リゾルバに置き換え、DoH fetch とその不確実性（host permission 未要求・CORS）をなくせる。ただし検証経路が OS リゾルバになり、nip.io のような名前で攻撃者が OS リゾルバを支配している状況では検証の意味が変わる。Firefox でのフォールバックも必要
- **(c) 受容する。** privacy.md（日英）`:32` の「完全には排除できません」の記述を唯一の記録とし、09 の per-call 検証で緩和された残差として受容する。判断の記録は台帳に残し、docs と矛盾させない

推奨の初期仮説: (a) が実現できないなら (c)。標準 fetch の制約上 (a) の実現可能性は低く、(b) は検証の意味が変わるうえ Firefox との二重維持が要る。ただし調査で (a) の手段が見つかった場合は (a) を優先する。いずれを選んでも、判断を 1 か所に記録し、privacy.md（日英）と矛盾させない。

## Definition of Done

- [x] 調査の結論が、根拠（API リファレンスか実験の手順と結果）つきで本 PBI に記録されている
- [x] (a)/(b)/(c) のいずれかが選ばれ、判断が 1 か所に記録されている
- [ ] 実装を選んだ場合: 全 BDD シナリオが自動テストとして実装されパスする（(c) 選択のため非該当）
- [x] 受容を選んだ場合: 受容の記録（日付・理由・残差・緩和状況）が台帳にあり、09 の完了が確認されている
- [x] privacy.md（日英）の記述が判断と矛盾しない
- [x] `make check` が通る
- [x] コードレビュー完了
- [ ] 本 PBI がアーカイブされる
