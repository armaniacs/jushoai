# PBI: 起動させないURLを設定画面から登録する

状態: 未着手
起票日: 2026-10-12

## ユーザーストーリー

JushoAI の利用者として、JushoAI を起動させたくない URL を設定画面から登録したい。なぜなら Google スプレッドシートのような、フォーム入力の補完が無関係なページでもボタンが出てしまい、作業の邪魔になるから。

## ビジネス価値

- 無関係なページでボタンが出なくなり、日常の作業が邪魔されない
- 利用者が自分で対象を決められるため、「このサイトで出てほしくない」という要望に、コード変更なしで答えられる
- 測定: 除外 URL を1件以上登録した利用者数、および除外 URL 上での起動回数が 0 であること

## 優先度

- 実施順: 進行中の 40〜45（0.1.14 レビューの衛生項目）より先
- RICEスコア: 4.0（Reach=1 / Impact=2 / Confidence=80% / Effort=0.5 人週 = 5pt 相当）
- 根拠: 利用者が体感できる不便の解消であり、衛生項目と違い直接の価値がある。利用者ごとに「邪魔なページ」は違うため、伸びしろも大きい

## BDD受け入れシナリオ

```gherkin
Scenario: 登録したURLでは起動しない
  Given 利用者が設定画面を開いている
  When  https://docs.google.com/spreadsheets/ を追加して保存する
  Then  そのURL配下のページを開いても JushoAI のボタンは表示されない

Scenario: 開いているタブにも即時反映される
  Given https://docs.google.com/spreadsheets/ を開いていてボタンが表示されている
  When  設定画面で同じURLを追加して保存する
  Then  開いているタブのボタンが消える

Scenario: 前置一致の境界で、別のパスは起動する
  Given https://docs.google.com/spreadsheets/ を登録している
  When  https://docs.google.com/document/ を開く
  Then  ボタンは通常どおり表示される

Scenario: 登録を削除すると元に戻る
  Given https://docs.google.com/spreadsheets/ を登録している
  When  一覧からそのURLを削除して保存する
  Then  同じページでボタンが再び表示される

Scenario: 不正な入力は保存できない
  Given 利用者が設定画面の除外URL欄にいる
  When  https:// で始まらない文字列や空文字を追加しようとする
  Then  保存されず、直すべき点が画面に表示される
```

## 受け入れ基準

- [x] 設定画面に入力欄と一覧があり、URLの追加と削除ができる
- [x] 一致は**前置一致**（登録した文字列で始まる URL を除外）。大文字小文字の違いは一致に影響しない
- [x] `http://` または `https://` で始まらない入力、空白のみの入力は保存されず、理由が表示される
- [x] 同じエントリは重複しない。件数と1件あたりの長さに上限があり、上限超過は理由とともに拒否される
- [x] 除外されたページでは、ボタンの表示だけでなく、フォームの走査と監視も行わない
- [x] 設定の保存後、開いているタブにも反映される（除外されたらボタンが消え、除外が外れたら再び表示される）
- [x] 同一タブ内で URL が変わったとき（履歴 API を使うページ）も、除外の判定がやり直される
- [x] Chrome / Firefox の両方で動く（実機 E2E が両方で緑）
- [x] 既存の `make check` が緑のまま

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 設定でURLを追加 → 対象ページを開いてボタンが出ないこと（Chrome / Firefox の既存 E2E に1ケース追加）
- 対象ページを開いたまま設定で追加 → ボタンが消えること

### 統合テスト
- 保存した一覧が設定画面の再読み込み後も復元されること
- 除外の変更通知を受けたコンテンツスクリプトが、ボタンを破棄し、監視を止めること（偽の runtime で確認）

### 単体テスト
- 前置一致の判定: 一致する / しない / 大文字小文字違い / 前方一致だが別ホスト / 空の一覧
- 入力の正規化と検証: 前後の空白、`http://` と `https://`、スキームなし、`javascript:`、空文字、重複、件数上限、長さ上限
- 境界値: 登録文字列と完全一致する URL、登録文字列の直後が `/` 以外の URL

