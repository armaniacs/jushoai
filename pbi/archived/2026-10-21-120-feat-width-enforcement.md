# PBI: 半角・全角を強制するページへの対応

## ユーザーストーリー

全角強制フォームを埋めるユーザーとして、欄が求める文字幅に合わせて注入値を変換してほしい、なぜなら全角を強制する欄では半角のまま注入するとページ側バリデータに弾かれ補完が完了しないから。

## 優先度

- 順位: 6位 / 9件
- RICEスコア: 8(Reach=2.5 / Impact=1 / Confidence=80% / Effort=0.25人月)
- 根拠: 走査は pattern/placeholder/maxLength を既に収めており(scan-fields.ts:145,147,148)欄単位の幅判定と半→全変換が新規(最も近い先行例は wantsHyphen: formatters.ts:98-106)。TODO 8(建物名略記)と変換規則を共有するため 6 を先に着手する。

## BDD受け入れシナリオ

```gherkin
Scenario: 全角強制欄に全角で注入される
  Given pattern が全角数字を要求する郵便番号欄がある
  When 分類と注入を実行する
  Then 注入値が決定的に全角へ変換され プレビューで確認できる

Scenario: 判定できない欄は現行どおり
  Given pattern も placeholder も文字幅のヒントを持たない欄がある
  When 分類と注入を実行する
  Then 現行どおりの値がそのまま注入される
```

## 受け入れ基準

- [x] fixture を先行追加(tests/core/)してから core/formatters に幅判定と変換(数字・英字・カナの半⇔全。半→全は新規実装)を追加する(tests/core/width-enforcement.test.ts 16 テストを fixture 先行で追加し 12 失敗を確認してから緑化。detectWidthKind/toFullWidth/toHalfWidth を formatters に新設(+68 行)。toFullWidth は ASCII 0x21-0x7E を 0xFEE0 オフセット+半角カナ→全角カナ(濁点は NFC で結合)、toHalfWidth は全角 ASCII ブロックのみでカナは触らない(kanaKind との二重書き換え回避))
- [x] planner valueFor に配線し 変換後の値がプレビューで確認できること(preview 側変更は不要: content-run.ts が display を透過)(planner.enforceWidth を buildPlan の raw に適用。tag==='input' のみ(select/radio は option 一致前提)、type==='date' は ISO 保持のため対象外)
- [x] maxlength の役割を設計時に決める(maxlength は文字幅を運ばないため推定規則の採否は設計判断)(不採用: maxlength は幅を運ばないため推定規則は入れない。変換は長さ不変のため超過判定は従来どおり warn-maxlength で警告して注入しない)
- [x] 判定できない欄は現行どおり無変換である(両方の幅が含まれる pattern か無い pattern は null で無変換)
- [x] 変換は core/ の決定的コードに留め LLM は値を作らない・送らない(LLM 不使用)
- [x] `make check` が通る

## テスト戦略

- 単体: formatters の幅判定・変換(fixture 先行)
- 統合: 対象 URL を持つなら `make addurl` から samples fixture+統合テスト(全角強制 fixture は未収集。半角強制 tel は samples に実在)

## 見積もり

- 0.25人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする(tests/core/width-enforcement.test.ts 16 テストが幅判定・変換・無変換境界を機械的に守る)
- [x] コードレビュー完了
- [x] `make check` が通る
