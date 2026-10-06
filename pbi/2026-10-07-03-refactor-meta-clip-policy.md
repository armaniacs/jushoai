# メタデータ切り詰め80文字の集約

- 種別: refactor
- 優先度: 順位 3/4
- RICE: 4.8（Reach=3 / Impact=1 / Confidence=0.8 / Effort=0.5）
- 見積もり: 0.5pt
- 依存: 02 の後（同ファイルのため 02 先行）

## RICE 根拠

プロンプト用と報告用の切り詰めが別々に 80 を知っており、切り詰め幅の変更が飛び火する。分散したマジックナンバーを1箇所に集約する変更であり、ユーザーへの直接効果は小さいため Impact=1、範囲は送信データ経路に限定されるため Reach=3、作業量は定数集約のみのため Effort=0.5、確信度は Confidence=0.8。

## ユーザーストーリー

送信データの保守者として、切り詰め幅の変更を1箇所で済ませたい。なぜなら 80 という値が2ファイルに分散しているから。

## 背景

現状、メタデータ文字列の切り詰め幅 80 が以下2箇所に分散している（Read で確認済み）。

- `src/llm/classifier.ts:24`: `const clip = (s: string) => s.slice(0, 80);`（プロンプト送信用のメタデータ切り詰め）
- `src/feedback/issue-url.ts:29`: `const hint = [meta.label, meta.placeholder, meta.name].filter(Boolean).join(' / ').slice(0, 80);`（報告 URL 用のヒント切り詰め）

プライバシー文書に 80 文字の記載がある場合、この集約後も文書と実装の対応が保たれることを確認する。集約は値の変更ではなく置き場所の変更であり、文書の記載内容を変えないことが前提。

## BDD シナリオ

### シナリオ1: 切り詰め結果は不変である

```gherkin
Given 80 文字を超える label / placeholder / name を持つフィールドメタデータ
When プロンプト用 rows と報告 URL 用 hint を生成する
Then 集約前と集約後の出力は byte-identical である
```

### シナリオ2: `messages.ts` の `MAX_TEXT_LENGTH=200` とは別物である

```gherkin
Given `messages.ts` の `MAX_TEXT_LENGTH=200`
When 80 文字の切り詰め定数を集約する
Then `MAX_TEXT_LENGTH=200` の値も用途も変更しない
And 80 文字の定数はプロンプト用・報告用のメタデータ切り詰め専用であり、`MAX_TEXT_LENGTH` と統合しない
```

## 受け入れ基準

1. 80 という切り詰め幅が単一の共有定数として定義され、2箇所から参照されること
2. プロンプト用 rows と報告 URL 用 hint の出力が集約前と byte-identical であること（出力不変）
3. プロファイルの値が送信経路に混入しないプライバシー保証が維持されること
4. `MAX_TEXT_LENGTH=200` に変更がないこと
5. 既存テストが green であること（`make test` または対象の vitest が成功）

## テスト戦略

- vitest で切り詰めの不変性を検証する。配置先: `tests/core/`（既存の分類・整形・計画の fixture 規約に従う）。
- 境界値（80 文字ちょうど / 81 文字以上 / マルチバイト文字を含む場合）の切り詰め結果が集約前後で同一であることを確認する。
- `MAX_TEXT_LENGTH=200` への影響がないことを既存テストの green で確認する。

## DoD

- [ ] 切り詰め幅 80 が1箇所に集約され、2箇所から参照されている
- [ ] 出力が集約前と byte-identical であり、既存テストが green である
- [ ] プライバシー保証（値の非送信）が維持されている