## 実装アプローチ

- **Outside-In**: 実ブラウザの E2E（ボタンが出ない）から始め、失敗を確認してから統合・単体・実装へ降りる
- **Red-Green-Refactor**: 判定の純粋関数から着手し、検証 → ストア → 設定画面 → コンテンツスクリプトの順に、各段で赤から緑にする
- **リファクタリング**: 早期リターンと監視の起動・停止が絡むため、コンテンツスクリプトの入口を起こす/止めるの2つの責務に整理してから除外判定を差し込む

## 見積もり

5pt（要チームでの見積もり）

## 技術的考慮事項

- 依存関係: なし
- テスタビリティ: 判定と検証は DOM にも `chrome.*` にも依存しない純粋関数に置き、ストアと画面は薄い層にする。設定変更の通知はメッセージ型を1つ足すだけで済ませる
- 非機能要件: 除外一覧は起動のたびに読むため、件数と長さに上限を設けて入力の大きさを有界にする。判定はページ表示の経路に入るので、リストが伸びても線形で収まる範囲に抑える
- プライバシー: 除外 URL は利用者の端末内（`chrome.storage.local`）にのみ保存し、外部に送らない

## 実装者向け注記

### 現状コードの確認（着手前に必ず実行すること）

```bash
# 除外URL・ホストの設定が既にあるか（2026-10-12 時点では未実装）
grep -rniE "除外|exclude|denylist|blocklist|allowlist|skipHosts" src/ --include="*.ts"
```

2026-10-12 の調査結果:

- 除外URLの設定は**未実装**。`exclude` の一致は `src/core/classify-rules.ts` の社名除外語彙のみで、起動制御とは無関係
- 保存先は `jushoai:data`（プロファイル・住所、`src/storage.ts`）、`jushoai:ai-settings`（`src/ai/settings-store.ts`）、`jushoai:audit-log`（`src/ai/audit-log.ts`）の3キー。除外一覧はこれらと別のキーにする
- `src/entrypoints/content.ts` は `matches: ['<all_urls>']` で全ページに注入され、**保存データの有無に関わらずボタンを表示する**（`loadData` はボタン押下時に初めて呼ばれる）。したがって「起動させない」は `main()` の入口での早期リターンとして実装する
- 設定画面は `src/entrypoints/options/main.ts` が `mountAiSection` / `mountAuditSection` を呼ぶ構成。除外一覧は同じ形で1セクション追加する

### 実装手順

1. E2E（`tests/e2e/`）に「除外URLを登録するとボタンが出ない」を追加し、失敗を確認する
2. 純粋関数（`src/core/` 配下を想定）に、入力の正規化・検証と前置一致の判定を置き、単体テストを赤から緑にする。判定は「一覧が空なら常に false」「大文字小文字を無視」「登録文字列そのものにも一致」を満たす
3. ストア（`chrome.storage.local` の新キー）を追加し、読み書きを統合テストで固定する。破損した値（配列でない・文字列以外を含む）は空の一覧として扱い、起動を止めない
4. 設定画面にセクションを追加する（入力欄＋追加ボタン＋削除付き一覧＋保存時の通知表示）。既存の `audit-section` の作りに合わせる
5. メッセージ型を `src/messages.ts` に足し、保存時に送る。コンテンツスクリプトは受信時に一覧を読み直して判定し直す
6. `src/entrypoints/content.ts` の入口を「起動（監視の登録と初回同期）」と「停止（監視の解除と表示中ボタンの破棄）」に分け、除外の判定を両方の入口に差し込む。履歴 API で URL が変わるページのために、同期のたびに `location.href` で判定し直す
7. `make check` と両ブラウザの E2E を通す

### 落とし穴

