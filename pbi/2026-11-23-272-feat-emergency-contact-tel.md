# PBI: 緊急連絡先を電話番号として扱う

## ユーザーストーリー
学校の申込み形を使う人として、緊急連絡先の3分割欄にも電話番号を入れてほしい、なぜなら 必須の緊急連絡先だけ空で残り送信がブロックされるから

## 優先度
- 順位: 単発（あらき連絡 2026-11-23）。足立ラウンドの後続
- RICEスコア: 192 (Reach=40 / Impact=3 / Confidence=80% / Effort=0.5人週)
- 根拠: 語彙1つと fixture 復元で済む。保護者区画は電話番号欄が無く緊急連絡先だけなので、保護者の電話番号はここに入るのが自然。実ページの保存 HTML で欄構造を確認済み。依存は 269（役割が1種でも働く）

## BDD受け入れシナリオ

```gherkin
Scenario: 見出し語だけの電話3分割が入る
  Given 緊急連絡先という見出しの3分割欄があり語に電話を含まない
  When  分類する
  Then  3欄はtel1/tel2/tel3に分かれプロファイルの電話番号が載る

Scenario: 氏名語と並ぶときは名前を優先する
  Given 緊急連絡先氏名という語の欄がある
  When  分類する
  Then  欄は氏名のままで電話番号欄にならない
```

## 受け入れ基準
- [ ] `緊急連絡先` が tel 語彙で判定される（氏名語のある欄は氏名のまま。1欄型は tel で全体値）
- [ ] 足立 fixture に実ページどおりの緊急連絡先2行（児童 j_idt553/557/561・保護者 j_idt2150/2154/2158）を戻す
- [ ] corpus 台帳の expected に6欄分を載せ pin を更新する
- [ ] `make check` と `make eval` が緑

## テスト戦略
- 統合: 足立 fixture で2行6欄が埋まること
- 単体: 語彙の判定と氏名語の優先、同ラベル6欄が leftover 化して注入しないこと（役割が同扱いになったときの誤注入しない劣化）

## 見積もり
0.5人週（要チームでの見積もり）

## Definition of Done
- [ ] 全BDDシナリオが自動テストとして実装されパスする
- [ ] コードレビュー完了
- [ ] ドキュメント更新済み

## 出どころ
- あらき 2026-11-23 の連絡（スクリーンショット付き。緊急連絡先は電話番号から）
- `tmp/adachi/` の保存 HTML（`form:areaTelKinkyuJukensha` / `form:areaTelKinkyuHogosha`）
- `tests/corpus.ts` の「tel-split-by-heading の要調査候補」付箋

## 実装者向け注記

### 現状コードの確認（2026-11-23 実施済み）
- `grep -rn "緊急連絡先" src/` で語彙に無いことを確認。保存 HTML の行構造を再現した3欄は unknown になり計画に載らない（電話番号行は tel1/2/3 に入る対照結果も確認）
- 役割語彙（person-role）に緊急連絡先は無い。児童区画の行は self、保護者区画の行は guardian になり、2行は別グループで分割される

### 実装手順
1. 単体を先に赤で: label「緊急連絡先 必須」の3欄が tel1/2/3、単独欄は tel、「緊急連絡先氏名」は fullName
2. `src/core/classify-rules.ts` の `classifyText` に名前段（fullName 判定）の後に緊急連絡先の分岐を足す。名前段より前に置かない
3. fixture 復元: `tmp/adachi/` の保存 HTML から行構造を写す。input に id 属性は無く name のみ、maxlength 5/4/4、`－` 区切り。行の書き方は既存の電話番号行に合わせる
4. corpus 台帳: adachi の expected に6欄を追加し excluded の注釈から緊急連絡先を外す。`make eval-pin FIXTURE=adachi-gakuen-apply.html` の出力を PIN_TABLE に反映
5. `make check` と `make eval`

### 落とし穴
- 名前段より前に置くと「緊急連絡先氏名」が tel になる（dispatch 順）
- id 属性なしの input の台帳キーは name 側（form:j_idt553）
- 役割が同扱いになると同ラベル6欄になり leftover 化で注入なし（既存の誤注入しない劣化）
- LLM prompt 側のカテゴリ一覧の変更は不要（tel/tel1-3 は既存）
- CHANGELOG.md はユーザー作業中なので触らない
