# PBI: messages.ts を契約族ごとに分割する

## ユーザーストーリー

開発者として、AI runtime メッセージ契約と走査上限と popup analyze 契約を別モジュールに分けたい、なぜなら351行の messages.ts が11モジュールのハブで3系統の契約を抱えており、語彙変更のたびにどの層に飛び火するか読み取りにくいため。

## 優先度

- 順位: 3位 / 4件
- RICEスコア: 16（Reach=6 / Impact=1 / Confidence=80% / Effort=0.3人月）
- 根拠: 波及コスト削減。効果は大きいが PBI-43 の移動手順を踏むため工数は中。111位の別名削除の後が自然（移動する export が実体だけになる）。

## BDD受け入れシナリオ

```gherkin
Scenario: 走査上限が dom から直接 import できる
  Given MAX_TEXT_LENGTH が messages.ts にある
  When scan-limits.ts に移す
  Then dom/scan-fields.ts が messages を経由せず上限を引き、両端の cap は一致を保つ

Scenario: popup 契約が AI 契約から分かれる
  Given ANALYZE_MESSAGE_TYPE が messages.ts にある
  When analyze-contract.ts に移す
  Then popup/main.ts と content.ts が新モジュールから引き、AI 語彙を推移的に引き込まない
```

## 受け入れ基準

- [x] src/scan-limits.ts に MAX_TEXT_LENGTH が移り、messages.ts と dom/scan-fields.ts の両方がそこから引くこと
- [x] src/analyze-contract.ts に popup analyze 契約が移り、popup/main.ts と content.ts がそこから引くこと
- [x] messages.ts が AI runtime 契約（AiRequest・codec・parse 群）に専念すること
- [x] 純粋な移動 + 再エクスポートで挙動が不変であること（PBI-43 の手順を踏襲）
- [x] `make check` が通る

## テスト戦略

- 単体: 既存の wire 契約テスト（tests/messages.test.ts）が緑を維持する
- 回帰: `make check` green

## 見積もり

- 0.3人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [x] `make check` が通る
