# PBI: pin 表化（corpus.eval.ts の集計 pin を fixture 単位の指標表に変え、世代コメント考古学を表の差分に置き換える）

## ユーザーストーリー
corpus の分類指標を測る保守担当者として、tests/eval/corpus.eval.ts の pin（ruleHits 203・llmFallbacks 61・fillable 125 の集計 magic number）を fixture 単位の指標表（pin 表）にしてほしい、なぜなら集計 pin だと 1 fixture の指標が動いたとき、失敗がどの fixture 由来かを名指さず、全 fixture 分の make eval 出力を人手で diff して確かめることになり、pin 更新を古い「正当な基準値」コメントに anchored に書くと落ちた make eval を回帰と誤読して分類ルールを触り始める実害が既に起きているから。per-fixture 表なら drift が「どの fixture のどの指標が動いたか」を名指し、集計は表の合計として誘導され、pin 更新は該当行の編集だけで済む

## 優先度
- 順位: 3 / 8（RICE 候補 #3、ユーザー承認済み）
- RICE スコア: 5.3（Reach=1.0（分類指標を測る全保守タッチ）/ Impact=2（大きい・pin 誤読の実害済み）/ Confidence=80%（実装スコープは明確だが eval 再構成の影響範囲の確認が要る）/ Effort=0.3 人週（tests/eval のみ・src/ 変更なし・fixture 先行 TDD + pin 更新込み））
- 根拠: pin 誤読の実害済み（なぜなぜ分析で実害が記録された唯一の場所。PBI-208 の 127・PBI-210 の 126・PBI-211 の 60 が同居）。corpus の指標を動かす PBI（208/210/211/212/213 系）の pin 更新が毎回ここを通る
- 依存: PBI-212（実装済み。corpus.eval.ts の pin が 203/61/125 の現行状態）の後に実施。corpus.eval.ts が同じファイルのため競合し、pin 表の初回作成は 212 の pin 更新の後。corpus 土台（2a/2b）と PBI-213 も corpus.eval.ts を触るため、着手時に他の差分が入っていないか確認する（落とし穴参照）

## 出どころ
- なぜなぜ分析（アーキラウンド、.superpowers/sdd/why-why-arch-2026-10-31-summary.md）の発見 3a（pin の fixture 単位指標表化）と 3b（世代コメント考古学の置き換え）。詳細は同分析の保守担当者編（why-why-arch-2026-10-31-p2-maintainer.md、項目 3a・3b・実害の記録）:
  - 発見 3a（保守担当者 Top 1「半年後に最も事故りやすい・実害済み」）: pin は集計値（和）としてしか固定されておらず lossy で、fixture 別の内訳はコメント散文のみ。make eval の fixture 別行は console.log 出力だけで期待値としては固定されていない。1 fixture の指標が動くと、動いた値が fixture 追加の分なのか回帰なのかを全 fixture の出力を人手で diff して確かめることになり、回帰が fixture 追加と同じコミットに乗るとプラスとマイナスが相殺されて集計 pin は回帰を隠せる
  - 発見 3b: 世代コメントが「正当な基準値」の宣言形で積み上がっている（分析起票時点で PBI-160 から 211 までの 5 世代、PBI-212 の追加で 6 世代目まで育った。127・126・60 が同居）。宣言形の履歴コメントは現在の状態と同じ読み方をするため、古い値に anchored に pin を書くと make eval が落ち、それを「自分の実装が pin を壊した」と読んで分類ルールを疑って触り始める実害が起きている（PBI-208 の 127・PBI-210 の 126・PBI-211 の 60）
  - 開発運用 Top 3: pin は eval レイヤ（on-demand、make check にも CI にも検知されず人の規律のみで守られている）。per-fixture 表なら drift が「どの fixture のどの指標が動いたか」を名指す
  - 構造根因 2: 名前のある seam の後ろにない状態・履歴が ambient チャネル（コメント）に書かれ、assert できないので記録が黙って嘘になる
