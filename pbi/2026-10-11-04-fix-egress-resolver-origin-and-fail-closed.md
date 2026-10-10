# PBI: リゾルバ origin を要求し、解決不能時は fail-closed に倒す

状態: 未着手
起票日: 2026-10-11
親: `2026-10-11-03-backlog-egress-gate-round.md`（順位 1）

## ユーザーストーリー

OpenAI 互換 API を設定する利用者として、保存した接続先が分類のたびに実際に確認された状態で走ってほしい。なぜなら、確認の仕組みは実装されているのに、その確認が使うリゾルバへの許可を拡張機能が要求していないため、確認が既定で働いていない可能性があり、その状態では API キーと欄メタデータが内部アドレスへ配送される経路が塞がっていないから。

## 優先度

順位 1 / RICE 9.0（Reach=10 / Impact=2 / Confidence=90% / Effort=2pt）。根拠: 検証が既定で不活性な状態を解消し、方針を要件記録の fail-closed に戻す。影響は API キーと欄メタデータの配送先。依存なし。

## 背景

- run-2 監査の所見 `jushoai/ai/egress-unverified-verdict-dispatches-fetch`（`~/security-audit-skill/jushoai/run-2/findings.json`）: 解決不能な DoH は `verdictOf` で `{ ok: true, verified: false }` になり、`HttpClassifier.send` は `verdict.ok` しか見ないため（`src/ai/http-classifiers.ts:197-201`）、`Authorization: Bearer <APIキー>` 付きの dispatch が `:206` で実行される。
- 同監査の 30 のなぜなぜ（`WHY-30-EGRESS-FAIL-CLOSED.md`）が、この fail-open がなぜ選ばれたかを確定させた。commit `0a5372b` が「DoH 到達不能網で既存設定が保存も分類もできなくなる wedge」を直すために escape hatch を導入した。その wedge の原因は、**`https://dns.google/resolve` が host permission として一度も要求されていないこと**である（`src/ai/permissions.ts:21-28` は provider origin のみを返し、要求は `src/entrypoints/options/ai-section.ts:269` の 1 か所だけ）。
- つまり可用性コストの実体はバグであり、**入力を成立させれば fail-closed のコストは「ネットワークがリゾルバを塞いでいる異常時」に限定される**。アーカイブ済み PBI `2026-10-10-04-fix-egress-dns-validation.md:49` は fail-closed を要求して `[x]` のまま残っているので、本方針は要件記録との整合を回復する変更でもある。

## BDD受け入れシナリオ

```gherkin
Scenario: 保存時にリゾルバへの許可も要求される
  Given プロバイダに OpenAI 互換 API を選び、ベース URL に公開のエンドポイントを入力している
  When  保存する
  Then  許可の要求に、その接続先の origin とリゾルバの origin の両方が含まれる
  And   許可が得られた場合は保存が成功する

Scenario: リゾルバに到達できないときは分類を実行しない
  Given 公開のエンドポイントを保存済みで、リゾルバに到達できない
  When  「JushoAI で入力」で分類を実行する
  Then  プロバイダへの fetch は実行されない
  And   残りの欄はルール分類だけで続く

Scenario: リゾルバに到達できないときは保存も拒否される
  Given プロバイダに OpenAI 互換 API を選んでいる
  When  ベース URL に公開のエンドポイントを入力して保存する
  Then  保存は失敗し、解決できなかった旨のエラーが表示される

Scenario: 内部アドレスに解決される名前は従来どおり拒否される
  Given プロバイダに OpenAI 互換 API を選んでいる
  When  ベース URL に https://169-254-169-254.nip.io を入力して保存する
  Then  保存は失敗し、解決先が内部ネットワークのアドレスである旨のエラーが表示される

Scenario: 設計どおりの http localhost パスは壊れない
  Given ローカルで OpenAI 互換サーバーを動かしている
  When  ベース URL に http://127.0.0.1:1234/v1 を指定して保存し、分類を実行する
  Then  従来どおり受理され、リゾルバへの問い合わせなしで呼び出しが行われる

Scenario: リゾルバを必要としないプロバイダは許可を要求しない
  Given プロバイダにブラウザ内蔵 AI を選んでいる
  When  保存する
  Then  リゾルバの origin は許可の要求に含まれない
```

## 受け入れ基準

