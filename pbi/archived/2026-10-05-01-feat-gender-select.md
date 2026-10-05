# PBI: 性別(select)対応 — プロファイル保持とselect欄への自動入力

## ユーザーストーリー
JushoAI利用者として、プロファイルに性別を登録してselect形式の性別欄へ自動入力したい、なぜならアンケートや会員登録で性別が必須のフォームに手入力なく答えたいから

## ビジネス価値
- select形式の性別欄があるフォームの入力手数を1欄分削減する
- 測定方法: select性別欄を含むサンプルフォームでプレビュー承認後に正しい選択肢が選ばれること

## BDD受け入れシナリオ

```gherkin
Scenario: select性別欄にプロファイルの性別が入る
  Given プロファイルに性別「女性」が登録されている
  And フォームに性別select欄があり選択肢に「男性」「女性」が含まれる
  When 利用者がJushoAIボタンを押してプレビューを承認する
  Then 性別select欄に「女性」が選択される

Scenario: 選択肢にない性別は警告して入力しない
  Given プロファイルに性別「回答しない」が登録されている
  And フォームの性別select欄に「回答しない」の選択肢がない
  When 利用者がプレビューを開く
  Then 該当欄は warn-no-option で表示され値は入力されない

Scenario: 入力済みの性別欄は上書きしない
  Given フォームの性別select欄に既に何らかの値が選ばれている
  When 利用者がJushoAIボタンを押す
  Then 該当欄は filled 扱いで上書きされない
```

## 受け入れ基準
- [x] プロファイルに性別(男性/女性/その他/回答しない/未設定)を保存・復元できる
- [x] label/nearby/nameに性別語彙があるselect欄が gender に分類される
- [x] 既存の negatives(件名・会社名など)が gender に誤分類されない
- [x] select性別欄がプロファイル値と一致する選択肢に解決される(表記ゆれ対応含む)
- [x] 選択肢なし・入力済み・プロファイル空の場合は入力せず状態表示が正しい
- [x] LLM分類でも gender が返り得る(SYSTEM_PROMPTとCATEGORIESの更新)
- [x] サイト文面の「性別などは扱いません」がselect範囲で更新される

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- 最小限: 手動確認用に samples/ へ select性別欄つきフォームを追加し、プレビュー承認で正しく選ばれることを確認する手順を残す(自動E2E基盤なしのため手動)

### 統合テスト
- analyze/classifyAll 経由で性別select meta が gender になること
- buildPlan + fillField(既存select setter)で選択肢valueが解決されること
- options保存〜復元で gender が消えないこと

### 単体テスト
- classifyField: 性別/せいべつ/gender/sex の positives、件名・会社名・部署名などの negatives
- matchGenderOption: 「男性/女性/その他/回答しない」の表記ゆれ(全角・空白・男/女の略記は採用可否をテストで固定)、value数値(“0”/“1”)への対応可否
- planner.buildPlan(select+gender): ok / warn-no-option / filled / プロファイル空でスキップ
- normalizeProfile/validateProfile: gender の正規化と許容値外の扱い
- 比率目安 E2E:統合:単体 = 1:10:100

## 実装アプローチ
- **Outside-In**: 失敗する受け入れテスト(分類→計画の順)から開始し、赤を確認してから実装
- **Red-Green-Refactor**: TDDサイクルを分類・照合・計画の各層で適用
- **リファクタリング**: グリーンになるたびに品質改善

## 見積もり
3〜5pt (要チームでの見積もり)

## 技術的考慮事項
- 依存関係: なし(本PBIはradio対応を含まない。radioは `2026-10-05-02-backlog-gender-radio.md` に分離)
- テスタビリティ: 既存の makeMeta / vitest 流儀に従う。LLM実機精度は samples 手動確認に委ねる
- 非機能要件: プロファイル値はLLMに送らない既存原則を維持する。性別は機微な個人属性のため設定UIに任意項目である旨を示す
- 既存ドキュメントとの整合: `site/content/ja/how-it-works.md` 52行目、`troubleshooting.md` 62行目(英版も)が「性別などは扱いません」と明記。select対応後は文面更新が必要

