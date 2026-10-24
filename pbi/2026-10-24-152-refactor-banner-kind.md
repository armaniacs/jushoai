# PBI: banner 文字列を正規表現で嗅ぐのをやめる

## 背景

session が `DisplayDecision.banner` を人間可読文字列として合成し（`src/content-session.ts:311-314` の `decideDisplay`）、button の `showError(text: string)` がその**内容**を includes/match で解析して「4秒で復帰する一時エラーか、永続する部分適用バナーか」を決めている（`src/ui/button.ts:91-101` の `text.includes('一部のみ適用')` + `text.match(/一部のみ適用（[^）]*）/)`）。`tests/ui/button.test.ts:178-231` が文言を5ケースでピン留めしている。

挙動を分ける事実（部分適用か否か）が文字列型に乗っておらず、interface は `string` 1つなのに、呼び出し側は「文言の形式を変えると button 側 timer 挙動が変わる」という暗黙の順序制約を知らされる。同一の知識（一部適用バナーの形式）が session・button・テストの3点に分散し、locality が欠けている。

## ユーザーストーリー

開発者として、banner の挙動区分（partial / transient）を型で渡したい、なぜなら文言の形式と timer 挙動が文字列嗅ぎで結合していて、文言調整（言い回し変更も含む）で timer テストが壊れるため。

## 優先度

- 順位: 3位 / 10件
- RICEスコア: 160（Reach=6 / Impact=1 / Confidence=80% / Effort=0.03人月）
- 根拠: 小差分で済む quick win。coupling の証拠がテストの文言ピン留めに既に出ている。文言を pin する既存5テストが「kind を渡す」テストになり、正規表現ではなく意味論をテストできる。依存なし（バッチ1）。
- 対象: src/ui/button.ts:91-101、src/content-session.ts:311-314、tests/ui/button.test.ts:178-231

## BDD受け入れシナリオ

```gherkin
Scenario: banner の挙動区分が型で渡る
  Given showError が構造化区分（{ kind: 'partial' | 'transient', text }）を受ける
  When 部分適用バナーを表示する
  Then kind='partial' で表示され、4秒で畳まれない（文言に依存しない）

Scenario: 一時エラーは4秒で復帰する
  Given 一時エラーを kind='transient' で表示する
  When 4秒経過する
  Then banner が畳まれ、永続表示にならない
```

## 受け入れ基準

- [x] `showError` が構造化区分（kind + text）を受ける形状に拡張されている
- [x] `decideDisplay` が型で区分を渡し、button 側の includes/match 嗅ぎがなくなっている
- [x] 「部分適用は畳まず残す」の決定が session と button の1本の契約になっている
- [x] 文言を pin する既存テストが kind ベースのテストに変わっている
- [x] 既存テストが緑維持

## テスト戦略

- 単体: kind='partial' で畳まない、kind='transient' で4秒後に畳むことを確認する
- 回帰: 既存の session・button テスト一式を緑維持で確認する

## 見積もり

- 0.03人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
