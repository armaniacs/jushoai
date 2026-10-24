# PBI: options の saved/errors 通知を1つの module に

## 背景

`el('p').className='saved'` / `el('ul').className='errors'` という同じ表示語彙が4つ独立に定義されている:

- `src/entrypoints/options/main.ts:128-138`（`message()` ― 保存時の validation エラーを全件 li にする）
- `src/entrypoints/options/exclusion-section.ts:18-28`（`notice()`）
- `src/entrypoints/options/transfer-section.ts:99-115`（`showSaved`/`showErrors` ― **5件で truncate** の追加挙動を持つ唯一の実装）
- `src/entrypoints/options/ai-section.ts:129-138`（`setAiNotice`）

同じ「saved/errors 通知」概念の挙動が呼び出し箇所ごとに違う。エラーが増えると main.ts の画面が伸び、truncate 規定は1実装にしかない。削除テスト: 共通 module を削除すれば p.saved/ul.errors の構築が4箇所に再出現する ― 存在価値あり。

## ユーザーストーリー

開発者として、options の saved/errors 通知を1つの notice module に集約したい、なぜなら4つの shallow 実装に挙動の drift があり、truncate 規定と表示契約が1箇所に集中しないため。

## 優先度

- 順位: 2位 / 10件
- RICEスコア: 240（Reach=18 / Impact=1 / Confidence=80% / Effort=0.06人月）
- 根拠: 帰属先の `src/entrypoints/options/dom.ts` が既に存在し（2026-10-18-39 で整備済みの el 系語彙の家）、drift の証拠（transfer のみ truncate）もある quick win。`.saved`/`.errors` を断言する2テストファイル（exclusion 6件、transfer 12件）が共通の1実装に対して意味論を pin でき、main.ts の validation エラーにも truncate が自動適用される。依存なし（バッチ1）。
- 対象: src/entrypoints/options/dom.ts、main.ts:128-138、exclusion-section.ts:18-28、transfer-section.ts:99-115、ai-section.ts:129-138

## BDD受け入れシナリオ

```gherkin
Scenario: saved/errors 通知が1つの module から出る
  Given notice(kind, lines, { max }) に集約された表示 module がある
  When 4つの section が通知を出す
  Then saved は p、errors は ul で表示され、最大件数を超えたら畳む（truncate 規定は1箇所で決まる）

Scenario: main.ts の validation エラーにも truncate が適用される
  Given 保存時の validation エラーが6件ある
  When message() 相当の通知を出す
  Then 5件で畳まれ、画面が伸びない
```

## 受け入れ基準

- [x] `options/dom.ts` に `notice(kind, lines, { max })` が追加されている
- [x] 4実装（main.ts / exclusion / transfer / ai-section）が notice module 経由に置き換わっている
- [x] truncate 規定が module の1箇所で決まる
- [x] `.saved`/`.errors` を断言する既存テストが緑維持
- [x] `make check` が通る

## テスト戦略

- 単体: notice module が kind に応じて p/ul を出し、max 超過で畳むことを確認する
- 回帰: exclusion-section / transfer-section の既存テスト一式を緑維持で確認する

## 見積もり

- 0.06人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
