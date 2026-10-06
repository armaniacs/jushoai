# バックログ台帳: ロゴ・確認ポップアップ・ギア（2026-10-06）

## 候補一覧
1. 設定画面の左上にロゴを置き GitHub Pages へリンクする
2. ツールバークリックで入力内容の確認ポップアップを開く
3. 確認ポップアップの右上にギアを置き設定画面へ遷移させる

## RICE スコアリング表

```
RICE = (Reach x Impact x Confidence) / Effort
Reach: 設定・ツールバー利用者からの相対推定（全候補で同一基準）
Impact: 3=圧倒的 / 2=大きい / 1=中 / 0.5=小 / 0.25=極小
Confidence: 1.0=確定 / 0.8=設計判断が残る / 0.5=不確か
Effort: 人週の相対推定
```

| 順位 | 候補 | Reach | Impact | Conf. | Effort | RICE | ファイル |
|---|---|---|---|---|---|---|---|
| 1 | ロゴリンク | 4 | 0.5 | 1.0 | 0.2 | 10.0 | `2026-10-06-04-feat-options-logo.md` |
| 2 | 確認ポップアップ | 8 | 2 | 0.8 | 1.5 | 8.5 | `2026-10-06-05-feat-action-popup.md` |
| 3 | ギア | 8 | 1 | 1.0 | 0.2 | 40.0 | `2026-10-06-06-feat-popup-gear.md` |

### 実行順の逸脱理由
- 順位3（RICE 40.0）が最後に配置されている: 置き場所であるポップアップ（順位2）に依存するため、スコアより依存を優先した。

## 依存マップ
```
2026-10-06-04 (options/nav.ts, public/icon)                → 単独
2026-10-06-05 (wxt.config.ts manifest action, popup entry, storage)
  -> 2026-10-06-06 (同 popup + chrome.runtime.openOptionsPage)
```

## なぜなぜ分析の要約
- 疑問「ポップアップに何を出すのか不明」: 選択状態はプレビュー実行時のメモリ上にしかなく永続化されていないため、直前の選択は復元できない。保存済みの一覧を確認する画面にし、先頭を既定表示にする。
- 疑問「Pages の URL が不明」: リポジトリ `armaniacs/jushoai` の project pages の定形 `https://armaniacs.github.io/jushoai/` を採用する。デプロイ本体は `.github/workflows/pages.yml`。
- 疑問「権限追加が要るか」: `storage` は取得済みのため不要。外部送信もしない。