- 現状コード: tests/eval/corpus.eval.ts:31-70 の pin（:66-68 が ruleHits 203・llmFallbacks 61・fillable 125、:69-70 が refineChanged 28・refineDropped 0。203/61/125 は PBI-212 実装後の現行値）と 6 世代の prose コメント（:36-65）。指標の shape は src/eval/metrics.ts:14-33（EvalMetrics）、集計は :65-82（aggregate）

## BDD受け入れシナリオ

Scenario: pin が fixture 単位の表になり、ずれが fixture 名を名指す
  Given corpus 全 fixture の行を持つ pin 表と、表の合計として誘導される集計の期待値
  When 1 fixture の分類が動く変更（例: 語彙の追加）を入れて make eval 相当の pin 検査を実行する
  Then 失敗がその fixture 名を名指し、どの fixture のどの指標が動いたかがエラーだけで分かる（全 fixture の出力を人手で diff する手順は要らない）

Scenario: pin 更新が表の行の編集だけで済み、世代コメントが育たない
  Given pin 更新が必要な実装差分（fixture 追加や語彙追加）と pin 表
  When 変わった fixture の行だけを同じコミットで編集して make eval を実行する
  Then make eval が緑になり、git diff が「どの fixture のどの指標が動いたか」として世代記録になる。古い基準値を追記する prose コメントは増えない

Scenario: fixture 追加で pin 表から取り残されない
  Given make addurl で corpus に追加した新 fixture と、その行が無い pin 表
  When pin 検査を実行する
  Then corpus と pin 表の行の一致検査がその fixture 名で失敗し、行の追加が同じコミットで促される（新 fixture が pin から静的に外れることはない）

Scenario: 落ちた pin 検査が分類ルールを触る誘導にならない
  Given pin 更新を忘れた実装差分（pin 表の行が古いまま）と、fixture 名を示す失敗メッセージ
  When pin 検査を実行する
  Then 失敗メッセージが動いた fixture 名と pin 表の該当行を示し、「pin 更新か意図しない分類の変化かを fixture に戻って確認する」誘導を載せる。古い「正当な基準値」の数字は表にもコメントにも残らない

## 受け入れ基準
- [x] tests/eval/corpus.eval.ts の pin（ruleHits 203・llmFallbacks 61・fillable 125 の 3 magic number）が fixture 単位の指標表に置き換わっている（1 行 = 1 fixture。行は fixture 名と ruleHits・llmFallbacks・fillable を持つ）
- [x] refineChanged/refineDropped の集計 pin（:69-70）も pin 表の合計として誘導され（行に refineChanged・refineDropped を載せる）、集計側の magic number が残っていない
- [x] pin がずれたとき、失敗が fixture 名を名指す（どの fixture のどの指標が動いたかがテスト失敗だけで分かる）
- [x] corpus（import.meta.glob の fixture 名集合）と pin 表の行が一致することを検査し、行が無い fixture がその名前で失敗する
- [x] 世代コメント考古学（PBI-160/203/208/210/211/212 の「正当な基準値」段落）が削除され、「現在の内訳は pin 表を見よ」と pin 更新ルール（該当行を同じコミットで編集する）の 1 行コメントに置き換わっている
- [x] make eval が緑（pin 表が実測と一致。203/61/125・refineChanged 28・refineDropped 0 と同じ実測）
- [x] src/ 変更なし（src/eval/metrics.ts の EvalMetrics・evalMetricsFor・reportLine・aggregate は触らない）
- [x] make check が exit 0

