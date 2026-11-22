# PBI: dark 配色回帰を e2e で守る (OS 切替なしの dark セッション)

## ユーザーストーリー
dark モードで拡張を使う利用者として、dark での配色回帰が e2e で守られていてほしい、なぜなら OS 切替を伴う手動確認は低頻度になり、dark パレットの回帰 (dark メディアブロック内の color-scheme が後続 light ルールで上書きされる — 過去に実在した不具合クラス) が気づかれないまま出荷されるから

## 優先度
- 順位: 単独起票 (DRY/KISS ラウンド外の会話起点)
- RICE スコア: 19 (Reach=2 / Impact=2 / Confidence=70% / Effort=0.15人週)
- 根拠: PBI-209 の残 2 チェック (floating banner dark 追従・WCAG AA 実測) は OS 切替の手動確認で止まっているが、既存 harness が closed-shadow read seam と driver 生成の単一所有を持つため、OS 切替なしの dark 強制セッションで自動化できる。chrome-flags.ts が既に `--force-prefers-color-scheme=light` を押して dark 追従を抑止している (=dark バリアントの対称追加でよい)

## 出どころ
- 2026-11-22 の会話起点 (closer サマリーのユーザー作業項目に対する自動化可能性の指摘)。ラウンド台帳は INDEX の進行中節に記録
- 現状確認 (2026-11-22): tests/e2e/chrome-flags.ts:25-26 (force light + 理由コメント) / tests/e2e/harness.ts:426-480 (closed-shadow read seam) / tests/e2e/scenarios.ts:396 (light rgba assert 前例) / pbi/archived/2026-10-31-209-feat-dark-mode.md (残 2 チェック + dark token #212530 + 過去回帰の記録)

## ビジネス価値
- dark 利用者の見た目回帰が CI で検出され、OS 切替手動確認が消える。測定: PBI-209 の残 2 チェックボックスが e2e 結果で閉じる

## BDD受け入れシナリオ

```gherkin
Scenario: dark 強制セッションでバナーとパネルが dark token で描画される
  Given prefers-color-scheme: dark を強制した e2e セッションでテストページを開いている
  When 「JushoAI で入力」を押してプレビュー パネルを開く
  Then closed-shadow seam 経由で読んだパネルの computed 背景が dark token (#212530) と一致する
  And floating button バナーの computed 色も dark token と一致する
  And 背景と文字色から計算したコントラスト比が 4.5 以上である

Scenario: light 強制セッションは不変である
  Given 既存の light 強制セッション (--force-prefers-color-scheme=light) でテストページを開いている
  When 既存の light 配色 assert を走らせる
  Then scenarios.ts:396 の rgba pin を含む全 light pin が無変更で緑である
```

## 受け入れ基準
- [x] harness に dark セッション変数を追加 (**Chrome: `--force-prefers-color-scheme=dark` flag は実ブラウザで無効と実証されたため、PBI 受け入れ基準が明示認可したフォールバック — BiDi media override (`emulation.setMediaFeaturesOverride`) を dark セッションのみに適用**。Firefox: `layout.css.prefers-color-scheme.content-override` pref、light=1 は既存コードで実証済み / dark=0 を実描画で確認)。既存 light セッション (chrome-flags.ts:26) は無変更 — flag が無効な既存の潜在穴 (dark OS 機材で light pin 保護なし) は後続候補として実装記録に残す
- [x] scenarios.ts に dark シナリオを追加: バナー・プレビュー パネルの computed 背景と文字色が dark token と一致し、floating button バナーも追従 (closed-shadow seam 経由で要素取得 → executeScript で getComputedStyle を読む)。バナーの読み取りは既存 light シナリオと同じ `getCssValue` (computed 値を返すため PBI-209 の回帰クラスは検出可能 — レビューが同値性を確認)
- [x] 相対輝度からコントラスト比 ≥ 4.5 を計算する assert を含める (実測: パネル 12.7:1 / バナー 9.7:1。計算関数は tests/e2e/contrast.ts に抽出し単体テストが同一実装を pin — 計画の「scenarios.ts 内ローカル」を超える改善としてレビューが承認)
- [x] 既存 light pin (scenarios.ts:397) が無変更で緑
- [x] PBI-209 の残 2 チェックボックスを e2e 結果で閉じる (archived ファイルに実施記録)
- [x] `make check` 緑 (191 ファイル 3202 passed + 1 expected fail) + focused e2e (HEADLESS=1 で chrome 26 passed / firefox 23 passed — light + dark 両方)

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- dark シナリオ 2 件 (パネル配色 + floating banner 追従) — 本 PBI の本丸
- 既存 light pin は無変更 (light 不変の回帰網として残る)

### 統合テスト
- 追加なし (e2e 自体が統合層)

### 単体テスト
- コントラスト比計算 (相対輝度) の境界 3-4 件 (既知ペア: dark token 組で 4.5 以上、同色で 1.0、白黒で 21)

## 実装アプローチ
- **Outside-In**: scenarios.ts の dark シナリオから書き始め、必要な harness 機能 (dark セッション変数) を逆算
- **Red-Green-Refactor**: dark シナリオ RED (現状は light 強制で dark token にならない) → harness に dark セッション追加 → GREEN
- **リファクタリング**: chrome-flags.test.ts の既存 pin を壊さず dark バリアントを追加する

## 見積もり
0.15人週（要チームでの見積もり）

## 技術的考慮事項
- 依存関係: なし (PBI-209 はアーカイブ済みで完了済み実装に対する検証追加)
- テスタビリティ: closed-shadow read seam が全読み取りを単一所有
- 非機能要件: CI の e2e 時間が 1-2 シナリオ分微増。挙動変更なし (テスト追加のみ)

## 実装者向け注記

### 現状コードの確認
（2026-11-22 作成時に現存確認済み。着手時に再確認すること）
```bash
grep -n "force-prefers-color-scheme" tests/e2e/chrome-flags.ts tests/e2e/chrome-flags.test.ts
sed -n '426,480p' tests/e2e/harness.ts
sed -n '390,400p' tests/e2e/scenarios.ts
grep -n "\[ \]" pbi/archived/2026-10-31-209-feat-dark-mode.md
```

### 実装手順
1. chrome-flags.ts に dark バリアント (例: `chromeLaunchArgs({ scheme: 'dark' })`) を追加。chrome-flags.test.ts に dark の pin を追加 (既存 light pin は無変更)
2. Firefox の pref 値を実測確認: `layout.css.prefers-color-scheme.content-override` の 0/1/2 の対応 (MDN・bugzilla 記録)。誤値で light が dark になる事故を避けるため、実装時に dark 強化セッションでバナー色が変わることを目視 + assert の両方で確認
3. harness に dark ドライバ生成変数を追加 (firefox.Options().setPreference / chrome の flags 切替)
4. scenarios.ts に dark シナリオを追加: seam 経由でバナー・パネル要素を取得 → executeScript で getComputedStyle の backgroundColor / color を読む → dark token (#212530 系) と一致 + 相対輝度計算でコントラスト比 ≥ 4.5
5. PBI-209 の残 2 チェックボックスを [x] に更新 (e2e 結果を根拠に) + 実施記録
6. focused e2e (e2e-chrome / e2e-firefox) → make check → CI 確認

### 落とし穴
- chrome-flags.test.ts の既存 pin は順序固定 toEqual (PBI-51 で緩和済みの形状) — dark バリアント追加で既存 pin を壊さないこと
- Firefox pref の値対応を誤ると light が dark になる — 目視と assert の両方で確認してから固定する
- dark assert は **computed color** で読むこと — PBI-209 の手動確認で発見済みの回帰クラス (dark メディアブロック内の color-scheme が後続 light ルールで上書き) は、`<style>` の内容を assert しても検出できず、computed 値なら検出できる
- コントラスト比は computed color の rgba から相対輝度を計算する — PBI-209 記載の計算値 (#212530 背景) と突合して計算関数を検証する
- headless でも dark 強制は有効 (`--force-prefers-color-scheme` は headless=new で動作)

## Definition of Done
- [x] 全 BDD シナリオが自動テストとして実装されパスする (dark シナリオ + 既存 light pin 無変更)
- [x] テストカバレッジが基準を満たす (e2e dark 2 件 + コントラスト計算単体)
- [ ] コードレビュー完了（GitHub PR での approve を必須とする）
- [x] リファクタリング完了（該当なし — テスト追加）
- [x] ロールバック手段の検討（テスト追加のみ。e2e 不安定化時は dark シナリオを skip 扱いにして既存 light pin は維持、原因調査後に再開する手順を PR 説明に明記）
- [x] ドキュメント更新済み（PBI-209 の残 2 チェックを閉じ、本 PBI に実装記録）

## 実装記録（2026-11-22・SDD 2 タスク + 最終ゲート）

- **Task 1 (3cba9b2)**: dark セッション基盤。chrome-flags.ts に scheme オプション (`chromeLaunchArgs(env, { scheme })`、既定 light・4 層で既定を機械保証)、firefox pref を light=1 / dark=0 で分岐 (1=light は既存 light-token assert が実証)、adapter は constructor opts (`new ChromeAdapter({ colorScheme: 'dark' })`)。既存エントリ・既存 pin 無変更。TDD RED→GREEN。
- **Task 2 (6b29d8c)**: `runDarkColorScheme` シナリオ 2 件 (パネル + floating banner) — closed-shadow seam 経由で要素取得、executeScript / getCssValue で computed 色を厳密一致 assert、WCAG 相対輝度計算でコントラスト比 ≥ 4.5 (実測 パネル 12.7:1 / バナー 9.7:1)。コントラスト計算は tests/e2e/contrast.ts に抽出し tests/e2e/contrast.test.ts が同一実装を pin (単体は通常 config で make test に乗る)。エントリ tests/e2e/chrome.dark.e2e.ts / firefox.dark.e2e.ts — include pattern と package.json フィルタに自動一致するため Makefile・script は無変更。
- **重要な発見 — Chrome flag の無効性**: `--force-prefers-color-scheme=dark` は実ブラウザ (Chrome 157) で効かなかった (flag 付きでも dark にならず、実証のため flag なし RED → override 後 GREEN の証跡)。PBI 受け入れ基準 1 が明示認可したフォールバック (CDP 相当の BiDi media override) を dark セッションのみに適用 (harness.ts:348 で gate、1 関数で分離可)。既存 light flag も同様に無効な可能性が高く、**dark OS 機材で light pin 保護が効かない潜在穴** — 失敗モードは目立つ (light pin が赤になる) ため静寂な回帰ではないが、BiDi mirror による機械的修正は後続候補 (PBI-265 実装記録 + 台帳に記録)。
- **Firefox**: pref 0 = dark を実描画で確認 (panel computed rgb(33, 37, 48) 厳密一致)。
- **deviation 2 件** (レビュー承認): (1) コントラスト計算を scenarios.ts 内ローカルでなく tests/e2e/contrast.ts に抽出 (e2e assert が単体 pin と同一実装を行使) / (2) harness BiDi フォールバック (上記)。
- **受容・後続**: 既存 light シナリオ 1 件にタイミング flake を 1 回観測 (partial banner persistence・再実行で緑・本タスク対象外の未触経路)。バナー読み取りは getCssValue (PBI 原文の executeScript/getComputedStyle と機能的に同値 — レビューが同値性確認)。
- **検証**: `make check` 緑 (191 ファイル 3202 passed + 1 expected fail)・`make eval` 3 passed・`npm run test:e2e:chrome` / `test:e2e:firefox` (HEADLESS=1) で既存 light + 新規 dark 全緑。
- **訂正**: PBI/計画で参照した scenarios.ts:396 の light pin は現行 397 行 (レビュー指摘)。
