# PBI: 逐次チャンク走の二重所有の解消

## ユーザーストーリー
開発者として、逐次チャンク走（cap→分割→schedule→timeout→失敗集約）の所有を 1 層に寄せたい、なぜなら runClassifyPipeline と classify-transport.send が同一の失敗集約規律を同型実装し、規律の変更（truncated の扱い・budget 見直し）が必ず 2 ループ＋2 テストを通るため

## 優先度
- 順位: 4 / 13
- RICEスコア: 53（Reach=8 / Impact=2 / Confidence=50% / Effort=0.15人月）
- 根拠: テスト3重化（pipeline/transport/gateway が同一規律を pin）が実在。191 の後に着手（同ファイル）。帰属決定が最初の决策

## BDD受け入れシナリオ
Scenario: 部分結果＋最初の失敗＋truncated は走の所有者 1 層から返る
  Given 複数チャンクに分割される pending がある
  When チャンク走を実行する
  Then 失敗語彙の優先順位（初回失敗優先・truncated は最後・signal 打ち切りは既得保持）が 1 か所から返る

Scenario: もう一方の層は走を持たない
  Given 走の所有者ではない層
  When 1 回の送信を実行する
  Then 有界 1 回の送信だけを見て、走の規律を再実装しない

## 受け入れ基準
- [ ] 走の所有が 1 層に寄せられる（方向: pipeline 走を canonical とし、transport は有界 1 回の送信に畳む）
- [ ] 失敗集約規律（初回失敗優先・truncated 最後・signal 打ち切り）が 1 か所になる
- [ ] 1 chunk 退化時の caller schedule 通過（transport:88-90）が不変
- [ ] テスト 3 重（classify-pipeline / classify-transport / background-gateway）が統合される
- [ ] `make check` が緑

## テスト戦略
- 単体: pipeline テストの schedule handoff（single-chunk=undefined 含む）と tel trio の合流後 refine が成立すること
- 統合: gateway 経路の cap・分割・収集が不変であること
- 構造: export 面（走を持つのは 1 層のみ）を構造テストで固定

## 実装アプローチ
- 本番経路（content.ts → content-session → runClassifyPipeline）で pipeline 走が live であり、transport の走は pipeline 迂回時のみ live。pipeline 走を canonical に寄せ、transport send を有界 1 回の送信（単一チャンク前提）に畳む
- 「pipeline から来る fields は必ず 1 チャンク幅」という噛み合わせ不変条件は transport 側の plan 呼び出しを削除することで型から消える

## 見積もり
0.15人月

## 技術的考慮事項
- pipeline テストの schedule handoff と transport テストの境界表を同時に満たす寄せ方でないとどちらかが落ちる（最大の落とし穴）
- single-chunk で chunk キー省略（background-gateway テスト pin）と「分割時のみ schedule」の 2 規律が潰れないように

## Definition of Done
- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み
