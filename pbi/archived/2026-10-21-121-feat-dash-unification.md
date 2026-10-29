# PBI: ハイフン・ダッシュの扱いが特殊なページへの対応

## ユーザーストーリー

ダッシュを含む住所・建物名・カナを登録しているユーザーとして、欄が求めるダッシュ種別に注入時に統一してほしい、なぜならページ側の pattern やバリデータが特定の 1 種しか受け付けないことがあり 種類が違うと一致しないから。カナ欄はプロファイル検証が U+30FC のみ許容(profile.ts:64-65)で 他のダッシュがあるとエラーになる。

## 優先度

- 順位: 7位 / 9件
- RICEスコア: 8(Reach=1.5 / Impact=1 / Confidence=80% / Effort=0.15人月)
- 根拠: ダッシュ混在×特定 1 種受付の交差で狭い。NFKC では U+FF0D のみ fold し U+2010/2013/2014/2015/30FC は不変のため既存正規化では解決しない。トークン化(カナ語彙: kana.ts:6-17、PBI-104)と fixture 先行(nfkc-once)の先行例 2 つがある。

## BDD受け入れシナリオ

```gherkin
Scenario: 求められるダッシュ種別に統一される
  Given 特定の 1 種のダッシュしか受け付けない欄と ダッシュを含む住所がある
  When 注入を実行する
  Then ダッシュが欄の要求に合わせ決定的に統一され プレビューで確認できる

Scenario: 分類でダッシュ種別差異を同一視する
  Given ダッシュの種類だけが違う同一語が分類対象にある
  When 分類を実行する
  Then 種別差異を同一視して同じ分類になる(カナ語彙のトークン化と同じ方向)
```

## 受け入れ基準

- [x] どの文字を同一視するか fixture で先に固定する(既存の複数種ダッシュ正規表現は formatters.ts:103 の /[-‐－−]/ で U+2013/2014/2015 は未収録)(tests/core/dash-unification.test.ts を fixture 先行で追加し 4 失敗を確認してから緑化。7 種の整形結果+非同族(〜 U+301C/・ U+30FB/U+30FC 長音)の現行どおりを pin)
- [x] ダッシュ語彙テーブルを core/ に新設する(推し: core/dashes.ts。kana.ts:6-17 のトークン表+escapeRegExp+用途別述語のパターンを踏襲)(src/core/dashes.ts を新設: 整形用 HYPHEN_KINDS 7 種(U+002D/2010/2013/2014/2015/FF0D/2212)→hasHyphen、分類用 FOLD_KINDS 4 種(U+2010/2013/2014/2015)→unifyDashes。U+2212 は整形 family に残留(現行どおり、外すとリグレッション)だが分類 fold は対象外(数値の意味が変わる)、WHY コメントに記録)
- [x] 分類ではダッシュ種別差異を同一視し 整形では注入時に統一する(カナ欄のプロファイル検証 U+30FC のみ許容も考慮)(分類: literals.norm を NFKC 後 unifyDashes に配線し en dash 入りの e-mail と hbar 入りの e-mail が email に同一視。整形: formatters の wantsHyphen を hasHyphen に配線し 7 種が同族として同一視。値側は一切 fold しないため clean/profile.ts の U+30FC 検証は無改変。カナ判定 kana.ts も無改変)
- [x] 対象 URL を持つなら `make addurl` から samples fixture+統合テストを必須にする(U+2015 pattern の実例は未収集で kana-fields-design.md:58 の記録のみ)(対象 URL を持たないため不要と判断。実例未収集の旨を設計判断として PBI・コメントに記録)
- [x] 正規表現のテストが落ちたら期待値ではなく辞書を直す(fixture 先行 red で期待どおり失敗し、dashes.ts 側の辞書で緑化。既存テストの期待値は 1 つも変更していない)
- [x] `make check` が通る

## テスト戦略

- 単体: ダッシュ語彙テーブル・同一視・統一の fixture 先行
- 統合: 対象 URL を持つなら samples fixture+統合テスト

## 見積もり

- 0.15人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする(fixture 先行 red 4件→実装後緑。7 種の同一視・非同族の現行どおり・分類と整形の共有を tests/core/dash-unification.test.ts が機械的に守る)
- [ ] コードレビュー完了
- [x] `make check` が通る
