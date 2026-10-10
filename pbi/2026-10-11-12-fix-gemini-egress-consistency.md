# PBI: Gemini 経路に egress ゲートを渡さない判断を 1 か所に記録し、配線するかを受容として確定する

状態: 未着手（run-2 セキュリティ監査 `~/security-audit-skill/jushoai/run-2/REPORT.md` の差分 5「Gemini 経路の egress 欠落は finding にしない」から起票）
起票日: 2026-10-11

## ユーザーストーリー

この拡張機能を保守する開発者として、Gemini 経路に宛先の検査（egress ゲート）を渡していないことが、意図した受容として記録された状態でコードを読みたい。なぜなら、現状は実害が無いものの、その理由がどこにも書かれていないため、次に読む人が「渡し忘れ」と「通さない判断」を区別できず、同じ事実が複数の場所で別々に主張される事故（この repo が run-2 で学んだ方針記録の分散）の再生産につながるから。

## 優先度

順位 6 / 全候補 8 件。RICE 1.25（Reach=5（Gemini プロバイダを選ぶ層）/ Impact=0.25（実害は無く、整合性の記録が本体）/ Confidence=100%（事実は確定）/ Effort=1）。根拠: 攻撃者が制御する宛先が存在しないため、実害の修正ではなく判断の記録と docs の整合が本体。コメント 1 か所と日英 docs 2 ファイルで収まるため Effort 1。依存なし（ただし実施順は進行中 PBI 05 の後が自然で、配線の判断を含める場合は PBI 09 の設計判断の後）。

## 背景

- run-2 監査の差分 5（`~/security-audit-skill/jushoai/run-2/REPORT.md`）は、Gemini 経路の egress 欠落を独立した finding にしない判断を記録している。根拠は「Gemini の宛先は compile-time 定数で、apiVersion は正規表現検証・model は encode されるため、攻撃者が制御する宛先が存在しない」。その一方で、欠落自体は**整合性の欠缺**として hardening note に残っている。
- 進行中 PBI 05（`2026-10-11-05-feat-declaration-request-use-check.md`）の背景（`:18`）も同じ欠陥を「宣言・要求・使用を突き合わせれば視界に入る」例として挙げているが、判断の記録を担う成果物はどれも無い。
- 宛先が固定である精度は検証に耐えるものある。apiVersion は正規表現で検証され（`src/ai/settings.ts:236`）、model は `encodeURIComponent` で encode され（`src/ai/http-classifiers.ts:104`）、URL の根は定数である（`src/ai/types.ts:53`）。
- 一方、通さない判断がコードに無いため、次に読む人は `createGeminiClassifier` が egress を受け取らないのを「openai 側（`src/llm/handle-message.ts:108-116`）との非対称」にしか読めない。この repo は「方針を記録する成果物と強制する成果物が分離し、同期の担い手が人間の記憶だけ」だった事故（進行中 PBI 05 の背景 `:17`）と、引用がずれたまま残った実例（run-2 REPORT.md の差分 7）を学んでいる。判断は 1 か所に書き、docs と一致検査はそこを参照する形にする。

## 事実

| 事実 | 根拠 |
|---|---|
| openai は `deps.egress` をクラシファイアに渡す | `src/llm/handle-message.ts:108-116`（`egress: deps.egress` は `:111`） |
| gemini は `fetch` だけを渡し、egress を渡さない | `src/llm/handle-message.ts:117-118` |
| openai の既定 egress は `deps.egress ?? autoEgress()` | `src/ai/http-classifiers.ts:264`（`autoEgress` は `:251-254`、vitest では undefined） |
| gemini は `deps` をそのまま渡し、既定値を作らない | `src/ai/http-classifiers.ts:268-269` |
| `HttpClassifier.send` は egress があれば dial 直前に呼ぶ | `src/ai/http-classifiers.ts:189-201`（`:197` verdict、`:199-201` block） |
| gemini の宛先は compile-time 定数 | `src/ai/types.ts:53-54`（`GEMINI_BASE_URL` / `GEMINI_ORIGIN`） |
| 要求 URL は定数＋apiVersion＋encode された model | `src/ai/http-classifiers.ts:93-107`（URL は `:104`、`encodeURIComponent(cfg.model)`） |
| apiVersion は正規表現で検証される | `src/ai/settings.ts:236-238`（`/^v\d+((alpha|beta)\d*)?$/`） |
| 保存時の検証は gemini を解決しない | `src/ai/settings.ts:279`（openai 以外は早期 return）＋ `tests/ai/egress-dns.test.ts:260-281`（`doh.calls` が空であることを断言） |
| gemini の要求側 origin は `originPatternsFor` が返す `GEMINI_ORIGIN` | `src/ai/permissions.ts:21-28`（`:22`） |
| gemini の既存の分類テストは egress を渡さない | `tests/ai/http-classifiers.test.ts:110`、`:120`、`:217` |
| 「gemini に egress を通さない」判断の記録は存在しない | `grep -rn "egress" src/ | grep -i gemini` が空。`src/ai/http-classifiers.ts:42-43` のコメントは openai の既定値のみに言及 |
| docs の egress の説明は openai 互換の節にのみあり、Gemini の節は宛先が固定である旨を書いていない | `site/content/{ja,en}/ai-providers.md:28-29`（egress の説明）／`:45-51`（Google Gemini の節。設定項目のみ） |

