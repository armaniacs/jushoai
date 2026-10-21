# クロスオリジン iframe 対応 設計書（影響調査）

トップフレームのみで動く現行のコンテンツスクリプトを、埋め込み予約ウィジェットや外部決済フォームがある iframe 内にも効かせる可否を確定する。実装はこの文書では行わず、フレーム境界に関わる実装箇所の全数、`all_frames` 化の影響評価、段階的対応案の比較と推奨だけを定める。起点は `pbi/2026-10-21-123-backlog-iframe-investigation.md` で、TODO 台帳の項 9（`docs/todo-not-todo.md:70-73`）と深掘りセッションの着手判断（`docs/superpowers/dig/2026-10-17-todo-not-todo-boundary.md:36-42`）を受けた調査の完遂物である。

## 背景と動機

- 現行は `matches: ['<all_urls>']` で `all_frames` の指定がなく、コンテンツスクリプトはトップフレームにしか入らない。ページに埋め込まれた iframe 内のフォーム（予約ウィジェット・外部決済・アンケート埋め込み）では、分類・注入・プレビューのいずれも動かない
- 効けば主要ユースケースに届くが、`all_frames` 化はコード 1 行のフラグ変更ではない。監査ログの URL 解釈、除外 URL ゲート、ポップアップのメッセージ配信、UI の配置、分類メタデータの送信量に波及し、波及の全数と需要側の証拠の両方が揃って初めて着手コストを正当化できる
- 需要側の実績は現状ゼロ。fixture 20 件（`samples/`）と URL 台帳 7 件（`tests/target-url.md`）に iframe 内フォームの実測はなく、`iframe` を含む fixture も 0 件

## 現状（実装事実）

### 実行スコープ

- コンテンツスクリプトは `src/entrypoints/content.ts:98-101` の `defineContentScript` で登録され、`matches: ['<all_urls>']` + `runAt: 'document_idle'` + `all_frames` 未指定。ビルド済み manifest（`dist/chrome-mv3/manifest.json`）にも `all_frames` キーは出ておらず、MV3 の既定（false）でトップフレームのみに注入される。WXT は `allFrames` オプションで manifest の `all_frames` を出せる
- バンドルは `dist/chrome-mv3/content-scripts/content.js` で約 71KB（実測 71,103 バイト）。`all_frames` 化するとフレームごとにこの評価と `main()` が走る

```
ページ（トップフレーム）  ── main() x 1 ──▶ scan/observe/UI/分類（現行）
iframe（クロスオリジン）  ── main() x フレーム数（all_frames 化後）──▶ 同じパイプラインが複製される
  └─ ai-classify → background → 監査（pageUrl = sender.tab?.url はタブ URL）
```

- `main()` の状態（検出済みフォームのボタン、実行中フラグ、開いているプレビューとガイド）は `src/entrypoints/content.ts:102-105` のクロージャで、フレーム 1 つにつき 1 セット。フレーム単位で独立する
- `src/` 全体に `window.top`・`frameElement` 参照はなく（grep で 0 件）、トップフレームのみという前提が `document`/`window` への直接参照として各所に暗黙に焼き付いている

### フレーム境界に関わる実装箇所（全数）

| 領域 | 箇所 | 現在の振る舞い |
|---|---|---|
| 走査 | `src/entrypoints/content.ts:169`（scanContainer）、`264`・`304`（detectForms）、`258-261`（sync の署名走査） | ルートは `main()` の `document`。トップフレームの DOM のみ |
| 走査 | `src/entrypoints/content.ts:355-361`（MutationObserver）、`33-41`（プリフィルタ） | `document.body` へ subtree+attributes+characterData。フレームあたり 1 observer |
| 走査 | `src/dom/scan-fields.ts:125-161`、`src/dom/detect-forms.ts:88-108` | root 引数に閉じた querySelectorAll。DOM 依存は dom/ に限られ core/ はフレーム非依存 |
| UI 配置 | `src/ui/button.ts:35,64,107-131`、`src/ui/position.ts:12-28` | host は自分のフレームの `document.body` に position: fixed。配置計算はフレームのビューポート基準 |
| UI 配置 | `src/ui/panel.ts:28-90,159-186`、`src/content/consent-check.ts:85-97` | パネルも `document.body` に固定。keydown・scroll・resize の監視と elementFromPoint はフレーム内に閉じる |
| 監査ログ | `src/entrypoints/background.ts:70`、`src/llm/handle-message.ts:13-15` | 監査の pageUrl は `sender.tab?.url`。分類の依頼元がどのフレームでもタブ（トップフレームの文書）の URL に帰属する |
| 監査ログ | `src/ai/audit-log.ts:48-55` | 保存前に origin のみへ最小化（minimizeAuditPageUrl） |
| フィードバック URL | `src/entrypoints/content.ts:176-181`、`src/feedback/issue-url.ts:21-51` | `location.href` から origin+先頭 1 パスを切り出して公開 issue に載せる |
| 除外 URL ゲート | `src/entrypoints/content.ts:252,371`、`src/content/exclusion-gate.ts:23-48` | `window.location.href`（フレーム URL）に対し prefix 一致で start/stop |
| メッセージ配信 | `src/entrypoints/popup/main.ts:27`、`src/entrypoints/content.ts:294-315` | `chrome.tabs.sendMessage` は frameId 未指定でタブ内の全フレームに配信。リスナはトップフレームにしかない |
| メッセージ送信 | `src/llm/background-gateway.ts:37`、`src/entrypoints/background.ts:52-54` | フレームから background へ runtime メッセージ。sender.id で自拡張のみ許可 |
| メタデータ送信 | `src/messages.ts:132-155`、`src/ai/audited-classifier.ts:50-88` | 判定不能欄のみ encodeFieldMeta（8 キーの allow-list）でプロバイダへ。value は落とす |