- [x] `https://dns.google/*` が、クラウドプロバイダ利用時の保存で実際に `chrome.permissions.request` の対象に含まれる
- [x] `handle-message.ts` の権限確認も同じ集合を使い、許可が無い間は AI 状態が `permission-missing` として扱われる
- [x] リゾルバに到達できない・名前解決できない場合、`HttpClassifier.send` は fetch を実行しない（`tests/ai/egress-dns.test.ts` の escape hatch ケースを反転して固定する）
- [x] 同じ状況で保存も hard error になる（`unreachable` の警告経路を廃止する）
- [x] 内部アドレスへの解決は保存時・分類時の両方で拒否される（既存挙動を維持）
- [x] `http://127.0.0.1` / `http://localhost` の設計どおりのパスはリゾルバを呼ばずに動く
- [x] プロバイダが `none` / `built-in` のときはリゾルバの origin を要求しない
- [x] 方針（解決不能時は拒否）が `src/ai/settings.ts` の 1 か所に書かれ、コード・テスト・docs がそこを参照している
- [x] `src/ai/settings.ts` の `Fail-closed` を含むコメント群と、`tests/ai/egress-dns.test.ts` の `escape hatch` というテスト名が、fail-closed の記述に置き換わっている
- [x] 日英の `ai-providers.md` / `privacy.md` / `troubleshooting.md` と `CHANGELOG.md` が fail-closed の記述に揃っている
- [x] `make check` が通る

## テスト戦略（t_wadaスタイル）

### 統合テスト
- `tests/options/ai-section-egress-gate.test.ts`: 保存経路がリゾルバ origin を要求すること、到達不能時に hard error になること（既存の `unreachable: true` ケースを反転）
- `tests/ai/http-classifiers.test.ts`: 到達不能な解決結果で dispatch が起きないこと

### 単体テスト
- `tests/ai/permissions.test.ts`: `requiredHostOrigins` が openai=接続先+リゾルバ、gemini=Gemini+リゾルバ、none/built-in=空 を返すこと。既存の `originPatternsFor` の断言は変更しない
- `tests/ai/egress-dns.test.ts`: 到達不能・空応答・timeout の各分岐が block になること（`:145`、`:156`、`:309`、`:391` の反転）。loopback リテラルの例外は不変のまま固定する
- 方針の単一ソースが宣言され、`createEgressCheck` の実挙動がそれと一致すること

## 実装アプローチ

- **Outside-In**: まず `tests/ai/egress-dns.test.ts` の escape hatch ケースを反転して失敗を確認する。次に `tests/ai/permissions.test.ts` に `requiredHostOrigins` の期待を書いて失敗を確認する。そのうえで実装する
- **Red-Green-Refactor**: 許可の要求（行動 1）→ fail-closed（行動 2）の順に、それぞれ緑にしてから次へ進む。逆順にすると DoH 未許可のまま機能が止まり、`0a5372b` が直した wedge を再発させる
- **リファクタリング**: `verified` フラグが fail-closed 化で常に true になるなら、`EgressVerdict` から落とす（下記「未決の設計判断」）

## 見積もり

2pt（要チームでの見積もり）

## 技術的考慮事項

- 依存関係: なし。子 05（三者一致の検査）が本 PBI の後に実施される前提
- テスタビリティ: `ResolveDeps` と `HttpDeps.egress` の既存 seam をそのまま使える。新しいモック機構は不要
- 非機能要件: リゾルバへの追加クエリは TTL キャッシュ（`EGRESS_TTL_MS`）で 1 host あたり 30 秒 1 回に保たれている。本変更で増えないこと

## 実装者向け注記

### 現状コードの確認（着手前に実行し、済み）

```bash
grep -rn "dns.google" --include=*.ts .        # → src/ai/settings.ts:130 の定義のみ（要求なし）
grep -rn "originPatternsFor\|requestHostPermission\|permissions.request\|permissions.contains" src/
#   → src/ai/permissions.ts:21,44 / src/llm/handle-message.ts:57 / src/entrypoints/options/ai-section.ts:268-269
sed -n '128,215p' src/ai/settings.ts          # ゲート本体（DOH_ORIGIN / resolveHostAddresses / verdictOf / createEgressCheck）
sed -n '242,275p' src/ai/settings.ts          # 保存時ゲート（validateBaseUrlResolved / validateAiSettingsResolved）
grep -rn "escape hatch" src/ tests/            # → src/ai/settings.ts:251 / tests/ai/egress-dns.test.ts:4, :309
#   （他の反転対象は lets ... proceed unverified という名前。:145, :156, :391）
```

