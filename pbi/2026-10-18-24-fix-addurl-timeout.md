# PBI: addurlの未配線全件fetchにtimeoutと対象限定を付ける

## ユーザーストーリー

開発者として、1件のURL追加のはずが未配線全件の取得で無期限停止しないようにしてほしい、なぜなら1件追加のための作業が応答しないホスト1件で止まると開発が進まなくなるため。

## 優先度

- 順位: 24位 / 40件
- RICEスコア: 80（Reach=3 / Impact=2 / Confidence=80% / Effort=0.06人月）
- 根拠: 未配線全件fetchの無期限停止をなくしaddurl作業を止めない。依存なし（PBI-36と同スクリプトのため実装は直列）。
- 出典: checking-team DX Medium
- 対象: Makefile:59-64、scripts/sync-target-urls.mjs:46-56

## BDD受け入れシナリオ

```gherkin
Scenario: 応答しないホストがあってもtimeoutで打ち切られる
  Given 未配線URLの中に応答しないホストが含まれる
  When sync-target-urlsがfetchを実行する
  Then AbortSignal.timeoutで打ち切られ、無期限停止せず次のURLに進む

Scenario: 追加対象の1件だけに限定して取得できる
  Given URL=で1件のURLを指定してaddurlを実行する
  When sync-target-urlsが対象限定（--only相当）で動作する
  Then 指定した1件だけが取得・配線され、未配線の他件は取得しない
```

## 受け入れ基準

- [x] fetchにAbortSignal.timeoutによる打ち切りが付く
- [x] timeout時はそのURLをスキップして次の未配線URLに進む
- [x] URL=/--only相当で指定1件だけに限定取得できる
- [x] 変更範囲が対象コード（Makefileのaddurl周辺とsync-target-urls.mjsのfetch周辺）に収まる
- [x] 既存テストが緑維持

## テスト戦略

- 単体: timeout打ち切りと対象限定の分岐を網羅する
- 統合: 応答なしURL混じりの台帳→同期の一連で停止せず進むことを確認する
- 回帰: 正常取得・配線の振る舞いが変わらないことを既存テストで確認する

## 見積もり

- 0.06人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] `make check` が通る
