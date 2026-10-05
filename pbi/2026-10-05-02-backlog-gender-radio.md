# PBI: 性別(radio)対応 — radio群の走査・分類・注入基盤 (backlog)

## ユーザーストーリー
JushoAI利用者として、radio形式の性別欄(例: 男性/女性の2択)にも自動入力したい、なぜなら対象フォーム `https://pro.form-mailer.jp/lp/f3553ff3175246` の性別欄が radio で作られており select対応だけでは届かないから

## ビジネス価値
- radio性別欄(対象URLの `field_2760244` など)への自動入力で PBI-01 の価値を完成させる
- 測定方法: 対象URL相当の radio 群サンプルで正しい選択肢に checked が付くこと

## BDD受け入れシナリオ

```gherkin
Scenario: radio性別欄にプロファイルの性別が入る
  Given プロファイルに性別「男性」が登録されている
  And フォームに性別radio群があり選択肢に「男性」「女性」が含まれる
  When 利用者がJushoAIボタンを押してプレビューを承認する
  Then 「男性」のradioに checked が付く

Scenario: 一致なし・入力済みは触らない
  Given プロファイルの性別に対応する選択肢がない、または既にいずれかが checked である
  When 利用者がプレビューを開く
  Then 該当群は警告または filled 表示で上書きされない
```

## 受け入れ基準
- [ ] radio群(fieldset/legend/name 単位)が1つの論理欄として走査される
- [ ] radio群が gender に分類される
- [ ] planner が radio群の選択肢解決(warn-no-option/filled 含む)ができる
- [ ] fill が checked + input/change/blur 発火でフレームワークに検知される
- [ ] プレビュー表示が radio群に対応する
- [ ] 対象URL相当のサンプルで手動確認できる

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 最小限: samples に radio性別フォームを追加し手動確認

### 統合テスト
- scan→classify→plan→fill の radio 群スルー

### 単体テスト
- radio群化(同一name/fieldset の束ね)、分類、選択肢照合、fill の checked 付与、境界値(選択肢なし・disabled・hidden)
- 比率目安 E2E:統合:単体 = 1:10:100

## 実装アプローチ
- **Outside-In**: E2E相当の赤から開始
- **Red-Green-Refactor**: 各層で TDD
- **リファクタリング**: グリーン後に整理

## 見積もり
8pt超の可能性あり (要チームでの見積もり)。Epic化(40pt超の兆し)したら着手前にシニアと設計相談すること

## 技術的考慮事項
- 依存関係: `2026-10-05-01-feat-gender-select.md` の gender 値・照合語彙に依存。先にPBI-01を完了させること
- テスタビリティ: FieldMeta が単一要素前提(tag: input|select)のため、radio群の表現(群ID・options・checked状態)の設計が要。スパイク分離を検討
- 非機能要件: PBI-01同様、プロファイル値はLLMに送らない。radio の checked 操作がサイトのバリデーションを壊さないこと
- 現状の制約: `src/dom/scan-fields.ts:70` TEXT_TYPES、`src/dom/fill.ts` value setter、`src/core/planner.ts` select分岐、`site` 文面の「チェックボックス、ラジオ、日付など対象外」がすべて変更対象

## 実装者向け注記

### 現状コードの確認
```bash
grep -rn "TEXT_TYPES\|fillField\|isUntouchedSelect" src/
grep -rn "radio\|checkbox" src/ site/content/ja/
```

### 実装手順
Outside-Inの縦スライス順:
1. radio性別の赤い受け入れテストを書く(scan→plan→fill の群スルー)
2. 走査の群化を実装する(scan-fields の radio 対応)
3. 分類・計画・注入・プレビューを群対応させる
4. 文面の「ラジオ対象外」を更新し `make check` を通す

### 落とし穴
- 同一nameの hidden(empty送信用 `request-parameter-default-empty`)を群の選択肢と誤認しないこと(対象URLに存在)
- `el.value = ...` に置き換えないこと。既存の prototype setter + イベント発火の流儀を radio の checked 版で踏襲する
- フロント/バックの技術レイヤーで分割しないこと。radio群の縦スライスで進める

## Definition of Done
- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] テストカバレッジが基準を満たす（E2E/統合/単体すべて）
- [ ] `make check` が通る
- [ ] コードレビュー完了
- [ ] リファクタリング完了（グリーン後）
- [ ] ドキュメント更新済み

## INVEST + Readyチェック
- Independent: PBI-01完了後は単独で価値提供可(依存はPBI-01のみ)
- Negotiable: 群表現の詳細は実装時に調整可
- Valuable: 対象URL形式の回答が可能になる
- Estimable: 要スパイク(群表現の設計不確実性あり)
- Small: 現時点では大きめ。要分割検討(スパイク分離)
- Testable: 上記受け入れ基準で検証可
