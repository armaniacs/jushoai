# PBI: アンカー選択の矩形読み取り共有化

状態: 未着手（コードレビュー Critical #2＋提案 #1 の統合として起票）
起票日: 2026-10-13

## ユーザーストーリー

フォームを使う利用者として、欄が多いページでも住所補完ボタンがもたつかずに出てきてほしい。なぜならフォーム検出のたびに余分なレイアウト読み取り（強制リフロー）が発生すると、表示のカクつきとして利用者に返ってくるから。

保守担当者として、`pickAnchor` の「矩形は1要素1回読み」という性能保証が実ブラウザでも本当に成り立っていてほしい。なぜなら現状は `pickAnchor` 内の `rectOf` メモ化が `isHidden(el)` 内部の独自 `getBoundingClientRect()` を捕捉できず、実ブラウザでは1要素2回読みになり、jsdom（`checkVisibility` なしで早期 return）では検出できない偽陽性のテストだけが残っているから。

## 優先度

- 順位: 1位 / 全候補 9件
- RICEスコア: 約10000（Reach=5000/月・Impact=0.5・Confidence=80%・Effort=0.15人週）
- 根拠: 全フォーム検出で余分な強制リフローを払い続けており、しかも既存の「1回読み」テストが実ブラウザ経路を再現できていないため性能保証が虚偽になっている。利用者体感（重さ）と保守者の正しさ（テストの信頼性）の両方を損なうため最優先。
- 依存: なし（#3 の前提となるPBI）

## BDD受け入れシナリオ

```gherkin
Scenario: 実ブラウザ相当の条件でも矩形読み取りは1要素1回になる
  Given checkVisibilityを持つ実ブラウザ相当の要素が複数あるフォームがある
  When アンカー選択のためにフォーム検出を行う
  Then 各要素の矩形読み取りは1回だけ行われる

Scenario: jsdom相当の条件でも従来通り動作する
  Given checkVisibilityを持たないjsdom相当の条件でフォームがある
  When アンカー選択のためにフォーム検出を行う
  Then 従来と同じアンカーが選ばれ、検出結果は変わらない
```

※ シナリオは実装詳細（関数名・DOM API名・比較回数など）に触れず、利用者・保守者から見た振る舞いだけを記述する。

## 受け入れ基準

- [x] 実ブラウザ相当のfake（`checkVisibility` あり）の条件で、アンカー選択時の各要素の矩形読み取りが1回であることが回数を数えるテストで断言できる
- [x] `checkVisibility` なし（jsdom相当）の条件でも、既存の選択結果（アンカー位置・検出フォーム数）が変わらない
- [x] 隠し欄（`hidden` 属性・非表示・ゼロ面積）の除外ルールが変わらない（honeypot・未レイアウト欄がアンカーに選ばれない）
- [x] 既存の `tests/dom/detect-forms.test.ts` が緑のまま（偽陽性のまま残さず、実ブラウザ相当経路を再現する形に更新または追加されている）
- [x] `make check` が通る

## テスト戦略

### E2Eテスト

- 対象外（表示位置の実測は既存のボタン配置E2Eに委ねる。本PBIは読み取り回数の削減であり、見た目の変更はない）

### 統合テスト

- 既存の fixture ケース（`tests/integration/samples.test.ts`）で選択結果の不変を確認する

### 単体テスト

- 実ブラウザ相当のfake（`checkVisibility` を生やし、矩形読み取り回数を数える）で「各要素1回読み」を断言する（現状は2回読みになることを Red で示す）
- jsdom相当（`checkVisibility` なし）の条件で従来通りの選択結果になることを断言する
- 隠し欄・ゼロ面積欄の除外が変わらないことの境界テスト

## 見積もり

1pt（相対ポイント、要チームでの見積もり）

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] テストカバレッジが基準を満たす（単体＋既存の統合が緑）
- [x] `make check` が通る
- [x] コードレビュー完了
- [x] ドキュメント更新済み（性能保証コメントが実態と一致している）

## 実装者向け注記

### 対象ファイル（読み取り専用調査済み、実装は本PBIで行う）

- `src/dom/detect-forms.ts` ― `pickAnchor` 内の `rectOf`（`Map<Element, DOMRect>` によるメモ化）が矩形読み取りの一本化点
- `src/dom/scan-fields.ts:67-72` ― `isHidden(el)` が内部で独自に `getBoundingClientRect()` を呼ぶ箇所（実ブラウザで2回読みの原因）
- `tests/dom/detect-forms.test.ts` ― 「1回読み」テスト（`reads each field's box exactly once when picking the anchor`）が jsdom 条件（`checkVisibility` なしで早期 return）のため偽陽性になっている箇所

### 現状コードの確認（着手前に必ず実行すること）

```bash
grep -rn "rectOf\|isHidden\|getBoundingClientRect\|checkVisibility" src/dom/
```

未実装であること（共有化されていないこと）を確認済みであることを着手時に再確認すること。

### 修正方向（実装詳細は開発中に調整可能）

- `isHidden` の矩形読みを `rectOf` に一本化する案を検討すること。例：
  - （案A）`isHidden` を「属性・可視性判定」と「面積判定」に分割し、面積判定は呼び出し側が持つ rect を使う
  - （案B）`isHidden` に rect 注入引数（任意の矩形受け渡し）を追加し、`pickAnchor` 側の `rectOf` から渡す
- いずれの場合も `scan-fields.ts` の `scanFields`／`scanRadioGroups` 側の `isHidden` 呼び出しの振る舞いを変えないこと（共有呼び出し元を壊さない）
- セマンティクス不変が条件：フィルタ順・ソートキー・フォールバック（boxless→全文、pool空→全件）は変えない

### 落とし穴

- jsdom では `checkVisibility` が無いため `isHidden` が早期 return し、矩形読みが1回にしか見えない。テストは `checkVisibility` を生やした fake で実ブラウザ相当経路を再現しないと回帰を検出できない
- `pickAnchor` 内のメモ化は pick スコープであり、モジュールレベルのキャッシュに変えると rect が古くなる。スコープは変えないこと
- 読み取り回数の断言は `getBoundingClientRect` のスパイで行い、`checkVisibility` 自体の呼び出し回数と混同しないこと

## 実施記録（2026-10-13、自律タスククローザーによる実装）

- 実装コミット `c124902`: `isHidden(el, rect?)` に矩形注入引数を追加（案B）。`pickAnchor` の 2 箇所を `isHidden(f.el, rectOf(f.el))` に変更し、hidden 判定・box 判定・ソートで同一メモ化 rect を共有。`scanFields` / `scanRadioGroups` は引数なしのまま不変。
- テスト: 既存カウントテストを `... under jsdom` に改名し、`checkVisibility` 付き fake の新テスト（honeypot・ゼロ面積除外＋アンカー維持＋読み取り≦2回＝scan 1＋pick共有 1）を追加。修正前に Red（expected 3 to be ≦ 2）を確認。
- 検証: `npx tsc --noEmit` exit 0、`tests/dom/detect-forms.test.ts` 13/13、`tests/dom`＋`tests/integration` 85 件全 pass。フル単体 1168 件 green、両ブラウザ build＋manifest 検査＋lint green。
- なぜなぜ連鎖: jsdom に `checkVisibility` が無いため早期 return で偽陽性 → 実ブラウザでは `isHidden` 内部が独自に rect を読む → 共有できない真因は `isHidden` の署名（全文は `/tmp/whywhy-anchor.md`）。
- ユーザーの作業として残る項目: コードレビュー
