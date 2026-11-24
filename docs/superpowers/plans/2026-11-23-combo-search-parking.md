# 計画: 検索補助窓の停泊と残置欄の pin 固定

- 日付: 2026-11-23
- branch: work/emergency-contact-tel (272 の直後に積む)
- 原紙: /Users/yaar/Playground/JushoAI/tmp/adachi/イベント ｜ 足立学園中学校（東京都）.html (実ブラウザで保存したHTML。コミットしない)
- PBI: pbi/2026-11-23-273-feat-combo-search-parking.md
- 分析: .superpowers/sdd/why-why-school-remnants-2026-11-23.md (3立場 x 30連鎖)

## 背景

- 学年・塾・その他の学校/塾は Tasks1-4 で対応済み (9ea20cd / 2ae561c / 2e64fc9 / f0132fa + bcffa62)。
- 残置の2点 (出身3連動の絞り込み2欄・塾コンボの隠し部分) を 3立場 x 30連鎖で掘った結果、着手できる分は次の3つ。
  - A1: placeholder に 検索 を含む text/search 型 input を confident unknown に落とす。#textCombo (塾コンボの検索補助窓) が juku 0.7 に分類され、profile.juku 設定時に検索窓へ注入される誤注入面を減らす (実測: probe 6 件のうち textCombo のみ juku)
  - A2: 足立 fixture に塾コンボ可視部 (textCombo/jukuShikuchosonCd/jukuCd) と出身3連動 (shussinTodofukenCd/shussinShikuchosonCd/shusshinSchoolCd) を戻し、停泊と警告を pin に固定する
  - A3: PBI-270 に分析の示唆を追記する (絞り込みの値源・ajax 待ち・親fillの価値・手選択案内)
- 隠し部 (#combobox・jukuTodofukenCd) は isHidden と hidden 型除外の既存防御で担保し、fixture にも入れない (既存規約)。

## Global Constraints

- 語彙の追加は 1 述語で済ませる。classify-vocab-misc の isSearchBox の隣に置き、ゲートは classify-rules の isSearchBox 直後 (autocomplete/email の後、EXCLUDE より先)。
- 対象は tag input かつ type text/search のみ。placeholder は norm して判定する。
- 期待値を曲げず実装を直す。corpus が壊れたら語彙を juku 特化に狭める。
- fixture は実ページの行構造を保つ。value 属性は入れない。hidden は入れない。
- コメントにタスク ID を書かない。CHANGELOG.md はユーザー作業中 (未コミット) なので触らない。
- コミットは自分の変更ファイルだけを明示指定して行う (git add -A 禁止)。
- docs/*.md は CP932 で表現できる文字のみ (em dash U+2014 禁止、横棒は ― を使う)。

## Task 1: 検索placeholder語彙を足す (A1・単体)

1. tests/core/classify-rules.test.ts に先に赤で追加する:
   - htmlId textCombo + placeholder 塾を検索（入力検索可） + nearby 塾 の text 1欄が confident unknown 0.7 になる
   - placeholder 東京都 など検索を含まない欄は分類が変わらない (対照)
   - select 型や button 型には効かない
2. src/core/classify-vocab-misc.ts に述語を足し、src/core/classify-rules.ts の isSearchBox ゲートの直後に置く。
3. npx vitest run tests/core/classify-rules.test.ts と npx tsc --noEmit で確認。
4. コミット: src/core/classify-vocab-misc.ts + src/core/classify-rules.ts + tests/core/classify-rules.test.ts のみ。

## Task 2: fixture 復元と台帳と pin (A2・緑化)

1. samples/adachi-gakuen-apply.html に可視部を戻す:
   - 塾コンボ可視部: その他の学校行の後。#textCombo (placeholder 塾を検索（入力検索可）) と
     form:jukuShikuchosonCd / form:jukuCd (option は 選んでください のみ)
   - 出身3連動: shussinTodofukenCd (都道府県 option 付き) / shussinShikuchosonCd / shusshinSchoolCd (option 空)
   - 行構造は実ページどおり div.form-group 形。hidden は入れない
2. tests/corpus.ts の adachi: excluded 注記を復元後の現仕様に書き換える
   (textCombo は検索補助窓の停泊、絞り込み2欄と2段目は連動停泊、shusshinSchoolCd は空option警告)。
3. npx vitest run tests/integration/samples.test.ts -t adachi で緑を確認。
4. make eval-pin FIXTURE=adachi-gakuen-apply.html の出力を tests/eval/corpus.eval.ts の PIN_TABLE に反映。
5. make check と make eval が緑。
6. コミット: fixture + tests/corpus.ts + eval pin のみ。

## Task 3: PBI-270 への示唆追記 (A3・docs)

1. pbi/2026-11-23-273-feat-combo-search-parking.md の受け入れ基準を確認しつつ、
   pbi/2026-11-22-270-feat-cascade-select-fill.md に分析の示唆を追記する:
   - 絞り込み2欄の値源は 出身地=現住所 の仮定を含むため明示判断が必要
   - 親fill単独の価値 (change 後に子の option が生成される) と待ち機構の範囲
   - 塾コンボと出身3連動は手選択という案内の要否
2. コミット: pbi 2 ファイルのみ (273 起票を含めてもよい)。

## 完了条件

- textCombo 形状が confident unknown、対照欄が不変
- 足立 fixture で停泊と警告が pin に固定される
- make check 線、make eval 緑 (pin 更新済み)
- task review x2 + 最終レビューを通す
