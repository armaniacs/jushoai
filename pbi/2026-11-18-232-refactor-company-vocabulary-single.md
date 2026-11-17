# PBI: classify-rules の会社語彙一本化と文脈除外の集約

## ユーザーストーリー
分類ルールの語彙を追加する開発者として、会社語彙と文脈除外の定義が 1 箇所にあってほしい、なぜなら `hasCompoundJobJoint` が `COMPANY_WORD` を再記述した独自正規表現を持ち、語彙を増やすと「会社語・役職の結合を jobTitle にしない」ガードだけが置き去りになって「支店名・役職名」が jobTitle 誤分類に流れるから

## 優先度
- 順位: 2 / 14
- RICEスコア: 90（Reach=5 / Impact=1 / Confidence=90% / Effort=0.05人週）
- 根拠: PBI-203/212/224/225/229 と同型の語彙追加のペースを考えると近いうえに再発する。両修正ともテスト影響なしの等価リファクタでコストが小さい

## 出どころ
- checking-team 2026-11-18 ラウンド・Maintainability Guardian。`plans/2026-11-18-0530-review-main-v0.1.29.md`
- 場所: src/core/classify-rules.ts:98（COMPANY_WORD）・:127-130（hasCompoundJobJoint）・:102-130（KANA_NOTE/BIRTH_CTX 除外が 3 述語に重複）

## BDD受け入れシナリオ
Scenario: 語彙が 1 本化される
  Given hasCompoundJobJoint が COMPANY_WORD を参照する実装になる
  When  `npx vitest run tests/core/` を実行する
  Then  全テストが現行どおり緑であり、挙動の差がない

Scenario: 次の語彙追加が 1 箇所で完結する
  Given 会社語彙に新しい語（例: 支店）を 1 語追加する
  When  会社語・役職の結合ガードの挙動を確認する
  Then  新語が COMPANY_WORD だけで会社読み・jobTitle ガードの両方に反映される

## 受け入れ基準
- [ ] `hasCompoundJobJoint` が `COMPANY_WORD.test(own) || /部署/.test(own)` の形になり、語彙の再記述が消える（現状と同値）
- [ ] `officeContextExcluded(own)`（KANA_NOTE/BIRTH_CTX の除外判定）が切り出され、officeEligible / deptOfficeEligible / jobOfficeEligible の 3 述語から呼ばれる
- [ ] 挙動不変であることを既存テスト全体で確認する（新規テストは同値性の pin として最小限）
- [ ] `make check` が緑

## 実装手順
- `hasCompoundJobJoint` を COMPANY_WORD 参照に置き換える
- `officeContextExcluded` を切り出し、3 述語から呼ぶ
- 等価性は既存の corpus（311 fixture）と tests/core/ で確認する

## テスト戦略
- 既存テストが回帰網。同値性の確認のため hasCompoundJobJoint の境界ケース（既存 pin がある corpus 行）を 1〜2 件 pin する
- 挙動差が出た場合は PBI の方針に反するため、差分を fixture 先行で固定してから原因を直す

## 見積もり
0.05人週（要チームでの見積もり）

## Definition of Done
- [ ] 全 BDD シナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み（本 PBI に実装記録）
