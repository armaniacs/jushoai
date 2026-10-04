# PBI: オーバーレイパネルの共通化（preview / ai-guide の抽出）

## 優先度

| 項目 | 値 |
|---|---|
| 実行順位 | 4 / 6 |
| RICE スコア | 3.0（Reach 6 × Impact 1 × Confidence 1.0 / Effort 2） |
| 根拠 | panel CSS・fixed 配置・Escape close・primary ボタン样式の 2 重定義がコードで確定。「変わる理由が同じ」（オーバーレイの視覚・挙動変更）のため共通化は過剰でない |
| 依存 | なし（バッチ 1 で並列実装可。PBI 01 の相互排他 fix と担当ファイルが非重複） |

## ユーザーストーリー

保守担当者として、プレビューと AI ガイドのオーバーレイ実装（ホスト生成・panel CSS・Escape close・primary ボタン）が 1 箇所に集まってほしい。視覚変更や Escape 挙動の変更が 2 箇所に飛び火するのをなくしたいから。

## 背景（現状）

- panel CSS が 2 重定義: `src/ui/preview.ts:33-54` と `src/ui/ai-guide.ts:125-135`（`.panel`・`h2`・button の样式がほぼ同一）
- fixed 配置が 2 重: `src/ui/preview.ts:58-60` と `src/ui/ai-guide.ts:143-145`（ともに `top: 16px; right: 16px`）
- Escape close が 2 重: `src/ui/preview.ts:130-137` と `src/ui/ai-guide.ts:178-190`（ともに document レベル capture リスナー）
- primary ボタン样式が 2 重: `src/ui/preview.ts:52` と `src/ui/ai-guide.ts:134`

## BDD 受け入れシナリオ

```gherkin
Scenario: プレビューの表示と閉じる挙動は変わらない
  Given 既存のプレビュー実装がある
  When オーバーレイ共通化を適用する
  Then プレビューの表示・Escape close・ボタン挙動は現行と同じ（既存テストが無修正で通る）

Scenario: AI ガイドの表示と閉じる挙動は変わらない
  Given 既存の AI ガイド実装がある
  When オーバーレイ共通化を適用する
  Then ガイドの表示・Escape close・ボタン挙動は現行と同じ（既存テストが無修正で通る）
```

挙動不変リファクタリング。`showPreview` / `showAiGuide` のシグネチャは変えない。

## 受け入れ基準

- [ ] panel CSS・fixed 配置・Escape close・primary ボタン样式が `ui/` の 1 箇所に集約される
- [ ] `showPreview` / `showAiGuide` のシグネチャと外部挙動は不変
- [ ] ページ由来の文字列は `textContent` のみで `innerHTML` を使わない（設計保証の維持）
- [ ] 既存の `tests/ui/*` が無修正で green（挙動不変の証拠）
- [ ] `npx tsc --noEmit` green

## テスト戦略

- `tests/ui/` に共通ヘルパの単体テストを追加可（host が closed Shadow DOM であること、Escape で close コールバックが呼ばれること）。
- 既存 `tests/ui/button.test.ts`・`tests/ui/ai-guide.test.ts` が無修正で green であることを挙動不変の証拠にする。

## 見積もり

2 ストーリーポイント

## 技術的考慮事項

- 依存関係: なし
- テスタビリティ: jsdom で host / shadow root を検証できる
- 非機能要件: なし

## 実装者向け注記

### 実装手順

1. `src/ui/overlay.ts`（仮称）に共通ヘルパを抽出: closed host + panel CSS + `position: fixed; top: 16px; right: 16px` + Escape capture close + primary button 样式
2. `src/ui/preview.ts` と `src/ui/ai-guide.ts` が共通ヘルパを使うよう差し替え（それぞれ固有の CSS・内容は現状維持）
3. `npx vitest run tests/ui` → `npx tsc --noEmit`

### 落とし穴

- Escape の挙動が 2 つで微妙に違う: プレビューは `opts.onCancel()` を呼び（close は content.ts 側）、ガイドは自身の `close()` を呼ぶ。この差は共通ヘルパに close コールバックを渡す形で維持する
- ガイドの close は冪等（`closed` フラグ、`src/ui/ai-guide.ts:179-182`）。プレビューは冪等でない。共通化でこの差を消さない（既存の呼び出し側の慣行に合わせる）
- `.panel` の CSS は完全同一ではない（preview は select・li・note を持つ）。共通部分（panel・h2・button・actions）だけを抜き、固有部分は各モジュールに残す

## Definition of Done

- [ ] 上記受け入れ基準をすべて満たす
- [ ] 共通ヘルパの単体テストが green
- [ ] 既存 `tests/ui/*` が無修正で green（挙動不変の証拠）
- [ ] コミット済み（refactor: オーバーレイパネルの共通部分を ui/overlay に抽出）
