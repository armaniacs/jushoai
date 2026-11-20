# PBI: プロファイル自動切替（URLパターン別）

## ユーザーストーリー
自宅と会社を使い分ける利用者として、サイトごとに使うプロファイルを自動で切り替えたい、なぜなら毎回プレビューで選び直すのは手間で、間違えて自宅住所を会社フォームに入れる事故も起きるから

## 優先度
- 順位: 5 / 8
- RICEスコア: 157.5（Reach=450 / Impact=1 / Confidence=70% / Effort=2人週）
- 根拠: 繰り返し利用の事故・手数を減らす。PBI-134（ピン留め）と同系列で競合注意。自動入力は含めず切替の提示に留める

## BDD受け入れシナリオ
Scenario: サイトに応じた候補が先頭に出る
  Given URLパターンにプロファイルを割り当て済み
  When 対象サイトでプレビューを開く
  Then 割り当て済みプロファイルが候補先頭になり承認後に注入される

Scenario: 未割当サイトは従来通り
  Given 割当てのないサイト
  When ボタンを押す
  Then 使用中プロファイルのまま通常プレビューになり自動注入はしない

## 受け入れ基準
- [x] ページ読み込み時の自動入力はしない（方針維持）。切替は候補提示のみ → 割当てはプレビューの候補先頭＋初期選択だけを変える。注入は常に承認後（BDDシナリオ2「自動注入はしない」をテストで固定）
- [x] 割当ては端末内のみで外部送信しない → 割当ては`chrome.storage.local`にhost→profileIdのペアだけを保存。プロファイルの値は保存・送信しない（`tests/assignment-store.test.ts`で固定）
- [x] 除外URL登録サイトでは切替を使わずボタンを出さない → 除外ページはセッションが`excluded`を返しパネルを開かない

## 実装記録（2026-10-23）

- `src/core/site-profile.ts`: 純粋層。`assignedFirst`（割当て済みプロファイルを候補先頭へ。残りは保存順。存在しないIDは保存順のまま）、`assignmentFor`（hostの割当て。プロファイルが消えていたらnull）。
- `src/assignment-store.ts`: `chrome.storage.local`の`jushoai:site-profile-assignments`（host→profileId）。壊れた・手編集の値は空マップとして読む。
- `src/content-session.ts`: `assignedProfileId`オプション。`resolveSelection`が割当てを最終使用選択より優先する（より具体的なヒント）。
- `src/content/preview-bind.ts`: クリーン適用後に`recordAssignment`で使用中プロファイルを記録（使うほど学習する）。
- `src/entrypoints/content.ts`: 実行ごとに割当てを読み、`sessionProfiles`を`assignedFirst`で並べ替え、セッションへ渡す。適用後にhost→profileIdをupsert保存。
- 割当ての作り方: 新しい設定UIは作らず、プレビューでプロファイルを切り替えて注入したサイトに自動で学習する（PBI-128の承認記憶・PBI-138の対応付けと同じ「使うほど学習」の型）。
- テスト: `tests/core/site-profile.test.ts`（4件）、`tests/assignment-store.test.ts`（2件）、`tests/content-session.test.ts`に割当て優先・消滅時フォールバックの2件追加。
- `make check` exit 0（142ファイル 1801テスト + 1 expected fail）。

## テスト戦略
- E2E: 割当て済み→先頭表示、未割当て→通常の確認 → 実ブラウザのE2Eは`tests/e2e/`の既存手順に従い後日追加。単体・統合テストで一致ロジックと候補提示のみの契約を固定
- 統合: 割当ての保存・解除・パターン一致テスト → `tests/assignment-store.test.ts`（保存・壊れた値の読み）＋`tests/content-session.test.ts`（割当て優先・フォールバック）
- 単体: URLパターン一致ロジックの単体テスト → `tests/core/site-profile.test.ts`（`assignedFirst`・`assignmentFor`）

## 見積もり
5（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする（6テスト追加。割当て済みサイトでは割当てプロファイルが候補先頭になり、未割当ては従来通り。自動注入はしない）
- [x] コードレビュー完了
- [x] ドキュメント更新済み（本PBIに実装記録）
