# PBI: kana 帰属をパイプラインに戻す

## 背景

ルール分類パイプラインは deep に作られた module（`classifyRulePipeline` が canonical 合成、`TEXT_TO_CATEGORY_STAGES` が段階契約、PBI-44/50）だが、「`resolveKana` を classify と refine の間で呼ぶ義務」という順序制約が docstring にしかなく、本番3入口のうち2つが迂回している:

- **fill-one（Alt+J・右クリック）**: `planOneField`（`src/core/fill-one.ts:54-61`）は classify → refine → mapping → buildPlan で `resolveKana` をスキップ。label「フリガナ」欄は kana-blind 契約（`tests/core/kana-blind-contract.test.ts:15` がロック）により 'fullName' に分類されるため、kanji 氏名 join（`src/core/planner.ts:92-93`）が plan になり、フルプレビュー（`resolveKana` → 'fullNameKana' → formatKana）と同じ欄で**異なる値（漢字氏名）を注入する**。`src/core/fill-one.ts:10-11,35-36` は「the same planner guards as the full preview」「a fill-one matches the full preview's classification」と parity を約束するが、kana 欄で破れている。
- **import-draft（フォームから取り込む）**: `src/entrypoints/content.ts:532-537` も `resolveKana` をスキップ。`PROFILE_KEYS` は lastNameKana/firstNameKana を持つ（`src/core/import-draft.ts:21-22`）が、classifyField は決して kana カテゴリを返さず（`src/core/classify-rules.ts:125`）、refine の kana 分割（`:453`）は既存 kana カテゴリ前提のため**本番経路でこの2行に到達不能**。filled なフリガナ欄は 'fullName' に分類され PROFILE_KEYS に無いので下書きから無音に落ちる。
- **テストが本番の隙間を覆い隠す**: `tests/core/import-draft.test.ts:19` は `filled('lastNameKana','ヤマダ')` を手で食べている（kana カテゴリを作れるのは resolveKana だけなのに手組み Item で通る）。fill-one.test.ts には kana ケースが1つも無い。

resolveKana の本番呼び出しは `src/core/analyze.ts:88` のみ（検証済み）。

## ユーザーストーリー

開発者として、fill-one と import-draft を classifyRulePipeline 経由に統一し、「classifyField を直呼びしない」を docstring から構造に昇格させたい、なぜなら順序制約が型に現れないままでは kana 欄で入口ごとに異なる値が注入され、コンパイラも既存テストも止まらないため。

## 優先度

- 順位: 1位 / 10件
- RICEスコア: 400（Reach=30 / Impact=2 / Confidence=80% / Effort=0.12人月）
- 根拠: 唯一挙動の分岐が実在する候補。1合成が3入口（analyze/fill-one/import-draft）とそのテストで回収され（leverage）、kana 帰属の呼び出し義務という散在する知識が消え（locality）、今日ゼロの fill-one × kana・import-draft × kana が自動的に守られる。依存なし（バッチ1）。
- 対象: src/core/fill-one.ts:54-61、src/entrypoints/content.ts:532-537、src/core/classify-rules.ts:320,592-617、src/core/kana.ts:132-154、src/core/import-draft.ts:18-31

## BDD受け入れシナリオ

```gherkin
Scenario: fill-one がフルプレビューと同じ kana 帰属を使う
  Given label「フリガナ」の filled な欄がある
  When Alt+J で fill-one を実行する
  Then 分類がフルプレビューと同一（resolveKana 経由の 'fullNameKana'）になり、漢字氏名ではなくカナ値が plan になる

Scenario: import-draft が本番経路で kana キーに到達できる
  Given filled なフリガナ欄を含むフォームがある
  When フォームから下書きを取り込む
  Then lastNameKana/firstNameKana が下書きに載り、カタカナ値が漢字用キーに混入しない
```

## 受け入れ基準

- [x] `planOneField` が classifyRulePipeline 経由で kana 帰属を得ている（classifyField 直呼びでない）
- [x] import-draft ハンドラが classifyRulePipeline 経由で分類し、PROFILE_KEYS の kana 行が本番経路で到達可能になっている
- [x] 「classifyField を直呼びしない」が docstring から構造（入口の統一）に昇格している
- [x] fill-one × kana・import-draft × kana のテストが追加されパスする
- [x] 既存テストが緑維持

## テスト戦略

- 単体: fill-one が kana 欄でフルプレビューと同一の分類・値になることを確認する
- 単体: import-draft が filled なフリガナ欄から kana キーを立てることを確認する
- 回帰: 既存の fill-one・import-draft・analyze テスト一式を緑維持で確認する

## 見積もり

- 0.12人月

## Definition of Done

- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] `make check` が通る
