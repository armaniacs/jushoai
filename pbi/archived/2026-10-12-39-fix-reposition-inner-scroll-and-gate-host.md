# ボタン追従の内部スクロール対応と、同意ゲートのhost解決の厳格化

## 背景

0.1.14 のコードレビュー（提案 #1・#2）で見つかった 2 件を実装する。どちらも 0.1.14 で出荷した挙動の弱点で、新しい不具合ではない。

- #1: ボタンは `position: fixed` になったが、位置の再解決は `window` の scroll だけで起きる。`overflow: auto` の内部スクロール容器（ステップ式フォーム・モーダル）では、アンカーがビューポート内を動いてもボタンが追従せず視覚的に外れる。scroll はバブリングしないため、`window` のリスナーでは子要素のスクロールを捕捉できない
- #2: 同意ゲートの host 解決が `getPreviewHost?.() ?? env.queryHost()` で、プレビュー host が null のとき文書内の最初の `[data-jushoai]`（通常はフォームボタンの host）に落ちる。PBI-29 で直した取り違えと同じ形が残っている

## 対象

- `src/entrypoints/content.ts`（位置追従の配線、同意ゲートの host 解決）
- `tests/entrypoints/content-reposition.test.ts`（新規）
- `tests/ui/consent-check.test.ts`（#2 の回帰テスト）

## BDD受け入れシナリオ

```gherkin
Scenario: 内部スクロール容器のスクロールに追従する
  Given overflow が auto の容器の中にアンカーがある
  When  容器をスクロールする
  Then  ボタンの位置が再解決される

Scenario: ページのスクロールに追従する
  Given ページがスクロール可能である
  When  ページをスクロールする
  Then  ボタンの位置が再解決される

Scenario: 自前のパネルのスクロールでは再解決しない
  Given プレビューパネルが開いている
  When  パネルの中をスクロールする
  Then  ボタンの位置は再解決されない

Scenario: スクロールの連続では1フレームに1回だけ再解決する
  Given 位置追従が有効である
  When  同じフレーム内で複数回スクロールする
  Then  再解決は1回だけ行われる

Scenario: プレビュー host が解決できないときは注入を中止する
  Given プレビュー host の provider が null を返す
  When  同意を検証する
  Then  文書内の別の host で代用せず、注入を中止する
```

## 受け入れ基準

- [x] scroll のリスナーが document の capture 相にあり、子要素のスクロールを捕捉できる
- [x] 自前の host（`[data-jushoai]`）で起きた scroll では再解決しない
- [x] 再解決は rAF で合流し、1フレームに1回に収まる
- [x] `load` では合流を待たずに即時再解決する
- [x] 返した detacher の実行後は、どのイベントにも反応しない
- [x] provider がある場合、null は null のまま扱い `queryHost()` に落ちない（注入を中止する）
- [x] 既存の `make check` と両ブラウザの E2E が緑のままである（Chrome 3/3、Firefox 3/3）

## テスト戦略

- 実 DOM（jsdom）でイベント伝播そのものを検証する。fake の EventTarget ではなく document に登録するため、capture 相で子要素の scroll が届くことが実際に確かめられる
- フレームスケジューラは注入可能にし、合流の分岐を実時間待ちなしで断言する
- 同意ゲートは既存の注入 env で provider が null を返す場合を追加する（Red → Green）

## 見積もり

1pt

## Definition of Done

- [x] 全 BDD シナリオが自動テストとして実装されパスする（`tests/entrypoints/content-reposition.test.ts` 6 件、`tests/ui/consent-check.test.ts` 1 件を追加）
- [x] `make check` が通る
- [x] Chrome / Firefox の E2E が通る
- [x] 0.1.15 としてバージョンと CHANGELOG を更新する
- [x] コードレビュー完了（PR #4 としてマージ）

## 実施記録（2026-10-12）

- 実装コミット `7f49af3`、バージョン更新 `77711fd`、マージ `1341725`（PR #4）
- 検証: `make check` exit 0、Chrome E2E 3/3、Firefox E2E 3/3、生成 manifest は両ブラウザ `0.1.15`
- リリース: タグ `v0.1.15` を main の先頭に作成して push。environment `release` の承認を経て Release を作成（chrome / firefox / sources の zip 3 点）
- 関連: 残るレビュー提案 #3〜#7 は `2026-10-12-45-backlog-review4-suggestions-round.md` にラウンド化した
