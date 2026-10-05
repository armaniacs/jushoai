# PBI: 年代(radio)対応 — radio群の年代解決 (backlog)

## ユーザーストーリー
JushoAI利用者として、radio形式の年代欄(例: 20代〜70代以上の6択)にも自動入力したい、なぜなら対象フォーム `https://pro.form-mailer.jp/lp/f9334cf2294970` の年齢欄が radio(`field_4609097`)で作られており select対応だけでは届かないから

## ビジネス価値
- radio年代欄への自動入力で PBI-03 の価値を完成させる
- 測定方法: 対象URL相当の radio 群サンプルで正しい年代に checked が付くこと

## BDD受け入れシナリオ

```gherkin
Scenario: radio年代欄に生年月日から導出した年代が入る
  Given プロファイルに生年月日が登録されている
  And フォームに年代radio群があり選択肢に「20代」〜「70代以上」が含まれる
  When 利用者がJushoAIボタンを押してプレビューを承認する
  Then 導出年代のradioに checked が付く

Scenario: 一致なし・入力済みは触らない
  Given 導出年代に対応する選択肢がない、または既にいずれかが checked である
  When 利用者がプレビューを開く
  Then 該当群は警告または filled 表示で上書きされない
```

## 受け入れ基準
- [x] radio群が年代カテゴリに分類される
- [x] planner が radio群の年代解決(warn-no-option/filled 含む)ができる
- [x] fill が checked + input/change/blur 発火で検知される(PBI-02の基盤を流用)
- [ ] 対象URL相当のサンプルで手動確認できる(ユーザー作業として残す。自動e2eは来場予約fixtureで代替)

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 最小限: samples に radio年代フォームを追加し手動確認

### 統合テスト
- scan→classify→plan→fill の radio 群スルー

### 単体テスト
- 群化、分類、年代照合、checked 付与、境界値(70代以上・10代以下・生年月日空)
- 比率目安 E2E:統合:単体 = 1:10:100

## 実装アプローチ
- **Outside-In**: E2E相当の赤から開始
- **Red-Green-Refactor**: 各層で TDD
- **リファクタリング**: グリーン後に整理

## 見積もり
8pt超の可能性あり (要チームでの見積もり)。Epic化の兆しがあれば着手前にシニアと設計相談すること

## 技術的考慮事項
- 依存関係: `2026-10-05-03-feat-age-decade-select.md` の年代導出・照合語彙に依存。先にPBI-03を完了させること。 radio群基盤は `2026-10-05-02-backlog-gender-radio.md` と共通化すること
- テスタビリティ: FieldMeta が単一要素前提のため群表現の設計が要。スパイク分離を検討
- 非機能要件: プロファイル値はLLMに送らない。radio の checked 操作がサイトバリデーションを壊さないこと
- 現状の制約: `src/dom/scan-fields.ts:70` TEXT_TYPES、`src/dom/fill.ts` value setter、`src/core/planner.ts` select分岐が変更対象

## 実装者向け注記

### 現状コードの確認
```bash
grep -rn "TEXT_TYPES\|fillField\|isUntouchedSelect" src/
grep -rn "4609097\|field_4609097" samples/ 2>/dev/null || echo "no sample yet"
```

### 実装手順
Outside-Inの縦スライス順:
1. radio年代の赤い受け入れテストを書く
2. PBI-03の導出・照合を流用し群解決を実装する
3. radio基盤(PBI-02)と統合し `make check` を通す

### 落とし穴
- 同一nameの hidden(empty送信用)を群の選択肢と誤認しないこと(対象URLに存在)
- value “0”〜“5” はテキストと1:1でない。テキスト一致優先の順序を守ること
- フロント/バックの技術レイヤーで分割しないこと

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする(手動確認を除く。一致なし・入力済みは単体テストで検証)
- [x] テストカバレッジが基準を満たす（E2E/統合/単体すべて）
- [x] `make check` が通る
- [ ] コードレビュー完了(ユーザー作業として残す)
- [x] リファクタリング完了（グリーン後）
- [x] ドキュメント更新済み(PBI-02と共通の文面更新で充足)

## INVEST + Readyチェック
- Independent: PBI-03完了後は単独で価値提供可(依存はPBI-03とradio基盤のみ)
- Negotiable: 群表現の詳細は調整可
- Valuable: 対象URL形式の回答が可能になる
- Estimable: 要スパイク(群表現の不確実性あり)
- Small: 現時点では大きめ。要分割検討
- Testable: 上記受け入れ基準で検証可