### 送信データの README 記述（現状評価）

- `README.md:68-72`「送信されるデータ」: 通信は「JushoAI で入力」を押したときだけで、ページを開いただけでは何も送らない。ルールで判定できない入力欄のメタデータ（name・label・placeholder・見出し・type・maxlength）が、選んだプロバイダに送られる。プロファイルの値や欄に入っている値は送らない
- この記述は all_frames 化しても誤りにはならない（通信発生条件・内訳とも不変）。変わるのは「入力欄」の範囲で、第三者が提供する iframe 内の欄のメタデータも送信対象に入る点は現記述に明示がない
- `README.en.md` も同じ節を持ち、site の日英対応検査があるため、更新するなら両方に同じ変更が要る
- Firefox の `data_collection_permissions`（`optional: ['websiteContent']`、`wxt.config.ts:29`）は宣言変更が不要。同意ダイアログの対象（ウェブサイトのコンテンツ）はフレームの有無で変わらない

## 設計判断材料

### パフォーマンス

- 固定費がフレーム数倍になる: バンドルの評価（約 71KB）、`MutationObserver` の登録（`content.ts:355-361`）、`sync()` の署名走査（`258-261`）、`detectForms`、除外 URL 評価、`storage.onChanged` 登録。広告・計測 iframe の多いページでフレーム数は数十に達し、ページ表示のたびに繰り返される
- 単価は PBI-21 のプリフィルタ（`content.ts:22-96`）で抑えられているが、プリフィルタ自体もフレームごとに動くため固定費の削減にはならない
- 検出ゲート（`detect-forms.ts:12-13`、MIN_CONTROLS 3 + MIN_CLASSIFIED 2）が「フォームのない iframe に UI を出さない」自然なフィルタになる。ただし走査・observer は UI 有無と関係なく走る
- 実測は未実施。着手する場合は、広告 iframe の多い実ページでフレーム数・スクリプト評価時間・observer 通知回数を before/after で計測する工程を最初に置く

### 権限

- host permissions はオリジン単位の API アクセスで、`content_scripts[].all_frames` とは独立。注入の可否は `matches` がフレーム URL に対して個別に評価して決めるため、`all_frames: true` にしても `wxt.config.ts:22-23` の permissions・optional_host_permissions は 1 つも変わらない
- ユーザーへの権限表示（「すべてのサイトでデータを読み取る」等）も現行の `<all_urls>` から変化しない
- Firefox の `data_collection_permissions` は宣言変更不要。AMO 審査では「第三者 iframe 内のコンテンツに触れる」説明が増える程度

### 監査ログの URL 解釈

- 現在、監査エントリの pageUrl は `sender.tab?.url`（`background.ts:70`）で、分類の依頼元がどのフレームでもタブ（トップフレームの文書）の URL に帰属する。[MDN: runtime.MessageSender](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/MessageSender) では、スクリプトが iframe 内で動く場合の `sender.url` は iframe の URL、`sender.frameId` は子フレームで正の値になる
- all_frames 化しても `sender.tab?.url` のままなら、iframe 由来の分類も「埋め込んでいるページ」に帰属し続ける。`README.md:80` の記述（送った内容と応答がこの端末に記録される）は URL の出所を述べていないため成立し続ける
- iframe 単位の帰属に変えるなら `sender.url`（または sender.origin + frameId）への切替が必要で、「ページが埋め込んでいるサードパーティの URL」を監査に残す意味づけの決定が要る

### プレビューボタンの配置

