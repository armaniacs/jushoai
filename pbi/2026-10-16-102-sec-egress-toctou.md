# PBI: egress検査と実fetchの解決乖離（DNSリバインディングTOCTOU）の縮小

## ユーザーストーリー

カスタムbaseUrl利用者として、検証時と送信時で名前解決がすり替わる余地をできるだけ小さくしたい。なぜなら攻撃者管理ドメインを設定した場合にSSRFゲートを突破される余地が残るため（セキュリティ）。

## 優先度

- 順位: 9位 / 9件
- RICEスコア: 38（Reach=5 / Impact=3 / Confidence=50% / Effort=0.2人月）
- セキュリティ旗: RICEは低 reach のため最下位だが、セキュリティ案件として引き上げ可。悪用前提は「ユーザーが攻撃者管理ドメインをbaseUrlに設定済み」。
- 出典: adversarial-code-review ハッカー視点 `src/ai/settings.ts:205-221`＋`src/ai/http-classifiers.ts:167-179,181-191,202-203`（独立サブエージェント反証でSURVIVES Medium確定。DoH解決とfetchのシステムDNS解決が別経路・別タイミングでIP pinなし）

## BDD受け入れシナリオ

```gherkin
Scenario: 送信直前に解決が再検証される
  Given 検証済みのカスタムbaseUrlがある
  When 分類リクエストを送信する
  Then 送信時点の解決が gate の対象になる（乖離窓が最小化される）

Scenario: 完全排除が不可の場合は危険が明示される
  Given fetch APIにIP pin手段がない
  When 根本排除ができない
  Then 制約と推奨（信頼できるbaseUrlのみ設定）が文書に残る
```

## 受け入れ基準

- [x] check→fetchの乖離窓を縮小する実装または再検証が行われる
- [x] 残存する制約がコードコメントまたはドキュメントに明示される
- [x] 既存のegress関連テストが緑維持
- [x] 通常のloopback・クラウド利用の操作性が損なわれない

## テスト戦略

- E2E: 対象外
- 統合: 解決flip時の再検証動作を確認する（可能な範囲で）
- 単体: check/fetchの解決経路・再検証分岐を網羅する

## 見積もり

- 0.2人月（プラットフォーム制約の調査を含む）

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする（文書のみの場合は制約明示で代替）
- [x] コードレビュー完了
- [x] `make check` が通る
