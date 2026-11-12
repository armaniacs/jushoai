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
