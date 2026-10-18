# PBI: プレビューの2セレクトに標識を付ける

## ユーザーストーリー

フォーム利用者として、プレビューの2つのセレクト（プロファイル／住所）が判別できるようにしてほしい、なぜなら誤認が誤住所注入に直結するため。

## 優先度

- 順位: 1位 / 20件
- RICEスコア: 2133（Reach=40 / Impact=2 / Confidence=80% / Effort=0.03人月）
- 根拠: 誤住所直結を1行で防ぐ。依存なし。
- 出典: checking-team UX（UI Expert Medium＋A11y Medium統合） plans/2026-10-18-1430-review-1018a.md、.checking-team-tmp/1018a-20261018-142047/ux-frontend.md

## BDD受け入れシナリオ

```gherkin
Scenario: 2つのselectを標識で判別できる
  Given プロファイル複数・住所複数があるプレビューを開いている
  When 2つのselectを見る
  Then プロファイル／住所の標識があり、どちらがどれか判別できる

Scenario: SRでアクセシブル名が伝わる
  Given スクリーンリーダーでプレビューを操作している
  When 2つのselectに順にフォーカスする
  Then それぞれプロファイル／住所のアクセシブル名が読み上げられる
```

## 受け入れ基準

- [x] プロファイル用selectにlabelまたはaria-labelで標識がある
- [x] 住所用selectにlabelまたはaria-labelで標識がある
- [x] 標識の文言が既存el/labeledとの整合を保つ
- [x] 対象コードがsrc/ui/preview.ts:78-104に収まる
- [x] 既存テストが緑維持

## テスト戦略

- E2E: 複数プロファイル・複数住所のプレビューで標識の判別を確認する
- 統合: プレビュー表示→select操作の一連で標識と選択の対応を確認する
- 単体: 各selectのlabel/aria-label付与の分岐を網羅する

## 見積もり

- 0.03人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] `make check` が通る
