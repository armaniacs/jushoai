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

- [x] `left` を設定しない理由（`all: initial` の `auto` と、right 起点の配置）がコメントに書かれている
- [x] overlay の配置が従来どおりである（`tests/ui/host.test.ts` が緑のまま）
- [x] `make check` が通る

## テスト戦略

- コメントのみのため対象外。既存の `tests/ui/host.test.ts` の緑で確認する

## 見積もり

0.25pt（要チームでの見積もり）

## Definition of Done

- [x] コメントが追加されている
- [x] `make check` が通る
- [ ] コードレビュー完了（ユーザー作業）

## 実施記録（2026-10-12、タスククローザの並列サブエージェントによる実装）

- 実装コミット `63be9b9`: `src/ui/overlay.ts` の `createOverlayHost` に、`left` を書かない理由の英語コメント 9 行を追加。(1) `position: fixed` + `right: 16px` のもと `left: auto` ならボックスは右端起点で幅（`OVERLAY_CSS` の `.panel`、360px）分左へ伸びること、(2) `createShadowHost` の `all: initial !important` が `left` を important 優先度で auto にリセット済みで非 important の書き込みは負けること、(3) important 付きで書くと固定幅ボックスで left + right + width が過剰拘束になり LTR では right が無視されて固定が左端寄りに反転すること。コードは 1 行も変更していない
- 検証: `npx vitest run tests/ui/overlay.test.ts` 5/5 緑。`make check` exit 0
- ユーザーの作業として残る項目: コードレビュー
