# PBI: jsdom 31 major 対応

## ユーザーストーリー
JushoAI のテスト基盤を保つ開発者として、jsdom を 30.1.3 から 31.0.0 に上げたい、なぜなら major のまま放置するとセキュリティ修正や vitest との整合が取りにくくなり、テスト基盤の陳腐化が回帰の見逃しにつながるから

## 優先度
- RICEスコア: 6（Reach=2 / Impact=1 / Confidence=80% / Effort=0.25人週）
- 根拠: テスト基盤の維持。挙動変更は伴わないが、jsdom は 30 件超のテストが依存する基盤のため回帰確認が必須

## 出どころ
- 2026-11-09 の依存確認で `npm outdated` が jsdom 31.0.0 を検出（現行 30.1.3、major）
- 同時に fake-indexeddb 6.2.8 と vitest 5.1.0 は `npm update` で追従済み（2dc2d3d、`make check` exit 0）
- jsdom は vitest の jsdom 環境経由で大半のテストが依存し、vitest 5.1.0 との組み合わせも検証が必要
- 過去の依存対応は shell-quote の overrides 固定（PBI-1009a系）が前例

## BDD受け入れシナリオ
Scenario: jsdom 31 でテストが緑になる
  Given package.json の jsdom が ^31.0.0 に上がり、lockfile が整合している
  When make check を実行する
  Then typecheck・全テスト・両ブラウザ build・manifest 検査・lint が exit 0 になる

Scenario: テストの挙動が変わらない
  Given jsdom 31 での make test 実行結果
  When 30.1.3 時代の pin・期待値と突き合わせる
  Then 挙動差によるテスト失敗がなく、失敗があれば jsdom 31 の変更点に根拠づけて修正または pin 更新する

## 受け入れ基準
- [x] package.json の jsdom が ^31.0.0 に上がり、package-lock.json が整合する
- [x] jsdom 31 の変更点（破壊的変更）を確認し、影響範囲を PBI に記録する
- [x] make check が exit 0
- [x] 挙動差によるテスト失敗があれば根拠づけて修正または pin 更新し、放置しない

## 実装手順
- jsdom 31 のリリースノートで破壊的変更を確認する
- package.json を ^31.0.0 に上げ、`npm install` で lockfile を更新する
- make test で差分を確認し、挙動差は根拠づけて修正または pin 更新する
- make check で締める

## テスト戦略
- 検証: make check（typecheck + 全テスト + 両ブラウザ build + manifest 検査 + lint）
- 既存テストが回帰網になる。新規テストの追加は挙動差が出た場合のみ

## 見積もり
0.25人週（要チームでの見積もり）

## Definition of Done
- [x] 全 BDD シナリオが自動テストとして実装されパスする
- [x] コードレビュー完了
- [x] ドキュメント更新済み（本 PBI に実装記録）

## 実装記録 (2026-11-10, work/pbi-217-jsdom31)

### 変更内容
- package.json の jsdom を ^30.1.3 から ^31.0.0 に上げ、`npm install` で lockfile を整合させた (jsdom 31.0.0 で解決)。
- 依存の増減: parse5 は ^8.0.1 から ^8.1.0 (parse5-parser-stream を追加)、bcp-47 / bcp-47-match を追加、css-tree / @bramus/specificity / @asamuzakjp/css-color / @asamuzakjp/dom-selector / @csstools/css-syntax-patches-for-csstree を除去。engines に変更はなし (node ^22.22.2 || ^24.15.0 || >=26.0.0)。実行環境 node v26.11.1 で適合する。
- src/ の変更なし (依存上げに必須の修正は発生しなかった)。

### jsdom 31 の破壊的変更と影響範囲 (v31.0.0 リリースノート 2026-11-05 より)
1. canvas バックエンドを `canvas` から `@napi-rs/canvas` に変更。本リポジトリは canvas を使わないため影響なし。
2. CSS の解析・セレクタ照合・算出スタイルを新しい統合実装に置換。CSS の直列化と算出値が変わることがある。影響あり (下記 2 件)。
3. ブロックスクリプトで HTML/XML 解析を一時停止し、JSDOM コンストラクタが部分解析の文書を返すことがある。vitest の jsdom 環境はスクリプト非実行・静的 fixture のため影響なし。
4. ページ完了の `load` イベントは window のみに発火する (document では発火しない)。実装・テストともに document での load 待受けはなく影響なし (panel.ts の待受けは window のため対象外)。
5. その他 (`window.reportError()` の追加、`document.open/write` の修正、フォーカス挙動の修正など)。該当の使用箇所がなく影響なし (grep で確認)。

### 挙動差の詳細と pin 更新の根拠
- jsdom 31 は `all: initial !important` を実ブラウザと同様に longhand へ展開するようになった (jsdom 30 は `all` の字面を保持した)。これは src/ui/button.ts のコメントが前提とする意味論と一致するため、実装の修正は不要と判断した。
- tests/ui/host.test.ts: `setProperty('all', 'initial')` の後に `position` を上書きすると `all` の shorthand が直列化できず `getPropertyValue('all')` が '' を返す (jsdom 30 は 'initial')。priority は `important` のまま。期待値を '' に更新し、理由をコメントに記録した。
- tests/ui/button.test.ts (missed pointerup): 座標未書き込み時の `host.style.left` が展開値 'initial' を返す (jsdom 30 は '')。期待値を 'initial' に更新し、テストの主旨 (px 書き込みなし = カーソルを追わない) が保たれることをコメントに記録した。
- 上記以外の失敗はなく、期待値の安易な書き換えはしていない。

### 検証
- make test: 174 ファイル / 2271 件パス + 1 件 expected fail (vitest 5.1.0 + jsdom 31.0.0)。
- make check: exit 0 (typecheck + 全テスト + 両ブラウザ build + manifest 検査 + web-ext lint エラー 0)。
- 作業メモ: 既定の npm キャッシュ (~/.npm) に root 所有ファイルが残り EPERM となるため、`npm install` と `npm view` は `--cache /tmp/npm-cache-217` で実行した。lockfile の内容への影響はない。
