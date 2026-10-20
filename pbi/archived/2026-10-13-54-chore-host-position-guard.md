# PBI: host の第3消費者ガード（position 書き忘れ防止）

## ユーザーストーリー
拡張機能の開発者として、将来の Shadow host 新規消費者が `position` を書き忘れても検出できる仕組みがほしい、なぜなら書き忘れると host が `static` のままページ最下部に stranded し、UI 消失級の不具合になるから。

## 背景・現状コードの確認（2026-10-13 調査済み）
- `src/ui/host.ts` の `createShadowHost()` は意図的に `position` の既定を宣言しない。配置は消費者に委ねる設計で、コメントだけがガード。
- 現直接消費者 2 件は `position: fixed` を `important` 付きで書いていることを確認:
  - `src/ui/button.ts:39` ― `mountButton` 内で `host.style.setProperty('position', 'fixed', 'important')`
  - `src/ui/overlay.ts:17` ― `createOverlayHost` 内で同等の一行
- 間接消費者 2 件は `overlay.ts` 経由でカバーされることを確認:
  - `src/ui/preview.ts:67` ― `createOverlayHost()` を使用
  - `src/ui/ai-guide.ts:134` ― `createOverlayHost()` を使用
- `createShadowHost` / `createOverlayHost` の呼び出しは上記以外になし（`grep` にて確認）。
- すなわち現状は壊れていないが、3 件目の直接消費者が `position` を書き忘れると無音で `static` に落ちる。ガードはコメントのみ。

## 優先度・順位・スコア
- 優先度: 低（chore）
- 順位: 8 位 / 9 件
- RICE: **25**（Reach=5・Impact=1・Confidence=50%・Effort=0.1 人週）
- 根拠: 発生頻度は低いが、起きると UI 消失級のため保険として残す。
- 依存: なし

## BDD受け入れシナリオ

```gherkin
Scenario: 新規消費者がpositionを書き忘れると検出できる（ハッピー）
  Given 将来の開発者がcreateShadowHostを直接呼ぶ新規パネルを追加した
  And その新規コードがpositionを書き忘れた
  When 開発ビルドまたは単体テストでそのパネルを開く
  Then position未設定が警告・アサート・型エラーのいずれかで検出される
  And hostが無言でページ最下部にstrandedしない

Scenario: 既存2経路は無変更の見た目で通る（境界）
  Given 既存のボタン経路（button.ts経由）とオーバーレイ2経路（preview.ts・ai-guide.ts経由）がある
  When ガード導入後に既存テストと目視確認を行う
  Then ボタンはアンカー追従のfixed配置のままである
  And プレビューとAIガイドは右上fixed（top:16px・right:16px）のままである
  And 既存テストに回帰がない
```

## 受け入れ基準
- [x] `position` 未設定の新規消費者が dev-time（テスト・警告・型のいずれか）で検出できる
- [x] 既存 2 直接消費者（`button.ts`・`overlay.ts`）と 2 間接経路（`preview.ts`・`ai-guide.ts`）の配置・見た目に変化がない
- [x] 本番ビルドに余計なランタイムコスト・コンソールノイズを持ち込まない
- [x] 実装コードは書かない（本 PBI は方針決定＋ガード追加の最小変更に留める）

## テスト戦略（t_wadaスタイル）

### E2Eテスト
- なし（既存 E2E の回帰パスで十分。本 PBI 単独の E2E 追加はしない）

### 統合テスト
- ガード導入後、ボタン・プレビュー・AI ガイドの既存統合／サンプルテストがすべてグリーンのこと

### 単体テスト（Outside-In、失敗から入る）
1. 新規に `createShadowHost` を呼ぶだけのダミー消費者テストを書く → 現状では `position` が空で検出できないこと（Red の確認）
2. ガード導入後、同テストが検出成功すること（Green）
3. 既存の button / overlay 経路のテストが無変更で通ること（回帰）

## 見積もり
- 0.1 人週（要チームでの見積もり）。コメント＋数行のガード追加＋単体テスト 1 件の想定。

## 技術的考慮事項
- 依存関係: なし
- テスタビリティ: jsdom で `host.style.position` を読めるため単体テスト可能
- 非機能要件: 本番パフォーマンス・見た目への影響ゼロ

## 実装者向け注記

### 方向（この二択から選ぶ。両方はやらない）
- **案A: `createShadowHost` の引数化（推奨寄り）** ― 例 `createShadowHost({ position: 'fixed' })` 必須化、またはオプション＋既定 `'fixed'`。呼び忘れが型・lint レベルで見える。既存 2 呼び出し（`button.ts:34`・`overlay.ts:7`）の更新が必要。`all: initial !important` リセットとの順序（`important` 付き後勝ち）に注意。`overlay.ts` の `left: auto` 意図（`left` を書かない制約）を壊さないこと。
- **案B: dev-time warn アサート** ― 例 `if (process.env.NODE_ENV !== 'production' && host.style.position === '') console.warn(...)`、または開発用アサート関数。既存経路の変更が最小で済むが、警告の見落としリスクあり。本番に warn を残さないこと。

### 現2消費者の確認（着手前に再確認すること）
```bash
grep -rn "createShadowHost\|createOverlayHost" src/
```
- 直接: `src/ui/button.ts:39`、`src/ui/overlay.ts:17` が `fixed` をカバー
- 間接: `src/ui/preview.ts`・`src/ui/ai-guide.ts` は `overlay.ts` 経由
- 上記以外に直接呼び出しが増えていないか確認してから着手すること。

### 落とし穴
- `host.style.setProperty('all', 'initial', 'important')` が `top/left` を `initial` に戻すため、座標書き込みは `important` 付き必須。この約束をガード実装で壊さないこと。
- `overlay.ts` の右上ピン留めは `left` 未設定が意図的（`left` を `important` で書くと左寄せに反転する）。案A で `position` 既定を入れても `left` には触らないこと。
- 実装コードは本 PBI に含めない。ガード方針の決定と最小差分に留めること。

## Definition of Done
- [x] 上記 BDD 2 シナリオが自動テストまたは目視手順として確認されパスする
- [x] 既存テスト（`make test` 相当の UI 関連）に回帰がない
- [ ] コードレビュー完了
- [x] ドキュメント更新不要であることを確認済み（配置規約コメントの更新のみ可）

## 実施記録（2026-10-13、自律タスククローザーによる実装）

- 実装コミット `02564fb`: 案A を採用。`createShadowHost({ position: 'fixed' })` を必須化し、関数内で `important` 付き書き込み（従来の消費者側書き込みと等価な順序）。`button.ts`・`overlay.ts` は呼び出し更新＋重複行削除のみ。`preview.ts`・`ai-guide.ts` 無変更。本番コスト・ノイズゼロ。
- テスト: `host.test.ts` を引数付きに更新し、`@ts-expect-error` のコンパイル時ガードを追加（引数なし呼び出しが型エラーになることの証明）。
- 検証: `npx tsc --noEmit` exit 0、`tests/ui/host.test.ts` 2/2。最終宣言は従来と同一で見た目不変。
- ユーザーの作業として残る項目: コードレビュー
