# PBI: options配下のDOM組み立てをelヘルパーに統一する

## ユーザーストーリー

開発者として、ai-sectionはelヘルパー・mainはcreateElement直書きの二系統で属性変更が片系統にしか反映されない状態をなくしたい、なぜならDOM組み立ての経路が二つあると属性・クラス・振る舞いの変更が片方にしか反映されず、optionsページの表示不整合の温床になるから。

## 優先度

- 順位: 39位 / 40件
- RICEスコア: 10（Reach=5 / Impact=0.5 / Confidence=50% / Effort=0.12人月）
- 根拠: 動作不具合ではなく保守性改善。外形は変えず、将来の属性変更の反映漏れを防ぐ。依存なし。
- 出典: checking-team Maintainability Medium
- 対象: src/entrypoints/options/dom.ts、main.ts:55-166、ai-section.ts:142-237

## BDD受け入れシナリオ

```gherkin
Scenario: main配下の組み立てがdom.ts寄せになる
  Given cardFieldset・actionButton・buildSelectがmain.tsに直書きされている
  When 組み立てヘルパーをdom.tsに寄せて命名を整理する
  Then main.ts側はdom.tsのヘルパー呼び出しだけになり、二重実装がなくなる

Scenario: el・labeled一本化でも表示が変わらない
  Given ai-section.tsがel・labeledを使いmain.tsがcreateElement直書きである
  When el・labeled一本化で組み立て経路を統一する
  Then 生成される要素・属性・順序・テキストが従来と同一になる
```

## 受け入れ基準

- [x] `cardFieldset`・`actionButton`・`buildSelect` が `dom.ts` に寄せられ、`main.ts` 側の直書き実装がなくなること
- [x] ヘルパーの命名が整理され、`el`・`labeled` と一貫した呼び出し口になっていること
- [x] `ai-section.ts:142-237` の組み立て経路が `el`・`labeled` 一本化で維持されること
- [x] プロファイル・住所・AI設定ページの生成DOM（要素・属性・順序・文言）が変更前と同一であること
- [x] 既存テストが緑維持であること

## テスト戦略

- 単体: 移設したヘルパー（fieldset・button・select）の生成要素・属性・イベント結線を検証する
- 回帰: options関連の既存テストが緑維持であることを確認する
- 目視: プロファイル・住所・AI設定ページの表示差分がないことを確認する

## 見積もり

- 0.12人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] `make check` が通る（2026-10-18最終検証でEXIT:0を確認。作成時の一過性失敗は解消済み）
