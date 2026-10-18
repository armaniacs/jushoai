# PBI: sync毎の全DOM走査＋全欄再分類を軽量化する

## ユーザーストーリー

動的ページの利用者として、MutationObserver発火のたびにCPUスパイクで重くならないようにしてほしい、なぜなら重いページで入力がもたつくと利用継続の妨げになるため。

## 優先度

- 順位: 21位 / 40件
- RICEスコア: 167（Reach=100 / Impact=0.5 / Confidence=50% / Effort=0.15人月）
- 根拠: 動的ページの体感性能を底上げする。依存なし。
- 出典: checking-team Tuning Medium plans/2026-10-18-1430-review-1018a.md、.checking-team-tmp/1018a-20261018-142047/ops-performance.md
- 対象: src/entrypoints/content.ts:439、src/dom/detect-forms.ts:60

## BDD受け入れシナリオ

```gherkin
Scenario: 無関係なDOM変異では全欄再分類を走らせない
  Given 動的ページを開きフォーム検出済みの状態である
  When 分類対象外の要素だけが追加・変更される
  Then 全DOM走査と全欄のclassifyField再実行をスキップし、マウント状態が維持される

Scenario: 分類対象の変化時のみ再検出して振る舞いが変わらない
  Given フォーム検出済みの状態である
  When input/selectの追加・削除やname/type/idの変化が起きる
  Then detectFormsと再分類が実行され、従来と同じマウント結果になる
```

## 受け入れ基準

- [x] 軽量事前フィルタ（対象セレクタ・変異種別の判定）またはmetaハッシュのメモ化で無関係な変異をスキップする
- [x] 分類対象の変化時は従来どおり再検出・再分類され、マウント結果が変わらない（振る舞い不変）
- [x] 変更範囲が対象コード（content.tsのsync周辺、detect-forms.tsの分類周辺）に収まる
- [x] 連続する無関係変異でCPU時間・走査回数が削減されることが計測またはテストで裏付けられる
- [x] 既存テストが緑維持

## テスト戦略

- 単体: 無関係変異のスキップと対象変化時の再実行の分岐を網羅する
- 統合: 変異→sync→マウント維持／更新の一連で振る舞い不変を確認する
- 性能: 連続変異時の走査回数・分類回数を数えて削減を確認する

## 見積もり

- 0.15人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] `make check` が通る
