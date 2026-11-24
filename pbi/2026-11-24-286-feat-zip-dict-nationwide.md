# PBI: 郵便番号の補助候補を全国に広げる

## ユーザーストーリー
住所の都道府県や市区町村を登録し忘れた利用者として、郵便番号からの補助候補が自分の地域でも出てほしい、なぜなら今の辞書は東京 23 区と一部の主要都市だけで、それ以外では候補が出ず警告で止まるから

## 区分
改善 / 1.0 後でも可

## 優先度
- 順位: 12 / 17
- RICEスコア: 16 (Reach=20 / Impact=1 / Confidence=80% / Effort=1人週)
- 根拠: `src/core/zip-dict.ts` は全国データへの差し替えを想定した seed（87 行）。補助は住所が欠けた場合だけ動くため Reach は小さいが、ガイドが「郵便番号からの候補」をうたう以上、地域による差は不公平に見える。バンドルサイズの予算決めが要る

## BDD受け入れシナリオ

```gherkin
Scenario: 地方の郵便番号でも候補が出る
  Given 住所に都道府県と市区町村が無く、郵便番号が 9300001 である
  When  プレビューを開く
  Then  富山県・富山市が補助候補として出て、チェックすると入る

Scenario: 1 つの郵便番号に複数の町域がある
  Given 郵便番号が複数の市区町村にまたがる
  When  プレビューを開く
  Then  候補は都道府県までにとどめ、市区町村は警告のまま止める
```

## 受け入れ基準
- [x] 日本郵便の公開データから表を生成するスクリプトを `scripts/` に置き、生成物の形は今の lookup と同じにする（`scripts/generate-zip-dict.mjs`。実データでの生成実行は未了で引継ぎに記録）
- [x] 生成物のサイズ予算（例: content script の増分 200KB 以下）を決め、`tests/build/` で検査する（超える場合は 3 桁 prefix のまま粒度を保つ等の判断を記録）
- [x] データのライセンスと出典をガイドと LICENSE 関連文書に記す
- [x] 更新手順（年 1 回程度）を `docs/release.md` に書く

## テスト戦略
- E2E: なし
- 統合: 生成表での planner の補助候補
- 単体: 複数市区町村にまたがる番号、未知番号

## 見積もり
1人週（要チームでの見積もり）

## Definition of Done
- [ ] 全BDDシナリオが自動テストとして実装されパスする（仕組みのテストは緑。9300001 の planner 連携は全国表の生成待ち）
- [ ] コードレビュー完了
- [x] ドキュメント更新済み

## 出どころ
- 2026-11-24 正式版準備の棚卸し。`src/core/zip-dict.ts:1-6`

## 引継ぎ
- 未着手（2026-11-24）。着手前に `docs/superpowers/plans/2026-11-24-ga-readiness-handoff.md` の該当節を読む（調査済みの事実・落とし穴・検証手順）
- Task 10 実施済み（2026-11-24）。スクリプト・予算・文書・仕組みのテストは完了。残りは実データでの生成実行のみ。取得できる環境で `npm run zip-dict` を実行し、表を全国版に差し替える。手順は `docs/release.md` の「郵便番号辞書の更新」。実行時は次の点を確認する
  - 公式 URL（`https://www.post.japanpost.jp/zipcode/dl/oogaki/zip/ken_all.zip`）は 2026-11-24 に作業環境から 404 だった（HTML ページは取得可。WAF による遮断と推定）。取得できる環境では URL の有効性を先に確かめる。変わっていればダウンロードページ（`https://www.post.japanpost.jp/zipcode/download.html`）から正規の URL を取り直す
  - 生成後に 9300001 の planner 連携テスト（富山県・富山市の候補と承認時の入力）を追加し、BDD シナリオ 1 を自動テストでふさぐ。BDD シナリオ 2（複数市区町村）は city 空エントリの扱いが lookup・planner 無変更で動くこと（都道府県のみ候補、市区町村は警告のまま）を生成表の実 prefix で確認する
  - 除外 prefix（複数都道府県にまたがる 3 桁）の件数と内容を実装記録に追記する

## 実装記録
- 生成スクリプト: `scripts/generate-zip-dict.mjs`（`npm run zip-dict`）。日本郵便の KEN_ALL（zip 直取り込み、Shift_JIS 復号、依存なしの zip 読み）を `src/core/zip-build.ts` の純粋関数（`parseKenAllCsv`、`buildPrefixRanges`）で表にし、`src/core/zip-dict-data.ts` に書き出す。同じ入力からは同じ表が出る（バイト同一を確認済み）。表の形は lookup と同じ `ZipPrefixRange[]` で、lookup（`zipAssistFor`）と planner は振る舞い無変更。seed の 50 範囲は値と順序を保ったまま `zip-dict-data.ts` に移した
- 複数市区町村の表現と根拠: 同一都道府県で市が複数ある prefix は city 空のエントリ（都道府県のみ確定）にする。呼び出し側は従来どおりで、city 空は assist なしの警告のまま止まる（`hasAbbrev('')` が偽のため）。誤った市区町村の入力より警告停止の方が安全という保守側の判断。複数都道府県にまたがる prefix は表から外し、lookup は null を返して警告のままにする（誤った都道府県の提示を避ける）
- 予算の決め方と測定結果: 表自体 200KB 以下、content script 350KB 以下（seed 時の実測 135.0KB が両ブラウザで一致したため、200KB の増分枠を足して切り上げ）。`tests/build/zip-dict-size.build.ts` で検査し、両ブラウザの content script と表の形（3 桁・lo 小 hi・都道府県必須）を通す。全国化しても 3 桁 prefix は最大 1000 件のため、予算内に収まる見込み（粒度を保つ判断は不要だった）
- ライセンスと出典: 日本郵便は郵便番号データに著作権を主張せず自由な配布を認めている（一次情報は郵便番号データダウンロードの説明文）。`site/content/ja|en/license.md` に「郵便番号データ」節を追加し、日英の H2 数を一致させた。ガイド（`addresses.md` 日英）は辞書の現状（東京 23 区と主な都市のシード）と 3 桁単位の振る舞い、更新手順と出典への案内に直した
- 更新手順の置き場所: `docs/release.md` に「郵便番号辞書の更新（年 1 回程度）」節を追加。Task 5 のゲート一覧・版方針とは重ねず運用手順だけにした
- 検証: `make check` 相当を通した（typecheck、lint、test 197 件 3402 件、test-build 6 件 54 件、lint-firefox 終了 0）。`npm run site` も緑（日英の対応検査を通す）。赤→緑の経過は Task 10 の report にある
