# PBI: tab メッセージの guarded dispatcher を1つに

## 背景

`src/entrypoints/content.ts` の3つの chrome.runtime.onMessage リスナが各々「型 narrow → gate.isExcluded() → detectForms → sendResponse」を繰り返す:

- `:489-510`（analyze）
- `:516-539`（import draft）
- `:545-566`（guest）

「除外ページでは何も答えない／パネルを開かない」という gate の不変条件が、listener を足すたびに `if (gate.isExcluded()) { sendResponse({ ok: false }); return false; }` として手写しされている。`src/content/fill-one-entry.ts:11-12` のコメント自体が "the guards on the analyze/import/guest message handlers each check the same gate" と認めており、不変条件が convention として N箇所に分散。PBI-144 で3つ目の listener を足したときも scaffold は写経された。削除テスト: 共通 dispatch を削除すると型ガード・gate・response 形が N箇所に再出現する。

## ユーザーストーリー

開発者として、registerTabMessage(type, { gate: true, handler }) 形の1関数 interface を content 側に置き、型ガード・gate check・sendResponse 形を implementation に隠したい、なぜなら除外ゲートの不変条件が3箇所に重複し、新メッセージ型のたびに scaffold が写経されるため。

## 優先度

- 順位: 7位 / 10件
- RICEスコア: 19（Reach=3 / Impact=1 / Confidence=50% / Effort=0.08人月）
- 根拠: 除外ゲートの「excluded ページは答えない」が1箇所に集中し（locality）、gate の順序（type ガード後・body 前）を1テストで検証できる。次に tab メッセージ系 PBI を足すとき、gate 順序の写経確認が不要になる（leverage）。content.ts に触れるため候補150の後に直列156。
- 対象: src/entrypoints/content.ts:489-566、src/content/fill-one-entry.ts:11-12

## BDD受け入れシナリオ

```gherkin
Scenario: 除外ページでは答えない
  Given registerTabMessage に集約された dispatcher がある
  When 除外ページで3つのメッセージ型を受信する
  Then dispatcher が1箇所の gate check で全型を拒否し、パネルを開かない

Scenario: gate の順序が1テストで検証できる
  Given dispatcher に型ガード・gate・response 形が implementation として隠れている
  When dispatcher の順序制約を検証する
  Then type ガード後・body 前の gate check が1テストで断言できる
```

## 受け入れ基準

- [ ] registerTabMessage（または同等の guarded dispatcher）が1関数 interface として存在する
- [ ] 3リスナ（analyze/import/guest）が dispatcher 経由になり、手写しの gate check が消えている
- [ ] 除外時の応答が dispatcher の1テストで検証されている
- [ ] 既存テストが緑維持

## テスト戦略

- 単体: dispatcher が除外ページで全型を拒否することを確認する
- 回帰: content.ts 系の既存テスト一式を緑維持で確認する

## 見積もり

- 0.08人月

## Definition of Done

- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] `make check` が通る