## 実装手順
- red 先行: pin 表の行型と表を tests/eval に用意し（corpus.eval.ts 内、または tests/eval/ 配下の 1 module。src/ には置かない）、1 行だけ意図的に古い値を入れて pin 検査を実行する。失敗が fixture 名を名指すことを確認してから、実測値で埋める（表の局所性自体を先に固定する）
- pin 表の初期値は手で再計算しない: make eval の reportLine 出力（[JushoAI eval] fixture=... 行、corpus.eval.ts:25）から写す
- 集計の期待値を表の合計に置き換える: pin 表の行の合計と aggregate(rows) の実測を比較する形にし、toBe(203)/toBe(61)/toBe(125) と refineChanged/refineDropped の集計 pin を廃止する
- corpus と pin 表の一致検査を足す: import.meta.glob の fixture 名集合（corpus.eval.ts:8、PBI-136 の自動収集）と pin 表の fixture 名集合が一致することを検査する
- 失敗メッセージに fixture 名と誘導を載せる: expect(actual, message) の第 2 引数（または toEqual の差分）に fixture 名と「pin 更新か意図しない分類の変化かを確認する」文言を入れる
- 世代コメント（corpus.eval.ts:36-65 の PBI-160/203/208/210/211/212 段落）を削除し、「現在の内訳は pin 表を見よ。pin のずれは表の該当 fixture 行を同じコミットで編集する。表の diff が世代記録になる。古い基準値の追記はしない」のルールコメントに置き換える
- make eval・make test・make check で緑を確認し、pin 表の初回作成コミットを本 PBI の実装記録に残す（表の初回 diff が以後の世代記録の起点）

## テスト戦略
- E2E: なし（本 PBI は tests/eval の pin 表化のみ。実ブラウザ経路には触れない）
- 統合: make eval（pin 表が期待どおり。実測との一致・集計の誘導・ずれ時の fixture 名指しを確認する。corpus.eval.ts は make eval と同じ検査なので red から green の確認も同じ場所で行う）
- 単体: tests/eval/metrics.test.ts が指標の shape（EvalMetrics・aggregate・reportLine）を検査し、src/ 変更なしのため期待値は動かず緑のまま保たれる

## 見積もり
0.3 人週（RICE Effort。tests/eval のみ・src/ 変更なし。pin 表作成 + red 先行の局所性確認 + 世代コメント整理 + pin 更新込み。最終値は要チームでの見積もり）

## 実装者向け注記

### 現状コードの確認
（着手前に必ず実行すること）

```bash
grep -nE 'toBe\(203\)|toBe\(61\)|toBe\(125\)|正当な基準値' tests/eval/corpus.eval.ts
grep -n 'interface EvalMetrics\|export function aggregate\|export function reportLine' src/eval/metrics.ts
npx vitest run tests/eval/corpus.eval.ts
make eval
```

未実装の確認済み（2026-11-01 起票時）: pin は corpus.eval.ts:66-68 の集計 3 値と :69-70 の refineChanged/refineDropped のままで、fixture 単位の指標表は無い。世代コメント（PBI-160/203/208/210/211/212 の 6 世代）が :36-65 に同居している。

### 落とし穴
- pin 表を新しい第 2 台帳にしない: corpus は import.meta.glob 自動収集（corpus.eval.ts:5-8）なので、表と corpus の一致検査が無いと fixture 追加が黙って pin から外れ、「測られている = 固定されている」という読みが嘘になる。一致検査を必ず足す
- 行の値を手で計算しない: 手で再計算すると現行の prose コメントと同じ「嘘の記録」を量産する。make eval の reportLine 出力から写す
- 失敗メッセージに「回帰」という語を置かない: 208・210・211 の誤読を再製する。メッセージは fixture 名と「pin 更新か意図しない分類の変化かを確認する」誘導までにする
- 集計を先に直さない: pin 表の行を確定させてから集計の期待値を表の合計に変える。順序を逆にすると表の誤りが集計検査で隠れる
- unknowns は total - ruleHits で誘導できるため表の行に載せない（EvalMetrics には残る。src/ は触らない）
- corpus.eval.ts に他の差分（corpus 土台 2a/2b・PBI-213）が入っていないか着手時に git status で確認する。入っている場合は後回しにする（pin 差分が 2 原因混在になる）
- pin 更新ルールは PBI-212 の受け入れ基準（pin 更新を同じコミットに固定する）と同じ方向だが、本 PBI の後は「同じコミットで pin 表の該当行を編集する」が更新手順になる

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする（corpus.eval.ts と make eval で緑）
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録。pin 表の初回作成コミットが世代記録の起点になることを記す）

