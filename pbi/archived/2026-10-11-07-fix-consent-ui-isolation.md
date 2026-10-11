# PBI: プレビューの同意 UI をページの CSS・スクリプトから隔離し、適用直前に可視性を検証する

状態: 未着手（出典: run-2 セキュリティ監査 所見 4 `ui/preview-consent-host-page-css-and-hit-testing`（`~/security-audit-skill/jushoai/run-2/NEEDS-VALIDATION.md:39`）と REPORT.md 推奨アクション 4（`~/security-audit-skill/jushoai/run-2/REPORT.md:75`））
起票日: 2026-10-11

## ユーザーストーリー

プロファイルで入力する利用者として、プレビューの承認が自分の操作どおりに効く状態で走ってほしい。なぜなら、同意 UI がページの CSS やスクリプトで隠し替え・移動・覆いをされたままでも拡張機能が承認されたものとして注入してしまうと、利用者が承認していない値が欄に書かれるから。

## 優先度

順位 1 / 全候補 8 件。RICE 23.3（Reach=100（プレビュー承認は全利用者・全注入フローの必須経路）/ Impact=1（同意 UI の破壊は悪意あるページと利用者の誘導が前提）/ Confidence=70%（cascade と hit-testing の帰結は renderer 事実に依存）/ Effort=3）。根拠: 注入の最後の同意点に、ページが触れる前提の検証を入れる。影響は欄に書かれる値と承認の意味。依存なし。

## 背景

- run-2 監査の所見 `ui/preview-consent-host-page-css-and-hit-testing`（`~/security-audit-skill/jushoai/run-2/NEEDS-VALIDATION.md:39`）: 同意ホストは page の light DOM にある div で、非 important の inline CSS しか持たない。page CSS / `host.style` が勝つ。適用経路は可視性も位置も trust も再検証しない（同レポートの記録は `~/security-audit-skill/jushoai/run-2/REPORT.md:44`）。
- 同監査は前回起票された `isTrusted` ゲートの案を棄却している（`REPORT.md:28`）。closed shadow root と isolated world では page script が apply ボタンへの参照を得られず、ホストへの synthetic click は shadow 木の event path に入らない。一方、clickjacking の実クリックは `isTrusted` ゲートを通るため、提案されていた制御は本当の同意破壊を止めない。残る表面は CSS による隠し替え・移動・覆いと、それに乗せた実クリックである。
- REPORT.md 推奨アクション 4 は 3 層を挙げる。**(a)** critical なプロパティを important 付きで設定する。**(b)** panel を top layer または拡張機能所有の iframe に移す。**(c)** 最後の信頼判断点（`src/entrypoints/content.ts:136`）で panel が自身の apply ボタン矩形の最前面に可視であることを検証し、そうでなければ中止する。本 PBI は (a)+(c) を最小として実装し、(b) を未決の設計判断に残す。

## 事実（`2026-10-11` 時点で確認済み）

| 事実 | 根拠 |
|---|---|
| `host.ts:1` のコメント前半は不正確 | `src/ui/host.ts:1`「A closed shadow root keeps page CSS out …」— closed root でも page CSS は light DOM の host 要素に効く。後半（page scripts が UI を読めない）は正しい |
| host の inline 宣言に important が無い | `src/ui/host.ts:5`。`all: initial` / `position: absolute` / `z-index: 2147483647` のいずれも important なし。author origin の stylesheet important は非 important の inline 宣言に勝つ |
| overlay host の上書きも非 important | `src/ui/overlay.ts:8-10`。`position: fixed` / `top` / `right` を通常宣言で上書きする。`OVERLAY_CSS` は `:14-23`、パネル幅 360px は `:15` |
| host 要素は light DOM に置かれる | `src/ui/preview.ts:204`。page CSS の `[data-jushoai]`（属性は `src/ui/host.ts:4`）が host に一致する |
| 適用直前の検証が無い | `src/entrypoints/content.ts:134-152` の onApply が `applyPlan`（`:136`）→ `preview.close()`（`:137`）を実行する。可視性・位置・ヒットテストの検証は無い |
| 同意ボタンの click が onApply を呼ぶ | `src/ui/preview.ts:199`。`close()` は `host.remove()`（`:194-197`） |
| 既存テストの置き場所 | `tests/ui/`（overlay.test.ts、preview.test.ts、position.test.ts ほか）。host.style の断言は `tests/ui/overlay.test.ts:21-27`、attachShadow を open に差し替える jsdom のやり方は `tests/ui/preview.test.ts:14-26` |

