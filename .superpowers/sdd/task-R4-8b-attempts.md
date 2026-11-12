# Task R4-8b 試行ログ — 大手塾 P1 21件の取込結果

- ブランチ: `work/pbi-208-round4` (R4-9b と並行。commit は自分の成果物のみ path 限定 add)
- 手順: `make addurl URL=<url>` (FIXTURE 指定で汎用名を回避) → 最小再現まで削る → 期待値を honest pin → `npx vitest run tests/integration/samples.test.ts -t <fixture>` 緑 → 1 fixture ごとに commit
- 検証: `npx vitest run tests/integration/samples.test.ts` 緑 + `make addurl-check` ゼロ。`make eval` RED は想定内 (pin 更新なし)

## 取込結果

| # | URL (brief No.) | fixture | 結果 | commit |
|---|-----------------|---------|------|--------|
| 1 | toshin sform 資料請求 | toshin-shiryo-form.html (35 controls → 12欄解決) | 成功 | 5df44c7de84b282258be6977bffdec4dcd73cc9e |
| 2 | toshin sform 個別相談 | toshin-mendan-form.html (28 controls → 12欄解決) | 成功 | 22d31feeb1788b74849654e6178136d304debb9c |
| 3 | 四谷大塚 lform 入塾テスト | yotsuya-nyujuku-form.html (25 controls → 17欄解決) | 成功 | 7e2b5516ba0597f02fd62100c42469c97c23776e |
| 4 | 公文教室案内 | kumon-annai-form.html (17 controls → 10欄解決) | 成功 | 42f99c768d7ebf02f54424323fdcb24c81ef45ac |
| 5 | 河合塾マナビス資料請求 | manavis-shiryo-form.html (22 controls → 15欄解決) | 成功 | 790e6482137c9a1c49349a8ff770ebbbbeeb927c |
| 6 | 栄光eforms資料請求 | eikoh-shiryo-form.html (11 controls → 2欄解決) | 成功 | c9707fa3c45d90dc6f8d73f69da4cae20328a1c2 |
| 7 | 湘南ゼミナール問合せ | shozemi-contact-form.html (14 controls → 8欄解決) | 成功 | 2b0ac7d174c271c8f73f0c2ffc557ca48d0eaa6b |
| 8 | 早稲田アカデミー申込基盤 | waseda-ac-form.html (40 controls → 5欄解決) | 成功 | 6d75812f065b59c1b8603a6cda1681ac2c1d20f0 |
| 9 | 森塾問合せ | morijuku-contact-form.html (10 controls → 8欄解決) | 成功 | 6596e2393dd75510c5b0e2773884c3870751a978 |
| 10 | 自立学習RED問合せ | jiritsu-red-contact-form.html (12 controls → 7欄解決) | 成功 (配線は R4-9b 側 commit に巻き込み。fixture HTML のみ自 commit) | wiring: 2a70549・7e14545 (R4-9b No.16・17) / html: 9dd07a6c89e5787335c06e2781282e4f24527137 |
| 11 | TOMAS体験授業 | tomas-trial-form.html (26 controls → 9欄解決) | 成功 | 2251760d803894cf9bfa143c1aa578c7f12e600a |
| 12 | トライ式高等学院予約 | try-gakuin-reserve-form.html (11 controls → 7欄解決。段階式の懸念あったが静的取込可) | 成功 | 35a1d473b58aaf3a4bfa0205eee629fe9699cf5e |
| 13 | 明光義塾問合せ | meiko-contact-form.html (22 controls → 17欄解決。select 実選択肢復元) | 成功 | 26910603c6b61837f43e221bf1115e88acfc010c |
| 14 | 京進スクール・ワン問合せ | keishin-contact-form.html (30 controls → 20欄解決。Shift_JIS 文字化け復元) | 成功 | 85bfadb642d23a61c3759eabbeed96e93a22578f |

## 混入メモ (No.10 取込中の出来事)

- R4-9b 側が共有3ファイルの whole-file add を続け、No.10 作業中の配線が2度巻き込まれた。
  - 2a70549 (R4-9b No.16 和田興産) が jiritsu の placeholder 雛形 + test case + registry 行を取込。
  - 7e14545 (R4-9b No.17 阪急阪神) が jiritsu の honest-pin 済み entry (placeholder→期待値置換) を取込。
  - いずれも内容は R4-8b No.10 の作業そのもので、破壊なし (vitest 緑で確認)。
- fixture HTML (`samples/jiritsu-red-contact-form.html`) は untracked のまま残されたため、
  `git add samples/jiritsu-red-contact-form.html` のみで 9dd07a6 として commit し No.10 を完結させた。
- 以降も共有ファイルの stage 前に `git status` + `git diff` で相手差分を確認し、混在時は blob 直接 stage 方式で自分の分だけ commit する (patch フィルタ方式は hunk 計算が壊れやすいため廃止)。