- `mountButton`（`button.ts:30-64`）の host は自分のフレームの `document.body` に置かれ、`position: fixed` は iframe 内では iframe のビューポート基準。300x250 程度の小さい iframe では `computeButtonPosition` はそのビューポートに収まるよう動くが、物理的に狭く表示品質が落ちる
- プレビュー・ガイドのパネル（`panel.ts`）と同意チェック（`consent-check.ts:85-97` の elementFromPoint）もフレーム内で完結するため機能としては動く。「どのフレームに UI を出すか」のゲート（フォーム有無のみで通すか、フレームの可視サイズの下限を設けるか）は設計として決める必要がある
- ボタン押下 → 分類 → プレビュー承認 → 注入のフロー（`CLAUDE.md` の約束事）はフレーム内で独立して成立する。フレームをまたぐ注入は発生しない

### 分類メタデータ送信と README 更新

- iframe 内の欄が分類対象に加わると、判定不能欄分だけ LLM へのメタデータが増える。1 フォームあたりの欄数は小さいが、対象に第三者コンテンツ内の文字（label・見出し）が含まれる点が変わる
- README 更新要否: all_frames 化するなら「必要（1 文の追記）」。例として「ページに埋め込まれた iframe 内のフォームも対象になり、その欄のメタデータも送られる」を `README.md:70` と `README.en.md` の対応節に足す。対象外維持なら更新不要
- `content.ts:177` の `location.href` は iframe 内では iframe の URL になり、公開 issue にサードパーティの URL が載り得る。トップページ URL を使うには background 経由でタブ URL を取得する経路の追加が必要（除外ゲートの `252`・`371` も同様にフレーム URL 判定へ変わる）

## 段階的対応案の比較

| 案 | 内容 | 効果 | コストとリスク |
|---|---|---|---|
| a. all_frames 一括 | `allFrames: true` + フレームゲート（フォーム有無・可視サイズ）。監査の URL 帰属と popup 配信の対応を同梱 | 予約ウィジェット・外部決済を含む iframe 全般に届く。動機を最も直接満たす | 固定費がフレーム数倍。変更点は表の全領域（走査・UI・監査・ゲート・配信・README）。フィードバック URL がサードパーティ URL を公開し得る。計測が前提 |
| b. same-origin のみ | (b1) allFrames + 起動ゲートで親と同一オリジンのフレームだけ続行、(b2) トップフレームから同一オリジン iframe の contentDocument を直接走査 | (b1) は注入コストが a と同じで効果は狭窄のみ。(b2) は注入コスト 0 だが `main()` 全体を per-document 化する改造が最大 | 動機の本丸（予約ウィジェット・決済）はほぼクロスオリジンで、b はコストの割に届かない |
| c. 対象外維持 | 現状のまま。本書で判断材料と再開条件を残す | 劣化なし。固定費・波及・README 更新はすべて発生しない | iframe 内フォームは効かないまま。需要が現れたときに追い直す必要がある（本書が下支えする） |

## 推奨と次の着手判断

- 推奨は **c. 対象外維持**。実装 PBI は作らない
- 材料: (1) 需要の実績がゼロ。fixture 20 件・URL 台帳 7 件ともトップフレームのフォームで、iframe を含む fixture は 0 件。PBI の RICE も Impact 2 / Confidence 50%。 (2) a は変更点が 6 領域に波及し、計測による下振れのないまま固定費を上げる判断になる。 (3) b は注入コスト削減にならず（b1）、または改造コストが最大で効果が届かない（b2）。 (4) 深掘りセッションの着手判断（2026-10-17、調査完遂を条件に着手）に対し、調査の完遂は「着手しない」を正当に決められる情報を返す
- 再開条件（トリガ）: `tests/target-url.md` または `samples/` に iframe 内フォームの実測が 1 件以上入る、またはユーザーからの報告（埋め込みウィジェットで効かない）が 1 件以上届く
- 再開時の最初の工程: (1) 広告 iframe の多い実ページでの計測（パフォーマンス節）。 (2) 監査ログとフィードバック URL の帰属方針決定（`sender.tab?.url` 維持か `sender.url` 切替か）。 (3) a を 1 本の実装 PBI にする（フレームゲート・popup の frameId 指定・README 日英追記を同梱）
- 本書の結論を台帳（`docs/todo-not-todo.md` の項 9）と PBI に反映するかは本 PBI の外（親の判断）。コード変更は一切していない

## 非目標

- 実装（コード・manifest の変更）はしない。本書は調査と設計判断だけを定める
- same-origin iframe をトップフレームから直接走査する案（b2）の詳細設計はしない。非推奨の根拠を示すまで
- 監査ログの URL 帰属方針の決定はしない。再開時の工程として記録する
- パフォーマンスの実測はしない。着手条件側の工程として手順の位置づけまで
- README・PBI 台帳・`docs/todo-not-todo.md` の編集はしない