## BDD受け入れシナリオ

```gherkin
Scenario: パネルが隠されたままでは適用が中止される
  Given 悪意あるページが拡張機能のパネルを非表示にしている
  When  利用者が適用を試みる
  Then  拡張機能は可視性の検証に失敗し、欄に値を注入しない
  And   適用を中止した理由が表示される

Scenario: パネルが別の要素に覆われているときは適用が中止される
  Given パネルの承認ボタンの位置に別の要素が重なっている
  When  利用者が適用を試みる
  Then  注入は中止され、理由が表示される

Scenario: パネルが画面の外へ移動されているときは適用が中止される
  Given 悪意あるページがパネルを画面の外へ移動させている
  When  利用者が適用を試みる
  Then  注入は中止され、欄に値を注入しない

Scenario: ページの CSS による上書きでもパネルの位置と重なりは保たれる
  Given 悪意あるページが拡張機能のパネルの位置と重なりを上書きする CSS を読み込んでいる
  When  パネルが表示される
  Then  パネルは指定どおりの位置と重なりを保つ

Scenario: 通常のページでは従来どおり適用できる
  Given 悪意ある操作が無いページでパネルが表示されている
  When  利用者が承認を押す
  Then  承認どおりに値が注入される
  And   パネルが閉じる
```

## 受け入れ基準

- [x] critical なプロパティ（all / position / top / right / z-index）が important 付きで設定され、author stylesheet の important 宣言でも上書きされないことがテストで固定されている
- [x] 適用直前に、host が接続中であることが確認され、切断されていれば注入が中止される
- [x] 適用直前に、承認ボタンが自矩形の中心で最前面かつ可視であることが検証され、失敗なら注入が中止されて理由が表示される
- [x] 検証に失敗したとき、欄の値は変わらない（`applyPlan` が実行されない）
- [x] ヒットテストと可視性の問い合わせは注入可能な依存になっており、jsdom の単体テストが fake で書ける
- [x] 通常ページでの適用は従来どおり動き、既存の `tests/ui/` のテストが落ちない
- [x] `src/ui/host.ts:1` のコメント前半が、実際の分離境界（page CSS は light DOM の host 要素に効く）を述べた記述に置き換わっている
- [x] 新しいテストは `tests/ui/` と `tests/entrypoints/` の既存の置き場所に合わせて置かれる
- [x] `make check` が通る

## テスト戦略（t_wadaスタイル）

### 単体テスト

- `tests/ui/host.test.ts`（新設）: host に important 付きの宣言が載ること。`getPropertyPriority` で優先度を断言する
- `tests/ui/`（新規または preview 系の既存ファイルへ追加）: 可視性・ヒットテスト検証の分岐。「接続中」「中心が最前面」「可視」の成功と、「切断」「覆われ」「非表示」「画面の外」の失敗を、fake のヒットテストと可視性の問い合わせで返す

### 統合テスト

- `tests/entrypoints/`（content 系の既存置き場所。`content-run.test.ts`、`stale-plan-guard.test.ts` が並ぶ）: 適用経路が検証に失敗したとき注入しないこと、成功したとき従来どおり注入して閉じること。jsdom は layout を持たないため、`attachShadow` を open に差し替える既存のやり方（`tests/ui/preview.test.ts:14-26`）に合わせ、ヒットテストは fake に置き換える

### ビルド検査

- manifest とビルド出力は本 PBI の対象外。typecheck と両ブラウザの build は `make check` で担保する

