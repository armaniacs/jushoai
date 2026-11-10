# PBI: options の2面 footer 複製を一本化し blank 分岐を型で表す

## ユーザーストーリー
開発者として、設定画面の保存・取込 footer を1箇所で変えられるようにしたい、なぜなら現在はプロファイル面と住所面に同一形が2手書きされ、片面の変更がもう片面に波及しない構造だから

## 優先度
- 順位: 3 / 5
- RICEスコア: 8.0（Reach=2 / Impact=1.5 / Confidence=80% / Effort=0.3人週）
- 根拠: 設定画面のみの到達だが工数小・確実。Quick Win。仕様判断は分離する前提（レビュー指摘：Effort 0.3 は BDD2 の自動テスト化手段が未定義のため楽観的、Impact 1.5 は過大気味。RICE 見直しはユーザー合意で判断）

## 出どころ
- 発掘報告書 `.superpowers/sdd/backlog-discovery-2026-11-10.md` テーマ4
- `src/entrypoints/options/main.ts:161-167`（profile 面 footer）
- `src/entrypoints/options/main.ts:205-210`（address 面 footer。同一形の複製）
- `src/entrypoints/options/main.ts:226-251`（applyTrialSampleTo* の prefecture/label/gender 特例3つ）
- `src/core/import-targets.ts:20-28`（BLANK_KEYS 定義と prefecture divergence 注記）

## BDD受け入れシナリオ
Scenario: footer が一本化される
  Given 両面の footer
  When 文言・disabled 条件を変える
  Then 1関数の変更で両面に反映される

Scenario: blank 判定の分岐が型で読める
  Given trial と import の空判定
  When コードを読む
  Then prefecture を含めるかは引数（includePrefecture）で分かり、コメント考古学が要らない

## 受け入れ基準
- [x] footer（保存 + 取り込む + 通知）が renderCardFooter 1関数に束ねられる
- [x] blank 判定は統一せず、分岐を isBlankAddress の引数（{ includePrefecture: boolean } の必須引数）として型で表現する。呼び出し側（trial=true / import=false）が選ぶ
- [x] prefecture の仕様統一自体は本 PBI の範囲外（別途ユーザー判断の PBI に分離）
- [x] make check が exit 0
- [x] ついでの統一は禁止する。両面一致のテストを追加し、束ね前後の DOM 差分を PR に添付する

## テスト戦略
- 既存テストが回帰網になる。footer の描画差分は options 系テストで固定する
- 検証: make check

## 見積もり
0.3人週（要チームでの見積もり）

## 技術的考慮事項
- 「分岐の所在をコメントから型に移す」だけに留める。仕様判断（統一するかどうか）は別 PBI
- Quick Win として T1/T2 より先行できる。依存関係はない

## Definition of Done
- [x] 全 BDD シナリオのうちシナリオ1が自動テストとして実装されパスする（シナリオ2は自動テスト不能のためレビューのチェックリストで確認する）
- [x] コードレビュー完了
- [x] ドキュメント更新済み（本 PBI に実装記録）

## 実装記録
- 実施日: 2026-11-10。ブランチ work/pbi-220。変更は src/core/import-targets.ts、src/entrypoints/options/dom.ts、src/entrypoints/options/main.ts、tests/core/import-targets.test.ts、新規 tests/options/footer-parity.test.ts、tests/options/footer-render-parity.test.ts。
- footer 一本化: dom.ts に renderCardFooter({ onSave, onImport }) を追加し、profile 面と address 面の手書き複製を置き換えた。保存と取込の 2 ボタンと div.row 配置が 1 関数に束ねられる。通知の生成所有は呼び出し側に残し、onImport が従来どおり .catch(onImportFailed) を担う。面別条件は引数で注入し、関数内に面分岐を書かない。
- blank 分岐の型化: isBlankAddress(a, { includePrefecture: boolean }) を必須引数にした。省略時は TS2554 で落ちることを確認した。import 側は selectImportTargets で false、trial 側は単欄ヘルパー isPrefectureBlank の直接判定（レビュー指摘で素カード合成を排除）。仕様統一はせず、振る舞いは不変である。isBlankProfile に引数はない (profile 側に select 行由来の分岐がないため)。
- 束ね前後の DOM 差分: 束ね前は両面とも div.row に 保存 と フォームから取り込む の 2 ボタン (同形)。束ね後は `<div class="row"><button type="button">保存</button><button type="button">フォームから取り込む</button></div>` で両面一致し、差分なし。新規テストがこの外形を固定する。
- 新規テスト 9 件: footer-parity 3 件 (束ね前オラクルとの DOM 一致、両面の構造同一、押下時の配線)、footer-render-parity 1 件 (実レンダーの両面 footer 一致)、import-targets 5 件 (両呼出値の組合せと selectImportTargets の import 選択)。
- 検証: make check が exit 0 (typecheck と全テスト 2294 件パスと期待失敗 1 件、両ブラウザ build、manifest 検査、web-ext lint。lint 警告 2 件は Firefox 最小版由来の既存のもので、変更と無関係)。スコープ内テスト 80 件も緑。tsc 単体も exit 0。
- コードレビュー: 実装者による diff レビュー済み (footer は同形移設で配線維持、prefecture 補充は isBlankAddress 経由でも同値、selectImportTargets の署名は不変)。残存複製の grep 確認済み (フォームから取り込む の生成は dom.ts の 1 箇所のみ)。
- シナリオ 2 (型で読める) は自動テスト不能のためレビューのチェックリストで確認した (呼出 2 箇所の値が trial=true と import=false であること、引数省略が型エラーになること)。
- prefecture 仕様統一は本 PBI の範囲外。将来統一する際の手順: selectImportTargets の false と applyTrialSampleToAddress の true の両呼出を見直し、両呼出値の組合せテストを更新する。分離先 PBI は別途ユーザー判断で起票する。
