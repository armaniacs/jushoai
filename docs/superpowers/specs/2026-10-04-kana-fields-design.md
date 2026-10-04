# カナ欄（ふりがな・カタカナ）対応 設計書

ふりがな・カタカナを求めている氏名欄に、漢字ではなくカナが注入される問題に対応する。分類パイプラインに「カナオーバーレイ」を追加し、あわせてプレビューからの LLM 手動再分析と設定画面のふりがな表示を加える。分類・注入・承認の基本設計は `2026-10-03-jushoai-design.md`、LLM プロバイダは `2026-10-04-cloud-llm-providers-design.md` に従い、この文書は変更点だけを定める。

## 目的とスコープ

- ふりがな欄・カタカナ欄に、プロファイルのカナを正しい表記（ひらがな／全角カタカナ／半角カタカナ）で注入できるようにする
- ルール分類が自信過剰（autocomplete 0.95）でカナ欄を誤判定する問題を、分類経路を変えずに最終判断で修正する
- ユーザーが「判定がおかしい」と感じたとき、プレビューから LLM による全欄の再分析を手動で要求できるようにする

### 含める

- `wantsKana`（カナ欄判定）とカナオーバーレイ（`classifyAll` 内）
- `pattern` 属性の `\uXXXX` 復号によるカナ検出
- プレビュー内「LLM で再分析」ボタン（全欄一括・ルール結果を上書き・プレビュー承認は必須）
- 設定画面のふりがな・ライブ変換表示（保存形式は変えない）
- 実フォーム由来の回帰 fixture（FieldMeta 直書き＋`samples/` の HTML 断片。自動テストと手動確認を兼ねる）

### 含めない

- 住所・会社名など氏名以外のカナカテゴリ新設（住所のふりがな欄は要検討として記録のみ）
- プロファイル保存形式の変更（漢字＋全角カタカナの2系統を維持）
- 分類エンジンの LLM 主体化（ルール主体は維持。LLM は手動介入時のみ全欄に適用）
- プレビュー承認なしの自動注入
- ページロード時の自動入力

## 現状と原因

実サイト 2 ペームで再現確認済み。

| ページ | 欄 | 現状の分類 | 期待 |
|---|---|---|---|
| `pro.form-mailer.jp/fms/6d59e0a6280818` | ふりがな欄（placeholder「例：みらい」、pattern ひらがな範囲、legend「ふりがな」） | `lastName` (0.95) | `lastNameKana` + hiragana |
| `pro.form-mailer.jp/lp/2dd1c663300469` | カタカナ欄（placeholder「セイ」、pattern カタカナ範囲、legend「お名前（カタカナ）」） | `lastName` (0.95) | `lastNameKana` + katakana |

原因は `classifyField`（`src/core/classify-rules.ts`）が `autocomplete` を最優先（confidence 0.95）で採用し、placeholder・pattern・legend のカナ検出に到達しないこと。両ページのカナ欄には `autocomplete="family-name"` / `given-name` が付いており、confident 扱いになるため LLM にも渡らない。`detectKanaKind` 自体は両欄で正しく `hiragana` / `katakana` を返しており、カナ検出は機能している。すなわち問題は優先順位ではなく、**カナという欄属性がどの分類経路の最終判断にも反映されない**ことにある。

## アーキテクチャ

```
Content Script（ボタン押下）
  └─ scanContainer → classifyAll(metas, classifier, opts?)
       ├─ classifyField（ルール）        ← 無改変
       ├─ confident 未満のみ LLM          ← 通常モードは無改変
       ├─ ★カナオーバーレイ              ← 追加: wantsKana + 名前系カテゴリ → *Kana + kanaKind
       └─ refineClassifications           ← 無改変
  └─ buildPlan → プレビュー（承認必須）→ fillField
```

オーバーレイは `refineClassifications` の直前に 1 箇所だけ挟み、ルール結果・LLM 結果の双方に適用する。分類経路・優先順位・confidence は変更しない。

