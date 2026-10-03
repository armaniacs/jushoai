# JushoAI 設計書

日本のフォーム（姓名・フリガナ・分割された住所）を補完する Chrome 拡張機能。個人情報はブラウザ外に送らない。

## 目的とスコープ

- 1Password や Chrome 標準の自動入力が苦手な、日本式フォームの補完を行う
- フィールド分類はルールを主体にし、曖昧なものだけ Chrome 内蔵 AI（Gemini Nano, Prompt API）で補助する
- 値の整形（分割・カナ変換・ハイフン処理）は決定的なコードで行い、LLM に値を生成させない

### MVP に含める

- プロファイル: 姓・名、セイ・メイ、メールアドレス、電話番号
- 住所: 郵便番号、都道府県、市区町村、番地、建物名。複数登録可（氏名・連絡先は 1 組）
- 実行契機: フォーム検出時にページ上へボタンを表示し、クリックで実行
- 注入前にプレビューで確認し、承認後に注入
- LLM が使えない環境ではルール分類のみで動作を継続

### MVP に含めない

- 生年月日、性別、会社名、部署、カスタム項目
- 複数の氏名プロファイル
- クラウド LLM への切り替え
- ページ読み込み時の自動入力

## 技術スタック

WXT + TypeScript + Vitest（jsdom）。Manifest V3。

## アーキテクチャ

コアロジックは DOM と LLM に依存しない純粋関数にする。

```
src/
  core/
    profile.ts          Profile / Address の型とバリデーション
    classify-rules.ts   name/autocomplete/label/placeholder からの規則分類
    formatters.ts       カナ変換、電話番号、郵便番号の整形
    planner.ts          分類済みフィールド + プロファイル → 注入値
  llm/
    classifier.ts       FieldClassifier の Prompt API 実装
    availability.ts     Prompt API の利用可否判定
  dom/
    scan-fields.ts      input/select の抽出
    fill.ts             値注入とイベント発火
  entrypoints/
    content.ts          フォーム検出、ボタン、プレビュー、実行制御
    options/            プロファイル・住所の編集 UI
```

- LLM の呼び出しは `FieldClassifier` インターフェースの背後に置く。Prompt API を呼ぶ実行コンテキスト（Content Script か拡張機能ページか）は実装着手時に最新仕様で確認して決める
- プロファイルは `chrome.storage.local` に保存し、外部へ送信しない

### データの流れ

1. Content Script が補完対象フォームを検出し、Shadow DOM でボタンを表示する
2. クリックで DOM をスキャンし、ルールで分類する
3. 信頼度が閾値未満のフィールドがあり、LLM が利用可能なら LLM で分類する
4. `planner` が注入値を決め、プレビューを表示する
5. ユーザーが承認したら `fill` が注入する

## フィールド分類

### カテゴリ

`lastName` / `firstName` / `fullName` / `lastNameKana` / `firstNameKana` / `fullNameKana` / `email` / `tel` / `tel1` / `tel2` / `tel3` / `zip` / `zip1` / `zip2` / `prefecture` / `city` / `street` / `building` / `addressFull` / `addressNoPref` / `unknown`

### ルール分類

- 入力: `autocomplete`、`name`、`id`、`label`、`placeholder`、周辺テキスト、`type`、`maxlength`
- 優先順位: `autocomplete` → name/id → label/placeholder → 周辺テキスト
- 日本語と英語のキーワード辞書を持つ
- 結果は「カテゴリ + 信頼度」。閾値未満は LLM の対象にする
- カナの表記種別（全角カナ / 半角カナ / ひらがな）は `placeholder`・label・`pattern` から `kanaKind` として判定する
- 氏名・住所が分割されているかは、同一フォーム内の兄弟フィールドの分類結果から推定する

### フォーム検出

- text/email/tel の `input` と `select` が一定数以上あり、分類済みが 2 つ以上あるコンテナを補完対象とする
- ボタンは先頭フィールド付近に Shadow DOM で表示する
- `MutationObserver` で動的に追加されたフォームも検出する

### LLM 連携

- 入力はフィールドのメタデータとカテゴリ一覧のみ。プロファイルの値は渡さない
- 出力は `{fieldId: category}` の JSON に限定し、スキーマ制約を使う。パース失敗・未知カテゴリは `unknown` として破棄する
- 利用可否は 3 状態（利用可能 / ダウンロード中 / 利用不可）で判定し、ボタンに表示する
- LLM が付けた分類は低信頼として扱い、プレビューで印を付けて目立たせる

## 値の生成（決定的）

- **氏名**: 分割欄はそのまま入れる。1 欄の場合、区切り（全角スペース / 半角スペース / 無し）は `placeholder` の例示から判定し、判定できなければ半角スペース
- **カナ**: プロファイルは全角カタカナで保持し、`kanaKind` に応じてひらがな・半角カナ・全角カナへ変換
- **電話**: 数字のみで保持し、欄数・`maxlength`・`placeholder` からハイフン有無と分割を決める
- **郵便番号**: 7 桁で保持し、1 欄（ハイフン有無）と 2 分割に対応
- **住所**: 構造化して保持するため分割は不要。欄の構成に合わせて結合する。`maxlength` を超える場合は切り詰めず、プレビューで警告
- **select**: 都道府県の `option` は文字列一致（「東京」「東京都」の揺れを含む）で選ぶ。一致しなければ入力せず警告

## 注入

- ネイティブの value setter 経由で値を設定し、`input` / `change` / `blur` を発火する（React / Vue の state 更新のため）
- `readonly` / `disabled` はスキップ
- 入力済みの欄は上書きせず、プレビューで「入力済み」と表示

## プレビュー

- クリック後すぐには注入せず、「欄 → 値」の一覧を表示する
- 住所が複数登録されている場合はここで選択する
- LLM 分類の欄、`maxlength` 超過、select 不一致、入力済みを区別して表示する
- ユーザーが承認したときだけ注入する

## エラー処理と縮退

| 状況 | 挙動 |
|---|---|
| LLM が利用不可 | ルール分類のみで動作。ボタンに「AI 無効」と表示 |
| LLM 出力が不正 | 該当欄を `unknown` にし、他の欄は続行 |
| 未分類の欄 | 注入しない |
| 住所が未登録 | 設定画面へ誘導 |
| 住所が複数 | プレビューで選択 |

## テスト

- `core/`: Vitest。氏名 1/2 欄、カナ 3 種、住所 2/3/4 分割、電話 1/3 欄などを DOM メタデータの fixture で網羅する
- `dom/`: jsdom でスキャン、注入、イベント発火を検証する
- `llm/`: `FieldClassifier` をモックし、出力検証と縮退を検証する
- Gemini Nano の実精度は自動化できないため、手動確認用のサンプルフォーム集を用意する
