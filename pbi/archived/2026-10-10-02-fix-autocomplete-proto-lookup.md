# PBI: autocomplete 属性のルックアップをプロトタイプ継承の影響を受けない形にする

状態: 実装済み（`make check` green。コードレビューはユーザー作業として残す）

## ユーザーストーリー
autocomplete 属性を持つ入力欄があるページを訪れる利用者として、そのページでも「JushoAI で入力」が最後まで動いてほしい、なぜならページ側の属性値の書き方ひとつで拡張機能の中核フローが死ぬのは受け入れられないから

## 優先度
- 順位: 2 / 7
- RICE スコア: 20.0（Reach=10 / Impact=1 / Confidence=100% / Effort=0.5pt）
- 根拠: VulnHunter 監査の Code Quality #4。`autocomplete="constructor"` のようなページ側の値で分類ラン全体が TypeError で中断され、全欄が未入力のままエラーボタンになる。影響は拡張機能の中核フロー（分類→計画→注入）すべてに及ぶ一方、修正は 1 か所のルックアップと型ガードのみで小さい

## 背景
- VulnHunter 監査（`JushoAI_VULNHUNT_RESULTS_2026-10-10-051858/phase2b_output.md` の候補 #10、Gate 3 で Code Quality として採択）で発見。機構は検証済みで、TypeError が実際に投げられることを確認している
- `AUTOCOMPLETE` はプレーンオブジェクトリテラル（`src/core/classify-rules.ts:18`）。`if (AUTOCOMPLETE[ac])`（`src/core/classify-rules.ts:309`）のルックアップはプロトタイプチェーンを辿るため、ページが `autocomplete="constructor"`（または `"toString"` / `"valueOf"` 等）を設定すると、継承プロパティの関数オブジェクトが truthy に解決され、`make(関数オブジェクト, 0.95)` が呼ばれる
- `make` の中の `category.endsWith('Kana')`（`src/core/classify-rules.ts:306`）が関数オブジェクトに対して呼ばれ、TypeError が投げられる
- `classifyAll` は欄単位の catch を持たない（`src/core/analyze.ts:40` の `metas.map` が一括で `classifyField` を呼ぶ）ため、1 欄の例外で分類ラン全体が中止される。呼び出し元の `guardedRun` の catch（`src/entrypoints/content.ts:41-44`）が拾い、ボタンは「エラー: 分類に失敗、再試行してください」になる。再試行しても同じページでは必ず再発する
- 監視対象外の属性値（`"off"` 等）や未知の値はルックアップが falsy になるため現状でも安全だが、`Object.prototype` に存在する名前はすべて危険
- 制約: 正常な autocomplete 値（`"family-name"` 等）の分類結果は一切変えない。プレビューゲートの挙動も不変

## BDD受け入れシナリオ
Scenario: プロトタイプ継承名の autocomplete 値で分類が落ちない
  Given autocomplete="constructor" が設定された入力欄がある
  When 「JushoAI で入力」で分類を実行する
  Then その欄は TypeError にならず未分類（null）として扱われる
  And 分類ラン全体は最後まで続く

Scenario: その他の継承プロパティ名でも落ちない
  Given autocomplete="toString" または autocomplete="valueOf" が設定された入力欄がある
  When 分類を実行する
  Then どちらの欄も未分類（null）として扱われ、例外は投げられない

Scenario: 正常な autocomplete 値の分類は従来どおり
  Given autocomplete="email" と autocomplete="family-name" が設定された入力欄がある
  When 分類を実行する
  Then email と lastName が信頼度 0.95 で返る

Scenario: エラーボタンが出ない
  Given autocomplete="constructor" が設定された欄を含むフォームで
  When 「JushoAI で入力」を押す
  Then ボタンにエラーが表示されず、プレビューが開く

## 受け入れ基準
- [x] `src/core/classify-rules.ts` の autocomplete ルックアップが `Object.hasOwn`（または `Map`）を使い、継承プロパティを truthy と解釈しない
- [x] `make()` 呼び出し前にカテゴリ文字列の型ガードがあり、関数オブジェクトが渡っても TypeError にならない
- [x] `autocomplete="constructor"` / `"toString"` / `"valueOf"` の欄は throw せず未分類（null）になる
- [x] 正常値（`"email"`、`"family-name"`、`"postal-code"` 等の全定義済みキー）の分類結果・信頼度 0.95 が不変
- [x] `classifyAll` の分類ランは上記の欄を含んでも最後まで完了する
- [x] 既存の分類・整形・計画のテストがすべて green のまま

