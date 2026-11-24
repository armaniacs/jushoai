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
- [x] `緊急連絡先` が tel 語彙で判定される（氏名語のある欄は氏名のまま。1欄型は tel で全体値）
- [x] 足立 fixture に実ページどおりの緊急連絡先2行（児童 j_idt553/557/561・保護者 j_idt2150/2154/2158）を戻す
- [x] corpus 台帳の expected に6欄分を載せ pin を更新する
- [x] `make check` と `make eval` が緑

## テスト戦略
- 統合: 足立 fixture で2行6欄が埋まること
- 単体: 語彙の判定と氏名語の優先、同ラベル6欄が leftover 化して注入しないこと（役割が同扱いになったときの誤注入しない劣化）

## 見積もり
0.5人週（要チームでの見積もり）

## Definition of Done
- [x] 全BDDシナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] ドキュメント更新済み

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

## 実装記録（2026-11-23）
- `work/emergency-contact-tel`（base ad33ac2・role-profile-select に積む）に 4 コミット: 計画起票 3f9225a、語彙追加 ba1bdc8、住所段の後への移動修正 c245c18、fixture 復元 056fecc
- `classifyText` に `緊急連絡先` の分岐を 1 つ追加。名前段（緊急連絡先氏名 → fullName）と住所段（緊急連絡先住所 → addressFull）の後に置き、両方の順序を pin テストで固定。判定は最後尾なので既存のどの語彙も動かさない
- 足立 fixture に実ページどおりの2行を復元（ラッパ span・id 無し input・maxlength 5/4/4・`－` 区切り・`col-xs-1 col-xs-1` の重複クラスまで）。corpus 台帳に6欄分の expected を追加
- pin は adachi のみ `p(20,0,14,3,0)` → `p(26,0,20,9,0)`（+6 ruleHits・+6 fillable・+6 refineChanged）。他 fixture は不動
- 検証: make check exit 0（194 files・3297 passed + 期待失敗1・build 24・web-ext 誤り 0）、make eval 3 passed。タスクレビュー 2 件（Task 1 は住所段の後への移動修正ののち Approved）+ 最終レビュー Ready to merge: Yes
- 台帳への記載事項: 緊急連絡先続柄のような見出し小欄も tel になる（語彙固有。実 fixture には未出。出たら `緊急連絡先(?!続柄)` の除外を検討。プレビューが抑止）。単独欄の pin は classifyField 経由で pipeline 経由でない。テスト戦略に書いた「同ラベル6欄」の専用テストは未追加（6欄同役割のときは oversized drop で欄ごと消え注入しない機構で、既存テストが sibling カテゴリで保証。leftover 化は 2 欄のときの機構）。corpus 台帳の保護者側3欄はコメント無し（児童側のコメントが2行分を説明）
- サイトガイドの「電話番号は、1 欄と、3 つに分かれた欄に対応します」の記述が今回の挙動を既に覆うため、ユーザー向け文書の変更はなし
- push・PR 作成はユーザー作業（role-profile-select と adachi-label-extraction に積むため、PR の順序は adachi → role → 本ブランチ）