- **除外は「ボタンを隠す」ではなく「起動しない」**: 走査（`detectForms`）と監視（`MutationObserver`）も止める。隠すだけだと、除外したページで裏側の処理が動き続ける
- **既に開いているタブへの反映**: 保存時に開いているページは読み込み直されない。メッセージで再判定させないと、利用者は「保存したのに消えない」と感じる
- **SPA の URL 変更**: Google スプレッドシート等はページ遷移でコンテンツスクリプトが再実行されない。同期時に URL を見直さないと、除外パスへ移動してもボタンが残る
- **前方一致の誤爆**: `https://docs.google.com/spreadsheets/` は `https://docs.google.com/spreadsheets.example.com/` を除外しない（文字列の前置一致なので実際は除外しないが、`https://docs.google.com/spreadsheet` のような部分文字列を登録すると意図より広く当たる）。シナリオの境界ケースで固定する
- **プロファイル未設定でも止める**: 現状ボタンは未設定でも出る（バッジで状態を示す）。除外はその手前で効かせる
- **Firefox の差分**: メッセージ送受信は `chrome.*` のままで動くが、`sender` の扱いが違う箇所がないか既存の `background-gateway` の流儀に合わせる

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] テストカバレッジが基準を満たす（E2E/統合/単体すべて。Firefox の実機 E2E のみ未実行）
- [x] Chrome / Firefox の E2E が緑（Chrome 5/5、Firefox 5/5）
- [x] `make check` が通る
- [x] コードレビュー完了（PR #5 としてマージ）
- [x] リファクタリング完了（グリーン後）
- [x] 利用者向けドキュメント（README またはガイド）に除外URLの設定方法を追記（README.md / README.en.md）

## 実施記録（2026-10-12）

- 実装: `src/core/exclusions.ts`（検証・前置一致・追加・削除・保存値の正規化）、`src/exclusions-store.ts`（`jushoai:excluded-urls`）、`src/entrypoints/options/exclusion-section.ts`（設定画面のセクション）、`src/entrypoints/content.ts`（起動/停止の分離と除外ゲート）
- 設計上の判断: 即時反映は `chrome.storage.onChanged` で行う。`chrome.runtime.sendMessage` はコンテンツスクリプトに届かないことを実測で確認した（プローブで `before=1, after=1`）。storage の変更通知は全コンテンツスクリプトに届き、メッセージ型も `tabs` 権限も要らない
- 起動抑止の範囲: `stop()` が MutationObserver・保留中の同期・表示中のボタン・開いているパネルをすべて破棄する。`start()` が同じものを再構築するため、除外のオン/オフが再読み込みなしで往復する
- SPA の URL 変更: `sync()` の先頭で毎回 `location.href` を判定し直す。除外パスから出る方向は、設定変更か再読み込みで回復する（停止中はオブザーバを持たない設計のため。コード側にコメントで明記）
- 検証: `make check` exit 0（typecheck・87 ファイル / 1152 passed・両ブラウザ build・manifest 検査・web-ext lint）、`make site` green、**Chrome E2E 5/5**、**Firefox E2E 5/5**（除外 URL で起動しない／開いているタブからボタンが消える の 2 件を含む。Firefox は権限のある環境でユーザーが実行）
- テスト: `tests/core/exclusions.test.ts`（20 件）、`tests/exclusions-store.test.ts`（4 件）、`tests/entrypoints/content-exclusions.test.ts`（8 件）、`tests/options/exclusion-section.test.ts`（7 件）、E2E 2 件
- 追加: `README.md` / `README.en.md` に設定方法、`CHANGELOG.md` の `[Unreleased]` に機能を追記
- リリース: PR #5 を main にマージ（`ac9485b`）→ バージョン更新（`427db2a`）→ タグ `v0.1.16` を push。environment `release` の承認を経て Release を作成（chrome / firefox / sources の zip 3 点）
- 残る作業: なし