## テスト戦略（t_wadaスタイル）
- 単体: `tests/core/classify-rules.test.ts` に回帰テストを追加。`makeMeta({ autocomplete: 'constructor' })` で `classifyField` が throw せず null を返すこと。`"toString"` / `"valueOf"` の境界も同様に。正常値は従来どおりの期待値を固定し、修正前後で分類結果が変わらないことを先に（レッド→グリーン）
- 統合: `tests/core/analyze.test.ts` に `classifyAll` が `"constructor"` 欄を含む metas 配列で最後まで完了し、他の欄の分類が影響を受けないことを検証するケースを追加

## 実装者向け注記
### 現状コードの確認（着手前に実行済み）
- `src/core/classify-rules.ts:18` に `AUTOCOMPLETE: Record<string, Category>` のオブジェクトリテラル（`family-name` 〜 `street-address` 等の定義済みキー）
- `src/core/classify-rules.ts:300` で `m.autocomplete.trim().toLowerCase().split(/\s+/).pop() ?? ''` がトークン抽出
- `src/core/classify-rules.ts:309` の `if (AUTOCOMPLETE[ac]) return make(AUTOCOMPLETE[ac], 0.95)` がプレーンオブジェクトの添字ルックアップ。`:302-307` の `make` 内 `:306` で `category.endsWith('Kana')` が呼ばれる
- `src/core/analyze.ts:40` の `metas.map` に欄単位の catch なし。`src/entrypoints/content.ts:41-44` の `guardedRun` catch が最終的に拾ってエラーボタン表示

### 実装手順
1. 先にレッド: `tests/core/classify-rules.test.ts` に `autocomplete="constructor"` で throw せず null を返す回帰テストを書き、現状では TypeError で落ちることを確認する
2. `src/core/classify-rules.ts` の `AUTOCOMPLETE` を `Map<string, Category>` にするか、`Object.hasOwn(AUTOCOMPLETE, ac)` でガードする。`AUTOCOMPLETE` がモジュール内の他参照を持つか確認してから選ぶ
3. `:306` の `make()` 呼び出し前に `typeof category === 'string'` の型ガードを入れ、文字列以外は undefined を返す（または Map 化で `get` が undefined を返す形に統一する）。Category 型の安全な絞り込みを保つ
4. `tests/core/analyze.test.ts` に `classifyAll` 経由の統合ケースを追加する
5. `make test` で全テスト green、必要なら `make check` まで

### 落とし穴
- `Object.hasOwn` だけでは `make(Object, 0.95)` の第 1 引数問題が残る場合がある: ルックアップを hasOwn で閉じれば未定義キーは falsy になるが、将来 `AUTOCOMPLETE` に非文字列キーが入る経路がないか型で保証するのが目的。Map 化するなら `Map` の `get` は常に `Category | undefined` になるので型ガードが自然に絞れる
- トークン抽出（`:300`）の `pop()` 後の空文字 `''` は `Object.prototype` に存在しないため現状安全だが、Map 化・hasOwn 化のどちらでも崩れないことを回帰テストで確認する
- 正常値の分類結果を変えないこと。`Object.hasOwn` / `Map` への置換で `"off"` 等の未定義キーの挙動（null 返却）も不変であること。信頼度 0.95 も変えない
- `AUTOCOMPLETE` を `Map` にする場合、`tests/` や他モジュールから `AUTOCOMPLETE` を import していないか事前に grep する。export していないため未使用のはずだが、確認してから変える

## 見積もり
0.5pt（要チームでの見積もり）

## Definition of Done
- [x] `autocomplete="constructor"` / `"toString"` / `"valueOf"` の回帰テスト（単体 + `classifyAll` 統合）が green で、正常値の既存テストも不変
- [x] `make check` が通る
- [x] グラフの更新（`graphify update .`）まで完了している
