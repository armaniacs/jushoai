# 計画: adachi (mirai-compass) の label/nearby 抽出修復と人物役割の復活

- 日付: 2026-11-22
- branch: work/adachi-label-extraction (base d184fa1)
- 原紙: /Users/yaar/Playground/JushoAI/tmp/adachi/イベント ｜ 足立学園中学校（東京都）.html (実ブラウザで保存したHTML。コミットしない)

## 背景

- 現象: 足立学園のイベント申込フォームで入力に失敗し、欄ごとの人物役割判定(児童/保護者)も効かない。
- 根因: scan-fields.ts の labelOf は el.labels(for=またはwrapping)/aria のみ、nearbyOf は tr>th, dd>dt, fieldset>legend のみ。このページは
  - 見出しが label.control-label(for無し、欄を包まない)で入力欄の兄弟
  - 姓：/名：/セイ：/メイ： が div.form-control-static
  - 区画見出しが h3+fieldset (h3 参加者情報入力 / h3 保護者等情報入力)
  のため全37欄の label/nearby が空になり、分類は id/name 信号のある4欄しか plan に乗らず、person-role は全欄 default:self になった。
- fixture ドリフト: samples/adachi-gakuen-apply.html が label for=... 形式に書き換え済みで実構造を再現しない。テストは緑のままで実ページだけ壊れていた。

## Global Constraints

- 決定的メタデータ抽出は src/dom/scan-fields.ts に置く(core/ は DOM 非依存のまま)。
- 既存 corpus(約265件)への波及を最小化する: 新経路は既存経路が空のときだけ使う(label は el.labels+aria が空のとき、nearby は th/dt/legend が空のとき)。クラス名はこのページの実在値(control-label / form-control-static / fieldset の前の h1-h6)に限定し、広いヒューリスティクスを持ち込まない。
- scan-fields.ts の既存コメントにあるコスト規律(cloneNode/querySelectorAll の多用禁止、1欄あたりコストを一定に)を守る。登昇は浅い定数段にする。
- fixture は最小再現。実ページの id と行構造(コントロールラベル+入力欄+form-control-static)を保ち、無関係なノイズは削る。value 属性(アラキ/タクマ)は入れない。
- 期待値は tests/corpus.ts の現行値を維持(意味的な結果は変えない)。分類・整形のずれが起きたら期待値を曲げず実装を直す。
- コメントにタスクIDを書かない。CHANGELOG.md はユーザー作業中(未コミット)なので触らない。コミットは自分の変更ファイルだけを明示指定して行う(git add -A 禁止)。
- docs/*.md は CP932 で表現できる文字のみ(em dash U+2014 禁止、横棒は ― を使う)。
- 検証: Task 1 は samples adachi が赤になることまで。Task 2 で make test / make check / make eval を緑に戻し、pin が動いたら make eval-pin の出力を PIN_TABLE に反映して理由を報告する。

## Task 1: fixture を実構造に戻す(赤化)

1. samples/adachi-gakuen-apply.html を実ページと同じ行構造で書き直す:
   - h3 参加者情報入力 + fieldset、h3 保護者等情報入力 + fieldset の2区画
   - 各行: div.form-group > div.row > span > div.col-sm-12 > label.control-label(見出し) + div > 入力欄 + div.small.form-control-static(姓： 等)
   - 児童側: 児童氏名(漢字)行(姓/名2欄)、児童氏名(カナ)行(セイ/メイ2欄)、郵便番号、都道府県(tfknJukensha)、市区町村、町名・番地、建物名・部屋番号、電話番号3分割、メールアドレス
   - 保護者側: 保護者氏名(漢字)行(姓/名2欄)、保護者氏名(カナ)行(セイ/メイ2欄)
   - id/name は現行 fixture と同じ(form:SSeiKanji, form:SMeiKanji, form:SSeiKana, form:j_idt138, form:zipCodeJukensha, form:tfknJukensha, form:j_idt335, form:j_idt353, form:j_idt371, form:j_idt503/507/511, form:j_idt589, form:j_idt1718/1726/1748/1756)
2. tests/corpus.ts の adachi 期待値は原則現行維持(構造由来の文言だけ実態に合わせ調整可)。
3. npx vitest run tests/integration/samples.test.ts -t adachi で赤を確認し、失敗キー一覧を報告に残す。make eval は現時点で落ちてよい(pin は Task 2 で更新)。
4. コミット: fixture + corpus.ts のみ。

## Task 2: scan-fields 抽出拡張(緑化)+ 役割の検証

1. labelOf 拡張: 既存経路が空のとき、入力欄から浅い登昇(定数段)で for無し label の兄弟を探す(実ページでは input の親divの前兄弟の label.control-label)。見つかった行コンテナ内の .form-control-static の非空テキスト(姓：/セイ： 等)も label に足す。組合せ順序と重複排除は実装で決め、tests/dom/scan-fields.test.ts に単体テストを先に書いてから実装する。
2. nearbyOf 拡張: 既存経路(th/dt/legend)が空で closest('fieldset') が legend 無しのとき、fieldset の前兄弟を浅く辿り h1-h6 を採る(h3 参加者情報入力 / 保護者等情報入力)。
3. 役割の確認: 新 fixture で児童側=child(label 児童氏名)、保護者側=guardian(word+area 一致)になることを tests/integration/samples.test.ts の adachi ケースとして追加(既存の役割テストの流儀に合わせる)。
4. tests/integration/adachi-scratch.test.ts(診断用で tmp 参照あり)を削除する。
5. npx vitest run tests/dom/scan-fields.test.ts tests/integration/samples.test.ts の後、make check、make eval。pin 移動があれば make eval-pin FIXTURE=名 で PIN_TABLE を更新し理由を報告に書く。
6. コミット: src/dom/scan-fields.ts + テスト + eval pin。

## 完了条件

- samples adachi テスト緑 + 役割アサート緑
- make check 緑、make eval 緑(pin 更新済み)
- task review x2 + 最終レビューを通す
