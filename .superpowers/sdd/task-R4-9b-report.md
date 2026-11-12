# Task R4-9b report — 大手デベロッパー P1 21件の取込 (完了)

- ブランチ: work/pbi-208-round4。R4-9a (候補127・有望50) の後続。P1 21件を取込。P2・P3 には手を出さず。
- 制約遵守: src/ 変更なし。samples.test.ts への regex 直編集なし (tooling 配線 + fixture 改名の同名置換のみ)。分類のずれは直さず honest pin + Concerns 記録。pin 更新なし (`make eval` 未実行、集約タスクに委譲)。1 fixture ごとに commit。push なし。
- 取込ログ: `.superpowers/sdd/task-R4-9b-attempts.md` (No.1-7 / No.8-14 中間記録あり)。
- 検証: `npx vitest run tests/integration/samples.test.ts` 127 passed (全緑)。`make addurl-check` ゼロ。

## status: 成功 21/21 (失敗 0。取得不可なし)

| No | fixture | 解決欄数 | commit (フルSHA) |
|----|---------|----------|-----------------|
| 1 | smp-openhouse-inquiry.html | 9 | 3068d719eafb990a66ae05c9579d54c5d95b30db |
| 2 | sumitomo-latour-inquiry.html | 8 | 5d2b1ecbf945e103235f2559e0aaaa8db0798394 |
| 3 | sumifu-step-otoiawase.html | 8 | 3b532eef34469759b86b35a64753452e1973c986 |
| 4 | proud-procedure-form.html | 16 | 2c8162948c04a0f88297636b05535be1e8f7e47e |
| 5 | tokyu-branz-owner-form.html | 7 | 3884646bb966b24b9e865f372030226d4a3c5a76 |
| 6 | tokyu-commercial-form.html | 9 | 90d4388bfa443abed878cc761d9d768c80facb2f |
| 7 | tokyu-cre-form.html | 9 | 4dc1457be4ec48ade3d69b1ab57c47e2681a585b |
| 8 | brillia-support-contact.html | 6 | bf56f0c0a0ffed81ec6caecf97ef95bb9f906fbc |
| 9 | hulic-develop-plan.html | 9 | ba2ce9aa334494685665e5a1f6ae924dbf197d94 |
| 10 | mori-webcas-contact.html | 4 | 503a04a9a91a6b701f88e9f4494d18d2576a2676 |
| 11 | openhouse-customer-contact.html | 10 | 513945f39c9732fa72425862403584aa63585ffa |
| 12 | anabuki-general-contact.html | 3 | 4dba443702bac8556ae5fdf4022e722cd2027e25 |
| 13 | anabuki-landuse-contact.html | 8 | 221a991cd53fcf64c1373f5a4c4b424fdbf5722c |
| 14 | haseko-contact-input.html | 3 | b3f0fbfbd1dd793b3a8956bc788d30433e687c0f |
| 15 | cigr-ir-contact.html | 10 | c53a6a795e9eb5128e1464a2ccf2296d42f0c2de |
| 16 | wadakohsan-inquiry.html | 8 | 2a70549aff248fd07fb12694f12f8807cd8b7946 |
| 17 | hhp-site-inquiry.html | 9 | 7e145459e1a1bafc57a7118817ef64b1a375fca1 |
| 18 | nttud-inquiry.html | 5 | 9ef82e55ef8a46ac89c137c54e6931071480ff7a |
| 19 | sekisui-catalog-request.html | 11 | 0816d1a0161efef817968bcd14f6cee92b160ee6 |
| 20 | sekisui-inquiry-form.html | 13 | 1e9b3f9dd5edc3b76ac69f9abacf6086b54794dc |
| 21 | sekisui-mail-form.html | 12 | 0793f1bf4715ad8be51efe9074a6fb25af387221 |

- 各 commit は samples/*.html 1件 + tests/corpus.ts + tests/integration/samples.test.ts + tests/target-url.md の4ファイル (No.14/16/17 のみ後述の混入あり。HEAD 状態は正常)。
- 成果物: samples/*.html 21件 (+ LEDGER entry + test ケース配線・期待値埋め)、tests/target-url.md 成功分 21行追加。

## 運用メモ (後続タスク向け)

- tooling 既定名の衝突: `contact.html` (九工大 fixture と衝突→復元し改名)、`inquiry.html` / `cre.html` / `commercial.html` / `procedureform-xphp.html` 等の汎用名は No.1-8 で改名対応。No.9 以降は `make addurl URL=... FIXTURE=<意味ある名前>.html` で直接回避 (tooling ネイティブの手順)。
- 共有ブランチ並行 (R4-8a) との干渉: 事故記録は attempts.md 参照。要点のみ: (a) stage 前に `git diff` の追加 hunk が自分の fixture 名のみか確認する、(b) 相手の未コミット差分がある場合は待機か hunk フィルタ (`git apply --cached` 用 patch 分離) で分離 stage する、(c) index 破損 (大量削除 stage) を検出したら即 `git reset` (mixed) して worktree を保全する。
- No.19/20 の性別 radio: 実ページ (EUC-JP) の選択肢 (男性/女性/選択しない) を確認の上、otsuka 前例に準じ最小形で復元。label なし・div 構成のため tooling は skip 扱いだったが、性別群は分類対象のため人手で追加。

## Concerns (分類ずれ・将来PBI候補。分類は直していない)

- 郵便2欄の 3+4 分割対への誤結合 (refine): proud 旧新 (No.4)、東急 自宅/連絡先 (No.6/7)、anabuki 連絡先/物件 (No.13)。対照・複数住所の区別が候補。
- department→学科: No.1/3/16 (部署語彙が候補)。division→未分類: No.18 (部署名 label でも未解決。ff-csr organization_unit_name と同形)。
- type=text の mail 未分類 (email-via-name 候補): No.1/5/6/7/17。対照的に email-via-placeholder は解決する (No.4/9/11/15 相当)。
- company-by-placeholder 候補: No.3/4/9/12/13/14/16 (label 結合がある No.15/18 は解決する)。
- mail/mail_conf 非対称 (No.9。mail 未分類のまま mail_conf のみ解決)。email 名/ドメイン4分割の full email 注入 (No.20)。mailaddress→住所値 (No.21。mailaddress 語彙が候補)。
- name/name_kana 対の姓/名分割でカナ欄に漢字 (No.3。placeholder 対分割が候補)。mansion_name→姓 (No.5。物件名欄への姓注入)。sales_name 担当者→氏名 (No.11。担当者除外が候補)。proud address1→海外住所値 (No.4)。
- 漢字 placeholder の人名が未解決 (mori c_q10 No.10、cigr 漢字名 No.15、anabuki kana No.12/13、sekisui No.20。kobe-city ANSWER1 前例)。
- tel-by-name/placeholder 候補: No.4 (tel 2欄)、No.12/13 (tel/fax)、No.14 (mail01/02 も同様)。
- area 未分類 (No.11。area 語彙が候補)。building_ 接頭3欄→建物名 (No.13)。address-via-placeholder 候補 (mori c_q29 No.10)。
- in-form 検索 box 未分類 (No.2 keyword。search-box 候補)。
- fax 未解決 (No.9。ff-csr では tel 値が入る)。
