# PBI: splitBy をラッパー2関数に分割（可読性のみ・振る舞い不変）

## ユーザーストーリー

開発者として、分類ロジックの `splitBy` 5引数汎用関数を `splitGroupByLabel` / `splitGroupByPartOrder` の薄いラッパー2関数に分けたい。`key` / `accept` / `dropOversize` の組合せと `inPartOrder` の `out` への閉包参照を同時に追わなくて済むようにし、分類ロジックの可読性を上げたい。

なお本件は現状維持も可とされた案件であり、やるならこの形に限定する。

## 優先度

- 順位: 12位 / 12件
- RICE スコア: 20（Reach=5 / Impact=0.25 / Confidence=80% / Effort=0.05人月）
- 根拠: 可読性のみで効果最小。依存なし

## BDD受け入れシナリオ

### シナリオ1: ラベル一致グループは既存どおり再タグされる

- Given `tel` 候補3欄が同一 `label + nearby` キーを共有している
- When `splitGroupByLabel('tel', ['tel1', 'tel2', 'tel3'])` 相当の経路で分類する
- Then 3欄は `tel1` / `tel2` / `tel3` に再タグされ、超過グループは従来どおり破棄される

### シナリオ2: 連番・順序グループは既存どおり再タグされる

- Given ラベル綴りが異なる分割欄（市外局番/市内局番/加入者番号、上3桁/下4桁など）が nearby-only キー＋ consecutiveness ＋ part-order 条件を満たしている
- When `splitGroupByPartOrder(...)` 相当の経路で分類する
- Then 従来の `splitBy` と同一の再タグ／破棄結果になる

### シナリオ3: 5引数関数は外部から呼べない

- Given リファクタ後の `classify-rules.ts`
- When モジュールの公開API経由で汎用5引数 `splitBy` を直接呼ぼうとする
- Then それは不可であり（private 化／非 export）、呼び出し経路は2つのラッパーに限定される

## 受け入れ基準

- [x] `splitGroupByLabel` と `splitGroupByPartOrder` の薄いラッパー2関数が存在すること
- [x] 汎用5引数 `splitBy` が private 化（非 export／モジュール内に閉じる）されていること
- [x] 振る舞い変更なし（既存の再タグ／超過破棄ルールをそのまま委譲するのみ）
- [x] `classify-dispatch-parity` テストが緑であること
- [x] `make typecheck` が緑であること

## テスト戦略

- 振る舞い変更なしのため新規テストは追加しない（等価性は既存テストで担保済み）
- 回帰確認: `classify-dispatch-parity` テストを必ず実行し緑を維持する
- 型確認: `make typecheck` でラッパー分割による型崩れがないことを確認する
- 目視確認: `key` / `accept` / `dropOversize` の組合せが各ラッパーに固定され、`inPartOrder` の `out` への閉包参照が part-order 側に隔離されていること

## 見積もり

- Effort: 0.05人月
- 変更範囲: `src/core/classify-rules.ts` の `splitBy` 周辺のみ（ラッパー2関数追加＋5引数関数の private 化）

## Definition of Done

- [x] 上記受け入れ基準をすべて満たすこと
- [x] `classify-dispatch-parity` テスト緑・`make typecheck` 緑を確認したこと
- [x] 振る舞い変更がないこと（分類結果の差分ゼロ）
- [x] 他ファイルへの不要な変更がないこと
