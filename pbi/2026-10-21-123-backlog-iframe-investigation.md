# PBI: クロスオリジン iframe 対応(調査から始める)

## ユーザーストーリー

開発者として、クロスオリジン iframe 内のフォームへの対応可否を確定する影響調査と設計書がほしい、なぜなら現在はトップフレームのみ(matches: ['<all_urls>'] で allFrames 指定なし: content.ts:99)で 埋め込み予約ウィジェットや外部決済フォームで効かないから。

## 優先度

- 順位: 9位 / 9件
- RICEスコア: 20(Reach=2 / Impact=2 / Confidence=50% / Effort=0.1人月)
- 根拠: 効けば大きいが調査結果次第では対象外に戻す判断があり得る(Confidence 50%)。需要の実績(fixture・URL)がゼロ。RICE だけなら 3〜4 位相当だが 深掘りセッションの着手判断(着手条件を調査の完遂に置く)を尊重し最後尾。実施コストが低いため 2〜3 位の間で調査だけ先に回す選択肢はある。

## BDD受け入れシナリオ

```gherkin
Scenario: 影響調査が設計書にまとまり着手判断が決まる
  Given フレーム境界に関わる実装箇所(走査・プレビュー配置・監査・送信)がある
  When 影響調査を実施する
  Then docs/superpowers/specs/ に設計書が作られ 対象外に戻す判断も含めて次の着手が決まる
```

## 受け入れ基準

- [x] フレーム境界に関わる実装箇所の全数(走査・プレビューボタンの配置・監査ログの URL 解釈・分類メタデータ送信)を確定する(監査の URL 帰属は location.href ではなく background.ts:70 の sender.tab?.url。content.ts:177 はフィードバック issue URL、252/371 は除外ゲート)
- [x] all_frames 化のパフォーマンス・権限要求の対象フレーム・data_collection_permissions(optional websiteContent)への影響を確定する(バンドル約 71KB x フレーム数の固定費。host permissions は all_frames と独立のため宣言変更不要)
- [x] README の送信データ説明の更新要否を確定する(対象外維持なら不要。all_frames 化なら README.md と site の英字側に 1 文追記)
- [x] docs/superpowers/specs/ に設計書を新規作成する(docs/superpowers/specs/2026-10-21-iframe-design.md、文字種検証 exit 0)
- [x] 調査結果に基づき 実装 PBI 化か対象外かを決定する(コード変更はしない)(推奨は対象外維持。再開条件は iframe 内フォームの実測 1 件以上(fixture・台帳)またはユーザー報告 1 件以上。再開時の最初の工程は広告 iframe の多い実ページでの計測と監査・フィードバック URL の帰属方針決定)

## テスト戦略

- 調査: フレーム境界の実装箇所の全数把握+設計判断材料の確定。実装は設計書確定後の別 PBI

## 見積もり

- 0.1人月

## Definition of Done

- [x] BDDシナリオのとおり調査結果が設計書として纏まる(docs/superpowers/specs/2026-10-21-iframe-design.md、文字種検証 exit 0)
- [ ] コードレビュー完了
- [x] 次の着手判断が可能(実装 PBI or 対象外)(推奨は対象外維持。再開条件は iframe 内フォームの実測 1 件以上(fixture・台帳)またはユーザー報告 1 件以上)
