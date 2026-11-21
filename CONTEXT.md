# CONTEXT.md

JushoAI のドメイン用語集。最新仕様のスナップショットであり、経緯や変更履歴は書かない。

## 用語

- **分類** (classification): 入力欄のメタデータからカテゴリ (姓・名・フリガナ・郵便番号・住所分割など) を決めること。ルール (`core/classify-rules.ts`) が先に判定し、信頼度が `ACCEPT_THRESHOLD` 未満の欄だけ LLM に回す。
- **分類語彙テーブル** (classification vocabulary table): カテゴリごとの語彙定数 (regex / set) と、それを使う DISPATCH matcher を 1 枚の表として所有する module。`src/core/classify-vocab-<domain>.ts` (office / birth / name / school / address / misc)。語彙の追加は対応するテーブルへの 1 行追加で行う。語彙定数はドメイン間で import して参照できる (学校・部署エントリが office 語彙を使う等)。
- **dispatch キット** (dispatch kit): `DispatchCtx` / `MatcherEntry` / `matchAs` / `ownLegend` の共有キット。欄自身の一致 (0.7) が共有見出しの一致 (0.65) に勝つというグラデーションを `ownLegend` 1 箇所で展開する。
- **分類失敗語彙** (classification failure vocabulary): LLM 分類と接続テストの失敗理由の語彙 (`ClassifyFailure` / `TestFailure`) と fold。`src/core/classifier-failures.ts` が単一所有し、wire (`src/messages.ts`) は運搬のみを担う (応答 parser は述語経由で語彙を参照する)。
- **優先順** (dispatch order): ドメイン間の matcher の優先順は `classify-rules.ts` の明示的な結合リテラルが単一所有する。ドメイン内の順序はそのテーブルの module が持つ。定義順 = 優先度。
- **refine** (兄弟補正): 同一フォーム内の兄弟欄を見て分類を補正する段階 (電話 3 欄 → `tel1/2/3`、郵便番号 2 欄 → `zip1/2`、`fullName` 2 欄 → 姓/名、`addressFull` の絞り込みなど)。`refineClassifications` が公開 interface。
- **注入** (fill): プレビュー承認後に値を欄へ書き込むこと。ネイティブ setter 経由で `input` / `change` / `blur` を発火する。入力済み欄は上書きせず、`maxlength` 超過は切り詰めず警告して注入しない。
- **プレビュー** (preview): 注入前に計画を提示して承認を取る段階。注入は必ずプレビュー経由。
- **除外** (exclusion): 拡張機能を起動しない URL や欄の登録。クイック登録の undo は登録値の exact 削除。
- **egress ゲート**: LLM へ送信する欄の集合を決める門。「ゲートが見るもの = 送るもの」の不変条件を持つ。