### `wantsKana(meta): boolean`

「この欄はカナを求めている」を 1 関数に集約する。成立シグナル:

1. **placeholder がカナのみ**（既存の `placeholderIsKana`。NFKC・`stripExample` 済み）
2. **name / htmlId / label / nearby（legend 等）にカナ語**（既存の `KANA` 正規表現: `kana|furigana|yomi|フリガナ|ふりがな|カナ|ひらがな|読み|セイ|メイ` 等）
3. **`pattern` 属性にカナ範囲** — 属性値は `^[\u2015\u3000\u3041-\u3093...]` のリテラル文字列なので、`\uXXXX` を復号してから範囲判定する。placeholder 空欄のカナ欄を拾う最後の砦

ガード（偽陽性防止）:

- **placeholder が漢字・英字なら偽**（既存 `placeholderIsPlain`。共有見出しが「フリガナ」でも、placeholder が「山田」なら漢字欄）
- オーバーレイは `lastName` / `firstName` / `fullName` の**み**を対象とする。email・tel・住所・unknown には触れない

### カナオーバーレイ

```ts
// analyze.ts 内、refineClassifications の直前
if (wantsKana(meta) && isNameCategory(item.cls.category)) {
  item.cls.category = toKanaCategory(item.cls.category); // lastName →lastNameKana 等
  item.cls.kanaKind = detectKanaKind(meta);
}
// confidence は元のまま
```

- 下流は無改変: `planner.valueFor` は既に `lastNameKana` → `formatKana(kana, kind)` でひらがな／全角カタカナ／半角カタカナを出力する
- LLM が `lastName` を返したカナ欄もオーバーレイで救済される

### force モード（`classifyAll(metas, classifier, { force?: boolean })`）

通常モードは無改変。`force: true` のときだけ:

- confident 判定を無視し**全欄を LLM に送る**（autocomplete 0.95 の欄も対象）
- LLM の応答カテゴリを採用（`source: 'llm'`、プレビューの「AI判定」バッジが付く）
- **フォールバック**: LLM の応答なし・`unknown`・例外の欄は confidence に関係なくルール結果を採用する（通常モードでは confident 未満はドロップされるが、force モードでは残す）
- LLM 全体失敗時は confident 欄も未満欄もすべてルール結果で構成される。ルールでも判定できない欄のみ従来どおり除外されるため、再分析前と比べて行が大きく消えることはない
- force 結果にもカナオーバーレイを適用する

## プレビュー内「LLM で再分析」

プレビュー下部のアクション行を 3 ボタンにする。

```
[LLM で再分析]        [キャンセル] [入力する]
```

- **AI 利用可能時のみ表示**（classifier が null ならボタンを描画しない）
- 押下中は「分析中…」にラベル変更＋全ボタン disabled（二重実行・実行中の承認を防止）
- 押下 → `classifyAll(..., { force: true })` → カナオーバーレイ → `buildPlan` → `setRows` で行を差し替え
- 再分析は分類のやり直しだけで、**「入力する」（プレビュー承認）は従来どおり必須**。承認を飛ばす機能は作らない
- 住所切替・`maxlength`・入力済み判定は既存の `replan()` 経由で再計算される

変更箇所:

| ファイル | 変更 |
|---|---|
| `src/core/analyze.ts` | `opts?: { force?: boolean }`、カナオーバーレイ |
| `src/ui/preview.ts` | 3 ボタン化、`onReanalyze` / `setReanalyzing` |
| `src/entrypoints/content.ts` | `items` を `let` 化し再分析結果で差し替え → `replan()` |

## 設定画面のふりがな表示

保存形式は変えない（漢字＋全角カタカナ）。追加するのは入力中のライブ変換プレビューだけ。

