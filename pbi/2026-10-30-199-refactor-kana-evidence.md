# PBI: カナ証拠判定の証拠 module 化

## ユーザーストーリー
開発者として、カナ要求の証拠源泉（placeholder/own-text/legend/pattern）を 1 つの module に置きたい、なぜなら wantsKana と wantsKanaOwnMeta が同規則の手写しで、否決条項（漢字/ラテン placeholder 拒否・legend なし）の非対称が無文書のため

## 優先度
- 順位: 10 / 13
- RICEスコア: 15（Reach=3 / Impact=1 / Confidence=50% / Effort=0.1人月）
- 根拠: 非対称の意図確認（sibling guard の現行挙動 pin）が前提。依存なし

## BDD受け入れシナリオ
Scenario: own 証拠を持つ行だけ kana になる
  Given legend を共有する欄がある
  When resolveKana を実行する
  Then own 証拠（placeholder/own-text/pattern）を持つ行だけ kana になる（現行 pin どおり）

Scenario: 証拠源泉ごとの合成規律が名前を持つ
  Given 証拠 module がある
  When want 判定と own ガードを組み立てる
  Then 否決条項の有無が名前のある分岐になり、非対称が文書化される

## 受け入れ基準
- [ ] 源泉別判定（placeholder/own-text/legend/pattern）が 1 module に置かれる
- [ ] 2 述語は証拠 module の合成になり、否決条項の有無が名前のある分岐になる
- [ ] 挙動不変（kana-memoize テストの s1=legend 抑制・s2=own 付与 pin どおり）
- [ ] `make check` が緑

## テスト戦略
- 単体: kana-memoize.test.ts の混在フォーム pin（category+kanaKind）が成立すること
- 構造: 証拠源泉の追加が 1 module で済むことをコメントと型で固定

## 実装アプローチ
- placeholder/nameId/legend/pattern の源泉別判定を kana.ts 内の 1 module に置き、wantsKana（否決条項＋legend あり）と wantsKanaOwnMeta（否決なし・legend なし）がそれを合成する

## 見積もり
0.1人月

## 技術的考慮事項
- own 版に否決条項を「ついでに」足すと s1/s2 型フォームで sibling guard が発動せず kana 帰属が変わる（最大の落とし穴）
- kana-memoize テストの回数 lock（wantsKana 1 回/欄）は classifyField 経路のメモ契約なので、呼ばれ方を変えない

## Definition of Done
- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み