→ 検証機構は実装済みで、**未実装なのは「リゾルバ origin の要求」と「fail-closed」の 2 点**である。作り直しではなく配線と方針の変更になる。

### 実装手順

1. `tests/ai/egress-dns.test.ts` の「解決不能でも続行する」家族（`:145`、`:156`、`:309`、`:391`）を反転し、到達不能・空応答・timeout で block になる期待に変えて**失敗を確認する**。ファイル冒頭の説明コメント（`:4`「A DoH outage is an escape hatch, not a block」）と `:309` のテスト名から escape hatch の記述を外す。loopback のケース（`:96`、`:404`）は変更しない
2. `tests/ai/permissions.test.ts` に `requiredHostOrigins` の期待を追加して**失敗を確認する**。既存の `originPatternsFor` の断言（`:13-16`）は触らない
3. `src/ai/permissions.ts` に集合を足す。`originPatternsFor` の意味は変えない:

   ```ts
   import { DOH_ORIGIN, originPattern } from './settings';

   // ダイヤル時のゲートは固定の DoH origin で解決するため、利用者に求める許可は
   // 接続先の origin とリゾルバの origin の両方になる。ネットワークを使わない
   // プロバイダ（none / built-in）はどちらも要らない。
   export function requiredHostOrigins(s: AiSettings): string[] {
     const provider = originPatternsFor(s);
     return provider.length === 0 ? [] : [...provider, DOH_ORIGIN];
   }
   ```

4. 呼び出し 2 か所を差し替える: `src/entrypoints/options/ai-section.ts:268`（保存時の要求）と `src/llm/handle-message.ts:57`（状態確認の contains）
5. `src/ai/settings.ts` の `verdictOf` を fail-closed にする。空の解決結果は「内部」ではなく「確認できない」として block する:

   ```ts
   // 方針: 確認できなかった解決結果ではダイヤルしない。ここが唯一の宣言箇所で、
   // 保存時・ダイヤル時の両方がこの戻り値だけを見る。
   function verdictOf(addresses: string[]): EgressVerdict {
     if (addresses.some((ip) => isPrivateIp(ip))) return { ok: false, internal: true };
     if (addresses.length === 0) return { ok: false, internal: false };
     return { ok: true, verified: true };
   }
   ```

6. `src/ai/settings.ts` の保存時ゲートを合わせる。`!verdict.ok` の分岐で `verdict.internal` により `RESOLVED_INTERNAL_MESSAGE` と `RESOLVE_FAILED_MESSAGE`（`:245` に既存）を出し分ける。`ResolvedSettingsCheck.unreachable` と `validateAiSettingsResolved` の警告経路を廃止し、`src/entrypoints/options/ai-section.ts:301-309` を hard error の表示に変える
7. `src/ai/settings.ts` のコメント群（`:141-142`、`:167-168`、`:181-182`、`:251-252`、`:265-269`）を fail-closed の記述に書き直す。`Fail-closed` の語が「プリミティブが throw する」意味と「ダイヤルしない」意味で混ざらないようにする
8. 日英の docs を同時に更新する: `ai-providers.md:28-29`、`privacy.md:32`、`troubleshooting.md:186`、`CHANGELOG.md`（Security 節）
9. `make check` を緑にする。テスト名・コメント・docs に `escape hatch` や「スキップして続行」が残っていないか grep で確認する

### 落とし穴

- **`originPatternsFor` に `DOH_ORIGIN` を足さないこと。** `tests/ai/permissions.test.ts:13-16` の `toEqual` が落ちるだけでなく、関数の意味が変わり、次に読む人が「provider の origin を返す関数」と誤解する。別関数を足す
- **可用性の副作用を直視すること。** 許可が通っても、企業プロキシ等がネットワークレベルで `dns.google` を塞いでいる環境では、fail-closed がクラウド分類を全停止させる。`0a5372b` の wedge はまさにこれである。失う可用性を許容するかは下記の未決の設計判断で扱う
- **順序を守ること。** 許可の要求より先に fail-closed を入れると、未許可のまま機能が止まる
- **`requestHostPermission` は user gesture が要る**（`src/ai/permissions.ts:43`）。保存ボタン以外から呼ばない
- **`site/check.ts` が日英のキーと H2 の数一致を検査する。** 片方の言語だけ直すと `make site` が落ちる
- **`WXT` の manifest は宣言（`wxt.config.ts:18`）と要求（`requiredHostOrigins`）が別物のまま**である。宣言は `https://*/*` の optional で足りるが、両者が一致していることを機械的に確かめるのは子 05 の仕事。本 PBI では `requiredHostOrigins` の値を `tests/ai/permissions.test.ts` で固定するに留める
- アーカイブ済み PBI `2026-10-10-04-fix-egress-dns-validation.md` の `:49` は**変更不要**（fail-closed を要求して `[x]` のまま。本 PBI でその記述が実装と一致する）。触ると履歴が読めなくなる

