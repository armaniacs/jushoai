# PBI: checking-team ラウンド最終レビューのフォローアップ整理

## ユーザーストーリー
checking-team ラウンド（231〜244）の最終レビューで follow-up 判定になった 4 項目を、次に該当ファイルを開く開発者が 1 回で回収したい、なぜなら 個々は小さいが散らばったままだと同じ調べ直しを繰り返すから

## 優先度
- RICEスコア: 48（Reach=5 / Impact=0.5 / Confidence=95% / Effort=0.05人週）
- 根拠: 全項目が最終レビュー（2026-11-18）で fix-before-merge を免れた polish。単独では起票に値しないが、同一タイミングで回収するのが最も安い

## 出どころ
- checking-team ラウンド最終レビュー（2026-11-18・Ready to merge: Yes）の Minor 項目。出どころは各項目に記載

## 対象項目（4 件）

### (a) officeLegendEligible の文脈除外を officeContextExcluded に集約

- 出どころ: PBI-232 のレビュー記録・実装記録（「第 4 の office ゲート述語に同型のインライン除外が残る」）
- 場所: src/core/classify-rules.ts の `officeLegendEligible`（`!KANA_NOTE.test(own) && !BIRTH_CTX.test(own)` が残存）
- 実装: PBI-232 と同じ等価リファクタ。`officeContextExcluded(own)` を呼ぶ形に置き換える。挙動不変。既存テストと corpus pin が回帰網（RED 段階なし。同値性は既存 pin で確認）

### (b) 除外 URL の等価 fixture 3 面を pin

- 出どころ: PBI-239 のレビュー記録（「開示済みの等価性に fixture がない。将来のリファクタで静かに反転し得る」）
- 場所: tests/core/exclusions.test.ts
- 実装: `isExcludedUrl` に対して次の 3 面を pin する（実装と同値の期待値。RED 段階なし）:
  1. default port 同一視: エントリ `https://x.com/pay` に対し `https://x.com:443/pay` が一致する（new URL の origin は default port を落とす）
  2. userinfo 同一視: エントリ `https://user:pass@x.com/pay` と `https://x.com/pay` が一致する（origin は userinfo を含まない）
  3. bare-origin target: エントリ `https://x.com`（パスなし）に対し `https://x.com/任意/パス` が一致する（origin 直下はサイト全体）
- 期待値は実装（src/core/exclusions.ts の origin 比較 + coversPath/coversQuery）から確認してから書く。もし実装が上記と異なる場合は fixture を実装に合わせ、その差を実装記録に明記する

### (c) タスク ID コメントの残置除去と運用の明文化

- 出どころ: PBI-238 のレビュー記録（overlay.ts の PBI-209 由来タスク ID コメント）・最終レビュー Minor（同種が既存コードにもあるが本 PBI で触るのは 1 行のみ）
- 場所: src/ui/overlay.ts の SHADOW_TOKENS 付近にある `/* PBI-209: ... */` コメント
- 実装: タスク ID 参照を除いて WHY だけを残す（内容自体が不要ならコメントごと消してよい）。併せて AGENTS.md に 1 行明文化する: 「コードコメントにタスク ID（PBI-XXX 等）を書かない。理由の記述に留める」（既存規約の確認用の再掲）

### (d) チャンク予算の pin 補強

- 出どころ: PBI-240 のレビュー記録（「seam 側のクロックテストが run スコープの startedAt 再利用を pin していない」）
- 場所: tests/llm/classify-pipeline.test.ts の seam クロックテスト（:199-208 付近）
- 実装: 既存テストに 1 断言を追加する: 同一 run 内の全 `seam.attempt` 呼び出しに渡った startedAt が同一（`new Set(startedOpts).size === 1`）であること。挙動追加ではなく既存挙動の pin（RED 段階なし）

## 受け入れ基準

- [ ] (a) officeLegendEligible が officeContextExcluded を参照し、classify-rules.ts に KANA_NOTE/BIRTH_CTX のインライン組合せが 3 述語と同じ形で残っていない
- [ ] (b) 等価 fixture 3 面が tests/core/exclusions.test.ts に pin されている（期待値は実装と照合済み）
- [ ] (c) overlay.ts にタスク ID 参照がなく、AGENTS.md に運用 1 行がある
- [ ] (d) startedAt 再利用の pin が tests/llm/classify-pipeline.test.ts に追加されている
- [ ] `make check` が緑。`npm run eval` の pin 311 行が全行不変

## テスト戦略

- (a)(c) は挙動不変のため既存テストが回帰網（新規テストなし）
- (b)(d) は既存挙動の pin 追加のみ（RED 段階なし。pin の期待値は実装照合で確定）

## 見積もり
0.05人週（要チームでの見積もり）

## Definition of Done
- [ ] 全 BDD シナリオが検証手順（make check・eval pin 不変・実装照合）でパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録）