## BDD受け入れシナリオ

```gherkin
Scenario: Gemini の送信先が一致検査の視界に入る
  Given プロバイダに Google Gemini を選んだ利用者の設定がある
  When  宣言・要求・使用の一致検査を実行する
  Then  検査は Gemini の送信先を追跡している
  And   送信先の検査を通さない判断が、コードの記録と一致している

Scenario: 送信先の検査を通さない理由が 1 か所から導かれる
  Given 送信先の検査を通さない理由がコードの 1 か所に記録されている
  When  コードとドキュメントを確認する
  Then  理由が複数の場所で重複して主張されていない
  And   ドキュメントと一致検査はコードの記録を参照している

Scenario: Gemini を選んだ利用者の分類は今までどおり動く
  Given プロバイダに Google Gemini を選び、API キーを保存している
  When  「JushoAI で入力」で分類を実行する
  Then  送信先が固定の宛先であるため、分類は宛先の検証を待たずに続く
  And   残りの欄はルール分類だけで続く
```

## 受け入れ基準

- [ ] `createGeminiClassifier` の近傍に「宛先が compile-time 定数で攻撃者が制御する宛先が存在しないため、送信先の検査を通さない」旨のコメントが 1 か所ある
- [ ] その理由の本文がコード内で 1 か所のみで、`src/llm/handle-message.ts` の gemini の配線箇所と `HttpDeps` のコメントはそこを参照する形になっている（同じ事実を別々に主張しない）
- [ ] `site/content/{ja,en}/ai-providers.md` の「Google Gemini」の節に同じ理由が利用者向けの言葉で書かれ、日英の対応が取れている
- [ ] 進行中 PBI 05 の三者一致検査が、Gemini の送信先をコードから import して視界に入れる（URL をテストに書き写さない）
- [ ] 配線するか受容するかの判断が、この PBI の決定として記録される（未決のまま残らない）
- [ ] gemini の既存テスト（分類・保存時の検証）と docs の挙動の記述が現行のまま緑である
- [ ] `make check` が通る

## テスト戦略（t_wadaスタイル）

### 単体テスト
- 挙動を変えないため、新しい単体テストは原則不要。既存の回帰が緑のままであることを受容の確認として固定する:
  - `tests/ai/egress-dns.test.ts:260-281`（保存時の検証が gemini を解決しない）
  - `tests/ai/http-classifiers.test.ts:110`、`:120`、`:217`（gemini の分類が検査なしで動く）
- 「理由が 1 か所に集まっている」ことは `grep -rn "egress" src/ --include=*.ts | grep -i gemini` が空であること（理由の本文を書いた箇所が 1 か所に限る）で確認する。ソースを読んで数える単体テストにするのは過剰なので、grep 確認に留める

### ビルド検査
- docs の変更は `make site`（日英のキーと H2 の数一致）で検査される
- 進行中 PBI 05 の一致検査（`tests/build/host-permission-coverage.build.ts`、`make test-build`）が入っていれば、gemini の送信先がコードから import されていることをその検査が確認する

## 実装アプローチ

- **Red-Green は不要**。受容の記録が本体で、順序は ①コメント 1 か所 → ②docs（日英同時）→ ③一致検査との組込み確認の順
- **PBI 05 との協調**: Gemini の送信先を一致検査に視界に入れる実装は PBI 05 側の仕事になる。本 PBI は、検査が import する定数（宣言側 `GEMINI_ORIGIN`、要求側 `originPatternsFor` の戻り値）が揃っていることを確認して整合を取る
- **配線（a）を採る判断をした場合**は「未決の設計判断」の手順に従い、分類時の TTL の設計（PBI 09）と同時に確定させる。単独で配線しない

## 見積もり

1pt（要チームでの見積もり）

## 技術的考慮事項

- 依存関係: 進行中 PBI 05（三者一致検査）の後が自然。配線の判断を含める場合は PBI 09（`2026-10-11-09-fix-egress-verdict-cache-ttl.md`）の設計判断の後
- テスタビリティ: 挙動を変えないため既存の seam と既存テストで足りる。新しいモック機構は不要
- 非機能要件: gemini 分類のレイテンシを増やさない。宛先が compile-time 定数である以上、分類ごとの DoH 往復を足す理由は無い（PBI 09 の判断次第で前提が変わるため、下記の未決の設計判断に記録）

## 実装者向け注記

### 現状コードの確認（着手前に実行し、済み）