### 未決の設計判断

- **`verified` フラグを残すか落とすか。** fail-closed 化により `ok: true` のとき `verified` は常に true になる。残すと「未確認でも通る」と読める余地が生まれ、今回の乖離を再生産する。落とす（`{ ok: true } | { ok: false; internal: boolean }`）と型が小さくなり、`src/entrypoints/options/ai-section.ts` の参照も消える。推奨は**落とす**。差分を最小にしたい場合は残してよいが、その場合は「常に true」であることをテストで固定する
- **リゾルバを塞ぐ網の利用者に可用性を返すか。** 返す方法は、既定 OFF の明示的なオプトイン（例:「接続先を確認できないときは続行する」を設定ページに置き、選んだ事実を保存して警告に出す）である。これは silent な fail-open を**informed consent** に変える設計で、要件記録（fail-closed）と両立しうる。ただし方針の値が 2 つになるため、子 05 の一致検査は両方を覆う必要がある。**本 PBI では実装せず、必要なら別 PBI として起票する**ことを推奨する（まず fail-closed を成立させ、可用性の要望が出てから足す）

### 着手時の決定（2026-10-11、なぜなぜ 30 回による自律境界の調査）

- 上記の未決 2 件を決定した: **verified フラグは落とす**、**可用性の返し方は本 PBI では実装しない**（台帳に記録し、可用性の要望が出てから別 PBI で扱う）。
- 実装は手順 1〜9 を自律で進める。利用者の作業として残るのは、実機確認（permission prompt の実挙動・塞がれたネットワークでの fail-closed 挙動・http localhost パス）、再監査での確認、push（明示指示時）、レビューの最終承認。
- 根拠の全文は `docs/superpowers/dig/2026-10-11-autonomy-boundary-why30.md`。

## Definition of Done

- [x] 全 BDD シナリオが自動テストとして実装されパスする
- [x] `make check` が通る
- [x] 方針が `src/ai/settings.ts` の 1 か所に書かれ、コード・テスト・docs がそこを参照している
- [x] テスト名・コメント・日英 docs から escape hatch の記述が消えている
- [ ] コードレビュー完了
- [x] リファクタリング完了（`verified` フラグは `EgressVerdict` から落とした）

### 実装の記録（2026-10-11）

- 実装: `requiredHostOrigins`（`DOH_PERMISSION_PATTERN` = `https://dns.google/*` を settings.ts に定義）を `ai-section.ts`（保存時の要求）と `handle-message.ts`（状態確認の contains）に配線。`verdictOf` を fail-closed にし、`EgressVerdict` から `verified` を落とし、保存時の `unreachable` 警告経路を廃止した
- 検証: `make check` exit 0（typecheck、79 テストファイル / 1055 passed ＋ 既存の expected fail 2、両ブラウザ build、manifest 検査、web-ext lint errors 0）。`make site` も緑。escape hatch・「検証をスキップして続行」の文言は src/tests/docs に残存なし（CHANGELOG の 0.1.13 履歴と、旧挙動の説明としての言及を除く）
- 自己レビュー（最終承認はユーザーに残す）:
  - loopback（http://127.0.0.1）の利用者にも dns.google の許可を求める（ゲートは loopback を解決しないが、許可の集合は 1 つ）。壊れないが、必要なら requiredHostOrigins で loopback を外す後続改善がある
  - gemini 利用者は許可の集合に dns.google が加わるため、旧設定のままだと permission-missing になる（再保存で解消）。本 PBI のテスト戦略（gemini=Gemini+リゾルバ）どおり
  - 解決できない結果のキャッシュは空集合のまま TTL 窓で 1 回の解決遅延に保たれる（変化なし）
- ユーザーの作業として残る項目: 実機確認（保存ボタンからの permission prompt、塞がれたネットワークでの fail-closed 挙動、http://127.0.0.1 パス）、再監査での確認、本レビューの最終承認。PBI 05 の三者一致検査の後、アーカイブする
