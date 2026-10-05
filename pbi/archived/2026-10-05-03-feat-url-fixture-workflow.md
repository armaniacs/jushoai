# PBI: URL付きPBIのテストfixture化を必須運用＋雛形生成にする

## ユーザーストーリー
開発者として、対象URLを持つPBIが作られたときに実ページ準拠のfixtureとe2eテストを必ず追加し、URLからの雛形生成を簡単にしたい、なぜなら実フォームでの回帰を継続的に防ぎ、fixture作成の手間を減らしたいから

## 優先度
- 順位: 02 / 2件
- RICEスコア: 32(Reach=10 / Impact=1 / Confidence=80% / Effort=0.25人週)
- 根拠: スコアは最高だがユーザー指示でBの後。Bの受け入れ検証にもこの運用を使う

## BDD受け入れシナリオ

```gherkin
Scenario: URL付きPBIにはfixtureとe2eが添付される
  Given 対象URLを持つPBIを作成する
  When PBIを書き出す
  Then samples/へのfixture追加とsamples.test.tsへのケース追加が受け入れ基準に含まれる

Scenario: 雛形生成で手間が減る
  Given 対象URLがある
  When 雛形生成手順に従う
  Then form要素の抜粋からテスト可能なfixture雛形ができる
```

## 受け入れ基準
- [x] PBIテンプレート相当の手順に「対象URLがある場合はsamples fixture+e2e必須」が明記される(開発ドキュメントの適切な場所)
- [x] URL→fixture雛形の生成手順または補助スクリプトがある
- [x] 雛形から作ったfixtureで既存のplanFor形式のテストが書ける
- [x] radio/hidden/submit等の対象外要素の扱い(再現・skip固定)が手順に含まれる

## テスト戦略
- E2E: 手順書どおりに新規URLからfixtureを作りテストが通ること(ドッグフーディング)
- 統合: なし(運用改善のため)
- 単体: 補助スクリプトがある場合はその入出力テスト

## 見積もり
2〜3pt(要チームでの見積もり)

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする(スクリプト入出力テストと来場フォームでのドッグフーディングで代替。運用遵守自体は手順化で担保)
- [ ] コードレビュー完了(ユーザー作業として残す)
- [x] ドキュメント更新済み(CLAUDE.md テスト方針に運用ルールを追記)
