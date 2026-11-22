# 計画: 緊急連絡先を電話番号として扱う

- 日付: 2026-11-23
- branch: work/emergency-contact-tel (base ad33ac2、work/role-profile-select に積む)
- 原紙: /Users/yaar/Playground/JushoAI/tmp/adachi/イベント ｜ 足立学園中学校（東京都）.html (実ブラウザで保存したHTML。コミットしない)
- PBI: pbi/2026-11-23-272-feat-emergency-contact-tel.md

## 背景

- 現象: 足立学園の申込形で緊急連絡先(必須・3分割)が空のまま残る。あらき 2026-11-23 の連絡で発覚。
- 根因: 緊急連絡先は tel 語彙（電話・携帯・tel など）を含まないため classifyText が何も返さず、
  3欄とも unknown になり分割も計画も働かない。実ページの保存 HTML で再現確認済み
  （児童区画 j_idt553/557/561、保護者区画 j_idt2150/2154/2158。input は id 属性なし・name のみ・maxlength 5/4/4）。
- 保護者区画には電話番号欄が無く、緊急連絡先が唯一の電話欄。値はプロファイルの電話番号を使い、
  違う番号にしたいときはプレビューで行を外す。複数電話番号からの選択はプロファイルモデルの拡張なので別候補に置く。

## Global Constraints

- 語彙の追加は 1 分岐で済ませる。緊急連絡先の判定は classifyText の名前段（fullName 判定）より後に置き、
  「緊急連絡先氏名」を fullName のまま保つ。既存の電話語（電話・携帯・tel）の行は動かさない。
- 既存 corpus への波及を最小化する。緊急連絡先を含む欄は現行 fixture に無い（grep 済み）ため、
  pin が動くのは adachi のみの見込み。動いたら make eval-pin の出力を PIN_TABLE に反映し理由を報告する。
- fixture は実ページの行構造を保つ。input に id 属性を付けない（実ページどおり name のみ）。
  行の書き方は既存の電話番号行（j_idt503/507/511）に合わせ、無関係なノイズは削る。value 属性は入れない。
- 期待値を曲げず実装を直す。分類・整形のずれが起きたら fixture を最小再現まで削って原因を確定する。
- コメントにタスクIDを書かない。CHANGELOG.md はユーザー作業中(未コミット)なので触らない。
  コミットは自分の変更ファイルだけを明示指定して行う(git add -A 禁止)。
- docs/*.md は CP932 で表現できる文字のみ(em dash U+2014 禁止、横棒は ― を使う)。
- 役割語彙（person-role）は触らない。緊急連絡先は役割語ではない（児童区画 self・保護者区画 guardian）。

## Task 1: tel 語彙に緊急連絡先を足す(単体)

1. tests/core/classify-rules.test.ts に先に赤で追加する:
   - label「緊急連絡先 必須」の text 3欄(同一label・nearby 保護者等情報入力)が
     classifyRulePipeline で tel1/tel2/tel3 になる
   - label「緊急連絡先」の単独欄は tel になる
   - label「緊急連絡先氏名」は fullName のままになる
2. src/core/classify-rules.ts の classifyText に緊急連絡先の分岐を足す。
3. npx vitest run tests/core/classify-rules.test.ts tests/core/person-role.test.ts tests/core/planner.test.ts で既存が動かないこと。
4. コミット: src/core/classify-rules.ts + tests/core/classify-rules.test.ts のみ。

## Task 2: fixture 復元と corpus 台帳(緑化)

1. samples/adachi-gakuen-apply.html に緊急連絡先2行を戻す:
   - 児童区画: 電話番号行とメールアドレス行の間。label 緊急連絡先＋必須、
     input name=form:j_idt553(maxlength 5) / form:j_idt557(4) / form:j_idt561(4)、－ 区切り
   - 保護者区画: 保護者氏名(カナ)行の後。input name=form:j_idt2150(5) / form:j_idt2154(4) / form:j_idt2158(4)
2. tests/corpus.ts の adachi: expected に6欄('090'/'1234'/'5678')を追加し、
   excluded の注釈から緊急連絡先を外す（学年・塾・出身selectの注釈は残す）。
3. npx vitest run tests/integration/samples.test.ts -t adachi で緑を確認。
4. make eval-pin FIXTURE=adachi-gakuen-apply.html の出力を tests/eval/corpus.eval.ts の PIN_TABLE に反映。
5. make check と make eval が緑。
6. コミット: fixture + tests/corpus.ts + eval pin のみ。

## 完了条件

- 単体と samples adachi が緑（2行6欄が '090'/'1234'/'5678' で埋まる）
- make check 緑、make eval 緑(pin 更新済み)
- task review x2 + 最終レビューを通す
