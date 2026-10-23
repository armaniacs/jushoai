# PBI: 欄単位の入力とショートカット・右クリック

## ユーザーストーリー
一部の欄だけ埋めたい利用者として、フォーム全体ではなく「この欄だけ」をキーボードまたは右クリックで入力したい、なぜなら全体プレビューは重く、1〜2欄の追加入力が手間のまま残るから

## 優先度
- 順位: 1 / 8
- RICEスコア: 240（Reach=600 / Impact=1 / Confidence=80% / Effort=2人週）
- 根拠: 小さく効く最小拡張。PBI-132（undo）と相性が良く、132と同順で進められる。依存なし

## BDD受け入れシナリオ
Scenario: この欄だけ入力できる
  Given 分類済みの欄にフォーカスがある
  When ショートカットまたは右クリックの「この欄に入力」を選ぶ
  Then その欄だけプレビュー（値の確認）つきで注入される

Scenario: 未分類の欄は入力しない
  Given 未分類（unknown）の欄
  When 欄単位の入力を選ぶ
  Then 注入せず理由を示し、全体プレビューまたはカスタム対応付け（138）へ案内する

## 受け入れ基準
- [x] 欄単位でもプレビュー（値の確認）なしに注入しない → `confirmFillOne`パネルが分類名と値をtextContentで表示し、「注入する」承認後のみ`fillField`する
- [x] 入力済み・`readonly/disabled`・`maxlength`超過の欄は従来通り警告して注入しない → `planOneField`が`buildPlan`と同じガードを通し、warn状態は注入理由として表示（注入しない）
- [x] ページ由来文字列は`textContent`のみで表示し`innerHTML`を使わない → パネルはtextContentのみ。テストで`<img>`がHTMLとして解釈されないことを固定

## 実装記録（2026-10-23）

- `src/core/fill-one.ts`: 欄単位の解決。`classifyField`（ルールのみ・LLMなし・ゲートなし）→ 1欄の`refineClassifications` → `buildPlan`（同じガード）。unknownは`unknown`、readOnly/disabledは`inactive`、warn状態はそのまま理由として返す。理由ラベル表を単一の表で所有。
- `src/context-menu.ts`: chrome非依存の注入可能モジュール。onInstalledで一度だけメニュー作成（`removeAll`→`create`、editable コンテキスト）、onClickedを呼び出し時に1回だけ登録し、`{ type: 'fill-one' }`をタブへ送る。メッセージ形状はここで単一所有。
- `src/ui/fill-one-panel.ts`: `confirmFillOne`（値の確認パネル・Escape/キャンセルは注入なし）と`showFillOneBlocked`（理由＋全体プレビューへの案内）。closed Shadow DOM・textContentのみ。
- `src/entrypoints/background.ts`: `registerFillOneMenu(chrome.runtime.onInstalled, chrome.contextMenus, send)`を配線。sendは`chrome.tabs.sendMessage`（lastErrorを握りつぶし、content scriptが無いページで失敗しない）。
- `src/entrypoints/content.ts`: `fillOne`（document走査→対象欄解決→`planOneField`→確認パネル→`fillField`）。Alt+J（キーボード）・capture段のcontextmenu記憶（右クリック）・`runtime.onMessage`（fill-oneメッセージ）の3入口。プロファイル選択はsessionと同じ`resolveLastId`/`resolveAddressId`経由。
- `wxt.config.ts`: `contextMenus`権限を追加（host権限は任意のまま）。
- テスト: `tests/core/fill-one.test.ts`（6件）、`tests/context-menu.test.ts`（3件）、`tests/ui/fill-one-panel.test.ts`（4件）、manifestビルドテストにcontextMenus権限の含有を追加、backgroundテストのfakeにonInstalled/contextMenusを追加。
- `make check` exit 0（129ファイル 1745テスト + 1 expected fail）。

## テスト戦略
- E2E: 実フォームでの欄単位入力→undoの通し確認 → BDDシナリオは単体・統合テストで固定。実ブラウザのE2Eは`tests/e2e/`の既存手順に従い後日追加
- 統合: ショートカット・コンテキストメニューの配線テスト → `context-menu`モジュールのテスト（chrome非依存の注入）＋manifestビルドテスト（contextMenus権限）
- 単体: 対象欄の解決ロジック（フォーカス・右クリック位置）の単体テスト → `planOneField`（分類・ガード・理由）と`fillOne`の3入口配線

## 見積もり
5（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする（13テスト追加。分類済み欄は値確認つき注入、未分類は理由＋案内）
- [x] コードレビュー完了
- [x] ドキュメント更新済み（本PBIに実装記録。manifest権限はビルドテストで固定）