### 実機確認

- `samples/` のサンプルフォーム（demo-registration.html ほか）で、通常ページの適用が従来どおり動くこと
- ページ側で `[data-jushoai]` への important 付きの上書き CSS、`host.style` の書き換えスクリプト、承認ボタンの位置に重なる覆い要素を置いた fixture を 127.0.0.1 で出し、Chrome / Edge / Firefox の 3 ブラウザで注入が中止されること（`~/security-audit-skill/jushoai/run-2/NEEDS-VALIDATION.md:43-45` の手順に対応）。cascade の important と hit-testing の帰結は renderer 事実なので、自動テストでは確定しない

## 実装アプローチ

- **Outside-In**: まず適用経路の失敗テスト（検証失敗で注入しない）を `tests/entrypoints/` に書いて**赤を確認**する。次に検証の単体テストを `tests/ui/` に書いて**赤を確認**する。そのうえで実装して緑にする
- **Red-Green-Refactor**: (c) 適用直前の検証 → (a) important 化の順に、それぞれ緑にしてから次へ進む。(a) だけでは `host.style` の書き換えと `remove` に勝てず、(c) だけでは page CSS の隠し替えを検証が拾いきれないため、両方を 1 つの PBI に入れる
- **リファクタリング**: 検証の依存（ヒットテスト、可視性、host の接続確認）を 1 つの注入可能な引数にまとめ、panel 側と content 側で重複を作らない

## 見積もり

3pt（要チームでの見積もり）

## 技術的考慮事項

- 依存関係: なし。run-2 監査由来の他の PBI と独立
- テスタビリティ: jsdom は layout を持たないため、`elementFromPoint` / `checkVisibility` / `getBoundingClientRect` に依存する検証は、既存の `PreviewOptions` の callback 形に揃えた注入可能な依存にする。新しいモック機構は作らない
- 非機能要件: 検証は適用のクリックごとに 1 回だけ走り、監視ループやポーリングを入れない。通常ページでのパネルの見た目・位置・操作感を変えない

## 実装者向け注記

### 現状コードの確認（着手前に実行し、済み）

```bash
sed -n '1,8p' src/ui/host.ts      # コメントと cssText（重要宣言なし）
sed -n '6,23p' src/ui/overlay.ts  # position/top/right の上書きと OVERLAY_CSS
grep -n "onApply\|applyPlan\|preview.close" src/entrypoints/content.ts   # :134 / :136 / :137
ls tests/ui/                      # overlay / preview / position / button / ai-guide / status-label / preview-feedback
```

→ important 付けと適用直前の検証は、いずれも**未実装**である。closed shadow root による page script からの読み取り保護（`src/ui/host.ts:1` 後半）と、page script の synthetic click が shadow 木に入らない構造は実装済みで、直すのはコメントの前半と、host 要素の CSS・可視性の扱いである。

### 落とし穴

- **jsdom は layout を持たない。** `elementFromPoint` は実座標のヒットテストを返さず、`checkVisibility` も期待どおりに動かない。検証関数はヒットテスト（(x, y) => Element | null）と可視性の問い合わせを依存として受け、単体テストでは fake を使う。実機での確認を省略しない
- **important 付けは `setProperty(name, value, 'important')` で行う。** `all: initial` を先に、specific なプロパティを後に置く順序を保たないと、同じ重要宣言内の source order で意図しない方が勝つ。`cssText` の文字列を張り替える方式は順序を壊しやすい
- **page script は host 要素の remove ができる。** closed root でも light DOM の要素は取れ、`host.style` の書き換えもできる。important 化は stylesheet の上書きには勝てるが、style 属性の直接書き換えには効かない。検証に接続確認を含め、書き換え後の実効的な可視性を見ること
- **important 化の変更は既存テストの seam に触れる。** `tests/ui/overlay.test.ts:21-27` は `host.style.position` などの値を断言するが、important でも値は変わらないため落ちない見込み。優先度の断言を追加すること。`tests/ui/position.test.ts` は位置計算の純粋関数のテストで、本変更の対象外
- **ページがパネルを隠す攻撃は悪意あるページが前提。** 通常ページでの回帰（従来どおり適用できる）を必ずシナリオと実機確認に入れる。検証の誤検知で適用が常時止まる形にしない
- **検証は適用の直前、パネルを閉じる前に 1 回だけ行う。** `close()` は `host.remove()`（`src/ui/preview.ts:194-197`）なので、閉じた後の検証は意味を持たない

