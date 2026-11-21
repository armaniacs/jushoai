# PBI: 会社名フリガナ欄の対応

## 背景

https://fair.j-lis.go.jp/registration/ に「会社名（フリガナ）」欄（name="company_kana"、th 見出し）がある。現状は PBI-119 の設計で意図的に EXCLUDE されており、unknown で行が出ない。PBI-119 が閉じたのは誤注入の恐れ（会社欄に人名カナ・人名欄に会社カナが入る）があるためで、専用カテゴリで開く必要がある。

## ユーザーストーリー

開発者として、会社名フリガナ欄を専用カテゴリ `companyNameKana` で分類・入力できるようにしたい、なぜなら対象 URL のフォームで会社フリガナが未入力のまま残り、ユーザーが手で埋めなければならないため。

## 優先度

- 順位: 単独（対象 URL 対応）
- RICEスコア: 120（Reach=30 / Impact=2 / Confidence=80% / Effort=0.25人月）
- 根拠: 対象 URL の会社フリガナ行が埋まる。プロファイル項目の追加を伴うため、分類・計画・取り込み・UI・保存の正規化まで一式 touched する。
- 対象: src/core/types.ts、profile.ts、classify-rules.ts、kana.ts、planner.ts、import-draft.ts、field-catalog.ts、samples/registration.html

## BDD受け入れシナリオ

```gherkin
Scenario: 会社名フリガナ欄が専用カテゴリに載る
  Given th 見出し「会社名（フリガナ）」の company_kana 欄がある
  When 分類パイプラインを通す
  Then カテゴリが companyNameKana になり、プロファイルの会社カナが plan になる

Scenario: 人名カナと混ざらない
  Given 同一フォームに会社名（フリガナ）欄と人名フリガナ欄がある
  When 分類パイプラインを通す
  Then 会社欄が人名カナにならず、人名欄が companyNameKana にならない
```

## 受け入れ基準

- [x] `company_kana` 欄（会社・法人系語彙 AND カナ注記の連言）が `companyNameKana` に分類される
- [x] 素の会社名は `company` のまま、カナ単独・誕生文脈・複合欄は従来動作のまま
- [x] 値がプロファイルの会社カナ（formatKana 変換）から来る。辞書 assist は付けない
- [x] 取り込み（import-draft）が会社カナのキーに到達する
- [x] options カードに会社名（フリガナ）行が出る。guest には載らない
- [x] registration.html の期待値が埋まり、`make addurl-check` がゼロ
- [x] eval 集計 pin の差分が registration 行のみ

## テスト戦略

- 単体: 連言の肯定・否定（漢字会社名・人名カナ・素フリガナ・複合・誕生・name のみ）、交差ガード、kanaKind、planner 値、取り込み parity、catalog/guest/options
- 回帰: PBI-119 の緩和境界テストは無改変で緑維持
- 結合: tests/integration/samples.test.ts の registration ケース、tests/eval の集計 pin 更新

## 見積もり

- 0.25人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
