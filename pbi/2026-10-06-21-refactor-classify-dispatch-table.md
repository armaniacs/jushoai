# classifyFieldのテーブル駆動化

- 種別: refactor
- 優先度: 順位 5/6、RICE 2.1（Reach=8 / Impact=1 / Confidence=0.8 / Effort=3）
  - 根拠: 新カテゴリ追加が単一関数の編集になる構造の規範化。ルール優先順の設計判断が残るため Confidence 0.8。
  - 依存: なし
- 見積もり: 3pt

## ユーザーストーリー

分類ルールの保守者として、新しい欄種の追加を表の1行で済ませたい、なぜなら300行超の単一関数内の逐次分岐は順序依存が暗黙で新規追加が既存判定を壊しやすいから。

## 背景

`src/core/classify-rules.ts:115` の `classifyField` が単一関数内に逐次 `if` 連鎖を持つ現状:

- `src/core/classify-rules.ts:146-148`: 生年月日単体フレーズの早期 `null` ガード
- `src/core/classify-rules.ts:151-157`: birth (`birthMonth` / `birthDay` / `birthYear`、`BIRTH_CTX` + month/day/year の順序依存あり)
- `src/core/classify-rules.ts:158-162`: era (`birthEra`、`eraByContext` / `eraExact`)
- `src/core/classify-rules.ts:163-168`: school / department / gender（`ownText` 0.7 と `legendText` 0.65 の二重分岐）
- `src/core/classify-rules.ts:175-190`: overseas（`country` / `address1-4` / `postalCode`、`OVERSEAS_CTX`・`FOREIGN_MARK` ゲート付き）
- `src/core/classify-rules.ts:192-201`: age（`ageDecade`、`isOptionField` + `hasDecadeOptions` 条件付き）
- `src/core/classify-rules.ts:205-212`: romaji（`ROMAJI_CTX` + `FULL_NAME` / `LAST` / `FIRST`）
- `src/core/classify-rules.ts:226-234`: kana sources（`[text, confidence, bare]` の3行テーブル + `classifyText` 走査）
- `src/core/classify-rules.ts:235-236`: `tel` フォールバックと `null`

kana sources だけがテーブル形状（`sources: [string, number, boolean][]`）であり、それ以外の birth〜romaji は順序固定の逐次 `return` であるため、新規欄種の追加位置が優先順位の設計判断と結びつき、差分の見通しが悪い。

## BDDシナリオ

### 1. 既存 fixture の分類結果 parity

- Given `tests/helpers.ts` の `makeMeta` で作った既存 `tests/core/` fixture 群（birth / era / school / department / gender / overseas / ageDecade / romaji / kana / tel フォールバックを覆うもの）
- When テーブル駆動化後の `classifyField` で分類する
- Then 全ての fixture の `category`・`confidence`・`source`・`kanaKind` がリファクタ前と同一である

### 2. 新規欄種の追加が表の1行でできる

- Given テーブル駆動化後の `classifyField`
- When 保守者が優先順序付きの dispatch table に1エントリ（matcher + category + confidence）を追加する
- Then 既存エントリのコードを変更せずに新規欄種が分類され、既存 fixture の parity が保たれる

### 3. 優先順序の衝突が明示される

- Given `birthMonth` と `birthYear` の両方にマッチしうる `makeMeta` fixture（例: 生年月日の年・月を含む label）
- When `classifyField` で分類する
- Then テーブル上の優先順位どおり `birthMonth` が選ばれ、順序の理由がテーブルの定義順または明示的な priority として読み取れる

## 受け入れ基準

1. `classifyField` の birth〜romaji の逐次 `if` 連鎖が優先順序付き dispatch table（matcher 関数の配列等）に置き換わり、新規欄種の追加が原則1エントリの追加で済むこと。
2. 既存 `tests/core/` fixture の分類結果（`category` / `confidence` / `source` / `kanaKind`）が全て不変であること（parity golden で検証）。
3. `ACCEPT_THRESHOLD` および `isConfident` の判定ロジック・閾値が維持され、`analyze.ts` の `classifyAll` のフォールバック挙動（LLM 不可・出力不正・例外時はルール分類のみで継続）が変わらないこと。
4. `tel` フォールバック（0.5）と分類不能時の `null` 返却の挙動が維持されること。
5. `officeField`（`EXCLUDE`）による birth〜romaji 系全体の抑止と、`ownText` 0.7 / `legendText` 0.65 の confidence 勾配が維持されること。
6. 正規表現のテストが落ちたら期待値ではなく正規表現を直す方針に従い、fixture の期待値を現状合わせで書き換えないこと。意図的な順序変更が必要な場合のみ理由を明記して fixture を更新すること。
7. `core/` の純粋性（DOM・LLM 非依存）を保ち、`classifyField` のシグネチャ `(m: FieldMeta) => Classification | null` を変えないこと。

## テスト戦略

- `tests/core/` の parity / golden 先行: リファクタ前に現行 `classifyField` の出力を固定する parity テスト（`tests/helpers.ts` の `makeMeta` で fixture を作る）を追加し、Red（新規 parity が通ること）を確認してからテーブル駆動化を行う。
- 対象: birth 年月日の順序（month → day → year）、era の context/exact、`ownText` / `legendText` の confidence 差、overseas の context ゲート、age の option 条件、romaji の name 信号、kana sources の3段階、`tel` フォールバック、`null` 系。
- 単体テストのみ。`samples/` の手動確認や `tests/integration/samples.test.ts` の追加は対象外。

## DoD

- [ ] `tests/core/` の parity テストが全て緑である
- [ ] `make check`（typecheck + test + build）が緑である
- [ ] 新規欄種の追加手順が dispatch table の1行追加で説明できること
