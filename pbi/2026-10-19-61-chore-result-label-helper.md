# PBI: 境界のasキャストをヘルパーに寄せる

## ユーザーストーリー

開発者として、境界の `as` キャストを小さなヘルパーに寄せたい、なぜなら語彙追加のたびにコピーされる雛形になっており、中央に寄せれば以後書かずに済むため。

## 優先度

- 順位: 1位 / 4件
- RICEスコア: 50（Reach=3 / Impact=0.5 / Confidence=100% / Effort=0.03人月）
- 根拠: Quick Win。数分で終わる独立作業。他候補との依存なし。

## BDD受け入れシナリオ

```gherkin
Scenario: ラベル参照にキャストが要らない
  Given FillResultの語彙キーがある
  When 表示側と送信側がラベルを引く
  Then fillResultLabel経由でフォールバック付きで読め、asが残らない

Scenario: 権限APIの参照が1箇所に寄る
  Given chrome.permissionsの参照が3箇所にある
  When 小さなaccessorに寄せる
  Then 呼び出し側にasが残らず、振る舞いが変わらない
```

## 受け入れ基準

- [x] `fillResultLabel` が `dom/fill-plan.ts` に定義され、preview.tsとissue-url.tsの `as FillResult` が消えること
- [x] `chrome.permissions` の3箇所の `as PermissionsApi` がaccessorに寄ること
- [x] 未知キー時のフォールバック（キー表示）が維持されること
- [x] 既存テストが緑維持

## テスト戦略

- 単体: 未知キー入力でキーがそのまま返ることを固定する
- 回帰: `make check` green

## 見積もり

- 0.03人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] `make check` が通る