```bash
grep -rn "egress" src/ --include=*.ts | grep -i gemini
#   → 空。gemini に送信先の検査を通さない判断を書いたコメントは存在しない
sed -n '105,120p' src/llm/handle-message.ts    # → openai は deps.egress を渡す（:108-116、egress は :111）。
#     gemini は { fetch: deps.fetch } のみ（:117-118）
sed -n '250,269p' src/ai/http-classifiers.ts   # → openai の既定値は :264（deps.egress ?? autoEgress()）。
#     gemini は deps をそのまま渡す（:268-269）。autoEgress は :251-254 で vitest では undefined
sed -n '189,201p' src/ai/http-classifiers.ts   # → HttpClassifier.send の gate 本体。:190 で有無、:197 で verdict
sed -n '50,55p' src/ai/types.ts                # → GEMINI_BASE_URL / GEMINI_ORIGIN（:53-54）
sed -n '93,107p' src/ai/http-classifiers.ts    # → buildGeminiRequest（:93-107、URL は :104）
sed -n '234,240p' src/ai/settings.ts           # → apiVersion の正規表現検証（:236）
sed -n '255,282p' tests/ai/egress-dns.test.ts  # → 保存時の検証が gemini を解決しない現行挙動（:260-281）
```

→ gemini に宛先の検査を通さない判断の記録は**どこにも無い**。検査の機構と既定値の配線は openai 側にのみ存在する。作り直しではなく記録と判断の確定になる。

### 落とし穴

- **記録は 1 か所に。** コメント・docs・一致検査の 3 か所が同じ事実を別々に主張しない。理由の本文は `createGeminiClassifier` のコメント 1 か所に書き、docs は利用者向けの言葉で「Gemini の送信先は固定」と述べる形に、一致検査はコードから import した事実を主張する形にする。この repo は「方針の記録が 4 か所に分散し、1 か所だけ古い」事故（進行中 PBI 05 の背景 `:17`）と、引用がずれたまま残った実例（run-2 REPORT.md の差分 7）を学んでいる
- **記録の置き場所を `HttpDeps` にしない。** `src/ai/http-classifiers.ts:42-43` のコメントは openai の既定値の説明として役割が決まっている。ここに gemini の理由を足すと 2 か所目になり、更新漏れの温床になる
- **配線（a）を入れたときに影響を受けるテストは保存時ではない。** `tests/ai/egress-dns.test.ts:260-281` は保存時の検証（`validateAiSettingsResolved`）で、gemini は openai 以外として早期 return される（`src/ai/settings.ts:279`）。分類側に配線してもこのテストは変わらない。変わるのは分類時で、`tests/ai/egress-dns.test.ts` の分類時の describe（`:284-`）に gemini のケースを足す形になる。既存の gemini 分類テスト（`tests/ai/http-classifiers.test.ts:110`、`:120`、`:217`）は検査を渡さないため、vitest では `autoEgress()` が undefined（`src/ai/http-classifiers.ts:251-254`）で緑のまま
- **docs は日英同時に。** `site/check.ts` が日英のキーと H2 の数一致を検査し、片方だけ直すと `make site` が落ちる
- **PBI 09 の判断を先に読むこと。** 分類時の TTL（per-call 解決）の設計判断が確定する前に配線（a）を入れると、Gemini 分類のコストの前提が後から変わる。配線する場合は PBI 09 の後に確定する

### 未決の設計判断

- **(a) 配線するか（b) 受容して記録するか。** 推奨は (b)。(a) の場合のコスト: PBI 09（`2026-10-11-09-fix-egress-verdict-cache-ttl.md`。本 PBI 起票時点では `pbi/` に未作成だったが、起票後に `pbi/2026-10-11-09-fix-egress-verdict-cache-ttl.md` として作成済み。run-2 REPORT.md の差分 3 の TTL キャッシュの記録から起票）が per-call 解決に倒した場合、Gemini の分類 1 回ごとに A・AAAA の 2 つの DoH クエリ（`src/ai/settings.ts:166`）が増える。宛先が compile-time 定数（`src/ai/types.ts:53`）である以上、この往復に防御上の意味は無い。なお現行の TTL キャッシュ（30 秒、SW 生存中 1 インスタンス。`src/entrypoints/background.ts:23-26`）でも openai 側は最大 30 秒に 1 回解決が走る点は (a)（b) とも変わらない
- **一致検査への組込み方法。** Gemini の送信先は、宣言側が `GEMINI_ORIGIN`（`src/ai/types.ts:54`）、要求側が `originPatternsFor` が返す `GEMINI_ORIGIN`（`src/ai/permissions.ts:22`）で揃っている。検査はコードから import して揃いを確認する形にする（URL を書き写すと実装側の定数を変えたときに検査だけが古い事実を主張する。進行中 PBI 05 の落とし穴と同じ）。検査自体を実装するのが PBI 05 か本 PBI かは、05 の着手状況を見て決める

## Definition of Done

- [ ] 全 BDD シナリオが自動テストまたは機械的な確認（grep、`make site`、進行中 PBI 05 の一致検査）で検証されている
- [ ] `make check` が通る
- [ ] Gemini に宛先の検査を通さない理由がコードの 1 か所に記録され、docs と一致検査がそこを参照している
- [ ] （a）/（b）の判断が決定として記録され、未決のまま残っていない
- [ ] コードレビュー完了
