# PBI: FieldMetaのページ入力値保持を最小化する

## ユーザーストーリー

プライバシー担当として、content scriptメモリ上のFieldMeta.value（ページ既存値）の保持をなくしたい、将来の送信側変更がそのまま漏洩経路になるため。現行送信はallow-listで遮断済み。

## 優先度

- 順位: 11位 / 20件
- RICEスコア: 333（Reach=100 / Impact=1 / Confidence=50% / Effort=0.15人月）
- 根拠: 送信側の将来変更がそのまま漏洩経路になる保持を断つ。依存なし。
- 出典: checking-team Compliance Medium、src/dom/scan-fields.ts:117,152、src/messages.ts:70-100

## BDD受け入れシナリオ

```gherkin
Scenario: LLM送信用はwire型のみで構築される
  Given ページに入力値を持つ欄がある
  When LLM分類用のペイロードが構築される
  Then wire型（allow-listキー）のみで構築され、ページ既存値は含まれない

Scenario: fill判定の既存値参照は別経路で維持される
  Given 入力済みの欄がある
  When プラン構築・注入可否を判定する
  Then live DOM読みなどの別経路で既存値を参照し、入力済み欄への上書き抑止が維持される
```

## 受け入れ基準

- [x] 走査側がFieldMeta.valueにページ既存値を保持しない、または送信形状とfill判定形状が分離される
- [x] LLM送信用ペイロードがwire型（allow-listキー）のみで構築されることが保証される
- [x] fill判定の既存値参照（入力済み上書き抑止）が別経路で維持される
- [x] 定義側（FieldMeta相当）にvalue保持の扱いを示すコメントが残る
- [x] 既存テストが緑維持

## テスト戦略

- 単体: 走査結果にページ既存値が保持されないこと、fill判定の上書き抑止が維持されることを確認する
- 統合: 走査→分類送信→プラン構築の一連で送信形状に値が混入しないことを確認する
- E2E: 入力済み欄ありのフォームで上書き抑止とプレビュー表示が従来通りであることを確認する

## 見積もり

- 0.15人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] `make check` が通る（2026-10-18最終検証でEXIT:0を確認）