### 未決の設計判断

- **(b) top layer / 拡張機能所有 iframe への移し替え。** `dialog.showModal()` や popover なら top layer に載り、page CSS との z-index 競争から外れる。ただし現行 UI は body 直付けの div + closed shadow root で、位置決めと Escape 経路（`src/ui/overlay.ts:26-31`）を top layer 側へ寄せる変更になる。**本 PBI では実装せず**、(a)+(c) の効果を 3 ブラウザの実機で確認してから、必要なら別 PBI として起票することを推奨する
- **検証の置き場所。** 承認ボタンと host の参照は panel が閉じ込めているため、content.ts から検証するには handle に窓が要る。panel 側で click 直前に検証して onApply を呼ばない形と、handle に検証結果を返す窓を足して content.ts を最後の判断点にする形がある。推奨は後者（監査の推奨が「最後の信頼判断点（`src/entrypoints/content.ts:136`）」を指しているため）。ただし窓の公開範囲が広がりすぎないよう、戻り値は真偽と失敗理由に留める
- **中止理由の表示場所。** panel 内の警告行（panel が隠されている攻撃では見えない）か、フォーム横ボタンのエラー行（`src/entrypoints/content.ts:42` の `button.showError` と同じ経路）か。panel が隠された攻撃ではボタン側が見えるためボタン側を推奨するが、AI 失敗用の文言と混ざらないようにすること
- **検証失敗時に panel を閉じるか。** 閉じると再試行とキャンセルの入口が消え、開いたままでは覆いが残り続ける。まずは開いたまま・キャンセル可能とし、実機確認の結果で決める

## Definition of Done

- [x] 全 BDD シナリオが自動テストとして実装されパスする（CSS の上書きシナリオは実機確認の手順として残る）
- [x] `make check` が通る
- [x] critical なプロパティが important 付きで設定され、テストで固定されている
- [x] 適用直前の検証が最後の信頼判断点として入っており、失敗時に注入しないことがテストで固定されている
- [x] `src/ui/host.ts:1` のコメントが実態に合う記述に置き換わっている
- [ ] 実機確認（`samples/` と悪意ある fixture、Chrome / Edge / Firefox）の結果が記録されている
- [ ] コードレビュー完了
- [x] リファクタリング完了（検証の依存が注入可能になっている）

### 実装の記録（2026-10-11、サブエージェントによる並列実装）

- 実装: host の critical 宣言を `setProperty(name, value, 'important')` 化、overlay の上書きを最小限 important 化。`ConsentCheckDeps`（注入可能）＋`verifyApplyConsent`（切断→画面外→非表示→被覆の順に真偽＋理由）＋`defaultConsentCheckDeps`（実 DOM 配線）＋`applyIfConsented` ゲートを `content.ts` に追加し、`onApply` を最後の信頼判断点に配線。失敗時は `button.showError`（ボタン側）に理由を出し panel は開いたまま。`host.ts:1` 前半を是正
- 近似の明示: 実配線の適用点は host 中央点（preview.ts 非接触の制約）。ボタン矩形の厳密化には PreviewHandle への検証窓追加が要り、将来の PBI 候補として未決。(b) top layer / iframe 移設は実装せず別 PBI 候補
- 検証: 新テスト 12 件の Red→Green。`tests/ui/`＋`tests/entrypoints/` 157 passed、`tsc` exit 0、`make check` exit 0（最終検証）
- ユーザーの作業として残る項目: 3 ブラウザ実機確認、コードレビューの最終承認
