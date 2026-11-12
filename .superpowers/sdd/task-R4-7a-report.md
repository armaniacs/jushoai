# Task R4-7a フルレポート — THE日本大学ランキング対象校の候補200 URLリスト

- status: DONE
- ブランチ: work/pbi-208-round4 (作業開始前に `git branch` で確認済み)
- 対象: brief記載verbatimの99校 (表題は「上位100校」だが列挙は99校。99校全校をカバー)
- 成果物: `.superpowers/sdd/task-R4-7a-attempts.md` (試行ログ200件+集計)

## 候補件数・有望件数

- 試行総数: 200件 (No.1-200。要求100件以上を満たす)
  - No.1-99: 各校公式サイトの問合せ導線 (トップページからリンク抽出または推測パス)
  - No.100-198: 各校の入試・資料請求系導線 (No.=99+大学番号)
  - No.199-200: 青学公式問合せ頁から辿れるform-mailer外部フォーム2件
- 有望: 8件
  - P1 (4件・即取込推奨): No.36 九州工業大学 `/contact/`、No.87 産業医科大学 `Exam/inquiry.html`、No.96 昭和大学 (postin-svr外部)、No.191 福岡大学 (admission-logi外部)
  - P2 (4件): No.30 京都工芸繊維大学 `/contact`、No.86 島根大学 `/inquiry/1/`、No.199・No.200 青山学院大学 (form-mailer外部×2)
- 除外: 192件 (到達不能74: code=000が10・HTTP 4xx/5xxが60・実質404が4 / フォームなし118: 問合せハブ・一覧・OC/資料請求案内で静的formは検索のみ)

## 検証

- 候補200件すべてを `curl -sL --max-time 25` + Chrome UA で取得し、HTTPコード・form/input/textarea/select計数・action・欄名で判定。6件の有望候補は欄構成まで目視確認した
- `tests/target-url.md` および R4-1 の183件との重複なし (全200件をドメイン照合。大学公式ドメイン自体が既存・R4-1とも重なりゼロ。No.199-200のform-mailer 2件は既存登録のform-mailer URL群とexact-URL照合で別物を確認)
- 除外理由は PBI-208 基準 (JS描画のみ・ログイン必須・フォームなし・到達不能) に沿う。資料請求=テレメール外部・出願=e-apply外部・相談=Googleフォーム外部の3機構は概要をログに記録した
- `tests/target-url.md` への登録は未実施 (R4-7b以降が `make addurl` で行う)。src/・samples/・tests/ に触っていない

## 進め方 (並行作業対応)

- commit はすべて path限定 (`git add -f .superpowers/sdd/task-R4-7a-*` + `git commit -- <同ファイル>`) で11件。他タスクのファイルには触れていない (各commitで `git status` 確認。他タスクの `M AGENTS.md / tests/*` は作業前後で不変)
- 20件ごとに commit (No.1-20〜181-200の10件+集計1件)。commitロック衝突は発生せず retry 不要だった
- push はしていない (指示通り)

## concerns

1. brief表題「上位100校」に対し列挙は99校だったため、99校全校の各2URL (計198) +青学外部2件で200件とした。不足の1校が別途指定される場合は追加試行が必要
2. 5大学 (立命館・神田外語・福岡女子・聖路加国際・順天堂) の公式ドメインが curl を遮断 (https接続失敗・空応答。UA変更・http試行・リトライでも到達不能。bot遮断とみられる)。各2URLを到達不能として記録した。R4-7bで実ブラウザ取得を検討されたい
3. 大学の問合せ導線は「総合問合せハブ (静的formなし・検索のみ)」が大勢で、実フォームは外部サービス (テレメール/e-apply/OCANs等) に分散する傾向が強い。有望8件中3件が外部フォーム (admission-logi・postin-svr・form-mailer)。取込時は外部ドメインの扱い (既存corpusにも外部フォームの取込例あり) に留意されたい
4. B導線の多くは推測パス (`/admission/contact/` 型) で404だったが、R4-1 precedentと同様に試行記録として残した。404率は高いが捏造ではなく実測である

## commits (full SHA・当タスク分11件)

- e8a521860b1c8e5c52593c8ed58ba70f29423c09 (No.1-20)
- f96dfefdaa047bbf81e4d40f457a05352befd956 (No.21-40)
- 9100a5c42ffaeadde2798cddca1451af51ef96eb (No.41-60)
- 3b3f9cad222c4b0eb6e6931fd923fa35c8622da1 (No.61-80)
- 4fef764dfc3b050460eb678a0dd21f10679937ea (No.81-100)
- 9dd26a24c1a1d8744304644f78f746660759e53d (No.101-120)
- a267bb166e225edcad3624b3ccaf3e11229bb8db (No.121-140)
- 0537409b3d658cadb676b4d53a2253b2504dbc19 (No.141-160)
- 02fc27a33bc76660043c44610037c77cd89448bd (No.161-180)
- 4ce3c2fe4df0a0eafeef57482fbfc084a1a22f8b (No.181-200)
- c1fb0c8c9fdba37796a3d5bc3e71c3f4b23da9d7 (集計追加)
