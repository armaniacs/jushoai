# PBI: refineWithDrops の3責務を純粋関数に分離する

## ユーザーストーリー
開発者として、分割・除外・住所絞り込みを別々に変えられるようにしたい、なぜなら現在は refineWithDrops の1関数に4処理が同居し、次の条件追加が90行の末尾に足され続ける構造だから

## 優先度
- 順位: 2 / 5
- RICEスコア: 9.3（Reach=4 / Impact=2 / Confidence=70% / Effort=0.6人週）
- 根拠: 分割・絞り条件の追加は分類改善の常連（PBI-09/12型）。順序不変の切出しで確信度高（Effort 0.6 はチーム見積もり前の仮置きで、確定時に再計算する）

## 出どころ
- 発掘報告書 `.superpowers/sdd/backlog-discovery-2026-11-10.md` テーマ2
- `src/core/classify-rules.ts:506-523`（refineWithDrops 本体と at() ナローイング）
- `src/core/classify-rules.ts:529-574`（splitBy と2系統の grouping 分岐）
- `src/core/classify-rules.ts:581-597`（PBI-09 の leftover unknown 化。第3の grouping 走査）
- `src/core/classify-rules.ts:603-615`（PBI-12 の住所絞り込み。第4の走査）
- `src/core/classify-rules.ts:487-504`（SPLIT_POLICIES 表。label/partOrder の2系統が既に分岐）

## BDD受け入れシナリオ
Scenario: 分離しても順序と意味論が変わらない
  Given 分離の前後
  When 分割・除外・絞り込みの各ケースを実行する
  Then 分類結果がすべて同一になる

Scenario: 各責務が単体で検証できる
  Given dropLeftovers と narrowAddress の純粋関数
  When 境界値を与える
  Then mock なしの単体テストで振る舞いが固定される

## 受け入れ基準
- [x] (c) leftover unknown 化を dropLeftovers、(d) 住所絞り込みを narrowAddress の純粋関数に切り出す
- [x] (a) 分割retag・(b) drop は splitBy 所有のまま残す
- [x] refineClassifications は split→leftover→narrow の順序固定の合成になり、意味論は不変
- [x] 既存テスト・pin 無変更で緑、make check が exit 0

## テスト戦略
- 既存テストが回帰網になる。新規テストは切り出した2関数の単体テストのみ
- 検証: make check

## 見積もり
0.6人週（要チームでの見積もり）

## 技術的考慮事項
- T1（PBI-218）とはファイルが近いが変更理由が別（分割 vs 値解決）のため別 PBI。順序制約はない
- pin 更新が必要になったら意味論変更疑いで停止し、原因を特定してから進める（黙って pin を更新しない）
- 切り出した関数の try/catch・ガードの移設は旧所在から新所在の移設表を PR に添付して明示する（ガードの欠落は欠陥扱い）

## Definition of Done
- [x] 全 BDD シナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] ドキュメント更新済み（本 PBI に実装記録）

## 実装記録
- 実施日: 2026-11-10。ブランチ work/pbi-219。変更は src/core/classify-rules.ts と tests/core/classify-rules.test.ts のみ。
- (c) を dropLeftovers、(d) を narrowAddress として切り出した。どちらも入力を変えず新しい配列を返す純粋関数である。同ラベル系の grouping キー sameLabel は splitBy と dropLeftovers で共有する単一定義に引き上げ、書式の drift を防ぐ。(a) 分割 retag・(b) drop は splitBy のまま残した。
- refineWithDrops は split→leftover→narrow の順序固定の合成になった。refineClassifications は items だけを取り出す入口のままで、意味論は不変である。
- ガードの移設表: at の範囲 throw・retag の有無判定・inPartOrder の連続性判定は splitBy 側に残留。leftover の `if (it)` narrowing と narrow の `g?.hasCity` / `g?.hasPref` スコープ不在判定は新所在に同形で移設。旧 leftover の droppedIds 除外は合成側の kept フィルタに置き換えた。dropped 欄は city/prefecture/addressFull になり得ないため scope 判定に影響せず、群の数え方も等価である。try/catch は旧所在になかったため移設対象なし。
- pin 更新はなし。意味論変更の疑いが出なかったため停止規約の発動なし。
- 新規テストは切り出した2関数の単体テストのみ。dropLeftovers 7件（単独維持・同キー unknown 化・別キー維持・分割済みと対象外の不変・空キー unknown 化・付帯情報保持・入力不変）。narrowAddress 5件（単独維持・同一スコープ絞り込みと city 優先・別スコープ不変・city/prefecture 不変・入力不変）。
- 検証: make check が exit 0（typecheck + 全テスト 2285 件パス + 両ブラウザ build + manifest 検査 + web-ext lint。lint 警告 2 件は Firefox 最小版由来の既存のもので、変更と無関係）。
- コードレビュー: 実装者による diff レビュー済み（split 部は同一、leftover/narrow は逐語移設、dropped 除外の前倒しは等価であることを確認。呼び出し側の署名は不変）。結合時の別視点レビューは次工程に委ねる。
- タスクレビューゲート（2026-11-10）承認。spec ✅・品質 Approved、Critical/Important なし。コントローラが classify-rules.test.ts 231/231 緑を再確認した。
