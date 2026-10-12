# PBI: アンカー選択の矩形読み取りを1回にまとめる

状態: 未着手（0.1.14 コードレビュー 2026-10-12 の Suggestions #4 から起票）
起票日: 2026-10-12

## ユーザーストーリー

保守担当者として、欄が多いページでもアンカー選択の費用が欄数に比例していてほしい。なぜなら `pickAnchor` は `hasBox` で全欄の矩形を読み、さらにソートの比較子が `visualTop` を比較ごとに 2 回呼ぶため、`getBoundingClientRect()` が O(n log n) 回走るから（書き込みが挟まらないため強制リフローではないが、無駄な読み取りである）。

## 優先度

- 順位: 5 / 全候補 5 件
- RICEスコア: 0.4（Reach=1 / Impact=0.25 / Confidence=80% / Effort=0.5）
- 根拠: 実測していないため確信度を 80% とした。読み取りはレイアウトキャッシュに当たるため、体感差が出るのは欄が非常に多いページに限られる。他候補と独立

## BDD受け入れシナリオ

```gherkin
Scenario: 矩形の読み取りが欄数に比例する
  Given 欄が N 個あるフォームがある
  When  アンカーを選ぶ
  Then  各欄の矩形は 1 回だけ読まれる

Scenario: 選ばれるアンカーは変わらない
  Given 視覚順と文書順が食い違うフォームがある
  When  アンカーを選ぶ
  Then  従来と同じ欄が選ばれる
```

## 受け入れ基準

- [x] 各欄の矩形読み取りが 1 回に収まっている（読み取り回数を数えるテストで断言する）
- [x] 既存の `tests/dom/detect-forms.test.ts` と `tests/integration/samples.test.ts` が緑のまま（選択結果が変わらない）
- [x] `make check` が通る

## テスト戦略

- 単体: `getBoundingClientRect` をスパイし、呼び出し回数が欄数に比例することを断言する（現状は O(n log n) になることを Red で示す）
- 統合: 既存の fixture ケースで選択結果の不変を確認する

## 見積もり

0.5pt（要チームでの見積もり）

## Definition of Done

- [x] 全 BDD シナリオが自動テストとして実装されパスする
- [x] `make check` が通る
- [ ] コードレビュー完了（ユーザー作業）

## 実施記録（2026-10-12、タスククローザによる実装。並列サブエージェントが 2 回中断したため本体で実施）

- 実装コミット `049968d`: `src/dom/detect-forms.ts` の `pickAnchor` 内に pick スコープの rect メモ化（`Map<Element, DOMRect>`）を置き、`hasBox` とソートキーの両方を `rectOf` から導出。モジュールレベルの `visualTop` / `hasBox`（`grep` で pickAnchor 専用と確認済み）をローカルクロージャに移設し、既存コメント（ゼロ面積が最後尾、jsdom で安定、boxless を落とす理由）は移動先に保持。フィルタ順・ソートキー・フォールバックのセマンティクスは完全に不変
- テスト: `tests/dom/detect-forms.test.ts` にカウントテスト 1 件追加（9 欄のフォームで `detectForms` 走行中の各欄の `getBoundingClientRect` がちょうど 1 回。旧実装はソート比較子が再読みして欄あたり 2〜3 回で Red）
- 検証: Red → Green（detect-forms 12/12、samples 23/23）。`make check` exit 0
- ユーザーの作業として残る項目: コードレビュー
