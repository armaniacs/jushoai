# PBI: jsdom 31 major 対応

## ユーザーストーリー
JushoAI のテスト基盤を保つ開発者として、jsdom を 30.1.3 から 31.0.0 に上げたい、なぜなら major のまま放置するとセキュリティ修正や vitest との整合が取りにくくなり、テスト基盤の陳腐化が回帰の見逃しにつながるから

## 優先度
- RICEスコア: 6（Reach=2 / Impact=1 / Confidence=80% / Effort=0.25人週）
- 根拠: テスト基盤の維持。挙動変更は伴わないが、jsdom は 30 件超のテストが依存する基盤のため回帰確認が必須

## 出どころ
- 2026-11-09 の依存確認で `npm outdated` が jsdom 31.0.0 を検出（現行 30.1.3、major）
- 同時に fake-indexeddb 6.2.8 と vitest 5.1.0 は `npm update` で追従済み（2dc2d3d、`make check` exit 0）
- jsdom は vitest の jsdom 環境経由で大半のテストが依存し、vitest 5.1.0 との組み合わせも検証が必要
- 過去の依存対応は shell-quote の overrides 固定（PBI-1009a系）が前例

## BDD受け入れシナリオ
Scenario: jsdom 31 でテストが緑になる
  Given package.json の jsdom が ^31.0.0 に上がり、lockfile が整合している
  When make check を実行する
  Then typecheck・全テスト・両ブラウザ build・manifest 検査・lint が exit 0 になる

Scenario: テストの挙動が変わらない
  Given jsdom 31 での make test 実行結果
  When 30.1.3 時代の pin・期待値と突き合わせる
  Then 挙動差によるテスト失敗がなく、失敗があれば jsdom 31 の変更点に根拠づけて修正または pin 更新する

## 受け入れ基準
- [ ] package.json の jsdom が ^31.0.0 に上がり、package-lock.json が整合する
- [ ] jsdom 31 の変更点（破壊的変更）を確認し、影響範囲を PBI に記録する
- [ ] make check が exit 0
- [ ] 挙動差によるテスト失敗があれば根拠づけて修正または pin 更新し、放置しない

## 実装手順
- jsdom 31 のリリースノートで破壊的変更を確認する
- package.json を ^31.0.0 に上げ、`npm install` で lockfile を更新する
- make test で差分を確認し、挙動差は根拠づけて修正または pin 更新する
- make check で締める

## テスト戦略
- 検証: make check（typecheck + 全テスト + 両ブラウザ build + manifest 検査 + lint）
- 既存テストが回帰網になる。新規テストの追加は挙動差が出た場合のみ

## 見積もり
0.25人週（要チームでの見積もり）

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録）