- セイ／メイ欄のラベルを「セイ（全角カナ）」→「セイ（フリガナ・ふりがな入力可）」に変更
- 欄の下に「ひらがな表示: やまだ」を即時表示。変換は保存正規化と**同一関数**を使うので、表示と注入結果がズレない
- 入力が空なら表示も空
- `Profile` 型・`storage`・`validateProfile`・`normalizeProfile` は無改変。フィールド追加なし

| ファイル | 変更 |
|---|---|
| `src/entrypoints/options/main.ts` | ラベル文言、セイ／メイ欄下のプレビュー DOM |

## テスト

### コア fixture（`tests/core/`）

`makeMeta` による `FieldMeta` 直書き。`classifyField` 単体の既存テストは期待値変更しない（分類経路は無改変のため）。

- placeholder「みらい」＋autocomplete `family-name` → `lastNameKana` + hiragana
- placeholder「セイ」＋autocomplete `family-name` → `lastNameKana` + katakana
- legend「ふりがな」のみ（placeholder 空）→ `lastNameKana`
- placeholder「未来」＋autocomplete `family-name` → `lastName` のまま（偽陽性ガード）
- `pattern` の `\uXXXX` 復号でカナ範囲を検出
- email / tel 欄にカナ語が混じる → 名前系でないためオーバーレイ対象外
- `refineClassifications` 経由の `fullNameKana` ペア分割 → 既存挙動の非退行
- force モード: LLM が `lastName` を返したカナ欄 → オーバーレイで `lastNameKana`
- force モード: LLM 例外 → confident 欄も未満欄もルール結果で維持される

### HTML 断片 fixture（`samples/` + `tests/integration/`）

DOM 層とコア層の境界（`scanFields` → `classifyAll` → `buildPlan`）を jsdom で検査する。既存の `tests/integration/samples.test.ts` が `samples/*.html` を `?raw` インポートして同じ流れを検査しているため、**同じパターンを踏襲**する。以下の 2 ファイルは自動テストの fixture と、将来の回帰疑い時の手動確認用 HTML を兼ねる（既存の `single-field-form.html` 等と同じ位置づけ）。

```
samples/furigana-fieldset-form.html    ← page1: お名前 fieldset + ふりがな fieldset
samples/katakana-fieldset-form.html    ← page2: お名前 + お名前（カタカナ）
```

断片に含める実構造（今回のバグ再現に必須）:

- `<legend>` + `data-fieldset-label`（`nearby` 抽出経路）
- `class="visually-hidden"` の `<label>名前の姓</label>`（label 抽出）
- `autocomplete="family-name"` 付きカナ input
- `placeholder="例：みらい"` / `"セイ"`、`pattern="^[\u3041-\u3093...]+$"`（リテラル `\uXXXX`）
- 漢字欄とカナ欄の両方（偽陽性ガードの同時検査）

検査は `scanFields` → `classifyAll(metas, null)` → `buildPlan` まで。期待値は「漢字欄に漢字・カナ欄にカナの対応する表記」が入った `plan`。既存 3 サンプルの E2E テストと同じ表形式で追加する。

## 完了判定

1. `make check`（typecheck + test + build）が緑
2. 実ページ 2 つで目視確認:
   - page1: ふりがな欄にひらがなが入り「全角ひらがなで入力してください」が出ない
   - page2: カタカナ欄にカタカナが入り、プレビューが「漢字ペア／カナペア」として正しく表示される
   - プレビュー承認フロー、プレビュー内「LLM で再分析」ボタンの動作
3. 設定画面: ひらがな入力がカタカナに正規化され「ひらがな表示」が即時追従する

## 要検討（スコープ外として記録）

- **住所のふりがな欄**: 現状 `addressFull` 等に分類され漢字住所が注入され、ページ側バリデーションでエラーになる可能性。対応には住所カナのプロファイル保存拡張が要るため今回のスコープ外
- **氏名以外のカナ欄**（会社名カナ等）: 同上