## 実装者向け注記

### 現状コードの確認
着手前に必ず実行すること。2026-10-05時点で以下を確認済み(未実装):

```bash
grep -rn "gender\|性別\|sex" src/ tests/
# src には該当なし。tests/core/classify-rules.test.ts:283 で { label: '性別' } が negatives(未分類)扱い
grep -rn "CATEGORIES\|Category" src/core/types.ts
# CATEGORIES に gender なし
```

- 設計書 `docs/superpowers/specs/2026-10-03-jushoai-design.md:21` は性別を将来項目として言及のみ
- `src/dom/scan-fields.ts:70` は input type が text/email/tel/search のみで radio 対象外
- `src/core/planner.ts:100-122` は select を prefecture/birthMonth/birthDay/birthEra のみ解決し他は skip
- 対象URL `https://pro.form-mailer.jp/lp/f3553ff3175246` の性別欄は radio(`field_2760244`, 男性value=0/女性value=1)。本PBIでは扱わず、radioはPBI-02に分離

### 実装手順
Outside-Inの縦スライス順に進める:

1. E2E相当の赤を作る: `tests/core/` に性別selectの fixture(makeMetaで select+options+label性別)で classifyAll→buildPlan が gender解決しないことを失敗テストとして書く
2. 分類を緑にする: `src/core/types.ts` CATEGORIES に gender 追加、`classify-rules.ts` に性別語彙(性別/せいべつ/ジェンダー/gender/sex)を office除外(EXCLUDE)とNAME_EXCLUDEの後に判定追加。`src/llm/classifier.ts` SYSTEM_PROMPT に gender 行を追加(CATEGORIES由来のschemaは自動追従)
3. 値解決を緑にする: `Profile` に gender 追加、`normalizeProfile`/`validateProfile` 対応、性別選択肢照合関数(例 `matchGenderOption`)を新設し `planner.ts` の select分岐に gender を追加
4. UIと保存を緑にする: options のプロファイル編集欄に性別セレクト追加、既存保存データに gender がなくても壊れない互換を保つ
5. 文面を更新する: サイト日英の「性別などは扱いません」を select対応の記述に修正、README/設計書の対象欄一覧があれば同様に更新
6. リファクタリング: 照合の表記ゆれ処理が prefecture流儀と重複しないか整理し `make check` を通す

### 落とし穴
- `tests/core/classify-rules.test.ts:278-288` の negatives に `{ label: '性別' }` がいる。 positives 追加時に同居させると二重登録になるため negatives から除去すること
- `planner.ts:100-122` は select の早期 continue が強力。gender を分岐に追加し忘れると分類できても沈黙する
- 性別selectの value が “0”/“1” など数値コードの場合がある。テキスト一致優先・数値フォールバックの順序をテストで固定すること
- Profile 型追加は `EMPTY_PROFILE` と options 復元箇所の両方に影響する。片方だけ足すと保存後に消える
- radio欄(対象URLの形式)に手を出さないこと。radioは scan/planner/fill の基盤改修が必要で本PBIの規模を超える

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする(E2E相当の手動手順を除く)
- [x] テストカバレッジが基準を満たす（E2E/統合/単体すべて）
- [x] `make check` (typecheck + test + build)が通る
- [x] コードレビュー完了(ユーザー承認済み)
- [x] リファクタリング完了（グリーン後）
- [x] ドキュメント更新済み

## INVEST + Readyチェック
- Independent: radio対応(PBI-02)なしで単独提供可
- Negotiable: 選択肢語彙(男/女の略記対応など)は実装時に調整可
- Valuable: select性別フォームで1欄分の自動入力価値
- Estimable: 影響範囲が分類・計画・Profile・options・文面に限定され見積可
- Small: 1スプリントで完了(3〜5pt想定)
- Testable: 上記受け入れ基準で検証可
- BDD: 独立したユーザーシナリオを持つ
- t_wada: Outside-Inで段階的にテストを書ける