## 外す条件
- pin が gate 化される（make check / CI で機械検知され、eval レイヤの pin が人の規律で守る対象でなくなる）なら本 PBI は不要。ただし gate 化自体は本 PBI の対象外（候補棚の別枠）で、表化（局所性の付与）自体は gate 化しても意味を失わないため、gate 化 PBI の受け入れ基準に per-fixture の差分報告を載せるかどうかだけ確定する
- src/eval/metrics.ts の指標の shape 変更（EvalMetrics の単位や集計の定義変更）が伴う場合は本 PBI から外す（本 PBI は src/ を触らない。shape 変更は別 PBI に切り、その後に本 PBI を実施する）
- pin のずれが意図しない分類の変化を示した場合、src/core/ の分類ルールへの手入れは本 PBI に含めない（その fixture の意図確定を別作業に切る）

## 実装記録（2026-11-01）

### pin 表の初回作成

tests/eval/corpus.eval.ts に pin 表（行型 PinRow と表 PIN_TABLE）を新設した。1 行 = 1 fixture で、行は fixture 名と ruleHits・llmFallbacks・fillable・refineChanged・refineDropped を持つ。unknowns は total - ruleHits で誘導できるため行に載せていない（EvalMetrics には残る）。行の値は手で再計算せず、make eval の reportLine 出力（[JushoAI eval] fixture=... 行）から写した。

pin 表の初回作成コミットは本コミットで、このコミットの表の初回 diff が以後の世代記録の起点になる。以後の pin 更新は表の該当 fixture 行を同じコミットで編集し、表の diff が世代記録になる（古い基準値の追記はしない）。fixture 数は 27（corpus 全体。集計は 203/61/125・refineChanged 28・refineDropped 0 で、PBI-212 実装後の実測と同じ）。

### red 先行の確認

- 実測差分の red: nishimachi-inquiry.html の fillable を意図的に古い値（pin 6、実測 7）にして make eval を実行した。失敗は「nishimachi-inquiry.html: fillable pin=6 実測=7」と fixture 名と動いた指標を名指し、エラーだけでどの fixture のどの指標が動いたか分かった（全 fixture の出力を人手で diff する手順は要らない）。メッセージは「pin 更新か意図しない分類の変化かを fixture に戻って確認する」誘導で、「回帰」という語は置いていない
- 一致検査の red: pin 表から forum.html の 1 行を外して make eval を実行した。失敗は「forum.html: pin 表に行がありません。make eval の fixture 行から 1 行追加する」と fixture 名で失敗し、fixture 追加・削除が pin 表から黙って外れる形を作らないことを確認した

### 構成

- pin 表の検査は 2 方向。1 行 = 1 fixture の実測照合（pinDiff が指標単位のずれを列挙し、fixture 名と pin 値と実測値を載せる）と、corpus/pin 一致検査（corpus 側の行が無い fixture と pin 表側の残骸行の両方向）
- 集計 pin（toBe(203)/toBe(61)/toBe(125) と refineChanged/refineDropped の magic number）は廃止し、pin 表の行の合計（pinSum）と aggregate(rows) の実測を比較する形にした。集計側の magic number は残っていない（数字は pin 表の行にしか置かない）
- 世代コメント（PBI-160/203/208/210/211/212 の「正当な基準値」段落）を削除し、pin 表の先頭に「現在の内訳は pin 表を見よ。pin のずれは表の該当 fixture 行を同じコミットで編集する。表の diff が世代記録になる。古い基準値の追記はしない」のルールコメントを置いた
- src/ には触れていない（EvalMetrics・evalMetricsFor・reportLine・aggregate は不変）。tests/eval/metrics.test.ts の期待値も不変のまま緑

### 検証

- make eval: 緑（3 tests。pin 表が実測と一致）
- make test: 緑（174 files、2255 passed、1 expected fail。metrics.test.ts は src/ 変更なしのため期待値不変）
- make check: exit 0
- 文字種チェック（check_docs_chars.py）: OK
