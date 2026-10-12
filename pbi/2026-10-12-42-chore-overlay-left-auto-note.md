# PBI: overlay の left auto 依存をコメントに残す

状態: 未着手（0.1.14 コードレビュー 2026-10-12 の Suggestions #7 から起票）
起票日: 2026-10-12

## ユーザーストーリー

保守担当者として、overlay の位置指定が意図どおりだと一読で分かってほしい。なぜなら `createOverlayHost` は `top` と `right` だけを important で書き、`left` は `all: initial` の `auto` のままに依存しており、この非対称が偶然に見えるから。

## 優先度

- 順位: 3 / 全候補 5 件
- RICEスコア: 1.0（Reach=1 / Impact=0.25 / Confidence=100% / Effort=0.25）
- 根拠: 同点（1.0）の中で最も軽い。コメントのみで挙動は変わらない。他候補と独立

## BDD受け入れシナリオ

```gherkin
Scenario: left を書かない理由が読める
  Given `createOverlayHost` を読む
  When  位置指定を確認する
  Then  left が auto のままでよい理由がコメントされている
```

## 受け入れ基準

- [ ] `left` を設定しない理由（`all: initial` の `auto` と、right 起点の配置）がコメントに書かれている
- [ ] overlay の配置が従来どおりである（`tests/ui/host.test.ts` が緑のまま）
- [ ] `make check` が通る

## テスト戦略

- コメントのみのため対象外。既存の `tests/ui/host.test.ts` の緑で確認する

## 見積もり

0.25pt（要チームでの見積もり）

## Definition of Done

- [ ] コメントが追加されている
- [ ] `make check` が通る
- [ ] コードレビュー完了
