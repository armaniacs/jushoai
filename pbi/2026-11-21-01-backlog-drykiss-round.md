# ラウンド台帳: DRY/KISS 調査の PBI 化 (2026-11-21)

## 出どころ

DRY/KISS 調査 2026-11-21 (コード全体 18,145 行・約 60 ファイルを graphify + 機械走査 + 実読で確認)。全指摘は grep と実読で現存確認済み。既存 PBI (246-258) との重複は排除済み。

## 起票インベントリ (RICE 順・連番は実施予定順)

| 順位 | PBI | タイトル | 出どころ | RICE |
|---|---|---|---|---|
| 1 | 259 | isRecord 5 重定義を共有ガードに統合 | D1 | 95 |
| 2 | 260 | save-side の保存失敗処理をヘルパーに統合 | D2 | 38 |
| 3 | 261 | settings-store の型付きエラーモード (導入 or 判断記録) | D3 | 14 |
| 4 | 262 | showDismissDialog の内部分解 (253 と同時着手) | K1 | 14 (着手条件付き) |
| 5 | 263 | showPreview の配線分解 | K2 | 14 |
| 6 | 264 | 'bad-response' の名前付き定数化 | D4 | 9 |

INVEST: 各 PBI は独立 (ファイルが重ならない)、単独で価値を提供、grep 可能な現状で estimable、1 スプリント以内、受け入れ基準で testable。全件挙動不変のリファクタ。

## 対応不要の判断記録 (個別 PBI 化しない)

1. **K3 (mountButton 約 266 行)** — 既に台帳の候補棚に記録済み (2026-10-31「drag/click 状態機械の seam 化」RICE 0.83・「実ブラウザ E2E が flaky 化したら最優先で着手」)。新規起票せず候補棚を継続。
2. **K4 (classifyField 約 154 行)** — 受容。interface は 5 export の深い module で、分岐密度はドメイン固有 (autocomplete・terminal・kana 帰属・確度)。内部分割は深さを削らず掃散だけを生む。語彙テーブル追加のついでに自然に変化するなら追従、積極的分割はしない。
3. **K5 (buildPlan 約 92 行)** — 条件未到来。警告節 (maxlength・pattern) がさらに育ったら分離を再検討。現状は plan 組立の核心として許容。

## 調査で健全と確認した領域 (指摘なし)

- 学習系 store: kv-store.ts の KvSpec アダプタに統合済み (PBI-153)
- プロバイダ 2 種: http-classifiers.ts の HttpClassifier が build/extract 戦略で統合済み
- options 3 セクション: dom.ts + list-boot.ts を共有
- UI: overlay.ts (OVERLAY_CSS / SHADOW_TOKENS / attachEscapeClose) を共有
- planner: VALUE_ROWS 表駆動 (PBI-218)
- entrypoints の chrome.storage 直参照: onChanged リスナのみ (seam 漏れなし)
- console.: 意図的な診断ログ ([JushoAI] プレフィックス規律)

## 関連情報

- 検証: 全 PBI 共通で `make check` 緑。挙動不変のため `make eval` への影響なし (259 は core 触りのため focused で確認)。
- 台帳運用: 各 PBI 完了後に `pbi/archived/` へ移動し 00-INDEX.md に記録。
